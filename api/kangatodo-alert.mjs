// KangaToDo — the alert engine. Accelerated Experiences LLC.
//
// Two jobs, in this order:
//   1. PUSH   — Web Push (VAPID + aes128gcm, RFC 8291), free, instant, no phone number.
//   2. SMS    — the fallback, and only the fallback. It fires when push could not have
//               landed: no subscription on file, the push service returned 404/410
//               (app deleted, phone wiped), or the push landed and nobody acknowledged
//               it inside the ack window. Every send is logged so a chore never texts twice.
//
// SMS costs real money and stores a phone number belonging to a minor, so it is
// env-gated behind TWILIO_*. With those unset this file still runs, still pushes,
// and reports {sms:{ok:false, reason:'no_key'}}. It never pretends to have texted.
//
// Dependency-free ESM. Every key comes from process.env and none is ever returned
// to a browser.
//
// Routes:  POST /api/kangatodo-alert {do:'flush'}  — called right after a chore is saved
//          GET  /api/kangatodo-alert               — the cron backstop
//          POST /api/kangatodo-alert {do:'test', token} — prove a phone really buzzes

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
const NS = 'roo:';
const K = (s) => NS + s;
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };
const setJSON = (k, v, ttl) => ttl ? redis('SET', k, JSON.stringify(v), 'EX', String(ttl))
                                   : redis('SET', k, JSON.stringify(v));

/* ================================================================== keys == */

const VAPID_PUB  = process.env.VAPID_PUBLIC_KEY  || '';
const VAPID_PRIV = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUB  = process.env.VAPID_SUBJECT || 'mailto:help@aexperiences.com';
// Push is ready whenever we can resolve an identity — env OR the shared store.
const pushReady  = () => !!((VAPID_PUB && VAPID_PRIV) || storeReady());

const TW_SID  = process.env.TWILIO_ACCOUNT_SID || '';
const TW_TOK  = process.env.TWILIO_AUTH_TOKEN  || '';
const TW_FROM = process.env.TWILIO_FROM        || '';
const smsReady = () => !!(TW_SID && TW_TOK && TW_FROM);

// How long a pushed chore gets to be acknowledged before the text goes out.
const ACK_MINUTES = Math.max(1, Number(process.env.KANGATODO_ACK_MINUTES || 20));
const APP_URL = process.env.KANGATODO_URL || 'https://www.aexperiences.com/apps/kangatodo/';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
// The evening digest rides on the same cron as the flush, so this app adds ONE
// cron entry to a shared vercel.json instead of two. Hour is UTC unless set.
const DIGEST_HOUR = Number(process.env.KANGATODO_DIGEST_HOUR ?? 2);   // 19:00 Pacific

/* ========================================================== web push ====== */
/* RFC 8291 (message encryption) + RFC 8292 (VAPID), implemented on node:crypto.
   No web-push package — nothing in api/ carries dependencies. */

const b64url = (buf) => Buffer.from(buf).toString('base64')
  .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64url = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

const hmac = (key, data) => crypto.createHmac('sha256', key).update(data).digest();
// HKDF-Expand, single block. Every length we need here is <= 32 bytes.
const hkdf = (salt, ikm, info, len) =>
  hmac(hmac(salt, ikm), Buffer.concat([Buffer.from(info), Buffer.from([1])])).subarray(0, len);

/**
 * Resolve the VAPID identity. Three sources, in order:
 *   1. VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY env, if someone set them.
 *   2. `ef:vapid` in the shared Upstash store — the keypair ESPOfocus already
 *      generated for this same domain. Reusing it means nothing to paste, and
 *      it is the SAME application server, so it is the correct identity.
 *   3. Nothing there yet: generate a P-256 pair and store it in that same slot,
 *      in ESPOfocus's exact {pub, jwk} shape, so both apps keep sharing one.
 */
