// KangaToDo — the whole back end. Accelerated Experiences LLC.
//
// One endpoint, POST /api/kangatodo, body {do:'...'}. Server-authoritative on purpose.
//
// THE RULE THIS FILE EXISTS TO ENFORCE:
//   A child device never tells us which child it is. It presents an opaque token;
//   the server looks up which Skylight category that token is bound to and answers
//   with THAT child's chores and nothing else. A kid cannot see, complete, or delete
//   a sibling's task by editing a request. It is not a UI convention — it is the wire.
//
// Skylight: there is no official public API. This talks to the same OAuth-protected
// endpoints the Skylight mobile app uses (app.ourskylight.com). Skylight version-gates
// and has killed old clients before, so every Skylight call degrades honestly: if the
// upstream changes shape we report {ok:false, reason:'skylight_changed'} rather than
// silently dropping a parent's chore on the floor.
//
// Store: Upstash Redis over REST (env-injected by Vercel when the store is connected).
// Secrets: read from process.env only. Never hardcoded, never echoed to the browser.
// With no store and no credentials the endpoint says so plainly. It does not pretend.

import crypto from 'node:crypto';

/* ================================================================= store == */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const storeReady = () => !!(KV_URL && KV_TOK);

async function redis(...cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOK}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('store: ' + j.error);
  return j.result;
}

// Namespaced so this can share a Redis database with any other AE product
// without either one ever stepping on the other's keys.
const NS = 'roo:';
const K = (s) => NS + s;
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };
const setJSON = (k, v, ttl) => ttl ? redis('SET', k, JSON.stringify(v), 'EX', String(ttl))
                                   : redis('SET', k, JSON.stringify(v));

/* =============================================================== helpers == */

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const rnd = (n) => b64url(crypto.randomBytes(n));

