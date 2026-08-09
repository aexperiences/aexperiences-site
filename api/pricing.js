// /api/pricing — the store's price book, served from the one file that already publishes it.
//
// WHY THIS EXISTS
// catalog.js has always named a PRICE_API. The hub's price desk answers on
// aexperiences.studio; nothing answered on the store, so anything asking
// aexperiences.com for prices got a 404 and fell back to whatever copy it was
// carrying. That is precisely how nine of twelve showrooms drifted far enough
// to quote money the store contradicted (Aug 8 2026).
//
// So the store now answers for its own prices, and it does not keep a second
// copy to do it: every number here is parsed out of catalog.js at request time.
// catalog.js is what the storefront actually renders, so this endpoint cannot
// disagree with the store — there is only ever one set of numbers.
//
// WHAT IT DOES NOT DO
// It does not set a price, and it has no opinion about what a price should be.
// Anthony sets prices; this only reports what is already published (Art. III,
// Art. IV). If catalog.js is wrong, this is wrong in exactly the same way, which
// is the point — a reader can never be quietly out of step with the shelf.
//
//   GET /api/pricing              -> { updatedAt, source, appShop, hubs:[...] }
//   GET /api/pricing?product=abode -> { ok, product, name, tiers:[...] }
//
// The bare form matches the shape catalog.js's own refreshPrices() consumes
// (rec.hubs[].tiers[].mo/.build/.firstYear). The ?product= form is what the
// twelve showrooms call on boot to check their baked-in copy hasn't drifted.

const fs = require('fs');
const path = require('path');

/* Old ids kept resolving, same as catalog.js does. Retired NAMES never come
   back (Art. IV.4) but a retired id may still be a live bookmark or a hub
   record, and answering 404 to it would look like a missing product. */
const RETIRED_ID = {
  homestead: 'abode', draftline: 'buttress', datum: 'truss', marquee: 'musical',
  reel: '8mm', encore: 'amphitheater', cartwheel: 'lilninja', showroom: '4barrel',
  aefunkmaster: 'espofunkmaster'
};
const canonId = (id) => RETIRED_ID[id] || id;

let CACHE = null, CACHE_AT = 0;
const TTL = 60 * 1000;

async function catalogSource(req) {
  /* The file first — no network, no dependency on our own edge. If the function
     bundle doesn't carry it, fall back to fetching the asset we just served. */
  for (const p of ['catalog.js', 'public/catalog.js']) {
    try {
      const f = path.join(process.cwd(), p);
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    } catch (_) {}
  }
  const host = (req && req.headers && req.headers.host) || 'www.aexperiences.com';
  const r = await fetch('https://' + host + '/catalog.js');
  if (!r.ok) throw new Error('catalog.js unreachable (' + r.status + ')');
  return r.text();
}

/* Pull one bracket-balanced, string-aware block starting at `from`. Written this
   way rather than as a greedy regex because a blurb containing a bracket would
   otherwise run the match straight past the end of the product. */
function block(src, from, open, close) {
  let depth = 0, start = -1, inStr = null;
  for (let i = from; i < src.length; i++) {
    const c = src[i];
    if (inStr) { if (c === '\\') i++; else if (c === inStr) inStr = null; continue; }
    if (c === "'" || c === '"' || c === '`') { inStr = c; continue; }
    if (c === open) { if (!depth) start = i; depth++; }
    else if (c === close) { depth--; if (!depth) return { start, end: i, body: src.slice(start + 1, i) }; }
  }
  return null;
}

function parseCatalog(src) {
  const hubs = [];
  const re = /\{\s*id:\s*'([a-z0-9]+)'/g;
  let m;
  while ((m = re.exec(src))) {
    const id = m[1];
    const entry = block(src, m.index, '{', '}');
    if (!entry) continue;
    const body = entry.body;

    /* Only live products, and only ones that actually carry tiers — an app with
       a single price is not a tiered hub and must not be invented into one. */
    if (!/state:\s*'live'/.test(body)) continue;
    const tk = body.indexOf('tiers:');
    if (tk < 0) continue;
    const tb = block(body, tk, '[', ']');
    if (!tb) continue;

    const tiers = [];
    const row = /\[\s*(['"])((?:\\.|(?!\1).)*)\1\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(['"])((?:\\.|(?!\5).)*)\5)?/g;
    let t;
    while ((t = row.exec(tb.body))) {
      const mo = +t[3], build = +t[4];
      tiers.push({
        n: t[2].replace(/\\(.)/g, '$1'),
        name: t[2].replace(/\\(.)/g, '$1'),
        mo, build,
        inc: t[6] ? t[6].replace(/\\(.)/g, '$1') : '',
        /* Arithmetic on published numbers, not a new price: twelve months plus
           the one-time build. catalog.js's own reader expects this field. */
        firstYear: mo * 12 + build
      });
    }
    if (!tiers.length) continue;

    const name = (body.match(/name:\s*'([^']+)'/) || [])[1] || id;
    const tag  = (body.match(/tag:\s*'([^']+)'/)  || [])[1] || '';
    hubs.push({ id, name, tag, tiers });
  }

  const shop = src.match(/appShop:\s*\{\s*build:\s*(\d+)[^}]*terms:\s*'([^']*)'[^}]*turnaround:\s*'([^']*)'/);
  const appShop = shop
    ? { build: +shop[1], terms: shop[2], turnaround: shop[3] }
    : null;

  return { hubs, appShop };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');   /* the showrooms are cross-origin */
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'GET') { res.status(405).json({ ok: false, error: 'GET only' }); return; }

  try {
    if (!CACHE || Date.now() - CACHE_AT > TTL) {
      CACHE = parseCatalog(await catalogSource(req));
      CACHE_AT = Date.now();
    }
    const book = CACHE;
    if (!book.hubs.length) throw new Error('no priced products parsed from catalog.js');

    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400');

    const want = req.query && req.query.product;
    if (want) {
      const id = canonId(String(want).toLowerCase());
      const hub = book.hubs.find((h) => h.id === id);
      if (!hub) { res.status(404).json({ ok: false, error: 'no such product', product: id }); return; }
      res.status(200).json({
        ok: true, product: hub.id, name: hub.name, tiers: hub.tiers,
        source: 'catalog.js', updatedAt: new Date(CACHE_AT).toISOString()
      });
      return;
    }

    res.status(200).json({
      ok: true,
      updatedAt: new Date(CACHE_AT).toISOString(),
      source: 'catalog.js — the store\'s published catalogue, parsed at request time',
      appShop: book.appShop,
      hubs: book.hubs
    });
  } catch (e) {
    /* Say what broke. A pricing endpoint that fails quietly is how the drift
       started; anything reading this is built to keep its own numbers on error. */
    res.status(503).json({ ok: false, error: String((e && e.message) || e) });
  }
};
