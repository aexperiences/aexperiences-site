// /api/roz — Roz's real voice for ESPOhystory (and any AE app that needs the narrator).
//
// Roz = ElevenLabs "Rachel" (voice_id 21m00Tcm4TlvDq8ikWAM) — the SAME voice already used by
// Coach Roz on espodrama.com and by Gianna's studio.gigiespo.com. This endpoint exists SEPARATELY
// from /api/voice because /api/voice is Brian (ELEVENLABS_VOICE_ID) and is used by the App Shop
// assistant — pointing that at Rachel would change Brian everywhere. Same key, different voice.
//
// Uses the /with-timestamps endpoint so the response carries per-character timings alongside the
// audio. That is what lets ESPOhystory keep its karaoke word-highlighting after leaving the
// Web Speech API behind — no whisperx / forced-alignment step needed.
//
//   ELEVENLABS_API_KEY  (required) — already present on this project. No key is ever hardcoded.
//   ROZ_VOICE_ID        (optional) — defaults to Rachel.
//   ROZ_MODEL_ID        (optional) — defaults to eleven_multilingual_v2 (matches espodrama's Roz).
//
// Env-gated: with no key it returns 200 {ok:false, reason:'no_key'} so the client silently keeps
// the device voice instead of erroring or showing a Roz option that cannot work.
//
// GET is supported and is the path the client uses, so Vercel's edge cache can serve a paragraph
// that has already been rendered without spending another ElevenLabs character. POST also works.
//
// CommonJS — matches api/voice.js in this repo (aexperiences-site is not using ESM functions).
// Built by Accelerated Experiences LLC.

const ROZ_VOICE = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs "Rachel" — Roz
const MAX_CHARS = 1200;                   // measured safe ceiling is ~2000/request; stay well under

function json(res, code, obj, cacheable) {
  res.statusCode = code;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader(
    'Cache-Control',
    cacheable
      ? 'public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400'
      : 'no-store'
  );
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
  return body;
}

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.end();
    return;
  }

  const key = (process.env.ELEVENLABS_API_KEY || '').trim();
  const voiceId = (process.env.ROZ_VOICE_ID || ROZ_VOICE).trim();
  const modelId = (process.env.ROZ_MODEL_ID || 'eleven_multilingual_v2').trim();

  // ---- query parsing (GET) ----
  let q = {};
  try { q = new URL(req.url, 'http://x').searchParams; } catch (e) { q = new URLSearchParams(); }

  // ---- ping: does Roz work at all? Costs zero ElevenLabs characters. ----
  if (q.get('ping') !== null) {
    json(res, 200, key ? { ok: true, voice: 'roz', model: modelId } : { ok: false, reason: 'no_key' }, false);
    return;
  }

  if (!key) { json(res, 200, { ok: false, reason: 'no_key' }, false); return; }

  let text = '';
  if (req.method === 'GET') {
    text = (q.get('t') || '').toString();
  } else if (req.method === 'POST') {
    const body = await readBody(req);
    text = (typeof body.text === 'string' ? body.text : '');
  } else {
    json(res, 405, { ok: false, reason: 'method' }, false);
    return;
  }

  const full = String(text);
  if (!full.trim()) { json(res, 400, { ok: false, reason: 'no_text' }, false); return; }
  if (full.length > MAX_CHARS) {
    // The client chunks on sentence boundaries; anything over the ceiling is a client bug, and
    // silently truncating would drop words out of a child's story. Say so instead.
    json(res, 413, { ok: false, reason: 'too_long', max: MAX_CHARS, got: full.length }, false);
    return;
  }

  try {
    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) +
      '/with-timestamps?output_format=mp3_44100_64',
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({
          text: full,
          model_id: modelId,
          voice_settings: { stability: 0.45, similarity_boost: 0.75, style: 0.15, use_speaker_boost: true }
        })
      }
    );

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      json(res, 502, { ok: false, reason: 'upstream', status: upstream.status, detail: String(detail).slice(0, 300) }, false);
      return;
    }

    const data = await upstream.json();
    const a = (data && data.alignment) || null;
    const chars = (a && a.characters) || [];
    const starts = (a && a.character_start_times_seconds) || [];
    const ends = (a && a.character_end_times_seconds) || [];

    json(res, 200, {
      ok: true,
      voice: 'roz',
      audio: data.audio_base64 || '',
      // chars joined so the client can confirm a 1:1 match against the text it sent before
      // trusting the timings; on a mismatch it falls back to proportional pacing instead of
      // highlighting the wrong words.
      chars: chars.join(''),
      t: starts.map(function (n) { return Math.round(n * 1000) / 1000; }),
      e: ends.map(function (n) { return Math.round(n * 1000) / 1000; })
    }, true);
  } catch (e) {
    json(res, 500, { ok: false, reason: 'error', detail: String((e && e.message) || e).slice(0, 200) }, false);
  }
};
