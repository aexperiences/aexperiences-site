/* /api/espohystory-voice — RETIRED Sep 20 2026. Accelerated Experiences, LLC.
 *
 * This was the third ElevenLabs door on the store, and the last one standing. It rendered the
 * 35 ESPOhystory stories in one pass, returning audio plus character-level timing, so the app
 * could build its word-timing JSON. That bake is DONE and its output is filed and live.
 *
 * ElevenLabs is out of the house (Art. 0.10, A5.3). The house engine — Chatterbox on Modal —
 * carries Roz now, and every live caller already reads through the one door:
 *     /api/voice?voice=roz&say=<text>
 *
 * If the stories ever need re-baking, they get baked on the house engine, not here. The
 * existing 35 renders and their timing files are untouched by this retirement.
 *
 * Left as a marker rather than removed, so nobody rebuilds this door by accident. It calls no
 * vendor, holds no key, and spends nothing.
 */
module.exports = (req, res) => {
  res.statusCode = 410;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    ok: false,
    reason: 'retired',
    use: '/api/voice?voice=roz&say=hello',
    note: 'The ESPOhystory bake is finished and Roz lives on the house engine. Retired Sep 20 2026.'
  }));
};
