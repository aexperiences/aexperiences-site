// /api/voice — Brian and Roz speaking on aexperiences.com, from the HOUSE voice machine.
//
// Source order is fixed by the SSOT (A5 / A5.2): the AE Voice Engine (Chatterbox) is the only
// voice. No cloud vendor, no fallback synthesizer. If the engine is not reachable the reply
// stays text-only — the panel already handles a non-audio answer by staying silent.
//
//   AE_VOICE_URL   the engine's public address, e.g. http://<oracle-box-ip>:8777
//                  (set on the aexperiences-site project once the Oracle box is up)
//   AE_VOICE_KEY   optional bearer token if the engine is fronted by one
//
// Engine contract (v2.3): GET /health → {busy, voices...}; POST /speak {text, voice,
// exaggeration, cfg} → audio/wav (24 kHz mono). One take at a time — we check busy first.
// Built by Accelerated Experiences, LLC.

const VOICES = { brian: 'brian', roz: 'roz' };

function json(res, code, obj) {
  res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') return json(res, 405, { ok: false, reason: 'method' });

  const base = (process.env.AE_VOICE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return json(res, 200, { ok: false, reason: 'no_engine' });
  const key = (process.env.AE_VOICE_KEY || '').trim();
  const auth = key ? { authorization: 'Bearer ' + key } : {};

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== 'object') {
      const chunks = [];
      try { for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
    }
    const text = (typeof body.text === 'string' ? body.text : '').trim().slice(0, 900);
    if (!text) return json(res, 400, { ok: false, reason: 'no_text' });
    const voice = VOICES[String(body.voice || 'brian').toLowerCase()] || 'brian';

    // Single-threaded machine: if another take is running, answer in text only rather than queue.
    try {
      const h = await fetch(base + '/health', { headers: auth, signal: AbortSignal.timeout(4000) });
      const hj = h.ok ? await h.json().catch(() => ({})) : {};
      if (hj && hj.busy) return json(res, 200, { ok: false, reason: 'busy' });
    } catch (e) { return json(res, 200, { ok: false, reason: 'engine_down' }); }

    const up = await fetch(base + '/speak', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'audio/wav' }, auth),
      body: JSON.stringify({ text: text, voice: voice, exaggeration: 0.5, cfg: 0.5 }),
      signal: AbortSignal.timeout(280000)
    });
    if (!up.ok) {
      const detail = await up.text().catch(() => '');
      return json(res, 502, { ok: false, reason: 'upstream', detail: String(detail).slice(0, 300) });
    }
    const buf = Buffer.from(await up.arrayBuffer());
    if (buf.length < 20000) return json(res, 502, { ok: false, reason: 'short_take', bytes: buf.length });
    res.statusCode = 200;
    res.setHeader('Content-Type', (up.headers.get('content-type') || 'audio/wav').split(';')[0]);
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  } catch (e) {
    return json(res, 500, { ok: false, reason: 'error', detail: String((e && e.message) || e).slice(0, 200) });
  }
};

module.exports.config = { maxDuration: 300 };