// Join codes a child types on a phone. No 0/O/1/I/L — they get misread out loud
// and a kid retyping a code four times is a kid who gives up.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
function joinCode(n = 6) {
  const bytes = crypto.randomBytes(n);
  let s = '';
  for (let i = 0; i < n; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s;
}

const todayISO = (tz) => {
  try {
    return new Intl.DateTimeFormat('en-CA', { timeZone: tz || 'UTC' }).format(new Date());
  } catch { return new Date().toISOString().slice(0, 10); }
};

// Constant-time compare so a wrong PIN cannot be found one character at a time.
function safeEqual(a, b) {
  const A = Buffer.from(String(a)), B = Buffer.from(String(b));
  if (A.length !== B.length) return false;
  return crypto.timingSafeEqual(A, B);
}

/* ============================================================== skylight == */
//
// Reverse-engineered surface. Confirmed live Aug 2026:
//   - POST /api/sessions (the old email+password JSON login) is DEAD — it returns
//     401 "This version of Skylight is no longer supported."
//   - Current auth is OAuth 2.0 Authorization Code + PKCE (Rails Doorkeeper),
//     client_id 'skylight-mobile'. It is a multi-hop 302 chain with a cookie jar
//     and an HTML CSRF token, which is exactly why this cannot live in a browser.
//   - The API is CORS-locked to https://ourskylight.com. This proxy is not a
//     convenience; without it there is no product.

const SKY_BASE      = 'https://app.ourskylight.com';
const SKY_CLIENT_ID = 'skylight-mobile';
const SKY_SCOPE     = 'everything';
const SKY_REDIRECT  = 'https://ourskylight.com/welcome';
const SKY_API_VER   = '2026-03-01';

const SKY_EMAIL = process.env.SKYLIGHT_EMAIL || '';
const SKY_PASS  = process.env.SKYLIGHT_PASSWORD || '';
const skyConfigured = () => !!(SKY_EMAIL && SKY_PASS);

class SkylightError extends Error {
  constructor(reason, detail, status) {
    super(reason); this.reason = reason; this.detail = detail || ''; this.status = status || 0;
  }
}

/* -- cookie jar ------------------------------------------------------------ */
// Node's fetch will not carry cookies across a redirect chain we drive by hand,
// so we carry them ourselves. Small, dumb, and enough.
function jarPut(jar, setCookieHeaders) {
  for (const line of setCookieHeaders) {
    const pair = String(line).split(';')[0];
    const eq = pair.indexOf('=');
    if (eq > 0) jar[pair.slice(0, eq).trim()] = pair.slice(eq + 1).trim();
  }
}
const jarHeader = (jar) => Object.entries(jar).map(([k, v]) => `${k}=${v}`).join('; ');

function readSetCookie(res) {
  // Node 18+ exposes getSetCookie(); fall back for older runtimes.
  if (typeof res.headers.getSetCookie === 'function') return res.headers.getSetCookie();
  const raw = res.headers.get('set-cookie');
  return raw ? [raw] : [];
}

/* -- the OAuth PKCE dance -------------------------------------------------- */

async function skyAuthorize() {
  const verifier  = rnd(32);
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state     = rnd(16);
  const jar       = {};

  const authUrl = `${SKY_BASE}/oauth/authorize?` + new URLSearchParams({
    client_id: SKY_CLIENT_ID,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: SKY_REDIRECT,
    response_type: 'code',
    scope: SKY_SCOPE,
    state,
    prompt: 'login',
  });

  // 1 — start the authorize, pick up the session cookie.
  let r = await fetch(authUrl, { redirect: 'manual', headers: { accept: 'text/html' } });
  jarPut(jar, readSetCookie(r));
  const loginUrl = r.headers.get('location') || `${SKY_BASE}/auth/session/new`;

  // 2 — fetch the login form, scrape the Rails CSRF token.
  r = await fetch(new URL(loginUrl, SKY_BASE), {
    redirect: 'manual',
    headers: { accept: 'text/html', cookie: jarHeader(jar) },
  });
  jarPut(jar, readSetCookie(r));
  const html = await r.text();
  const csrf = (html.match(/name=["']authenticity_token["'][^>]*value=["']([^"']+)["']/i) || [])[1];
  if (!csrf) throw new SkylightError('skylight_changed', 'no CSRF token on the login form', r.status);

  // 3 — submit the credentials as a form post. 302 means we are in.
  r = await fetch(`${SKY_BASE}/auth/session`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'text/html',
      cookie: jarHeader(jar),
      origin: SKY_BASE,
      referer: `${SKY_BASE}/auth/session/new`,
    },
    body: new URLSearchParams({ authenticity_token: csrf, email: SKY_EMAIL, password: SKY_PASS }),
  });
  jarPut(jar, readSetCookie(r));
  if (r.status !== 302 && r.status !== 303) {
    throw new SkylightError('skylight_bad_login', 'Skylight rejected the email or password', r.status);
  }

  // 4 — replay the authorize, now authenticated, and catch the code off the redirect.
  r = await fetch(authUrl, { redirect: 'manual', headers: { accept: 'text/html', cookie: jarHeader(jar) } });
  jarPut(jar, readSetCookie(r));
  const back = r.headers.get('location') || '';
  const got = new URL(back, SKY_BASE).searchParams;
  const code = got.get('code');
  if (!code) throw new SkylightError('skylight_changed', 'no authorization code returned', r.status);
  if (got.get('state') !== state) throw new SkylightError('skylight_changed', 'oauth state mismatch', r.status);

  // 5 — trade the code for a token.
  return skyToken({
    grant_type: 'authorization_code',
    code,
    code_verifier: verifier,
    redirect_uri: SKY_REDIRECT,
  });
}

async function skyToken(extra) {
  const body = new URLSearchParams({
    client_id: SKY_CLIENT_ID,
    scope: SKY_SCOPE,
    skylight_api_client_device_fingerprint: deviceFingerprint(),
    skylight_api_client_device_platform: 'web',
    skylight_api_client_device_name: 'KangaToDo',
    skylight_api_client_device_os_version: 'unknown',
    skylight_api_client_device_app_version: '1.0.0',
    skylight_api_client_device_hardware: 'Linux',
    ...extra,
  });
  const r = await fetch(`${SKY_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.access_token) {
    const why = j.error === 'invalid_grant' ? 'skylight_bad_login' : 'skylight_changed';
    throw new SkylightError(why, j.error_description || j.error || 'token exchange failed', r.status);
  }
  return {
    access_token: j.access_token,
    refresh_token: j.refresh_token || '',
    // Refresh a minute early so a call never dies mid-flight on a boundary.
    expires_at: Date.now() + (Number(j.expires_in || 7200) - 60) * 1000,
  };
}

// One stable fingerprint per deployment. Skylight ties tokens to a device; a
// fingerprint that changed every cold start would look like a swarm of new
// devices logging in, which is how an account gets flagged.
function deviceFingerprint() {
  const seed = (process.env.SKYLIGHT_DEVICE_ID || '') || crypto
    .createHash('sha256').update('ae-assign|' + SKY_EMAIL).digest('hex');
  const h = seed.replace(/[^a-f0-9]/gi, '').padEnd(32, '0').slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
}

/* -- token cache ----------------------------------------------------------- */

let memToken = null; // survives warm invocations; Redis survives cold ones.

async function skyAccessToken(force) {
  if (!skyConfigured()) throw new SkylightError('no_skylight', 'SKYLIGHT_EMAIL / SKYLIGHT_PASSWORD are not set');

  if (!force && memToken && memToken.expires_at > Date.now()) return memToken.access_token;

  if (!force && storeReady()) {
    const cached = await getJSON(K('sky:token')).catch(() => null);
    if (cached && cached.expires_at > Date.now()) { memToken = cached; return cached.access_token; }
    if (cached && cached.refresh_token) {
      try {
        const t = await skyToken({ grant_type: 'refresh_token', refresh_token: cached.refresh_token });
        memToken = t; await setJSON(K('sky:token'), t).catch(() => {});
        return t.access_token;
      } catch { /* refresh tokens rotate and expire — fall through to a full login */ }
    }
  }

  const t = await skyAuthorize();
  memToken = t;
  if (storeReady()) await setJSON(K('sky:token'), t).catch(() => {});
  return t.access_token;
}

/* -- authenticated calls --------------------------------------------------- */

async function sky(path, { method = 'GET', body, retry = true } = {}) {
  const token = await skyAccessToken(false);
  const headers = {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'skylight-api-version': SKY_API_VER,
  };
  if (body !== undefined) headers['content-type'] = 'application/json';

  const r = await fetch(SKY_BASE + path, {
    method, headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (r.status === 401 && retry) { memToken = null; return sky(path, { method, body, retry: false }); }
  if (r.status === 429) {
    throw new SkylightError('skylight_rate_limited', `retry after ${r.headers.get('retry-after') || '?'}s`, 429);
  }
  if (!r.ok) {
    const text = await r.text().catch(() => '');
    throw new SkylightError('skylight_error', text.slice(0, 300), r.status);
  }

  // DELETE returns 200 with an empty body. Calling .json() on it throws.
  const raw = await r.text();
  if (!raw) return null;
  try { return JSON.parse(raw); }
  catch { throw new SkylightError('skylight_changed', 'response was not JSON', r.status); }
}

/* -- frame (household) ----------------------------------------------------- */

async function skyFrame() {
  if (process.env.SKYLIGHT_FRAME_ID) return { id: String(process.env.SKYLIGHT_FRAME_ID) };
  const j = await sky('/api/frames');
  const first = j && j.data && j.data[0];
  if (!first) throw new SkylightError('skylight_no_frame', 'this Skylight account has no frames');
  return { id: String(first.id), name: (first.attributes || {}).name || 'Home',
           tz: (first.attributes || {}).timezone || 'UTC',
           plus: !!(first.attributes || {}).plus };
}

/* -- children are categories ----------------------------------------------- */
// Skylight has no /people endpoint. A family member is a CATEGORY carrying
// linked_to_profile:true. That is the join point for everything below.

async function skyChildren(frameId) {
  const j = await sky(`/api/frames/${frameId}/categories`);
  return (j.data || [])
    .map((c) => ({
      categoryId: String(c.id),
      name: (c.attributes || {}).label || 'Unnamed',
      color: (c.attributes || {}).color || '#8a7a5c',
      isPerson: !!(c.attributes || {}).linked_to_profile,
      onChoreChart: !!(c.attributes || {}).selected_for_chore_chart,
      photo: (c.attributes || {}).profile_pic_url || null,
    }))
    .filter((c) => c.isPerson);
}

/* -- chores ---------------------------------------------------------------- */

function normaliseChore(c, catIndex) {
  const a = c.attributes || {};
  const catId = ((c.relationships || {}).category || {}).data;
  const cid = catId ? String(catId.id) : null;
  return {
    id: String(a.id ?? c.id),
    group: a.group ? String(a.group) : String(a.id ?? c.id),
    summary: a.summary || '',
    status: a.status || 'pending',
    done: a.status === 'complete',
    date: a.start || null,
    time: a.start_time || null,
    recurring: !!a.recurring,
    points: a.reward_points ?? null,
    emoji: a.emoji_icon || null,
    position: a.position ?? 0,
    categoryId: cid,
    childName: cid && catIndex ? (catIndex[cid] || null) : null,
  };
}

async function skyChores(frameId, { from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('after', from);
  if (to) q.set('before', to);
  q.set('include_late', 'true');
  const j = await sky(`/api/frames/${frameId}/chores?${q}`);
  const catIndex = {};
  for (const inc of (j.included || [])) {
    if (inc.type === 'category') catIndex[String(inc.id)] = (inc.attributes || {}).label || null;
  }
  return (j.data || []).map((c) => normaliseChore(c, catIndex));
}

async function skyCreateChore(frameId, chore) {
  // FLAT body, not JSON:API — sending relationships here returns 422
  // {"category":["must exist"]}. Both category_id AND category_ids are required.
  const body = {
    summary: chore.summary,
    start: chore.date,
    start_time: chore.time || null,
    recurring: !!chore.recurring,
    recurrence_set: chore.recurrence_set || null,
    recurring_until: chore.until || null,
    routine: chore.routine !== false,
    reward_points: chore.points ?? null,
    emoji_icon: chore.emoji || null,
    category_id: String(chore.categoryId),
    category_ids: [String(chore.categoryId)],
  };
  const j = await sky(`/api/frames/${frameId}/chores/create_multiple`, { method: 'POST', body });
  // Returns an ARRAY. A single BYHOUR=6,14,20 rule fans out into one record per hour.
  const list = (j && j.data) || [];
  return list.map((c) => normaliseChore(c, null));
}

const skySetStatus = (frameId, choreId, status) =>
  sky(`/api/frames/${frameId}/chores/${encodeURIComponent(choreId)}`, { method: 'PUT', body: { status } });

const skyDeleteChore = (frameId, choreId, applyToAll) =>
  sky(`/api/frames/${frameId}/chores/${encodeURIComponent(choreId)}${applyToAll ? '?apply_to=all' : ''}`,
      { method: 'DELETE' });

/* ============================================================== kid links == */
//
// A child device holds one opaque token. The token — not the request — decides
// which category the device may see. This is the whole security model.

const kidKey   = (token) => K('kid:' + token);
const codeKey  = (code)  => K('code:' + code.toUpperCase());
const childKey = (cid)   => K('child:' + cid);

async function resolveKid(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const kid = await getJSON(kidKey(token));
  if (!kid) return null;
  await redis('SET', kidKey(token), JSON.stringify({ ...kid, seen: Date.now() })).catch(() => {});
  return kid;
}


/* ============================================================ proof shots == */
//
// Photographs taken by children. Three rules this code exists to keep:
//   1. Shrunk on the phone before upload — we never receive a 4 MB original.
//   2. Stored at an unguessable path, and the URL is the only key.
//   3. Purged automatically after PHOTO_DAYS. The cron does it; nothing is kept
//      "just in case". A parent who wants to keep one saves it themselves.

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const blobReady = () => !!BLOB_TOKEN;
const PHOTO_DAYS = Math.max(1, Number(process.env.KANGATODO_PHOTO_DAYS || 7));

/** Upload bytes to Vercel Blob over its REST API (no SDK — api/ carries no deps). */
async function blobPut(pathname, bytes, contentType) {
  const r = await fetch(`https://blob.vercel-storage.com/${pathname}`, {
    method: 'PUT',
    headers: {
      authorization: `Bearer ${BLOB_TOKEN}`,
      'x-api-version': '7',
      'x-content-type': contentType,
      'x-add-random-suffix': '1',            // unguessable, even if a chore id leaks
      'x-cache-control-max-age': String(PHOTO_DAYS * 86400),
    },
    body: bytes,
  });
  const text = await r.text();
  if (!r.ok) throw new SkylightError('photo_store_failed', text.slice(0, 200), r.status);
  try { return JSON.parse(text); }
  catch { throw new SkylightError('photo_store_failed', 'upload response was not JSON', r.status); }
}

const proofSetKey = K('proofset');            // chore GROUP ids that require a photo
const photoKey  = (choreId) => K('photo:' + choreId);

/** Which of these chore groups need a photo? One round trip, not N. */
async function proofGroups() {
  if (!storeReady()) return new Set();
  const m = await redis('SMEMBERS', proofSetKey).catch(() => []);
  return new Set((m || []).map(String));
}

/** Attach needsProof + any photo already taken. */
async function decorate(chores) {
  if (!storeReady() || !chores.length) return chores;
  const need = await proofGroups();
  const withProof = chores.filter((c) => need.has(String(c.group)));
  const photos = {};
  for (const c of withProof) {
    const p = await getJSON(photoKey(c.id)).catch(() => null);
    if (p) photos[c.id] = p;
  }
  for (const c of chores) {
    c.needsProof = need.has(String(c.group));
    c.photo = photos[c.id] ? photos[c.id].url : null;
    c.photoAt = photos[c.id] ? photos[c.id].at : null;
  }
  return chores;
}

/** Record a finished job and queue the parent's buzz. Delivery is the alert endpoint's. */
async function queueParentAlert(entry) {
  if (!storeReady()) return;
  await redis('LPUSH', K('finished'), JSON.stringify(entry)).catch(() => {});
  await redis('LTRIM', K('finished'), 0, 199).catch(() => {});
  await redis('LPUSH', K('parentq'), JSON.stringify(entry)).catch(() => {});
  await redis('LTRIM', K('parentq'), 0, 99).catch(() => {});
  // Feeds the evening digest.
  await redis('LPUSH', K('digest:' + new Date().toISOString().slice(0, 10)), JSON.stringify(entry)).catch(() => {});
  await redis('EXPIRE', K('digest:' + new Date().toISOString().slice(0, 10)), 172800).catch(() => {});
}

/**
 * The public half of the VAPID identity the alert engine will sign with.
 * Same resolution order: env, then the shared `ef:vapid` slot in Upstash that
 * ESPOfocus already populated for this domain, then generate-and-store.
 * The browser needs this exact value as `applicationServerKey` or the push
 * it subscribes with cannot be signed for later.
 */
async function vapidPublicKey() {
  if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) return process.env.VAPID_PUBLIC_KEY;
  if (!storeReady()) return null;
  let v = await getJSON('ef:vapid').catch(() => null);
  if (v && v.pub) return v.pub;
  const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const raw = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-65);
  v = { pub: b64url(raw), jwk: kp.privateKey.export({ format: 'jwk' }) };
  await redis('SET', 'ef:vapid', JSON.stringify(v)).catch(() => {});
  return v.pub;
}