let _vapid = null;
async function getVapid() {
  if (_vapid) return _vapid;

  if (VAPID_PUB && VAPID_PRIV) {
    const pub = unb64url(VAPID_PUB);
    if (pub.length !== 65 || pub[0] !== 0x04) throw new Error('vapid_public_malformed');
    _vapid = { pub: VAPID_PUB, key: crypto.createPrivateKey({ format: 'jwk', key: {
      kty: 'EC', crv: 'P-256',
      x: b64url(pub.subarray(1, 33)), y: b64url(pub.subarray(33, 65)),
      d: b64url(unb64url(VAPID_PRIV)) } }) };
    return _vapid;
  }
  if (!storeReady()) return null;

  let v = await getJSON('ef:vapid').catch(() => null);
  if (!v || !v.pub || !v.jwk) {
    const kp = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const raw = kp.publicKey.export({ type: 'spki', format: 'der' }).subarray(-65);
    v = { pub: b64url(raw), jwk: kp.privateKey.export({ format: 'jwk' }) };
    await redis('SET', 'ef:vapid', JSON.stringify(v)).catch(() => {});
  }
  _vapid = { pub: v.pub, key: crypto.createPrivateKey({ format: 'jwk', key: v.jwk }) };
  return _vapid;
}

/** The VAPID Authorization header: a 12h ES256 JWT bound to the push service origin. */
function vapidHeader(endpoint, v) {
  const aud = new URL(endpoint).origin;
  const head = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claim = b64url(JSON.stringify({
    aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: VAPID_SUB,
  }));
  const sig = crypto.createSign('SHA256').update(`${head}.${claim}`)
    // Raw r||s, not DER — push services reject DER signatures.
    .sign({ key: v.key, dsaEncoding: 'ieee-p1363' });
  return `vapid t=${head}.${claim}.${b64url(sig)}, k=${v.pub}`;
}

/** Encrypt a payload to one subscription. Returns the aes128gcm body. */
function encrypt(payload, p256dhB64, authB64) {
  const uaPub = unb64url(p256dhB64);
  const auth  = unb64url(authB64);
  if (uaPub.length !== 65) throw new Error('subscription_key_malformed');

  const salt = crypto.randomBytes(16);
  const as = crypto.createECDH('prime256v1');
  as.generateKeys();
  const asPub  = as.getPublicKey();
  const shared = as.computeSecret(uaPub);

  // RFC 8291 §3.4 — the key-derivation info binds both public keys into the secret.
  const ikm = hkdf(auth, shared, Buffer.concat([
    Buffer.from('WebPush: info\0'), uaPub, asPub,
  ]), 32);
  const cek   = hkdf(salt, ikm, 'Content-Encoding: aes128gcm\0', 16);
  const nonce = hkdf(salt, ikm, 'Content-Encoding: nonce\0', 12);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const body = Buffer.concat([
    cipher.update(Buffer.concat([Buffer.from(payload, 'utf8'), Buffer.from([0x02])])),
    cipher.final(), cipher.getAuthTag(),
  ]);

  const header = Buffer.alloc(21);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);  // record size
  header.writeUInt8(65, 20);       // key id length
  return Buffer.concat([header, asPub, body]);
}

/**
 * Send one push.
 * @returns {{ok:boolean, status:number, gone:boolean, reason?:string}}
 *          `gone` means the subscription is dead and should be reaped —
 *          that is also the signal that this child needs the SMS fallback.
 */
async function sendPush(sub, payloadObj) {
  const v = await getVapid();
  if (!v) return { ok: false, status: 0, gone: false, reason: 'no_key' };
  try {
    const body = encrypt(JSON.stringify(payloadObj), sub.p256dh, sub.auth);
    const r = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        TTL: '86400',
        Urgency: 'high',
        'Content-Encoding': 'aes128gcm',
        'Content-Type': 'application/octet-stream',
        'Content-Length': String(body.length),
        Authorization: vapidHeader(sub.endpoint, v),
      },
      body,
    });
    // 404/410 — the browser threw the subscription away. It will never work again.
    const gone = r.status === 404 || r.status === 410;
    return { ok: r.ok, status: r.status, gone,
             reason: r.ok ? undefined : (gone ? 'gone' : 'push_' + r.status) };
  } catch (e) {
    return { ok: false, status: 0, gone: false, reason: String(e.message || e).slice(0, 80) };
  }
}

/* ================================================================ email === */
// Reuses RESEND_API_KEY / INQUIRY_FROM, already configured on this project for
// /api/inquiry. Costs nothing extra and needs no phone number.

const RESEND_KEY  = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.INQUIRY_FROM || 'KangaToDo <onboarding@resend.dev>';
const PARENT_EMAIL = process.env.KANGATODO_PARENT_EMAIL || process.env.INQUIRY_TO || '';
const emailReady = () => !!(RESEND_KEY && PARENT_EMAIL);

