// /api/espohystory-voice — ESPOhystory narration render (ElevenLabs text-to-speech + word timing).
//
// Same key as every other AE product: ELEVENLABS_API_KEY (required, already saved in this
// project's Vercel env vars — no key is ever hardcoded). Voice defaults to Roz/Rachel, the
// shared AE narrator (ElevenLabs public voice 21m00Tcm4TlvDq8ikWAM), verified live on
// studio.gigiespo.com Jul 21 2026.
//
// Unlike /api/voice.js (which returns raw mp3 bytes for on-demand playback in the live app),
// this endpoint calls ElevenLabs' /with-timestamps route and returns JSON:
// { ok, audio_base64, alignment }. It exists for a ONE-TIME render pass (35 ESPOhystory
// stories) run from a Claude sandbox, not for the live app to call — decoding the audio and
// turning the character-level alignment into the app's word-timing JSON happens on the
// caller's side, same contract as any other one-off content-generation script would produce,
// just without ever needing a local Node/CLI install (see SOT §13).
//
// Env-gated: with no key it returns 200 { ok:false, reason:'no_key' } instead of erroring.
// CommonJS (matches this repo's other api/*.js files — brian.js, inquiry.js, voice.js).
// Built by Accelerated Experiences, LLC.

const ROZ_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // ElevenLabs "Rachel" — the shared "Roz" voice

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'method' })); return; }

  const key = (process.env.ELEVENLABS_API_KEY || '').trim();
  if (!key) { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'no_key' })); return; }

  const voiceId = (process.env.ELEVENLABS_VOICE_ID || ROZ_VOICE_ID).trim();
  const modelId = (process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2').trim();

  try {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { body = {}; } }
    if (!body || typeof body !== 'object') {
      const chunks = [];
      try { for await (const c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
      try { body = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { body = {}; }
    }
    const text = (typeof body.text === 'string' ? body.text : '').trim().slice(0, 8000);
    if (!text) { res.statusCode = 400; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, reason: 'no_text' })); return; }

    const upstream = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '/with-timestamps?output_format=mp3_44100_128',
      {
        method: 'POST',
        headers: { 'xi-api-key': key, 'content-type': 'application/json', 'accept': 'application/json' },
        body: JSON.stringify({ text: text, model_id: modelId, voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
      }
    );
    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      res.statusCode = 502; res.setHeader('content-type', 'application/json');
      res.end(JSON.stringify({ ok: false, reason: 'upstream', detail: String(detail).slice(0, 500) }));
      return;
    }
    const data = await upstream.json();
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.end(JSON.stringify({ ok: true, audio_base64: data.audio_base64, alignment: data.alignment }));
  } catch (e) {
    res.statusCode = 500; res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ ok: false, reason: 'error', detail: String((e && e.message) || e).slice(0, 200) }));
  }
};