/* ================================================================ routing == */

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, reason: 'post_only' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const op = String(body.do || '');

  try {
    const out = await route(op, body, req);
    return res.status(200).json(out);
  } catch (e) {
    if (e instanceof SkylightError) {
      // An upstream that changed shape is a real answer, not a 500. The app shows it.
      return res.status(200).json({ ok: false, reason: e.reason, detail: e.detail, status: e.status });
    }
    return res.status(200).json({ ok: false, reason: 'error', detail: String(e && e.message || e).slice(0, 200) });
  }
}

async function route(op, b, req) {
  /* ---------------------------------------------------------- status ---- */
  // Honest capability report. The app renders exactly what this says and never
  // claims a feature that is dark.
  if (op === 'status') {
    const st = {
      ok: true,
      store: storeReady(),
      skylight: skyConfigured(),
      push: !!((process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) || storeReady()),
      sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
      photos: blobReady(),
      photoDays: PHOTO_DAYS,
      parentLock: !!process.env.PARENT_PIN,
      vapidPublicKey: await vapidPublicKey(),
    };
    if (st.skylight) {
      try {
        const f = await skyFrame();
        st.frame = { id: f.id, name: f.name || null, plus: !!f.plus, tz: f.tz || null };
        st.connected = true;
      } catch (e) {
        st.connected = false;
        st.skylightReason = e.reason || 'error';
        st.skylightDetail = e.detail || '';
      }
    } else {
      st.connected = false;
      st.skylightReason = 'no_skylight';
    }
    return st;
  }

  /* ---------------------------------------------------- parent unlock ---- */
  if (op === 'parent.unlock') {
    const pin = process.env.PARENT_PIN || '';
    if (!pin) return { ok: true, unlocked: true, unlocked_because: 'no_pin_set' };
    if (!safeEqual(String(b.pin || ''), pin)) {
      await new Promise((r) => setTimeout(r, 400)); // blunt the guessing
      return { ok: false, reason: 'bad_pin' };
    }
    return { ok: true, unlocked: true, session: rnd(24) };
  }

  const requireParent = () => {
    const pin = process.env.PARENT_PIN || '';
    if (!pin) return;                                  // no lock configured — say so in the UI, don't fake one
    if (!safeEqual(String(b.pin || ''), pin)) throw new SkylightError('locked', 'parent PIN required', 401);
  };

  /* ------------------------------------------------------- parent side --- */

  if (op === 'children') {
    requireParent();
    const f = await skyFrame();
    const kids = await skyChildren(f.id);
    if (storeReady()) {
      // Decorate with our own link state — which kids actually have a phone attached.
      for (const k of kids) {
        const rec = await getJSON(childKey(k.categoryId)).catch(() => null);
        k.linked   = !!(rec && rec.devices && rec.devices.length);
        k.devices  = rec ? (rec.devices || []).length : 0;
        k.phone    = rec && rec.phone ? String(rec.phone).replace(/\d(?=\d{4})/g, '•') : null;
        k.pendingCode = rec && rec.code ? rec.code : null;
      }
    }
    return { ok: true, frame: { id: f.id, name: f.name, tz: f.tz, plus: f.plus }, children: kids };
  }

  if (op === 'chores') {
    requireParent();
    const f = await skyFrame();
    const from = b.from || todayISO(f.tz);
    const to   = b.to   || from;
    return { ok: true, from, to, chores: await decorate(await skyChores(f.id, { from, to })) };
  }

  if (op === 'chore.create') {
    requireParent();
    if (!b.summary || !String(b.summary).trim()) return { ok: false, reason: 'no_summary' };
    if (!b.categoryId) return { ok: false, reason: 'no_child' };
    const f = await skyFrame();

    const made = await skyCreateChore(f.id, {
      summary: String(b.summary).trim().slice(0, 200),
      date: b.date || todayISO(f.tz),
      time: b.time || null,
      recurring: !!b.recurring,
      recurrence_set: b.recurrence_set || null,
      until: b.until || null,
      points: b.points ?? null,
      emoji: b.emoji || null,
      categoryId: b.categoryId,
    });

    // A job needs a photo per SERIES, so every repeat of it inherits the rule.
    if (storeReady() && made.length) {
      const grp = String(made[0].group);
      if (b.needsProof) await redis('SADD', proofSetKey, grp).catch(() => {});
      else              await redis('SREM', proofSetKey, grp).catch(() => {});
    }

    // Queue the alert. Delivery is the alert endpoint's job, not this one's —
    // a slow push service must never make a parent's Save button hang.
    if (storeReady() && made.length) {
      await redis('LPUSH', K('alerts'), JSON.stringify({
        at: Date.now(),
        categoryId: String(b.categoryId),
        choreId: made[0].id,
        summary: made[0].summary,
        time: made[0].time,
        date: made[0].date,
      })).catch(() => {});
      await redis('LTRIM', K('alerts'), 0, 499).catch(() => {});
    }

    return { ok: true, created: made, queuedAlert: storeReady() };
  }

  if (op === 'chore.complete') {
    requireParent();
    const f = await skyFrame();
    await skySetStatus(f.id, b.choreId, b.done === false ? 'pending' : 'complete');
    return { ok: true };
  }

  if (op === 'chore.delete') {
    requireParent();
    const f = await skyFrame();
    await skyDeleteChore(f.id, b.choreId, b.all !== false);
    return { ok: true };
  }

  /* --------------------------------------------------- linking a child --- */

  if (op === 'child.code') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    if (!b.categoryId) return { ok: false, reason: 'no_child' };

    const f = await skyFrame();
    const kids = await skyChildren(f.id);
    const kid = kids.find((k) => k.categoryId === String(b.categoryId));
    if (!kid) return { ok: false, reason: 'unknown_child' };

    const rec = (await getJSON(childKey(kid.categoryId))) || { devices: [] };
    if (rec.code) await redis('DEL', codeKey(rec.code)).catch(() => {});

    const code = joinCode(6);
    rec.code = code;
    rec.name = kid.name;
    rec.color = kid.color;
    await setJSON(childKey(kid.categoryId), rec);
    // A join code is a key to a child's task list. It expires in an hour.
    await setJSON(codeKey(code), { categoryId: kid.categoryId, name: kid.name, color: kid.color }, 3600);

    return { ok: true, code, expiresInMinutes: 60, child: kid.name };
  }

  if (op === 'child.phone') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const digits = String(b.phone || '').replace(/[^\d+]/g, '');
    const rec = (await getJSON(childKey(String(b.categoryId)))) || { devices: [] };
    if (!digits) { delete rec.phone; }
    else {
      if (!/^\+?\d{10,15}$/.test(digits)) return { ok: false, reason: 'bad_phone' };
      rec.phone = digits.startsWith('+') ? digits : '+1' + digits;
    }
    await setJSON(childKey(String(b.categoryId)), rec);
    return { ok: true, phone: rec.phone ? rec.phone.replace(/\d(?=\d{4})/g, '•') : null };
  }

  if (op === 'child.unlink') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const rec = await getJSON(childKey(String(b.categoryId)));
    if (!rec) return { ok: true, removed: 0 };
    let n = 0;
    for (const d of (rec.devices || [])) { await redis('DEL', kidKey(d.token)).catch(() => {}); n++; }
    rec.devices = [];
    if (rec.code) { await redis('DEL', codeKey(rec.code)).catch(() => {}); delete rec.code; }
    await setJSON(childKey(String(b.categoryId)), rec);
    return { ok: true, removed: n };
  }

  /* ------------------------------------------------------- child side ---- */
  // Everything below trusts the TOKEN and nothing else in the request.

  if (op === 'kid.join') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return { ok: false, reason: 'bad_code' };

    const claim = await getJSON(codeKey(code));
    if (!claim) return { ok: false, reason: 'bad_code' };

    const token = rnd(32);
    await setJSON(kidKey(token), {
      categoryId: claim.categoryId, name: claim.name, color: claim.color, since: Date.now(),
    });

    const rec = (await getJSON(childKey(claim.categoryId))) || { devices: [] };
    rec.devices = rec.devices || [];
    rec.devices.push({ token, since: Date.now(), label: String(b.device || 'phone').slice(0, 40) });
    delete rec.code;
    await setJSON(childKey(claim.categoryId), rec);
    await redis('DEL', codeKey(code)).catch(() => {});   // one code, one phone

    return { ok: true, token, name: claim.name, color: claim.color };
  }

  if (op === 'kid.mine') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const kid = await resolveKid(b.token);
    if (!kid) return { ok: false, reason: 'not_linked' };

    const f = await skyFrame();
    const day = b.date || todayISO(f.tz);
    const all = await skyChores(f.id, { from: day, to: day });

    // THE LINE. Filtered server-side against the token's category, never the request's.
    const mine = all.filter((c) => c.categoryId === kid.categoryId)
                    .sort((a, z) => (a.time || '99:99').localeCompare(z.time || '99:99') || a.position - z.position);

    await decorate(mine);
    return {
      ok: true, name: kid.name, color: kid.color, date: day,
      needsPhotoSupported: blobReady(),
      chores: mine,
      done: mine.filter((c) => c.done).length,
      total: mine.length,
    };
  }

  if (op === 'kid.done') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const kid = await resolveKid(b.token);
    if (!kid) return { ok: false, reason: 'not_linked' };

    const f = await skyFrame();
    const day = (String(b.choreId || '').match(/-(\d{4}-\d{2}-\d{2})-/) || [])[1] || todayISO(f.tz);
    const all = await skyChores(f.id, { from: day, to: day });

    // Re-check ownership against the token before writing. A child cannot complete
    // a sibling's chore by pasting its id, even a real one.
    const target = all.find((c) => c.id === String(b.choreId));
    if (!target) return { ok: false, reason: 'unknown_chore' };
    if (target.categoryId !== kid.categoryId) return { ok: false, reason: 'not_yours' };

    // A job marked "needs a photo" cannot be ticked off without one. Checked HERE,
    // on the server, so it holds even if the kid's app is old or tampered with.
    if (b.done !== false && storeReady()) {
      const need = await proofGroups();
      if (need.has(String(target.group))) {
        const shot = await getJSON(photoKey(target.id)).catch(() => null);
        if (!shot) return { ok: false, reason: 'needs_photo', summary: target.summary };
      }
    }

    await skySetStatus(f.id, target.id, b.done === false ? 'pending' : 'complete');

    // Clear any pending SMS fallback — the job is done, don't nag a kid who finished.
    await redis('SREM', K('ack'), String(b.choreId)).catch(() => {});
    await redis('SADD', K('acked'), String(b.choreId)).catch(() => {});
    await redis('EXPIRE', K('acked'), 172800).catch(() => {});

    if (b.done !== false) {
      await queueParentAlert({ child: kid.name, summary: target.summary,
                               choreId: target.id, photo: null, at: Date.now() });
    }
    return { ok: true, done: b.done !== false };
  }

  if (op === 'kid.push') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const kid = await resolveKid(b.token);
    if (!kid) return { ok: false, reason: 'not_linked' };
    const sub = b.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return { ok: false, reason: 'bad_subscription' };
    }
    await setJSON(K('push:' + b.token), {
      endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth,
      categoryId: kid.categoryId, name: kid.name, at: Date.now(),
    });
    await redis('SADD', K('pushtokens'), b.token).catch(() => {});
    return { ok: true };
  }


  /* ------------------------------------------------- proof photo (kid) --- */

  if (op === 'kid.proof') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    if (!blobReady())  return { ok: false, reason: 'no_photo_store' };
    const kid = await resolveKid(b.token);
    if (!kid) return { ok: false, reason: 'not_linked' };

    // The phone shrinks the picture before sending. Anything large is a bug or abuse.
    const raw = String(b.image || '');
    const m = raw.match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return { ok: false, reason: 'bad_image' };
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > 1_500_000) return { ok: false, reason: 'image_too_big' };

    const f = await skyFrame();
    const day = (String(b.choreId || '').match(/-(\d{4}-\d{2}-\d{2})-/) || [])[1] || todayISO(f.tz);
    const all = await skyChores(f.id, { from: day, to: day });
    const target = all.find((c) => c.id === String(b.choreId));
    if (!target) return { ok: false, reason: 'unknown_chore' };
    // Same ownership line as everywhere else: the token decides, not the request.
    if (target.categoryId !== kid.categoryId) return { ok: false, reason: 'not_yours' };

    const up = await blobPut(`kangatodo/${rnd(12)}.jpg`, bytes, m[1]);
    const rec = { url: up.url, at: Date.now(), choreId: target.id, summary: target.summary,
                  categoryId: kid.categoryId, child: kid.name };
    await setJSON(photoKey(target.id), rec, PHOTO_DAYS * 86400 + 3600);
    // Retention queue — the cron deletes the actual blob when this comes due.
    await redis('ZADD', K('photoq'), String(Date.now() + PHOTO_DAYS * 86400000),
                JSON.stringify({ url: up.url, choreId: target.id })).catch(() => {});

    // Now the job may complete.
    await skySetStatus(f.id, target.id, 'complete');
    await redis('SREM', K('ack'), String(target.id)).catch(() => {});
    await redis('SADD', K('acked'), String(target.id)).catch(() => {});
    await redis('EXPIRE', K('acked'), 172800).catch(() => {});

    await queueParentAlert({ child: kid.name, summary: target.summary,
                             choreId: target.id, photo: up.url, at: Date.now() });
    return { ok: true, photo: up.url, done: true };
  }

  /* --------------------------------------------- finished-alerts (parent) */

  if (op === 'parent.push') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const sub = b.subscription;
    if (!sub || !sub.endpoint || !sub.keys || !sub.keys.p256dh || !sub.keys.auth) {
      return { ok: false, reason: 'bad_subscription' };
    }
    const id = rnd(12);
    await setJSON(K('parentpush:' + id), {
      endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, at: Date.now(),
    });
    await redis('SADD', K('parentpushids'), id).catch(() => {});
    return { ok: true, devices: await redis('SCARD', K('parentpushids')).catch(() => 1) };
  }

  if (op === 'parent.unpush') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const ids = await redis('SMEMBERS', K('parentpushids')).catch(() => []);
    for (const id of (ids || [])) await redis('DEL', K('parentpush:' + id)).catch(() => {});
    await redis('DEL', K('parentpushids')).catch(() => {});
    return { ok: true, removed: (ids || []).length };
  }

  if (op === 'photos') {
    requireParent();
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const raw = await redis('LRANGE', K('finished'), '0', '49').catch(() => []);
    return { ok: true, photoDays: PHOTO_DAYS,
             finished: (raw || []).map((x) => { try { return JSON.parse(x); } catch { return null; } })
                                  .filter(Boolean) };
  }

  return { ok: false, reason: 'unknown_op', detail: op };
}
