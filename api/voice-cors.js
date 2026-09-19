/* /api/voice-cors — RETIRED Sep 19 2026. Accelerated Experiences, LLC.
 *
 * This was an ElevenLabs door, opened in August for the walkthrough-video render pipeline.
 * Nothing calls it any more — an org-wide search on Sep 19 2026 found zero callers — and
 * ElevenLabs is out of the house (Art. 0.10, A5.3). The house voice engine answers at
 * /api/voice for the whole cast, and it is free.
 *
 * The file is left here as a marker rather than removed, so nobody rebuilds this door by
 * accident. It calls no vendor, holds no key, and spends nothing.
 *
 * If you landed here looking for a voice: use  /api/voice?voice=<name>&say=<text>
 */
module.exports = (req, res) => {
  res.statusCode = 410;
  res.setHeader('content-type', 'application/json');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify({
    ok: false,
    reason: 'retired',
    use: '/api/voice?voice=brian&say=hello',
    note: 'The house voice engine replaced this on Sep 19 2026.'
  }));
};
