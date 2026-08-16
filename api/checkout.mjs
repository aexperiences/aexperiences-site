// /api/checkout — Stripe Checkout for the business-side OS tiers (Accelerated Experiences LLC).
// ONE PRICE RECORD: prices are validated at request time against /api/pricing (which reads
// catalog.js) — this endpoint can never quote a number the store doesn't show.
// SAFE WHILE OFF: with no STRIPE_SECRET_KEY in the env, it answers { ready:false } honestly.
// Anthony alone pastes keys (test first, then live) — that is the only switch.
//   POST { product:"truss", tier:"Firm" }  ->  { ready:true, url:"https://checkout.stripe.com/..." }
//   GET  ?product=truss&tier=Firm         ->  302 to Stripe Checkout (for plain links)

const SITE = 'https://aexperiences.com';

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

async function priceSpine() {
  const r = await fetch(SITE + '/api/pricing', { cache: 'no-store' });
  if (!r.ok) throw new Error('price record unavailable (' + r.status + ')');
  const j = await r.json();
  return Array.isArray(j) ? j : (j.products || []);
}

export default async function handler(req, res) {
  try {
    const key = process.env.STRIPE_SECRET_KEY || '';
    const isGet = req.method === 'GET';
    const q = new URL(req.url, SITE).searchParams;
    const b = isGet ? { product: q.get('product'), tier: q.get('tier') } : await readBody(req);

    const want = String(b.product || '').trim().toLowerCase();
    const wantTier = String(b.tier || '').trim().toLowerCase();
    if (!want || !wantTier) return send(res, 400, { error: 'NEED_PRODUCT_AND_TIER' });

    // Validate against the store's one price record — never trust a client-sent amount.
    const spine = await priceSpine();
    const prod = spine.find((p) => String(p.slug || '').toLowerCase() === want || String(p.name || '').toLowerCase() === want);
    if (!prod) return send(res, 404, { error: 'UNKNOWN_PRODUCT', product: want });
    const tier = (prod.tiers || []).find((t) => String(t.name || '').toLowerCase() === wantTier);
    if (!tier || !(tier.monthly > 0)) return send(res, 404, { error: 'UNKNOWN_TIER', product: prod.name, tier: wantTier });

    if (!key) {
      // Honest OFF state — the store shows the path; nothing can charge until Anthony pastes keys.
      return send(res, 200, { ready: false, product: prod.name, tier: tier.name, monthly: tier.monthly,
        message: 'Checkout is not connected yet. Stripe stays off until Accelerated Experiences LLC turns it on.' });
    }

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    form.set('success_url', SITE + '/buy.html?state=success&product=' + encodeURIComponent(prod.slug || prod.name) + '&session_id={CHECKOUT_SESSION_ID}');
    form.set('cancel_url', SITE + '/buy.html?state=cancel&product=' + encodeURIComponent(prod.slug || prod.name));
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(Math.round(tier.monthly * 100)));
    form.set('line_items[0][price_data][recurring][interval]', 'month');
    form.set('line_items[0][price_data][product_data][name]', prod.name + ' — ' + tier.name + ' (monthly)');
    form.set('metadata[product]', prod.slug || prod.name);
    form.set('metadata[tier]', tier.name);
    form.set('metadata[monthly]', String(tier.monthly));
    form.set('allow_promotion_codes', 'false');

    const sr = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    const sj = await sr.json();
    if (!sr.ok) return send(res, 502, { error: 'STRIPE', message: (sj && sj.error && sj.error.message) || ('stripe ' + sr.status) });

    if (isGet) { res.statusCode = 302; res.setHeader('location', sj.url); return res.end(); }
    return send(res, 200, { ready: true, url: sj.url, id: sj.id, product: prod.name, tier: tier.name, monthly: tier.monthly,
      livemode: !!sj.livemode });
  } catch (e) {
    return send(res, 500, { error: 'SERVER', message: String((e && e.message) || e) });
  }
}
