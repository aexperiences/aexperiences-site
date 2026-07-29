// /api/espofocus-nudge — the daily reminder sender for ESPOfocus (Vercel Cron, hourly).
//
// Each hour: for every subscription whose target UTC hour is now, if that account has NOT
// logged today, send a "tickle" web-push (no payload) — the service worker shows "log today".
// Dead subscriptions (404/410) are pruned. `?test=1&space=<code>` force-sends to one account
// now (for verification), returning the push-service status per subscription.
//
// Same Upstash store + VAPID keypair (ef:vapid) as /api/espofocus-push. CommonJS.
// Built by Accelerated Experiences, LLC.

function storeUrl() { return (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').trim(); }
function storeTok() { return (process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '').trim(); }
function enabled() { return !!(storeUrl() && storeTok()); }
async function redis(cmds) {
  var r = await fetch(storeUrl() + '/pipeline', { method: 'POST', headers: { authorization: 'Bearer ' + storeTok(), 'content-type': 'application/json' }, body: JSON.stringify(cmds) });
  if (!r.ok) throw new Error('store'); return r.json();
}
async function getJSON(key, fb) { var o = await redis([['GET', key]]); var v = o && o[0] && o[0].result; if (!v) return fb; try { return JSON.parse(v); } catch (e) { return fb; } }
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function b64urlStr(s) { return Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); }
function todayUTC() { var d = new Date(); function p(x){return (x<10?'0':'')+x;} return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); }

async function getVapid() { return getJSON('ef:vapid', null); }
async function vapidAuth(aud, v) {
  var key = await crypto.subtle.importKey('jwk', v.jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  var header = b64urlStr(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  var payload = b64urlStr(JSON.stringify({ aud: aud, exp: Math.floor(Date.now() / 1000) + 43200, sub: 'mailto:hello@aexperiences.com' }));
  var data = header + '.' + payload;
  var sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, Buffer.from(data));
  return 'vapid t=' + data + '.' + b64url(sig) + ', k=' + v.pub;
}
async function sendTickle(endpoint, v) {
  var aud; try { aud = new URL(endpoint).origin; } catch (e) { return 0; }
  var r = await fetch(endpoint, { method: 'POST', headers: { 'TTL': '3600', 'Authorization': await vapidAuth(aud, v), 'Content-Length': '0' } });
  return r.status;
}
async function loggedToday(space) {
  var st = await getJSON('ef:sp:' + space, null); if (!st || !st.days) return false;
  var t = todayUTC(); return st.days.some(function (d) { return d.date === t; });
}

module.exports = async function (req, res) {
  res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  try {
    if (!enabled()) { res.statusCode = 200; return res.end(JSON.stringify({ ok: true, enabled: false })); }
    var v = await getVapid();
    if (!v) { res.statusCode = 200; return res.end(JSON.stringify({ ok: true, sent: 0, reason: 'no-vapid-yet' })); }
    var q = req.query || {};
    var force = q.test == '1' || q.force == '1';
    var onlySpace = q.space ? String(q.space).replace(/[^a-z0-9]/gi, '').slice(0, 48) : null;
    var nowHour = new Date().getUTCHours();
    var today = todayUTC();

    var ids = (await redis([['SMEMBERS', 'ef:subs']]))[0].result || [];
    var sent = 0, skipped = 0, pruned = 0, results = [];
    for (var i = 0; i < ids.length; i++) {
      var id = ids[i];
      var sub = await getJSON('ef:sub:' + id, null);
      if (!sub || !sub.endpoint) { await redis([['SREM', 'ef:subs', id], ['DEL', 'ef:sub:' + id]]); pruned++; continue; }
      if (onlySpace && sub.space !== onlySpace) { skipped++; continue; }
      if (!force) {
        if (sub.utchour !== nowHour) { skipped++; continue; }
        var already = await getJSON('ef:sent:' + id, null);
        if (already === today) { skipped++; continue; }
        if (await loggedToday(sub.space)) { skipped++; continue; }
      }
      var code = await sendTickle(sub.endpoint, v);
      results.push(code);
      if (code === 404 || code === 410) { await redis([['SREM', 'ef:subs', id], ['DEL', 'ef:sub:' + id]]); pruned++; }
      else if (code >= 200 && code < 300) { sent++; await redis([['SET', 'ef:sent:' + id, today]]); }
    }
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, subs: ids.length, sent: sent, skipped: skipped, pruned: pruned, statuses: results }));
  } catch (e) {
    res.statusCode = 200; res.end(JSON.stringify({ ok: false, reason: 'err', msg: String(e && e.message || e) }));
  }
};
