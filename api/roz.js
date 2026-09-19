/* /api/roz — RETIRED Sep 19 2026. Accelerated Experiences, LLC.
 *
 * This was an ElevenLabs door for Roz. Every caller has moved:
 *   - ESPOhystory now reads through the house engine (/api/voice?voice=roz), verified by ear.
 *   - ESPOsketch is scrapped — unlisted in the shop, the sitemap and the catalog.
 * ElevenLabs is out of the house (Art. 0.10, A5.3), and the house engine is free.
 *
 * NOT THIS FILE: ae-cut-and-effect and espodrama each carry their OWN api/roz.mjs in their own
 * repos. Those are different products and a different decision. Retiring this one does not
 * touch them.
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
    note: 'Roz speaks on the house engine now. Retired Sep 19 2026.'
  }));
};
