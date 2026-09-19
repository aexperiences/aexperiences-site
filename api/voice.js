// /api/voice — the ONE door every AE app speaks through. Accelerated Experiences, LLC.
//
// Source order is fixed by the SSOT (A5 / A5.2 / A5.3): the AE Voice Engine (Chatterbox) is
// the only voice. No cloud vendor, no device synthesizer, ever. If the engine cannot be
// reached the answer stays SILENT — a caller never falls through to the browser robot voice.
//
//   AE_VOICE_URL   the engine's public address (the house machine on Modal)
//   AE_VOICE_KEY   bearer token the engine expects
//
// Engine contract: GET /health -> {busy, voices...}; POST /speak {text, voice, exaggeration,
// cfg} -> audio/wav (24 kHz mono). One take at a time — we check busy first.
//
// TWO WAYS IN, on purpose:
//   POST {text, voice}            — the concierge. Never cached, always a fresh take.
//   GET  ?say=...&voice=...       — apps. Cached hard at the edge, so a line the app says
//                                   over and over is paid for ONCE and is instant after that.
// The edge cache is what keeps a kids' app off the meter. Do not remove it.

const VOICES = {
  anthony: 'anthony', barry: 'barry', bigsean: 'bigsean', brian: 'brian',
  gianna: 'gianna', jessica: 'jessica', maddox: 'maddox', oliverose: 'oliverose',
  roz: 'roz', vince: 'vince'
};

// House default is 0.5 / 0.5. A voice only appears here when Anthony judged it by ear.
const TUNING = { gianna: { exaggeration: 0.7, cfg: 0.3 } };

function json(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

async function readBody(req) {
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (!body || typeof body !== 'object') {
    const chunks = [];
    try { for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
    try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
  }
  return body || {};
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  const isGet = req.method === 'GET';
  if (!isGet && req.method !== 'POST') return json(res, 405, { ok: false, reason: 'method' });

  const base = (process.env.AE_VOICE_URL || '').trim().replace(/\/+$/, '');
  if (!base) return json(res, 200, { ok: false, reason: 'no_engine' });
  const key = (process.env.AE_VOICE_KEY || '').trim();
  const auth = key ? { authorization: 'Bearer ' + key } : {};

  try {
    let text, voiceIn;
    if (isGet) {
      const u = new URL(req.url, 'https://www.aexperiences.com');
      text = (u.searchParams.get('say') || '').trim().slice(0, 900);
      voiceIn = u.searchParams.get('voice') || 'brian';
    } else {
      const body = await readBody(req);
      text = (typeof body.text === 'string' ? body.text : '').trim().slice(0, 900);
      voiceIn = body.voice || 'brian';
    }
    if (!text) return json(res, 400, { ok: false, reason: 'no_text' });

    const voice = VOICES[String(voiceIn).toLowerCase()] || 'brian';
    const tune = TUNING[voice] || { exaggeration: 0.5, cfg: 0.5 };

    // Single-threaded machine: if another take is running, stay silent rather than queue.
    try {
      const h = await fetch(base + '/health', { headers: auth, signal: AbortSignal.timeout(6000) });
      const hj = h.ok ? await h.json().catch(() => ({})) : {};
      if (hj && hj.busy) return json(res, 200, { ok: false, reason: 'busy' });
    } catch (e) { return json(res, 200, { ok: false, reason: 'engine_down' }); }

    const up = await fetch(base + '/speak', {
      method: 'POST',
      headers: Object.assign({ 'content-type': 'application/json', accept: 'audio/wav' }, auth),
      body: JSON.stringify({ text: text, voice: voice, exaggeration: tune.exaggeration, cfg: tune.cfg }),
      signal: AbortSignal.timeout(280000)
    });
    if (!up.ok) {
      const detail = await up.text().catch(() => '');
      return json(res, 502, { ok: false, reason: 'upstream', detail: String(detail).slice(0, 300) });
    }

    const buf = Buffer.from(await up.arrayBuffer());
    // A wav header alone is 44 bytes. Scale the floor to the text so a single spoken word
    // ("cat") is not thrown away as a bad take the way a silent 900-word take should be.
    const floor = Math.min(20000, 1200 + text.length * 120);
    if (buf.length < floor) return json(res, 502, { ok: false, reason: 'short_take', bytes: buf.length });

    res.statusCode = 200;
    res.setHeader('Content-Type', (up.headers.get('content-type') || 'audio/wav').split(';')[0]);
    res.setHeader('X-AE-Voice', voice);
    // The whole cost story: a GET take is immutable, so the edge serves every repeat free.
    res.setHeader('Cache-Control', isGet
      ? 'public, max-age=31536000, s-maxage=31536000, immutable'
      : 'no-store');
    res.end(buf);
  } catch (e) {
    return json(res, 500, { ok: false, reason: 'error', detail: String((e && e.message) || e).slice(0, 200) });
  }
};

module.exports.config = { maxDuration: 300 };
