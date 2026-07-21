// /api/trail-reports — ESPOtrek crowd-sourced trail conditions.
//
// One-tap reports from hikers (muddy / closed / crowded / clear), per place-slug,
// kept 7 days, newest first. The offline-first client queues taps with no signal
// and flushes them here when bars return.
//
// Storage: Upstash Redis REST (same env-var names as the proven AE Connect stack):
//   UPSTASH_REDIS_REST_URL    (required to switch reports on)
//   UPSTASH_REDIS_REST_TOKEN  (required to switch reports on)
//
// Env-gated: with no store configured, GET returns { ok:true, enabled:false, reports:[] }
// so the app stays honest ("reports switch on soon") instead of erroring.
// CommonJS (matches api/voice.js — this repo is NOT using ESM .mjs functions).
// Built by Accelerated Experiences, LLC.

var KINDS = { muddy: 1, closed: 1, crowded: 1, clear: 1 };
var TTL = 7 * 24 * 3600; // 7 days
var MAX = 40;            // reports kept per place

function slug(s) {
  return String(s || '').toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

async function redis(cmds) {
  var url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  var tok = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  if (!url || !tok) return null;
  var r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('store');
  return r.json();
}

module.exports = async function (req, res) {
  res.setHeader('content-type', 'application/json');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }

  var enabled = !!((process.env.UPSTASH_REDIS_REST_URL || '').trim() && (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim());

  try {
    if (req.method === 'GET') {
      var q = req.query || {};
      var place = slug(q.place);
      if (!place) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, reason: 'place' })); return; }
      if (!enabled) { res.end(JSON.stringify({ ok: true, enabled: false, reports: [] })); return; }
      var out = await redis([['LRANGE', 'trek:cx:' + place, '0', String(MAX - 1)]]);
      var now = Date.now();
      var reports = (out && out[0] && out[0].result ? out[0].result : [])
        .map(function (x) { try { return JSON.parse(x); } catch (e) { return null; } })
        .filter(function (x) { return x && x.k && x.t && (now - x.t) < TTL * 1000; });
      res.end(JSON.stringify({ ok: true, enabled: true, reports: reports }));
      return;
    }

    if (req.method === 'POST') {
      var body = req.body;
      if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
      body = body || {};
      var place2 = slug(body.place);
      var kind = String(body.k || '').toLowerCase();
      if (!place2 || !KINDS[kind]) { res.statusCode = 400; res.end(JSON.stringify({ ok: false, reason: 'bad_report' })); return; }
      if (!enabled) { res.end(JSON.stringify({ ok: false, reason: 'no_store' })); return; }
      var t = Number(body.t) || Date.now();
      // clamp queued-offline timestamps to sane range (max 3 days old, never future)
      var now2 = Date.now();
      if (t > now2) t = now2;
      if (now2 - t > 3 * 24 * 3600 * 1000) t = now2;
      var note = String(body.note || '').slice(0, 90);
      var item = JSON.stringify({ k: kind, t: t, note: note });
      var key = 'trek:cx:' + place2;
      await redis([
        ['LPUSH', key, item],
        ['LTRIM', key, '0', String(MAX - 1)],
        ['EXPIRE', key, String(TTL)]
      ]);
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.statusCode = 405; res.end(JSON.stringify({ ok: false, reason: 'method' }));
  } catch (e) {
    res.statusCode = 200; res.end(JSON.stringify({ ok: false, reason: 'store_error' }));
  }
};
