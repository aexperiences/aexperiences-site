// /api/espofocus-push — web-push subscriptions for ESPOfocus daily reminders.
//
// Uses the SAME Upstash Redis store as /api/espofocus (KV_REST_API_* or UPSTASH_*).
// VAPID keys are generated ONCE and kept in Redis (ef:vapid) — no secret for anyone to paste,
// nothing ever leaves the server. Reminders are "tickle" pushes (no payload) so we avoid
// payload encryption entirely; the service worker shows a generic "log today" notification.
//
// Actions:
//   GET  ?action=key                       -> { enabled, publicKey }   (applicationServerKey)
//   POST ?action=subscribe  {space,endpoint,utchour} -> stores the subscription
//   POST ?action=unsubscribe {endpoint}    -> removes it
//
// CommonJS. Built by Accelerated Experiences, LLC.

function storeUrl() { return (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim(); }
function storeTok() { return (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim(); }
function enabled() { return !!(storeUrl() && storeTok()); }
async function redis(cmds) {
  var r = await fetch(storeUrl() + '/pipeline', { method: 'POST', headers: { authorization: 'Bearer ' + storeTok(), 'content-type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('store'); return r.json();
}
async function getJSON(key, fb) { var o = await redis([['GET', key]]); var v = o && o[0] && o[0].result; if (!v) return fb; try { return JSON.parse(v); } catch (e) { return fb; } }
async function setJSON(key, obj) { await redis([['SET', key, JSON.stringify(obj)]]); }

function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function subId(endpoint) { return b64url(require('crypto').createHash('sha256').update(String(endpoint)).digest()).slice(0, 40); }

// VAPID keypair (P-256), created once, stored in Redis.
async function getVapid() {
  var v = await getJSON('ef:vapid', null);
  if (v && v.pub && v.jwk) return v;
  var kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign']);
  var rawPub = await crypto.subtle.exportKey('raw', kp.publicKey);
  var jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
  v = { pub: b64url(rawPub), jwk: jwk };
  await setJSON('ef:vapid', v);
  return v;
}

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) {} }
  var chunks = []; try { for await (var c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.setHeader('access-control-allow-origin', '*'); res.end(JSON.stringify(obj)); }
function cleanId(s) { return String(s || '').replace(/[^a-z0-9]/gi, '').slice(0, 48); }

module.exports = async function (req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); res.end(); return; }
  var q = req.query || {};
  var action = String(q.action || '').slice(0, 24);
  try {
    if (!enabled()) return send(res, 200, { ok: true, enabled: false });

    if (action === 'key') { var v = await getVapid(); return send(res, 200, { ok: true, enabled: true, publicKey: v.pub }); }

    if (action === 'subscribe') {
      var b = await readBody(req);
      var endpoint = String(b.endpoint || ''); if (!/^https:\/\//.test(endpoint)) return send(res, 400, { ok: false, reason: 'endpoint' });
      var space = cleanId(b.space); if (!space) return send(res, 400, { ok: false, reason: 'space' });
      var utchour = Math.max(0, Math.min(23, parseInt(b.utchour, 10) || 1));
      var id = subId(endpoint);
      await setJSON('ef:sub:' + id, { space: space, endpoint: endpoint, utchour: utchour });
      await redis([['SADD', 'ef:subs', id]]);
      return send(res, 200, { ok: true });
    }

    if (action === 'unsubscribe') {
      var b2 = await readBody(req); var id2 = subId(String(b2.endpoint || ''));
      await redis([['SREM', 'ef:subs', id2], ['DEL', 'ef:sub:' + id2]]);
      return send(res, 200, { ok: true });
    }

    return send(res, 400, { ok: false, reason: 'action' });
  } catch (e) { return send(res, 200, { ok: false, enabled: enabled(), reason: 'err' }); }
};
