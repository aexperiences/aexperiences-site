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

  // NOTE, learned from the FIRST real sign-in (Aug 14 2026): this URL must NOT
  // carry `prompt=login`. That parameter orders Skylight to demand a login on
  // EVERY authorize — including the replay after we have just logged in — so
  // step 4 bounced back to the login form instead of issuing a code, and the
  // very first real user saw "no authorization code returned". An
  // unauthenticated authorize lands on the login form anyway; the flag bought
  // nothing and broke everything.
  const authUrl = `${SKY_BASE}/oauth/authorize?` + new URLSearchParams({
    client_id: SKY_CLIENT_ID,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    redirect_uri: SKY_REDIRECT,
    response_type: 'code',
    scope: SKY_SCOPE,
    state,
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
  // Rails 302s on FAILURE too — straight back to the login form. Learned by
  // probing the live server with deliberately wrong credentials: without this
  // check a typo'd password reads as "Skylight changed something", which sends
  // a parent hunting for an outage instead of retyping their password.
  {
    const dest = new URL(r.headers.get('location') || '/', SKY_BASE);
    if (dest.pathname.startsWith('/auth/session'))
      throw new SkylightError('skylight_bad_login', 'Skylight rejected the email or password', r.status);
  }

  // 4 — catch the code. Rails remembers where you were going, so the login's
  // own redirect chain often delivers it; we walk that first (staying on
  // Skylight's host), and only then replay the authorize ourselves.
  const codeFrom = (loc) => {
    if (!loc) return null;
    const u = new URL(loc, SKY_BASE);
    if (!(SKY_REDIRECT.startsWith(u.origin) && SKY_REDIRECT.includes(u.pathname))) return null;
    return u.searchParams;
  };
  let got = codeFrom(r.headers.get('location'));
  let hop = r.headers.get('location'); let lastLoc = hop;
  for (let i = 0; i < 3 && !got && hop; i++) {
    const u = new URL(hop, SKY_BASE);
    if (u.origin !== SKY_BASE) break;                    // left their app — stop walking
    r = await fetch(u, { redirect: 'manual', headers: { accept: 'text/html', cookie: jarHeader(jar) } });
    jarPut(jar, readSetCookie(r));
    hop = r.headers.get('location'); if (hop) lastLoc = hop;
    got = codeFrom(hop);
  }
  if (!got) {
    r = await fetch(authUrl, { redirect: 'manual', headers: { accept: 'text/html', cookie: jarHeader(jar) } });
    jarPut(jar, readSetCookie(r));
    const back = r.headers.get('location') || ''; if (back) lastLoc = back;
    got = codeFrom(back);
  }
  if (!got || !got.get('code')) {
    // Say WHERE it bounced — host and path only, never the query, so a token
    // or code can never end up in an error message.
    let where = 'nowhere';
    try { const u = new URL(lastLoc || '', SKY_BASE); where = u.origin + u.pathname; } catch {}
    throw new SkylightError('skylight_changed', 'no authorization code returned (redirected to ' + where + ')', r.status);
  }
  const code = got.get('code');
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



/* ============================================================== grown-ups == */
//
// More than one parent. Mum's phone, Dad's phone, a grandparent, a co-parent in
// another house — all on the same household.
//
// The household id alone used to be the whole credential, which meant "whoever
// has the link is in, forever". So each grown-up device also carries its own
// `pdev` token, and the household keeps the set of tokens it trusts. Removing a
// phone is then a real revocation: it still knows the household id, and it is
// still locked out on the next request.
//
// Households created before this existed have an EMPTY set and keep working
// exactly as they did — the check only bites once there is a set to check.

const pdevKey  = (hh)   => K('hh:' + hh + ':pdev');
const pdevInfo = (hh,d) => K('hh:' + hh + ':pdev:' + d);
const pcodeKey = (code) => K('pcode:' + String(code).toUpperCase());

async function addParentDevice(hh, label) {
  const d = rnd(16);
  await redis('SADD', pdevKey(hh), d).catch(() => {});
  await setJSON(pdevInfo(hh, d), { id: d, label: String(label || 'This phone').slice(0, 30), at: Date.now() });
  return d;
}

/** Empty set = an old household, so nothing to enforce yet. */
async function parentDeviceOk(H, pdev) {
  const set = await redis('SMEMBERS', pdevKey(H.id)).catch(() => []);
  if (!set || !set.length) return true;
  return !!pdev && set.includes(String(pdev));
}

/* ============================================================ own store == */
//
// "Just use it" mode. Skylight is a $200 device; requiring one to type a chore
// made the app useless to most families who want it. So a household can also
// live entirely here: the parent adds their own kids and their own jobs, and
// EVERYTHING else — join codes, per-kid isolation, buzzing, photo proof, the
// PIN, the evening digest, delete-everything — is untouched, because none of it
// ever cared where the list came from.
//
// A household is `mode:'local'` or `mode:'skylight'`. The four functions below
// are the only place that difference exists; every op above calls them and
// stays ignorant.

// A household is local ONLY if it says so. This used to also treat "no refresh
// token" as local, which meant a real Skylight family whose token response
// omitted a refresh_token was silently downgraded to a local household — and
// their kids, which live in Skylight, vanished. (Found 15 Aug 2026 when
// Anthony's wife connected successfully and saw no children.)
const isLocal   = (H) => !H || H.mode === 'local' || (!H.mode && !H.refresh_token);
const kidsKey   = (hh)      => K('hh:' + hh + ':kidlist');
const personKey = (hh, cid) => K('hh:' + hh + ':person:' + cid);
const choreKey  = (hh, id)  => K('hh:' + hh + ':chore:' + id);
const dayKey    = (hh, d)   => K('hh:' + hh + ':day:' + d);

const KID_COLORS = ['#915EA1','#CB434C','#2F7DB5','#3C7C53','#C1622B','#8A5A9E','#B7433F','#2F6E8F'];

async function localChildren(H) {
  const ids = await redis('SMEMBERS', kidsKey(H.id)).catch(() => []);
  const out = [];
  for (const cid of (ids || [])) {
    const p = await getJSON(personKey(H.id, cid)).catch(() => null);
    if (p) out.push({ categoryId: String(cid), name: p.name, color: p.color, isPerson: true, photo: null });
  }
  return out.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
}

/** Every chore filed under each day in the range. Cheap, and range reads are
 *  the only read the app ever does. */
async function localChores(H, { from, to } = {}) {
  const days = [];
  const start = new Date((from || todayISO(H.tz)) + 'T12:00:00');
  const end   = new Date((to   || from || todayISO(H.tz)) + 'T12:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) days.push(d.toISOString().slice(0, 10));
  const names = {};
  for (const c of await localChildren(H)) names[c.categoryId] = c.name;
  const out = [];
  for (const day of days) {
    const ids = await redis('SMEMBERS', dayKey(H.id, day)).catch(() => []);
    for (const id of (ids || [])) {
      const c = await getJSON(choreKey(H.id, id)).catch(() => null);
      if (c) out.push({ ...c, childName: names[c.categoryId] || null });
    }
  }
  return out.sort((a, b) => (a.time || '').localeCompare(b.time || '') || (a.position - b.position));
}

async function localCreateChore(H, b) {
  const date = b.date || todayISO(H.tz);
  const id = 'L' + rnd(14);
  const chore = {
    id, group: id,
    summary: String(b.summary).trim().slice(0, 200),
    status: 'pending', done: false,
    date, time: b.time || null,
    recurring: false, points: b.points ?? null,
    emoji: b.emoji || null, position: Date.now() % 100000,
    categoryId: String(b.categoryId),
  };
  await setJSON(choreKey(H.id, id), chore);
  await redis('SADD', dayKey(H.id, date), id).catch(() => {});
  return [chore];
}

async function localSetDone(H, choreId, done) {
  const c = await getJSON(choreKey(H.id, choreId)).catch(() => null);
  if (!c) throw new SkylightError('no_such_job', 'that job is not here any more', 404);
  c.done = !!done; c.status = done ? 'complete' : 'pending';
  await setJSON(choreKey(H.id, choreId), c);
  return c;
}

async function localDeleteChore(H, choreId) {
  const c = await getJSON(choreKey(H.id, choreId)).catch(() => null);
  if (c) await redis('SREM', dayKey(H.id, c.date), choreId).catch(() => {});
  await redis('DEL', choreKey(H.id, choreId)).catch(() => {});
  await redis('DEL', photoKey(H.id, choreId)).catch(() => {});
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
  // A local household has no Skylight frame; it has a synthetic one so every
  // caller above can keep asking the same question.
  if (isLocal(H)) return { id: 'local', name: H.frameName || 'Home', tz: H.tz || 'UTC', plus: false, local: true };
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
  if (isLocal(H)) return await localChildren(H);
  const j = await skyH(H, `/api/frames/${frameId}/categories`);
  const all = (j.data || []).map((c) => {
    const a = c.attributes || {};
    return {
      categoryId: String(c.id),
      name: a.label || 'Unnamed',
      color: a.color || '#8a7a5c',
      // Skylight marks a person-category with linked_to_profile. Accept the
      // obvious aliases too — this is a private API and the field has moved
      // before.
      isPerson: !!(a.linked_to_profile ?? a.linkedToProfile ?? a.profile_id ?? a.profile),
      onChoreChart: !!(a.selected_for_chore_chart ?? a.selectedForChoreChart),
      photo: a.profile_pic_url || a.profilePicUrl || null,
    };
  });
  const people = all.filter((c) => c.isPerson);
  if (people.length) return people;
  // Nothing looked like a person. Rather than show a parent an empty house —
  // which reads as "this app cannot see my children" — offer what IS on the
  // chore chart, then anything at all, and let the UI say where it came from.
  const chart = all.filter((c) => c.onChoreChart);
  const fallback = (chart.length ? chart : all).map((c) => ({ ...c, isPerson: true, guessed: true }));
  return fallback;
}

async function hhChores(H, frameId, { from, to } = {}) {
  if (isLocal(H)) return await localChores(H, { from, to });
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

/**
 * Erase a household. EVERYTHING, not just the connection.
 *
 * A privacy page is only worth the paper if this function is honest, so it
 * deletes in this order: the photographs themselves (bytes out of Blob, not
 * just the pointer), then every per-child record and phone number, the kid
 * tokens, the parents' push subscriptions, the queued alerts and digest rows,
 * and finally the household with its Skylight refresh token. What survives is
 * nothing: signing in again starts from an empty house.
 */
async function forgetHousehold(H) {
  const hh = H.id;
  const out = { photos: 0, kids: 0, devices: 0 };

  /* 1. the photographs — bytes first, pointer after */
  const urls = [];
  const scan = await redis('KEYS', K('hh:' + hh + ':photo:*')).catch(() => []);
  for (const key of (scan || [])) {
    const rec = await getJSON(key).catch(() => null);
    if (rec && rec.url) urls.push(rec.url);
    await redis('DEL', key).catch(() => {});
  }
  if (urls.length && blobReady()) {
    await fetch('https://blob.vercel-storage.com/delete', {
      method: 'POST',
      headers: { authorization: `Bearer ${BLOB_TOKEN}`, 'content-type': 'application/json', 'x-api-version': '7' },
      body: JSON.stringify({ urls }),
    }).catch(() => {});
  }
  out.photos = urls.length;

  /* 2. the children — names, colours, phone numbers, device lists */
  const childKeys = await redis('KEYS', K('hh:' + hh + ':child:*')).catch(() => []);
  for (const key of (childKeys || [])) {
    const rec = await getJSON(key).catch(() => null);
    out.devices += rec && rec.devices ? rec.devices.length : 0;
    await redis('DEL', key).catch(() => {});
  }
  out.kids = (childKeys || []).length;

  /* 3. every kid phone that was ever joined */
  const toks = await redis('SMEMBERS', K('hh:' + hh + ':kids')).catch(() => []);
  for (const t of (toks || [])) await redis('DEL', kidKey(t)).catch(() => {});
  await redis('DEL', K('hh:' + hh + ':kids')).catch(() => {});

  /* 4. the parents' own push subscriptions */
  const pids = await redis('SMEMBERS', K('hh:' + hh + ':parentpushids')).catch(() => []);
  for (const id of (pids || [])) await redis('DEL', K('hh:' + hh + ':parentpush:' + id)).catch(() => {});
  await redis('DEL', K('hh:' + hh + ':parentpushids')).catch(() => {});

  /* 4b. a local household's own kids and jobs live here too */
  for (const pat of ['person:', 'chore:', 'day:']) {
    const keys = await redis('KEYS', K('hh:' + hh + ':' + pat + '*')).catch(() => []);
    for (const k of (keys || [])) await redis('DEL', k).catch(() => {});
  }
  await redis('DEL', K('hh:' + hh + ':kidlist')).catch(() => {});
  for (const d of (await redis('SMEMBERS', pdevKey(hh)).catch(() => []) || []))
    await redis('DEL', pdevInfo(hh, d)).catch(() => {});
  await redis('DEL', pdevKey(hh)).catch(() => {});

  /* 5. anything still queued that names this family */
  await redis('DEL', K('hh:' + hh + ':proofset')).catch(() => {});
  const digests = await redis('KEYS', K('digest:' + hh + ':*')).catch(() => []);
  for (const key of (digests || [])) await redis('DEL', key).catch(() => {});
  for (const list of ['finished', 'parentq']) {
    const rows = await redis('LRANGE', K(list), '0', '-1').catch(() => []);
    for (const raw of (rows || [])) {
      let e = null; try { e = JSON.parse(raw); } catch {}
      if (e && e.hh === hh) await redis('LREM', K(list), '0', raw).catch(() => {});
    }
  }

  /* 6. the household itself — and with it the Skylight refresh token */
  await redis('DEL', hhKey(hh)).catch(() => {});
  return { ...out, removed: (toks || []).length };
}

async function route(op, b, req) {
  const H = await household(b.hh);          // the signed-in family, or null
  // Which grown-up phone is this? Computed once, up here, because `status`
  // reports it and every parent op is gated on it.
  const deviceOk = H ? await parentDeviceOk(H, b.pdev) : true;

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
      mode: H ? (isLocal(H) ? 'local' : 'skylight') : null,
      pinSet: !!(H && H.pin),
      deviceOk,
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

  /* ---------------------------------------- start without Skylight ------ */
  //
  // No account, no password, no email. A household id is minted and lives in
  // the browser exactly like the Skylight one does. This is the front door for
  // every family that does not own a $200 calendar.
  if (op === 'parent.start') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const id = rnd(24);
    const rec = {
      id, mode: 'local', at: Date.now(),
      frameName: String(b.household || 'Home').trim().slice(0, 60) || 'Home',
      tz: String(b.tz || 'UTC').slice(0, 60),
    };
    if (isPin(process.env.PARENT_PIN)) rec.pin = pinHash(id, process.env.PARENT_PIN);
    await setJSON(hhKey(id), rec);
    const pdev = await addParentDevice(id, b.label);
    return { ok: true, hh: id, pdev, mode: 'local', frame: { id: 'local', name: rec.frameName, tz: rec.tz, local: true } };
  }

  if (op === 'parent.connect') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const email = String(b.email || '').trim();
    const password = String(b.password || '');
    if (!email || !password) return { ok: false, reason: 'need_login' };

    // One use only. We exchange it for a token and never write it anywhere.
    const t = await skyAuthorize(email, password);

    const id = rnd(24);
    const rec = { id, email, ...t, at: Date.now(), mode: 'skylight' };
    // A deployment-wide PARENT_PIN still seeds the first lock, so the original
    // single-account setup keeps behaving exactly as it did. Families who sign
    // up on a deployment without one simply start unlocked and can set their own.
    if (isPin(process.env.PARENT_PIN)) rec.pin = pinHash(id, process.env.PARENT_PIN);
    await setJSON(hhKey(id), rec);
    let frame = null;
    try { frame = await hhFrame(rec); } catch {}
    const pdev = await addParentDevice(id, b.label);
    return { ok: true, hh: id, pdev, email, frame };
  }

  if (op === 'parent.disconnect') {
    if (!H) return { ok: true, removed: 0 };
    return { ok: true, ...(await forgetHousehold(H)), signedOut: true };
  }

  // Same thing under the name a parent will look for. A privacy page that
  // promises deletion and a product that only "disconnects" would be a lie.
  if (op === 'parent.forget') {
    if (!H) return { ok: true, removed: 0 };
    return { ok: true, ...(await forgetHousehold(H)), signedOut: true, forgotten: true };
  }

  const needH = () => { if (!H) throw new SkylightError('not_connected', 'sign in with Skylight first', 401); return H; };

  // Every parent-side op goes through here. `locked` is a plain answer, not an
  // error, so the app can show a keypad instead of an alarming failure.
  const gate = () => {
    needH();
    if (!pinOk(H, b.pin)) throw new SkylightError('locked', 'that PIN did not match', 401);
    if (!deviceOk) throw new SkylightError('not_this_device', 'this phone was removed from the household', 401);
    return H;
  };

  /* ------------------------------------------------- kids, in own mode -- */
  if (op === 'child.add') {
    gate();
    if (!isLocal(H)) return { ok: false, reason: 'skylight_owns_kids' };
    const name = String(b.name || '').trim().slice(0, 40);
    if (!name) return { ok: false, reason: 'no_name' };
    const have = await localChildren(H);
    if (have.length >= 12) return { ok: false, reason: 'too_many_kids' };
    if (have.some((c) => c.name.toLowerCase() === name.toLowerCase()))
      return { ok: false, reason: 'name_taken' };
    const cid = 'c' + rnd(10);
    const color = /^#[0-9A-Fa-f]{6}$/.test(String(b.color || '')) ? b.color
                : KID_COLORS[have.length % KID_COLORS.length];
    await setJSON(personKey(H.id, cid), { categoryId: cid, name, color });
    await redis('SADD', kidsKey(H.id), cid).catch(() => {});
    return { ok: true, child: { categoryId: cid, name, color, isPerson: true, photo: null } };
  }

  if (op === 'child.remove') {
    gate();
    if (!isLocal(H)) return { ok: false, reason: 'skylight_owns_kids' };
    const cid = String(b.categoryId || '');
    if (!cid) return { ok: false, reason: 'no_child' };
    // their jobs go with them, and any photo attached to those jobs
    const days = await redis('KEYS', K('hh:' + H.id + ':day:*')).catch(() => []);
    let removed = 0;
    for (const dk of (days || [])) {
      const ids = await redis('SMEMBERS', dk).catch(() => []);
      for (const id of (ids || [])) {
        const c = await getJSON(choreKey(H.id, id)).catch(() => null);
        if (c && String(c.categoryId) === cid) { await localDeleteChore(H, id); removed++; }
      }
    }
    // and every phone that was joined to them
    const rec = await getJSON(childKey(H.id, cid)).catch(() => null);
    for (const d of ((rec && rec.devices) || [])) await redis('DEL', kidKey(d.token)).catch(() => {});
    await redis('DEL', childKey(H.id, cid)).catch(() => {});
    await redis('DEL', personKey(H.id, cid)).catch(() => {});
    await redis('SREM', kidsKey(H.id), cid).catch(() => {});
    return { ok: true, removedJobs: removed };
  }

  /* --------------------------------------------- what did Skylight say? -- */
  //
  // A read-only window for debugging a family whose kids do not appear. It
  // reports SHAPE, never content: counts, which attribute names came back, and
  // HTTP statuses. No child's name, colour or photo ever leaves this op, so it
  // is safe to read out over the phone or paste into a log.
  if (op === 'sky.debug') {
    gate();
    const out = { mode: isLocal(H) ? 'local' : 'skylight', hasRefreshToken: !!H.refresh_token };
    if (isLocal(H)) { out.note = 'This household is LOCAL — it is not talking to Skylight at all.'; return { ok: true, debug: out }; }
    try {
      const f = await hhFrame(H);
      out.frameId = f.id; out.frameName = f.name ? 'set' : 'missing'; out.plus = !!f.plus;
      const j = await skyH(H, `/api/frames/${f.id}/categories`);
      const rows = j.data || [];
      out.categoriesReturned = rows.length;
      out.attributeNames = [...new Set(rows.flatMap((c) => Object.keys(c.attributes || {})))].sort();
      out.withLinkedToProfile = rows.filter((c) => (c.attributes || {}).linked_to_profile).length;
      out.onChoreChart = rows.filter((c) => (c.attributes || {}).selected_for_chore_chart).length;
      out.types = [...new Set(rows.map((c) => c.type))];
    } catch (e) {
      out.categoriesError = e.reason || String(e.message || e);
    }
    // Probe the endpoints a person MIGHT live on now. Status codes only.
    for (const path of ['profiles', 'people', 'members', 'chore_chart']) {
      try {
        const f = await hhFrame(H);
        const r = await fetch(`${SKY_BASE}/api/frames/${f.id}/${path}`, {
          headers: { authorization: `Bearer ${await hhAccess(H, false)}`,
                     accept: 'application/json', 'skylight-api-version': SKY_API_VER },
        });
        let n = null;
        if (r.ok) { try { const jj = await r.json(); n = (jj.data || []).length; } catch {} }
        out['probe_' + path] = r.status + (n === null ? '' : ' · ' + n + ' rows');
      } catch (e) { out['probe_' + path] = 'threw'; }
    }
    return { ok: true, debug: out };
  }

  /* ------------------------------------------------- more grown-ups ----- */
  //
  // One code, one hour, one use. Same shape as a kid's join code, because the
  // parents in this house should not have to learn a second idea.
  if (op === 'parent.invite') {
    gate();
    const code = joinCode(6);
    await setJSON(pcodeKey(code), { hh: H.id, at: Date.now() }, 3600);
    return { ok: true, code, minutes: 60 };
  }

  if (op === 'parent.accept') {
    if (!storeReady()) return { ok: false, reason: 'no_kv' };
    const code = String(b.code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!code) return { ok: false, reason: 'no_code' };
    const claim = await getJSON(pcodeKey(code)).catch(() => null);
    if (!claim) return { ok: false, reason: 'bad_code' };
    const HH = await household(claim.hh);
    if (!HH) return { ok: false, reason: 'household_gone' };
    await redis('DEL', pcodeKey(code)).catch(() => {});          // one use
    const pdev = await addParentDevice(HH.id, b.label);
    return { ok: true, hh: HH.id, pdev, mode: isLocal(HH) ? 'local' : 'skylight',
             frame: { id: 'joined', name: HH.frameName || 'Home', tz: HH.tz || 'UTC' } };
  }

  if (op === 'parent.devices') {
    gate();
    const ids = await redis('SMEMBERS', pdevKey(H.id)).catch(() => []);
    const out = [];
    for (const d of (ids || [])) {
      const rec = await getJSON(pdevInfo(H.id, d)).catch(() => null);
      out.push({ id: d, label: (rec && rec.label) || 'A phone', at: (rec && rec.at) || null,
                 isYou: String(b.pdev || '') === d });
    }
    return { ok: true, devices: out.sort((a, z) => (a.at || 0) - (z.at || 0)) };
  }

  // A real revocation: that phone still knows the household id and is still out.
  if (op === 'parent.removedevice') {
    gate();
    const d = String(b.device || '');
    if (!d) return { ok: false, reason: 'no_device' };
    const ids = await redis('SMEMBERS', pdevKey(H.id)).catch(() => []);
    if ((ids || []).length <= 1) return { ok: false, reason: 'last_grownup' };
    await redis('SREM', pdevKey(H.id), d).catch(() => {});
    await redis('DEL', pdevInfo(H.id, d)).catch(() => {});
    return { ok: true, removedSelf: String(b.pdev || '') === d };
  }

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
    if (f.local) {
      const made = await localCreateChore(H, b);
      const grp = String(made[0].group);
      if (b.needsProof) await redis('SADD', proofSetKey(H.id), grp).catch(() => {});
      await redis('LPUSH', K('alerts'), JSON.stringify({
        at: Date.now(), hh: H.id, categoryId: String(b.categoryId),
        choreId: made[0].id, summary: made[0].summary, time: made[0].time, date: made[0].date,
      })).catch(() => {});
      await redis('LTRIM', K('alerts'), 0, 499).catch(() => {});
      return { ok: true, created: made, queuedAlert: true };
    }
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
    if (f.local) { await localSetDone(H, b.choreId, b.done !== false); return { ok: true }; }
    await skyH(H, `/api/frames/${f.id}/chores/${encodeURIComponent(b.choreId)}`,
               { method: 'PUT', body: { status: b.done === false ? 'pending' : 'complete' } });
    return { ok: true };
  }

  if (op === 'chore.delete') {
    gate();
    const f = await hhFrame(H);
    if (f.local) { await localDeleteChore(H, b.choreId); return { ok: true }; }
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
    if (f.local) await localSetDone(c.H, target.id, b.done !== false);
    else await skyH(c.H, `/api/frames/${f.id}/chores/${encodeURIComponent(target.id)}`,
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

    if (f.local) await localSetDone(c.H, target.id, true);
    else await skyH(c.H, `/api/frames/${f.id}/chores/${encodeURIComponent(target.id)}`,
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
