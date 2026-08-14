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

/**
 * The parent PIN is now PER HOUSEHOLD, not one global env var.
 *
 * It was `PARENT_PIN` when this ran on a single Skylight account. With many
 * families on one deployment a shared PIN is meaningless, so each household
 * carries its own — stored only as a salted hash, never in the clear, so a
 * dump of the store does not hand anyone a working PIN.
 *
 * The PIN is a SECOND lock, not the first. The household token already
 * authenticates the family; the PIN stops a kid picking up a parent's unlocked
 * phone and assigning themselves nothing. Optional by design — a parent who
 * doesn't want one shouldn't be forced to invent one.
 */
function pinHash(hhId, pin) {
  return crypto.createHash('sha256').update(hhId + ':' + String(pin)).digest('hex');
}
function pinOk(H, pin) {
  if (!H || !H.pin) return true;                     // no PIN set = no lock
  if (pin === undefined || pin === null || pin === '') return false;
  return safeEqual(pinHash(H.id, pin), H.pin);
}
const isPin = (p) => /^[0-9]{4,8}$/.test(String(p || ''));

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

async function skyAuthorize(email, password) {
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
    body: new URLSearchParams({ authenticity_token: csrf, email, password }),
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
    __email: email,
  });
}

async function skyToken(extra) {
  const email = extra.__email; delete extra.__email;
  const body = new URLSearchParams({
    client_id: SKY_CLIENT_ID,
    scope: SKY_SCOPE,
    skylight_api_client_device_fingerprint: deviceFingerprint(email),
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
function deviceFingerprint(email) {
  const seed = crypto.createHash('sha256').update('kangatodo|' + (email || 'default')).digest('hex');
  const h = seed.replace(/[^a-f0-9]/gi, '').padEnd(32, '0').slice(0, 32);
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20,32)}`;
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

/* ============================================================== kid links == */
//
// A child device holds one opaque token. The token — not the request — decides
// which category the device may see. This is the whole security model.

const kidKey   = (token) => K('kid:' + token);   // value carries its own householdId
const codeKey  = (code)  => K('code:' + code.toUpperCase());
const childKey = (hh, cid) => K('hh:' + hh + ':child:' + cid);

async function resolveKid(token) {
  if (!token || typeof token !== 'string' || token.length < 20) return null;
  const kid = await getJSON(kidKey(token));
  if (!kid) return null;
  await redis('SET', kidKey(token), JSON.stringify({ ...kid, seen: Date.now() })).catch(() => {});
  return kid;
}



/* ============================================================= households == */
//
// One household = one family that signed in with their own Skylight login.
// THE PASSWORD IS NEVER STORED. It is used once to complete Skylight's OAuth
// flow; only the refresh token comes back, and only that is kept. Signing out
// deletes it. Each household's data is namespaced by its own id, so one family
// can never see another's — the same rule the kid tokens follow.

const hhKey = (id) => K('hh:' + id);

async function household(id) {
  if (!id || typeof id !== 'string' || id.length < 20) return null;
  if (!storeReady()) return null;
  return await getJSON(hhKey(id)).catch(() => null);
}

/** Access token for THIS household, refreshing when it has aged out. */
async function hhAccess(H, force) {
  if (!H) throw new SkylightError('not_connected', 'this family has not signed in yet');
  if (!force && H.access_token && H.expires_at > Date.now()) return H.access_token;
  if (H.refresh_token) {
    try {
      const t = await skyToken({ grant_type: 'refresh_token', refresh_token: H.refresh_token, __email: H.email });
      Object.assign(H, t);
      await setJSON(hhKey(H.id), H);
      return t.access_token;
    } catch { /* refresh tokens rotate and expire — fall through */ }
  }
  throw new SkylightError('signed_out', 'Skylight signed this family out — sign in again');
}

/** Authenticated Skylight call ON BEHALF OF one household. */
async function skyH(H, path, { method = 'GET', body, retry = true } = {}) {
  const token = await hhAccess(H, false);
  const headers = { authorization: `Bearer ${token}`, accept: 'application/json',
                    'skylight-api-version': SKY_API_VER };
  if (body !== undefined) headers['content-type'] = 'application/json';
  const r = await fetch(SKY_BASE + path, { method, headers,
    body: body === undefined ? undefined : JSON.stringify(body) });
  if (r.status === 401 && retry) { await hhAccess(H, true); return skyH(H, path, { method, body, retry: false }); }
  if (r.status === 429) throw new SkylightError('skylight_rate_limited', `retry after ${r.headers.get('retry-after') || '?'}s`, 429);
  if (!r.ok) throw new SkylightError('skylight_error', (await r.text().catch(() => '')).slice(0, 300), r.status);
  const raw = await r.text();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { throw new SkylightError('skylight_changed', 'response was not JSON', r.status); }
}

async function hhFrame(H) {
  if (H.frameId) return { id: H.frameId, name: H.frameName, tz: H.tz, plus: H.plus };
  const j = await skyH(H, '/api/frames');
  const first = j && j.data && j.data[0];
  if (!first) throw new SkylightError('skylight_no_frame', 'this Skylight account has no frames');
  const a = first.attributes || {};
  H.frameId = String(first.id); H.frameName = a.name || 'Home';
  H.tz = a.timezone || 'UTC'; H.plus = !!a.plus;
  await setJSON(hhKey(H.id), H);
  return { id: H.frameId, name: H.frameName, tz: H.tz, plus: H.plus };
}

async function hhChildren(H, frameId) {
  const j = await skyH(H, `/api/frames/${frameId}/categories`);
  return (j.data || []).map((c) => ({
    categoryId: String(c.id),
    name: (c.attributes || {}).label || 'Unnamed',
    color: (c.attributes || {}).color || '#8a7a5c',
    isPerson: !!(c.attributes || {}).linked_to_profile,
    photo: (c.attributes || {}).profile_pic_url || null,
  })).filter((c) => c.isPerson);
}

async function hhChores(H, frameId, { from, to } = {}) {
  const q = new URLSearchParams();
  if (from) q.set('after', from);
  if (to) q.set('before', to);
  q.set('include_late', 'true');
  const j = await skyH(H, `/api/frames/${frameId}/chores?${q}`);
  const idx = {};
  for (const inc of (j.included || [])) if (inc.type === 'category') idx[String(inc.id)] = (inc.attributes || {}).label || null;
  return (j.data || []).map((c) => normaliseChore(c, idx));
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
      'x-access': 'private',                 // a child's photo is never readable by URL alone
      'x-cache-control-max-age': String(PHOTO_DAYS * 86400),
    },
    body: bytes,
  });
  const text = await r.text();
  if (!r.ok) throw new SkylightError('photo_store_failed', text.slice(0, 200), r.status);
  try { return JSON.parse(text); }
  catch { throw new SkylightError('photo_store_failed', 'upload response was not JSON', r.status); }
}

/**
 * Read a private blob back. The store is PRIVATE, so the URL alone is useless —
 * every read carries the token and therefore has to go through this server,
 * which is the point: the same ownership checks that guard the rest of the app
 * guard the photograph too. A leaked link is not a leaked photo.
 */
async function blobGet(url) {
  const r = await fetch(url, { headers: { authorization: `Bearer ${BLOB_TOKEN}` } });
  if (!r.ok) throw new SkylightError('photo_unreadable', 'blob read ' + r.status, r.status);
  const buf = Buffer.from(await r.arrayBuffer());
  return { bytes: buf, type: r.headers.get('content-type') || 'image/jpeg' };
}

const proofSetKey = (hh) => K('hh:' + hh + ':proofset');   // chore GROUPs needing a photo
const photoKey  = (hh, choreId) => K('hh:' + hh + ':photo:' + choreId);

/** Which of these chore groups need a photo? One round trip, not N. */
async function proofGroups(hh) {
  if (!storeReady()) return new Set();
  const m = await redis('SMEMBERS', proofSetKey(hh)).catch(() => []);
  return new Set((m || []).map(String));
}

/** Attach needsProof + any photo already taken. */
async function decorate(hh, chores) {
  if (!storeReady() || !chores.length) return chores;
  const need = await proofGroups(hh);
  const withProof = chores.filter((c) => need.has(String(c.group)));
  const photos = {};
  for (const c of withProof) {
    const p = await getJSON(photoKey(hh, c.id)).catch(() => null);
    if (p) photos[c.id] = p;
  }
  for (const c of chores) {
    c.needsProof = need.has(String(c.group));
    // The store is PRIVATE — the URL is useless without the token, so we do not
    // ship it to the browser at all. `photo:true` means "ask for it", and the
    // photo.view op below re-checks who is asking before handing the bytes over.
    c.photo = photos[c.id] ? true : null;
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
  // Per household. A shared list would mean one family's evening summary named
  // another family's children — the digest is grouped by kid name, so it would
  // have leaked across households the moment two families used one deployment.
  const day = new Date().toISOString().slice(0, 10);
  await redis('LPUSH', K('digest:' + entry.hh + ':' + day), JSON.stringify(entry)).catch(() => {});
  await redis('SADD', K('digestdays:' + day), entry.hh).catch(() => {});
  await redis('EXPIRE', K('digestdays:' + day), '172800').catch(() => {});
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
  const H = await household(b.hh);          // the signed-in family, or null

  /* ---------------------------------------------------------- status ---- */
  if (op === 'status') {
    const st = {
      ok: true,
      store: storeReady(),
      push: !!((process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) || storeReady()),
      photos: blobReady(),
      photoDays: PHOTO_DAYS,
      vapidPublicKey: await vapidPublicKey(),
      // Text backup is the fallback, not the main road. Reported honestly so the
      // app can say "Text backup off" instead of implying a message will arrive.
      sms: !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM),
      signedIn: !!H,
      pinSet: !!(H && H.pin),
    };
    if (H) {
      try {
        const f = await hhFrame(H);
        st.connected = true;
        st.email = H.email;
        st.frame = { id: f.id, name: f.name, plus: !!f.plus, tz: f.tz };
      } catch (e) {
        st.connected = false;
        st.skylightReason = e.reason || 'error';
        st.skylightDetail = e.detail || '';
      }
    } else st.connected = false;
    return st;
  }

  /* --------------------------------------------------- sign in / out ---- */

  if (op === 'parent.connect') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const email = String(b.email || '').trim();
    const password = String(b.password || '');
    if (!email || !password) return { ok: false, reason: 'need_login' };

    // One use only. We exchange it for a token and never write it anywhere.
    const t = await skyAuthorize(email, password);

    const id = rnd(24);
    const rec = { id, email, ...t, at: Date.now() };
    // A deployment-wide PARENT_PIN still seeds the first lock, so the original
    // single-account setup keeps behaving exactly as it did. Families who sign
    // up on a deployment without one simply start unlocked and can set their own.
    if (isPin(process.env.PARENT_PIN)) rec.pin = pinHash(id, process.env.PARENT_PIN);
    await setJSON(hhKey(id), rec);
    let frame = null;
    try { frame = await hhFrame(rec); } catch {}
    return { ok: true, hh: id, email, frame };
  }

  if (op === 'parent.disconnect') {
    if (!H) return { ok: true, removed: 0 };
    // Take every kid phone with it — their tokens point at this household.
    const kids = await redis('SMEMBERS', K('hh:' + H.id + ':kids')).catch(() => []);
    for (const t of (kids || [])) await redis('DEL', kidKey(t)).catch(() => {});
    await redis('DEL', K('hh:' + H.id + ':kids')).catch(() => {});
    await redis('DEL', hhKey(H.id)).catch(() => {});
    return { ok: true, removed: (kids || []).length, signedOut: true };
  }

  const needH = () => { if (!H) throw new SkylightError('not_connected', 'sign in with Skylight first', 401); return H; };

  // Every parent-side op goes through here. `locked` is a plain answer, not an
  // error, so the app can show a keypad instead of an alarming failure.
  const gate = () => {
    needH();
    if (!pinOk(H, b.pin)) throw new SkylightError('locked', 'that PIN did not match', 401);
    return H;
  };

  /* --------------------------------------------------------- the PIN ---- */
  //
  // Set, change, or clear this family's parent PIN. Changing or clearing needs
  // the current one, so someone holding a borrowed phone can't lock the parent
  // out of their own household.
  if (op === 'parent.pin') {
    gate();                                   // proves they know the current PIN
    const next = b.newPin === null || b.newPin === '' ? null : String(b.newPin || '');
    if (next !== null && !isPin(next)) return { ok: false, reason: 'bad_pin', detail: '4 to 8 digits' };
    const rec = { ...H };
    if (next === null) delete rec.pin; else rec.pin = pinHash(H.id, next);
    await setJSON(hhKey(H.id), rec);
    return { ok: true, pinSet: !!rec.pin };
  }

  /* ------------------------------------------------------- parent side --- */

  if (op === 'children') {
    gate();
    const f = await hhFrame(H);
    const kids = await hhChildren(H, f.id);
    for (const k of kids) {
      const rec = await getJSON(childKey(H.id, k.categoryId)).catch(() => null);
      k.linked  = !!(rec && rec.devices && rec.devices.length);
      k.devices = rec ? (rec.devices || []).length : 0;
      k.phone   = rec && rec.phone ? String(rec.phone).replace(/\d(?=\d{4})/g, '•') : null;
    }
    return { ok: true, frame: f, children: kids };
  }

  if (op === 'chores') {
    gate();
    const f = await hhFrame(H);
    const from = b.from || todayISO(f.tz);
    const to   = b.to   || from;
    return { ok: true, from, to, chores: await decorate(H.id, await hhChores(H, f.id, { from, to })) };
  }

  if (op === 'chore.create') {
    gate();
    if (!b.summary || !String(b.summary).trim()) return { ok: false, reason: 'no_summary' };
    if (!b.categoryId) return { ok: false, reason: 'no_child' };
    const f = await hhFrame(H);
    const j = await skyH(H, `/api/frames/${f.id}/chores/create_multiple`, { method: 'POST', body: {
      summary: String(b.summary).trim().slice(0, 200),
      start: b.date || todayISO(f.tz),
      start_time: b.time || null,
      recurring: !!b.recurring,
      recurrence_set: b.recurrence_set || null,
      recurring_until: b.until || null,
      routine: true,
      reward_points: b.points ?? null,
      emoji_icon: b.emoji || null,
      category_id: String(b.categoryId),
      category_ids: [String(b.categoryId)],
    }});
    const made = ((j && j.data) || []).map((c) => normaliseChore(c, null));

    if (made.length) {
      const grp = String(made[0].group);
      if (b.needsProof) await redis('SADD', proofSetKey(H.id), grp).catch(() => {});
      else              await redis('SREM', proofSetKey(H.id), grp).catch(() => {});
      await redis('LPUSH', K('alerts'), JSON.stringify({
        at: Date.now(), hh: H.id, categoryId: String(b.categoryId),
        choreId: made[0].id, summary: made[0].summary, time: made[0].time, date: made[0].date,
      })).catch(() => {});
      await redis('LTRIM', K('alerts'), 0, 499).catch(() => {});
    }
    return { ok: true, created: made, queuedAlert: true };
  }

  if (op === 'chore.complete') {
    gate();
    const f = await hhFrame(H);
    await skyH(H, `/api/frames/${f.id}/chores/${encodeURIComponent(b.choreId)}`,
               { method: 'PUT', body: { status: b.done === false ? 'pending' : 'complete' } });
    return { ok: true };
  }

  if (op === 'chore.delete') {
    gate();
    const f = await hhFrame(H);
    await skyH(H, `/api/frames/${f.id}/chores/${encodeURIComponent(b.choreId)}${b.all !== false ? '?apply_to=all' : ''}`,
               { method: 'DELETE' });
    return { ok: true };
  }

  /* ------------------------------------------------ looking at a photo --- */
  //
  // The blob store is PRIVATE, so a photograph of a child can only be read by
  // this server, holding the token. That makes the ownership check unavoidable
  // rather than advisory: a parent may see any photo in THEIR household, and a
  // kid may see only their own. Bytes come back as a data URL so the browser
  // never touches the store directly.
  if (op === 'photo.view') {
    const choreId = String(b.choreId || '');
    if (!choreId) return { ok: false, reason: 'no_chore' };
    if (!blobReady()) return { ok: false, reason: 'no_photo_store' };

    let hhId = null;
    if (b.token) {
      const kid = await resolveKid(b.token);
      if (!kid) return { ok: false, reason: 'bad_token' };
      const KH = await household(kid.hh);
      if (!KH) return { ok: false, reason: 'not_connected' };
      const f = await hhFrame(KH);
      const mine = await hhChores(KH, f.id, { from: todayISO(f.tz), to: todayISO(f.tz) });
      // A sibling cannot read another child's photo by guessing a chore id.
      if (!mine.some((c) => String(c.id) === choreId && String(c.categoryId) === String(kid.categoryId)))
        return { ok: false, reason: 'not_yours' };
      hhId = kid.hh;
    } else {
      gate();                       // parent side: signed in, and past the PIN
      hhId = H.id;
    }

    const rec = await getJSON(photoKey(hhId, choreId)).catch(() => null);
    if (!rec || !rec.url) return { ok: false, reason: 'no_photo' };
    const got = await blobGet(rec.url);
    return { ok: true, dataUrl: `data:${got.type};base64,` + got.bytes.toString('base64'), at: rec.at };
  }

  /* --------------------------------------------------- linking a child --- */

  if (op === 'child.code') {
    gate();
    if (!b.categoryId) return { ok: false, reason: 'no_child' };
    const f = await hhFrame(H);
    const kid = (await hhChildren(H, f.id)).find((k) => k.categoryId === String(b.categoryId));
    if (!kid) return { ok: false, reason: 'unknown_child' };

    const rec = (await getJSON(childKey(H.id, kid.categoryId))) || { devices: [] };
    if (rec.code) await redis('DEL', codeKey(rec.code)).catch(() => {});
    const code = joinCode(6);
    Object.assign(rec, { code, name: kid.name, color: kid.color });
    await setJSON(childKey(H.id, kid.categoryId), rec);
    await setJSON(codeKey(code), { hh: H.id, categoryId: kid.categoryId, name: kid.name, color: kid.color }, 3600);
    return { ok: true, code, expiresInMinutes: 60, child: kid.name };
  }

  if (op === 'child.phone') {
    gate();
    const digits = String(b.phone || '').replace(/[^\d+]/g, '');
    const rec = (await getJSON(childKey(H.id, String(b.categoryId)))) || { devices: [] };
    if (!digits) delete rec.phone;
    else {
      if (!/^\+?\d{10,15}$/.test(digits)) return { ok: false, reason: 'bad_phone' };
      rec.phone = digits.startsWith('+') ? digits : '+1' + digits;
    }
    await setJSON(childKey(H.id, String(b.categoryId)), rec);
    return { ok: true, phone: rec.phone ? rec.phone.replace(/\d(?=\d{4})/g, '•') : null };
  }

  if (op === 'child.unlink') {
    gate();
    const rec = await getJSON(childKey(H.id, String(b.categoryId)));
    if (!rec) return { ok: true, removed: 0 };
    let n = 0;
    for (const d of (rec.devices || [])) { await redis('DEL', kidKey(d.token)).catch(() => {}); n++; }
    rec.devices = [];
    if (rec.code) { await redis('DEL', codeKey(rec.code)).catch(() => {}); delete rec.code; }
    await setJSON(childKey(H.id, String(b.categoryId)), rec);
    return { ok: true, removed: n };
  }

  if (op === 'parent.push') {
    gate();
    const sub = b.subscription;
    if (!sub || !sub.endpoint || !sub.keys) return { ok: false, reason: 'bad_subscription' };
    const pid = rnd(12);
    await setJSON(K('hh:' + H.id + ':parentpush:' + pid),
      { endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth, at: Date.now() });
    await redis('SADD', K('hh:' + H.id + ':parentpushids'), pid).catch(() => {});
    return { ok: true };
  }

  /* ------------------------------------------------------- child side ---- */

  if (op === 'kid.join') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (code.length !== 6) return { ok: false, reason: 'bad_code' };
    const claim = await getJSON(codeKey(code));
    if (!claim) return { ok: false, reason: 'bad_code' };

    const token = rnd(32);
    await setJSON(kidKey(token), { hh: claim.hh, categoryId: claim.categoryId,
                                   name: claim.name, color: claim.color, since: Date.now() });
    const rec = (await getJSON(childKey(claim.hh, claim.categoryId))) || { devices: [] };
    rec.devices = rec.devices || [];
    rec.devices.push({ token, since: Date.now(), label: String(b.device || 'phone').slice(0, 40) });
    delete rec.code;
    await setJSON(childKey(claim.hh, claim.categoryId), rec);
    await redis('SADD', K('hh:' + claim.hh + ':kids'), token).catch(() => {});
    await redis('DEL', codeKey(code)).catch(() => {});
    return { ok: true, token, name: claim.name, color: claim.color };
  }

  // Every child op resolves the household FROM THE TOKEN — never from the request.
  const kidCtx = async () => {
    const kid = await resolveKid(b.token);
    if (!kid) return null;
    const KH = await household(kid.hh);
    if (!KH) return null;
    return { kid, H: KH };
  };

  if (op === 'kid.mine') {
    const c = await kidCtx();
    if (!c) return { ok: false, reason: 'not_linked' };
    const f = await hhFrame(c.H);
    const day = b.date || todayISO(f.tz);
    const mine = (await hhChores(c.H, f.id, { from: day, to: day }))
      .filter((x) => x.categoryId === c.kid.categoryId)
      .sort((a, z) => (a.time || '99:99').localeCompare(z.time || '99:99') || a.position - z.position);
    await decorate(c.H.id, mine);
    return { ok: true, name: c.kid.name, color: c.kid.color, date: day,
             chores: mine, done: mine.filter((x) => x.done).length, total: mine.length };
  }

  if (op === 'kid.done') {
    const c = await kidCtx();
    if (!c) return { ok: false, reason: 'not_linked' };
    const f = await hhFrame(c.H);
    const day = (String(b.choreId || '').match(/-(\d{4}-\d{2}-\d{2})-/) || [])[1] || todayISO(f.tz);
    const target = (await hhChores(c.H, f.id, { from: day, to: day })).find((x) => x.id === String(b.choreId));
    if (!target) return { ok: false, reason: 'unknown_chore' };
    if (target.categoryId !== c.kid.categoryId) return { ok: false, reason: 'not_yours' };

    if (b.done !== false) {
      const need = await proofGroups(c.H.id);
      if (need.has(String(target.group)) && !(await getJSON(photoKey(c.H.id, target.id)).catch(() => null)))
        return { ok: false, reason: 'needs_photo', summary: target.summary };
    }
    await skyH(c.H, `/api/frames/${f.id}/chores/${encodeURIComponent(target.id)}`,
               { method: 'PUT', body: { status: b.done === false ? 'pending' : 'complete' } });
    await redis('SADD', K('acked'), String(target.id)).catch(() => {});
    await redis('EXPIRE', K('acked'), 172800).catch(() => {});
    if (b.done !== false) await queueParentAlert({ hh: c.H.id, child: c.kid.name, summary: target.summary,
                                                   choreId: target.id, photo: null, at: Date.now() });
    return { ok: true, done: b.done !== false };
  }

  if (op === 'kid.proof') {
    if (!blobReady()) return { ok: false, reason: 'no_photo_store' };
    const c = await kidCtx();
    if (!c) return { ok: false, reason: 'not_linked' };
    const m = String(b.image || '').match(/^data:(image\/(?:jpeg|png|webp));base64,(.+)$/);
    if (!m) return { ok: false, reason: 'bad_image' };
    const bytes = Buffer.from(m[2], 'base64');
    if (bytes.length > 1_500_000) return { ok: false, reason: 'image_too_big' };

    const f = await hhFrame(c.H);
    const day = (String(b.choreId || '').match(/-(\d{4}-\d{2}-\d{2})-/) || [])[1] || todayISO(f.tz);
    const target = (await hhChores(c.H, f.id, { from: day, to: day })).find((x) => x.id === String(b.choreId));
    if (!target) return { ok: false, reason: 'unknown_chore' };
    if (target.categoryId !== c.kid.categoryId) return { ok: false, reason: 'not_yours' };

    const up = await blobPut(`kangatodo/${rnd(12)}.jpg`, bytes, m[1]);
    await setJSON(photoKey(c.H.id, target.id), { url: up.url, at: Date.now(), choreId: target.id,
      summary: target.summary, child: c.kid.name }, PHOTO_DAYS * 86400 + 3600);
    await redis('ZADD', K('photoq'), String(Date.now() + PHOTO_DAYS * 86400000),
      JSON.stringify({ url: up.url, choreId: target.id, hh: c.H.id })).catch(() => {});

    await skyH(c.H, `/api/frames/${f.id}/chores/${encodeURIComponent(target.id)}`,
               { method: 'PUT', body: { status: 'complete' } });
    await redis('SADD', K('acked'), String(target.id)).catch(() => {});
    await queueParentAlert({ hh: c.H.id, child: c.kid.name, summary: target.summary,
                             choreId: target.id, photo: up.url, at: Date.now() });   // server-side only
    return { ok: true, photo: true, done: true };
  }

  if (op === 'kid.push') {
    const c = await kidCtx();
    if (!c) return { ok: false, reason: 'not_linked' };
    const sub = b.subscription;
    if (!sub || !sub.endpoint || !sub.keys) return { ok: false, reason: 'bad_subscription' };
    await setJSON(K('push:' + b.token), { endpoint: sub.endpoint, p256dh: sub.keys.p256dh,
      auth: sub.keys.auth, hh: c.H.id, categoryId: c.kid.categoryId, name: c.kid.name, at: Date.now() });
    return { ok: true };
  }

  return { ok: false, reason: 'unknown_op', detail: op };
}
