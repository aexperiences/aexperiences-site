// /api/checkout — Stripe Checkout for the business-side OS tiers (Accelerated Experiences LLC).
// ONE PRICE RECORD: prices are validated at request time against /api/pricing (which reads
// catalog.js) — this endpoint can never quote a number the store doesn't show.
// SAFE WHILE OFF: with no STRIPE_SECRET_KEY in the env, it answers { ready:false } honestly.
// Anthony alone pastes keys (test first, then live) — that is the only switch.
//   POST { product:"truss", tier:"Firm" }  ->  { ready:true, url:"https://checkout.stripe.com/..." }
//   GET  ?product=truss&tier=Firm         ->  302 to Stripe Checkout (for plain links)
// Consumer apps carry PLANS rather than tiers, and a plan states its own billing
// interval, so a yearly price can never be charged as a monthly one:
//   GET  ?product=espohystory&plan=Yearly -> 302 to Stripe Checkout (billed yearly)

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

async function priceBook() {
  const r = await fetch(SITE + '/api/pricing', { cache: 'no-store' });
  if (!r.ok) throw new Error('price record unavailable (' + r.status + ')');
  const j = await r.json();
  // Live shape (verified Aug 15 2026): { ok, updatedAt, source, appShop, hubs:[{id,name,tag,tiers:[{n,name,mo,inc,firstYear}]}] }
  // Consumer apps (added Sep 12 2026): apps:[{id,name,tag,plans:[{name,amount,interval,inc}]}]
  if (Array.isArray(j)) return { hubs: j, apps: [] };
  return { hubs: j.hubs || j.products || [], apps: j.apps || [] };
}