async function sendEmail(subject, html) {
  if (!emailReady()) return { ok: false, reason: 'no_key' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${RESEND_KEY}`, 'content-type': 'application/json' },
      body: JSON.stringify({ from: RESEND_FROM, to: PARENT_EMAIL, subject, html }),
    });
    const j = await r.json().catch(() => ({}));
    return r.ok ? { ok: true, id: j.id } : { ok: false, reason: 'resend_' + r.status };
  } catch (e) { return { ok: false, reason: String(e.message || e).slice(0, 60) }; }
}

/* ================================================================== sms === */

async function sendSMS(to, text) {
  if (!smsReady()) return { ok: false, reason: 'no_key' };
  try {
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TW_SID}/Messages.json`, {
      method: 'POST',
      headers: {
        authorization: 'Basic ' + Buffer.from(`${TW_SID}:${TW_TOK}`).toString('base64'),
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: TW_FROM, Body: text }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { ok: false, reason: 'twilio_' + r.status, detail: (j.message || '').slice(0, 140) };
    return { ok: true, sid: j.sid };
  } catch (e) {
    return { ok: false, reason: String(e.message || e).slice(0, 80) };
  }
}

/* ============================================================ dispatch ==== */

/** Push one queued alert to every device belonging to that child. */
async function deliver(alert) {
  const rec = await getJSON(K('hh:' + alert.hh + ':child:' + alert.categoryId));
  const devices = (rec && rec.devices) || [];
  const name = (rec && rec.name) || 'your list';

  const payload = {
    title: alert.time ? `${alert.summary} — ${alert.time}` : alert.summary,
    body: `A new job is on your list${rec && rec.name ? `, ${rec.name}` : ''}.`,
    choreId: alert.choreId, date: alert.date, url: APP_URL,
  };

  let delivered = 0, reaped = 0, attempted = 0;

  for (const d of devices) {
    const sub = await getJSON(K('push:' + d.token)).catch(() => null);
    if (!sub) continue;
    attempted++;
    const r = await sendPush(sub, payload);
    if (r.ok) delivered++;
    else if (r.gone) {
      // Reap it now so we stop pushing into the void and start texting instead.
      await redis('DEL', K('push:' + d.token)).catch(() => {});
      await redis('SREM', K('pushtokens'), d.token).catch(() => {});
      reaped++;
    }
  }

  // Arm the SMS fallback. Two triggers: nothing could be pushed at all (queue it
  // due immediately), or it was pushed and we wait out the ack window.
  if (rec && rec.phone) {
    const dueAt = delivered > 0 ? Date.now() + ACK_MINUTES * 60000 : Date.now();
    await redis('ZADD', K('smsq'), String(dueAt), JSON.stringify({
      hh: alert.hh, choreId: alert.choreId, categoryId: alert.categoryId,
      summary: alert.summary, time: alert.time || null, name,
      pushed: delivered > 0,
    })).catch(() => {});
  }

  return { choreId: alert.choreId, child: name, devices: attempted, delivered, reaped,
           smsArmed: !!(rec && rec.phone) };
}

/** Fire any SMS whose ack window has expired without the chore being ticked off. */
async function runSMSQueue() {
  const now = Date.now();
  const due = await redis('ZRANGEBYSCORE', K('smsq'), '0', String(now)).catch(() => []);
  const out = [];

  for (const raw of (due || [])) {
    await redis('ZREM', K('smsq'), raw).catch(() => {});
    let job; try { job = JSON.parse(raw); } catch { continue; }

    // The kid finished it. Do not nag a child who already did the thing.
    const acked = await redis('SISMEMBER', K('acked'), String(job.choreId)).catch(() => 0);
    if (acked) { out.push({ choreId: job.choreId, skipped: 'already_done' }); continue; }

    // One text per chore, forever.
    const already = await redis('SISMEMBER', K('smssent'), String(job.choreId)).catch(() => 0);
    if (already) { out.push({ choreId: job.choreId, skipped: 'already_texted' }); continue; }

    const rec = await getJSON(K('hh:' + job.hh + ':child:' + job.categoryId)).catch(() => null);
    if (!rec || !rec.phone) { out.push({ choreId: job.choreId, skipped: 'no_phone' }); continue; }

    const when = job.time ? ` (${job.time})` : '';
    const r = await sendSMS(rec.phone, `${job.summary}${when} is on your list. ${APP_URL}`);

    if (r.ok) {
      await redis('SADD', K('smssent'), String(job.choreId)).catch(() => {});
      await redis('EXPIRE', K('smssent'), 604800).catch(() => {});
    }
    out.push({ choreId: job.choreId, child: rec.name || null, sms: r });
  }
  return out;
}


/* ==================================================== parent-side alerts == */

/** Buzz every device the parent has registered. */
async function pushParents(payload, hh) {
  const ids = await redis('SMEMBERS', K('hh:' + hh + ':parentpushids')).catch(() => []);
  let delivered = 0, reaped = 0;
  for (const id of (ids || [])) {
    const sub = await getJSON(K('hh:' + hh + ':parentpush:' + id)).catch(() => null);
    if (!sub) continue;
    const r = await sendPush(sub, payload);
    if (r.ok) delivered++;
    else if (r.gone) {
      await redis('DEL', K('hh:' + hh + ':parentpush:' + id)).catch(() => {});
      await redis('SREM', K('hh:' + hh + ':parentpushids'), id).catch(() => {});
      reaped++;
    }
  }
  return { delivered, reaped, devices: (ids || []).length };
}

/** "Maya finished Feed the dog" — with the photo attached when there is one. */
async function runParentQueue() {
  const out = [];
  for (let i = 0; i < 40; i++) {
    const raw = await redis('RPOP', K('parentq')).catch(() => null);
    if (!raw) break;
    let e; try { e = JSON.parse(raw); } catch { continue; }
    const r = await pushParents({
      title: `${e.child} finished ${e.summary}`,
      body: e.photo ? 'Tap to see the photo.' : 'Ticked off just now.',
      image: e.photo || undefined,          // Android shows this inline
      url: APP_URL,
      choreId: e.choreId,
    }, e.hh);
    // No parent device subscribed? Email instead — same information, no new key.
    let mail = null;
    if (r.delivered === 0 && emailReady()) {
      mail = await sendEmail(`${e.child} finished ${e.summary}`,
        `<p><b>${e.child}</b> finished <b>${e.summary}</b>.</p>` +
        (e.photo ? `<p><img src="${e.photo}" alt="" style="max-width:420px;border-radius:12px"></p>` : '') +
        `<p style="color:#888;font-size:12px">KangaToDo · Accelerated Experiences LLC</p>`);
    }
    out.push({ child: e.child, summary: e.summary, hasPhoto: !!e.photo, ...r, email: mail });
  }
  return out;
}

/** One evening summary of everything finished today — one per family. */
async function runDigest() {
  const day = new Date().toISOString().slice(0, 10);
  const hhs = await redis('SMEMBERS', K('digestdays:' + day)).catch(() => []);
  if (!hhs || !hhs.length) return { sent: false, reason: 'nothing_finished_today', families: 0 };

  let families = 0, delivered = 0;
  for (const hh of hhs) {
    const raw = await redis('LRANGE', K('digest:' + hh + ':' + day), '0', '99').catch(() => []);
    const items = (raw || []).map((x) => { try { return JSON.parse(x); } catch { return null; } }).filter(Boolean);
    if (!items.length) continue;

    const byKid = {};
    for (const it of items) (byKid[it.child] = byKid[it.child] || []).push(it);
    const line = Object.entries(byKid).map(([n, l]) => `${n} ${l.length}`).join(' · ');
    const withPhotos = items.filter((i) => i.photo).length;

    // Addressed to THIS household's parents only.
    const r = await pushParents({
      title: `Today: ${items.length} job${items.length === 1 ? '' : 's'} done`,
      body: line + (withPhotos ? ` · ${withPhotos} photo${withPhotos === 1 ? '' : 's'}` : ''),
      url: APP_URL,
    }, hh);
    families++; delivered += (r.delivered || 0);
  }
  return { sent: delivered > 0, families, delivered };
}

/* ================================================= photo retention purge == */
//
// Photographs of children do not sit on a server indefinitely. Every upload is
// queued with an expiry when it is taken; this deletes the actual blob when due.

async function purgePhotos() {
  const now = Date.now();
  const due = await redis('ZRANGEBYSCORE', K('photoq'), '0', String(now)).catch(() => []);
  if (!due || !due.length) return { purged: 0 };
  const urls = [], entries = [];
  for (const raw of due) {
    await redis('ZREM', K('photoq'), raw).catch(() => {});
    try { const e = JSON.parse(raw); urls.push(e.url); entries.push(e); } catch {}
  }
  if (!urls.length) return { purged: 0 };
  if (!BLOB_TOKEN) return { purged: 0, reason: 'no_photo_store' };

  let ok = false;
  try {
    const r = await fetch('https://blob.vercel-storage.com/delete', {
      method: 'POST',
      headers: { authorization: `Bearer ${BLOB_TOKEN}`, 'content-type': 'application/json', 'x-api-version': '7' },
      body: JSON.stringify({ urls }),
    });
    ok = r.ok;
  } catch { ok = false; }

  // Drop the pointers too, so the app never links a photo that is gone.
  for (const e of entries) await redis('DEL', K('hh:' + e.hh + ':photo:' + e.choreId)).catch(() => {});
  return { purged: urls.length, blobDeleted: ok };
}

/* ================================================================ route === */

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');

  const capability = {
    push: pushReady() ? { ok: true } : { ok: false, reason: 'no_key' },
    sms:  smsReady()  ? { ok: true } : { ok: false, reason: 'no_key' },
    email: emailReady() ? { ok: true } : { ok: false, reason: 'no_key' },
    store: storeReady(),
    photos: !!BLOB_TOKEN ? { ok: true } : { ok: false, reason: 'no_key' },
    ackMinutes: ACK_MINUTES,
  };

  if (!storeReady()) return res.status(200).json({ ok: false, reason: 'no_kv', capability });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const op = String(body.do || (req.method === 'GET' ? 'flush' : ''));

  try {
    /* -- prove a real phone really buzzes. No guessing whether it works. -- */
    if (op === 'test') {
      const kid = await getJSON(K('kid:' + body.token)).catch(() => null);
      if (!kid) return res.status(200).json({ ok: false, reason: 'not_linked', capability });
      const sub = await getJSON(K('push:' + body.token)).catch(() => null);
      if (!sub) return res.status(200).json({ ok: false, reason: 'no_subscription', capability });
      const r = await sendPush(sub, {
        title: 'KangaToDo is connected',
        body: `This phone will now buzz when a job lands for ${kid.name}.`,
        url: APP_URL,
      });
      if (r.gone) {
        await redis('DEL', K('push:' + body.token)).catch(() => {});
        await redis('SREM', K('pushtokens'), body.token).catch(() => {});
      }
      return res.status(200).json({ ok: r.ok, reason: r.reason, status: r.status, capability });
    }

    /* -- the evening digest, fired by its own cron ------------------------ */
    if (op === 'digest') {
      return res.status(200).json({ ok: true, digest: await runDigest(),
                                    purge: await purgePhotos(), capability });
    }

    /* -- flush: drain the queue, then work the SMS backlog ---------------- */
    const delivered = [];
    // Bounded per run: a serverless call must finish, and the cron will pick up
    // whatever is left over rather than us running the clock out.
    for (let i = 0; i < 40; i++) {
      const raw = await redis('RPOP', K('alerts')).catch(() => null);
      if (!raw) break;
      let alert; try { alert = JSON.parse(raw); } catch { continue; }
      delivered.push(await deliver(alert));
    }

    const texted  = await runSMSQueue();
    const parents = await runParentQueue();
    const purged  = await purgePhotos();

    // Once a day, at the digest hour, and only once — a flag keyed to the date.
    let digest = null;
    if (new Date().getUTCHours() === DIGEST_HOUR) {
      const day = new Date().toISOString().slice(0, 10);
      const already = await redis('GET', K('digestsent:' + day)).catch(() => null);
      if (!already) {
        digest = await runDigest();
        await redis('SET', K('digestsent:' + day), '1', 'EX', '172800').catch(() => {});
      }
    }

    return res.status(200).json({
      ok: true, capability,
      pushed: delivered,
      sms: texted,
      parents,
      purged,
      digest,
      note: !pushReady() ? 'VAPID keys are not set — nothing was pushed.'
          : (!smsReady() && texted.length ? 'Twilio is not set — the fallback did not text.' : undefined),
    });
  } catch (e) {
    return res.status(200).json({ ok: false, reason: 'error',
                                  detail: String(e && e.message || e).slice(0, 200), capability });
  }
}
