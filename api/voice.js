// /api/voice — Brian's voice for the AE App Shop (ElevenLabs text-to-speech).
//
// Cloned from Barry Burris NMD hub's proven voice endpoint (api/voice.mjs) so AE Brian
// sounds EXACTLY like Barry's Brian and espofret.com's Brian — same shared "Brian" voice
// across every AE product, same env-var names so Anthony can reuse the same ElevenLabs key:
//   ELEVENLABS_API_KEY   (required) — the ElevenLabs key
//   ELEVENLABS_VOICE_ID  (optional) — Brian's Voice ID; falls back to the public "Brian" voice
//   ELEVENLABS_MODEL_ID  (optional) — defaults to eleven_flash_v2_5 (fast, multilingual)
//
// Env-gated: with no key it returns 200 { ok:false, reason:'no_key' } so the assistant
// panel simply stays silent (text still works) instead of erroring. No key is ever hardcoded.
// CommonJS (matches api/brian.js's module format for this repo — aexperiences-site, unlike
// Barry's hub, is NOT using ESM .mjs functions).
// Built by Accelerated Experiences, LLC.

const BRIAN_FALLBACK_VOICE = 'nPczCjzI2devNBz1zQrb'; // ElevenLabs public "Brian" — shared AE brand voice

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'method' })); return; }

  const key = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!key) { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'no_key' })); return; }

  const voiceId = (process.env.ELEVENLABS_VOICE_ID || BRIAN_FALLBACK_VOICE).trim();
  const modelId = (process.env.ELEVENLABS_MODEL_ID || 'eleven_flash_v2_5').trim();

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== 'object') {
      // read raw stream when Vercel didn't pre-parse
      const chunks = [];
      try { for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
    }
    const text = (typeof body.text === 'string' ? body.text : '').trim().slice(0, 1500);
    if (!text) { res.statusCode = 400; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'no_text' })); return; }

    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '?optimize_streaming_latency=4&output_format=mp3_44100_64',
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', 'accept': 'audio/mpeg' },
        body: JSON.stringify({ text: text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      }
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      res.statusCode = 502; res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, reason: 'upstream', detail: String(detail).slice(0, 300) }));
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.statusCode = 200;
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    res.end(buf);
  } catch (e) {
    res.statusCode = 500; res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, reason: 'error', detail: String((e && e.message) || e).slice(0, 200) }));
  }
};