export default async function handler(req, res) {
  try {
    const key = process.env.STRIPE_SECRET_KEY || '';
    const isGet = req.method === 'GET';
    const q = new URL(req.url, SITE).searchParams;
    const b = isGet ? { product: q.get('product'), tier: q.get('tier'), plan: q.get('plan') } : await readBody(req);

    const want = String(b.product || '').trim().toLowerCase();
    const wantLine = String(b.tier || b.plan || '').trim().toLowerCase();
    if (!want || !wantLine) return send(res, 400, { error: 'NEED_PRODUCT_AND_TIER' });

    // Validate against the store's one price record — never trust a client-sent amount.
    const book = await priceBook();
    const byId = (p) => String(p.id || p.slug || '').toLowerCase() === want || String(p.name || '').toLowerCase() === want;

    let prod = book.hubs.find(byId);
    let lineName, amount, interval, isApp = false;

    if (prod) {
      const tier = (prod.tiers || []).find((t) => String(t.name || t.n || '').toLowerCase() === wantLine);
      amount = tier ? Number(tier.mo != null ? tier.mo : tier.monthly) : 0;
      if (!tier || !(amount > 0)) return send(res, 404, { error: 'UNKNOWN_TIER', product: prod.name, tier: wantLine });
      lineName = tier.name || tier.n;
      interval = 'month';
    } else {
      prod = book.apps.find(byId);
      if (!prod) return send(res, 404, { error: 'UNKNOWN_PRODUCT', product: want });
      isApp = true;
      const plan = (prod.plans || []).find((p) => String(p.name || '').toLowerCase() === wantLine);
      amount = plan ? Number(plan.amount) : 0;
      // The interval comes from the record, never from the caller and never assumed.
      interval = plan && (plan.interval === 'year' || plan.interval === 'month') ? plan.interval : '';
      if (!plan || !(amount > 0) || !interval) return send(res, 404, { error: 'UNKNOWN_PLAN', product: prod.name, plan: wantLine });
      lineName = plan.name;
    }

    if (!key) {
      // Honest OFF state — the store shows the path; nothing can charge until Anthony pastes keys.
      return send(res, 200, { ready: false, product: prod.name, tier: lineName, amount, interval,
        message: 'Checkout is not connected yet. Stripe stays off until Accelerated Experiences LLC turns it on.' });
    }

    const form = new URLSearchParams();
    form.set('mode', 'subscription');
    /* An app sends the buyer straight back into the app, carrying the session so it
       unlocks itself on arrival. A hub has nothing to unlock, so it lands on buy.html. */
    /* An app on its own domain gives an absolute url; one in this store gives a path. Both
       have to come back to the app itself, so the base is taken from the record (Sep 13 2026). */
    const appHome = prod.url ? (/^https?:\/\//i.test(prod.url) ? prod.url : SITE + prod.url) : '';
    const home = isApp && appHome ? (appHome + (appHome.includes('?') ? '&' : '?') + 'unlocked={CHECKOUT_SESSION_ID}') : null;
    form.set('success_url', home || (SITE + '/buy.html?state=success&product=' + encodeURIComponent(prod.id || prod.name) + '&session_id={CHECKOUT_SESSION_ID}'));
    form.set('cancel_url', SITE + '/buy.html?state=cancel&product=' + encodeURIComponent(prod.id || prod.name));
    form.set('line_items[0][quantity]', '1');
    form.set('line_items[0][price_data][currency]', 'usd');
    form.set('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
    form.set('line_items[0][price_data][recurring][interval]', interval);
    form.set('line_items[0][price_data][product_data][name]', prod.name + ' — ' + lineName + ' (' + (interval === 'year' ? 'yearly' : 'monthly') + ')');
    form.set('metadata[product]', prod.id || prod.name);
    form.set('metadata[tier]', lineName);
    form.set('metadata[amount]', String(amount));
    form.set('metadata[interval]', interval);
    form.set('metadata[kind]', isApp ? 'app' : 'hub');
    form.set('allow_promotion_codes', 'false');
    /* A free trial, when the price record states one for this app. Stripe still takes the
       card up front, charges nothing today, and bills on day trial+1 (Anthony, Sep 13 2026). */
    const trialDays = isApp ? Math.floor(Number(prod.trial) || 0) : 0;
    if (trialDays > 0 && trialDays <= 730) form.set('subscription_data[trial_period_days]', String(trialDays));
    // Stripe Tax (Anthony, Sep 11 2026): ask Stripe to add sales tax where Accelerated Experiences LLC is registered.
    form.set('automatic_tax[enabled]', 'true');
    form.set('line_items[0][price_data][product_data][tax_code]', 'txcd_10103001'); // SaaS — business use
    form.set('billing_address_collection', 'required');
    form.set('line_items[0][price_data][tax_behavior]', 'exclusive'); // Anthony, Sep 12 2026: tax goes ON TOP of the price, never inside it

    const post = (body) => fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + key, 'content-type': 'application/x-www-form-urlencoded' },
      body,
    });

    let sr = await post(form.toString());
    let sj = await sr.json();
    if (!sr.ok && /tax/i.test((sj && sj.error && sj.error.message) || '')) {
      // Stripe Tax not switched on in the dashboard yet — sell without it rather than refuse the sale.
      form.delete('automatic_tax[enabled]');
      form.delete('line_items[0][price_data][product_data][tax_code]');
      form.delete('billing_address_collection');
      form.delete('line_items[0][price_data][tax_behavior]');
      sr = await post(form.toString());
      sj = await sr.json();
    }
    if (!sr.ok) return send(res, 502, { error: 'STRIPE', message: (sj && sj.error && sj.error.message) || ('stripe ' + sr.status) });

    if (isGet) { res.statusCode = 302; res.setHeader('location', sj.url); return res.end(); }
    return send(res, 200, { ready: true, url: sj.url, id: sj.id, product: prod.name, tier: lineName, amount, interval,
      trialDays, livemode: !!sj.livemode });
  } catch (e) {
    return send(res, 500, { error: 'SERVER', message: String((e && e.message) || e) });
  }
}
