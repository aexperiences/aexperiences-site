// Web Push (RFC 8291 aes128gcm + VAPID), the same shape /api/push.mjs on the hub already uses.
// It REUSES the house key pair that push.mjs made and keeps in the shared store at
// aeos:push:vapid — no new keys, nothing for a human to paste, and nothing here writes to
// push.mjs's own subscription list. Anthony's phones are that list (aeos:push:subs, registered
// through /alerts/). Jessica's phones are memo:nd:push:jessica, registered from her Inbox room.
import crypto from 'node:crypto';

const CONTACT = 'mailto:anthonye@aexperiences.studio';
const KVAP = 'aeos:push:vapid';
// Where each person's phones are registered. A person can have more than one list:
// Anthony already has a phone on the hub's own list (registered through /alerts/), so he gets
// inbox alerts with nothing to set up. Anything registered from an Inbox room lands in the
// memo:nd:push: namespace, which is this room's own and which push.mjs never touches.
export const OWN_KEY = (who) => 'memo:nd:push:' + who;
export const SUBS_KEYS = (who) => (who === 'anthony' ? ['memo:nd:push:anthony', 'aeos:push:subs'] : ['memo:nd:push:' + who]);

const b64u = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();

function signedToken(audience, keys) {
  const head = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const body = b64u(JSON.stringify({ aud: audience, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: CONTACT }));
  const data = head + '.' + body;
  const key = crypto.createPrivateKey({ key: Buffer.from(keys.pk8, 'base64'), format: 'der', type: 'pkcs8' });
  return data + '.' + b64u(crypto.sign('sha256', Buffer.from(data), { key, dsaEncoding: 'ieee-p1363' }));
}

function encrypt(plaintext, uaPublicB64, authSecretB64) {
  const uaPublic = unb64u(uaPublicB64), authSecret = unb64u(authSecretB64);
  const local = crypto.createECDH('prime256v1'); local.generateKeys();
  const asPublic = local.getPublicKey();
  const prkKey = hmac(authSecret, local.computeSecret(uaPublic));
  const ikm = hmac(prkKey, Buffer.concat([Buffer.from('WebPush: info\0'), uaPublic, asPublic, Buffer.from([1])]));
  const salt = crypto.randomBytes(16), prk = hmac(salt, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const record = Buffer.concat([Buffer.from(plaintext, 'utf8'), Buffer.from([2])]);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const sealed = Buffer.concat([c.update(record), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096, 0);
  return Buffer.concat([salt, rs, Buffer.from([asPublic.length]), asPublic, sealed]);
}

async function deliver(sub, message, keys) {
  const headers = { TTL: '86400', Urgency: 'high',
    Authorization: 'vapid t=' + signedToken(new URL(sub.endpoint).origin, keys) + ', k=' + keys.pub };
  let body;
  if (sub.keys && sub.keys.p256dh && sub.keys.auth) {
    body = encrypt(JSON.stringify(message), sub.keys.p256dh, sub.keys.auth);
    headers['Content-Encoding'] = 'aes128gcm';
    headers['Content-Type'] = 'application/octet-stream';
    headers['Content-Length'] = String(body.length);
  } else headers['Content-Length'] = '0';
  const r = await fetch(sub.endpoint, { method: 'POST', headers, body });
  return { status: r.status, gone: r.status === 404 || r.status === 410 };
}

// Never let a failed push break a send. It returns what happened; the caller ignores it.
export async function pushTo(store, who, message) {
  try {
    const rawK = await store('GET', KVAP);
    const keys = rawK ? JSON.parse(rawK) : null;
    if (!keys || !keys.pub || !keys.pk8) return { sent: 0, why: 'no house key yet' };
    const lists = {};
    for (const key of SUBS_KEYS(who)) {
      const raw = await store('GET', key);
      try { lists[key] = raw ? JSON.parse(raw) : []; } catch (e) { lists[key] = []; }
    }
    const seen = {}; let sent = 0, total = 0;
    for (const key of Object.keys(lists)) {
      const alive = []; let dropped = false;
      for (const s of lists[key]) {
        if (!s || !s.endpoint || seen[s.endpoint]) { if (s && s.endpoint) alive.push(s); continue; }
        seen[s.endpoint] = 1; total++;
        let out; try { out = await deliver(s, message, keys); } catch (e) { out = { status: 0, gone: false }; }
        if (out.status >= 200 && out.status < 300) sent++;
        if (out.gone) dropped = true; else alive.push(s);
      }
      // Only ever prune a dead endpoint. Never rewrite a list this room does not own for any other reason.
      if (dropped) await store('SET', key, JSON.stringify(alive));
    }
    if (!total) return { sent: 0, why: 'no phone registered for ' + who };
    return { sent, of: total };
  } catch (e) { return { sent: 0, why: String((e && e.message) || e) }; }
}

// The public half of the house key pair, which a browser needs to register a phone.
// It never makes a key: if push.mjs has not made one yet, this answers null and the room says so.
export async function publicKey(store) {
  try { const raw = await store('GET', KVAP); const k = raw ? JSON.parse(raw) : null; return (k && k.pub) || null; }
  catch (e) { return null; }
}
