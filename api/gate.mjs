// /api/gate — the lock on every Accelerated Experiences CONSUMER app.
//
// Generalised from /api/hystory (Sep 17 2026), which proved the shape:
//   * a COMP CODE opens it forever — the family's, and any code handed out
//   * a PAYING CUSTOMER's durable key is their Stripe subscription id, re-checked
//     LIVE against Stripe on every unlock. Cancel and it stops opening. There is no
//     second copy of who-has-access to drift out of step with Stripe (Art. 0.6.1),
//     and no new service to pay for (Art. XVII, free first).
//
// ⛔ OS HUBS ARE NEVER GATED. Walking into a hub IS the sale. This endpoint answers
//    only for apps listed in APPS below; anything else is refused as NOT_GATED.
//
//   GET ?app=<id>&session=cs_...  -> exchange a completed Checkout Session for a code
//   GET ?app=<id>&code=...        -> validate a comp code or a subscription id
// Returns { ok:true, code, via, until? } or an honest refusal. Never partial.

const norm = (s) => String(s || '').trim();

/* Every gated consumer app, and which subscription opens it. A product opens
   itself; a BUNDLE opens each of its members. Anything absent is ungated. */
const FAMILY = {
  'neuro-divulge': ['thread', 'espotendency', 'esporegulator', 'espofocus'],
  'espo-music':    ['espofunkmaster']
};
const APPS = new Set([
  // The Neuro-Divulge
  'thread', 'espotendency', 'esporegulator', 'espofocus',
  // the rest of the sold consumer apps, Sep 18 2026
  'espofunkmaster', 'revolver', 'espovocab', 'espohystory',
  'espovineyard', 'espostogie', 'espowhiskey', 'espobarista',
  // apps on their own domains, gated across origin
  'espo-genius', 'the-narcs', 'espo-drama',
  // Xpense OS: the door ships now and opens itself freely until Oct 1 2026 (data-from on
  // its tag), because its page promises free use through September 30.
  'xpense',
  // internal: the production registry. No subscription sells it, so only a comp
  // code opens it - which is exactly the intent.
  'ops'
]);

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.setHeader('access-control-allow-origin', '*');
  res.end(JSON.stringify(obj));
}

/* Comp codes come from the environment so a code can be added or revoked without a
   deploy. Compared without case or spacing, so a code read off a note still works,
   and always in full — never by prefix.
     AE_COMP_CODES=weirdo,somethingelse            -> opens every gated app
     AE_COMP_CODES_THREAD=teacherpilot             -> opens only ND Thread          */
function compCodes(app) {
  const glob = String(process.env.AE_COMP_CODES || '');
  const perApp = String(process.env['AE_COMP_CODES_' + String(app).toUpperCase().replace(/[^A-Z0-9]/g, '')] || '');
  return (glob + ',' + perApp)
    .split(/[,\s]+/).map((c) => c.trim().toLowerCase()).filter(Boolean);
}

async function stripeGet(path, key) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    headers: { authorization: 'Bearer ' + key }
  });
  const j = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body: j };
}

/* A subscription opens an app while Stripe says it is live, and only if it was
   bought for THIS app or for a bundle containing it. A Truss OS subscription must
   never open a regulation tool for kids. */
function subOpens(sub, app) {
  if (!sub || sub.object !== 'subscription') return false;
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return false;
  const bought = String((sub.metadata || {}).product || '').toLowerCase();
  if (!bought) return false;                       // unstamped: refuse, never assume
  if (bought === String(app).toLowerCase()) return true;
  return (FAMILY[bought] || []).includes(String(app).toLowerCase());
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const app = norm(url.searchParams.get('app')).toLowerCase();
    const session = norm(url.searchParams.get('session'));
    const code = norm(url.searchParams.get('code'));
    const key = process.env.STRIPE_SECRET_KEY || '';

    if (!app) return send(res, 400, { ok: false, error: 'NEED_APP' });
    if (!APPS.has(app)) return send(res, 200, { ok: true, via: 'ungated', code: '' });

    // ---- a comp code. Checked before Stripe is ever called.
    if (code && compCodes(app).includes(code.toLowerCase())) {
      return send(res, 200, { ok: true, code, via: 'comp' });
    }

    // ---- exchange a completed Checkout Session for the durable code
    if (session) {
      if (!key) return send(res, 503, { ok: false, error: 'NOT_CONNECTED' });
      if (!/^cs_/.test(session)) return send(res, 400, { ok: false, error: 'BAD_SESSION' });
      const s = await stripeGet('checkout/sessions/' + encodeURIComponent(session), key);
      if (!s.ok) return send(res, 404, { ok: false, error: 'NO_SESSION' });
      const b = s.body || {};
      const done = b.payment_status === 'paid' || b.status === 'complete';
      const subId = typeof b.subscription === 'string' ? b.subscription : (b.subscription && b.subscription.id);
      if (!done || !subId) return send(res, 402, { ok: false, error: 'NOT_PAID' });
      const sub = await stripeGet('subscriptions/' + encodeURIComponent(subId), key);
      if (!sub.ok || !subOpens(sub.body, app)) return send(res, 402, { ok: false, error: 'NOT_ACTIVE' });
      return send(res, 200, { ok: true, code: subId, via: 'purchase', until: sub.body.current_period_end || null });
    }

    // ---- a returning customer: their saved subscription id, re-checked every time
    if (code) {
      if (!/^sub_/.test(code)) return send(res, 403, { ok: false, error: 'BAD_CODE' });
      if (!key) return send(res, 503, { ok: false, error: 'NOT_CONNECTED' });
      const sub = await stripeGet('subscriptions/' + encodeURIComponent(code), key);
      if (!sub.ok) return send(res, 403, { ok: false, error: 'BAD_CODE' });
      if (!subOpens(sub.body, app)) {
        return send(res, 403, { ok: false, error: 'NOT_ACTIVE', status: sub.body && sub.body.status });
      }
      return send(res, 200, { ok: true, code, via: 'subscription', until: sub.body.current_period_end || null });
    }

    return send(res, 400, { ok: false, error: 'NEED_CODE_OR_SESSION' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
