// /api/voice-cors — Brian's voice with CORS open, for the walkthrough-video
// render pipeline (Aug 2026). Identical to /api/voice except it sends
// Access-Control-Allow-Origin: * so the render transport (which assembles the
// long walkthrough videos from a github.com page) can fetch narration audio
// cross-origin. /api/voice is already public and unauthenticated — the browser
// same-origin policy was the only thing CORS changes, so this exposes nothing
// new. No key is ever hardcoded; env-gated exactly like /api/voice:
//   ELEVENLABS_API_KEY   (required)
//   ELEVENLABS_VOICE_ID  (optional) — falls back to the shared "Brian" voice
//   ELEVENLABS_MODEL_ID  (optional) — defaults to eleven_flash_v2_5
// Built by Accelerated Experiences LLC.

const BRIAN_FALLBACK_VOICE = 'nPczCjzI2devNBz1zQrb'; // ElevenLabs public "Brian" — shared AE brand voice

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
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
