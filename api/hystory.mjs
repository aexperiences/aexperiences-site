// /api/hystory — the lock on ESPOhystory's paid stories (Accelerated Experiences LLC).
//
// WHAT IT PROTECTS
// The app ships ONE free story in full. The other thirty-four keep their card
// metadata in the app — title, blurb, grade, artwork — so the shelf still shows
// what is for sale, but their text lives in ./_hystory.mjs, which is function
// source and is never served as a static asset. So the paid words are genuinely
// not in the page a visitor can view-source. That is the whole point (Art. IV, VI).
//
// WHO GETS IN
// 1. Comp codes — Anthony's and Jessica's, from HYSTORY_COMP_CODES. Free forever.
// 2. Paying customers — their code is their Stripe subscription id, checked LIVE
//    against Stripe on every unlock. Cancel and it stops opening. There is no
//    second copy of who-has-access to drift out of step with Stripe (Art. 0.6.1),
//    and no new service to pay for (Art. XVII, free first).
//
//   GET ?session=cs_...  -> exchange a completed Checkout Session for a durable code
//   GET ?code=...        -> validate a comp code or a subscription id
// Both return { ok:true, code, stories:{...} } or an honest refusal. Never partial.

import { PAID, FREE_ID } from './_hystory.mjs';

const norm = (s) => String(s || '').trim();

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

/* Comp codes are compared without case or spacing so a code read off a note still
   works. Compared in full, never by prefix. */
function compCodes() {
  return String(process.env.HYSTORY_COMP_CODES || '')
    .split(/[,\s]+/).map((c) => c.trim().toLowerCase()).filter(Boolean);
}

async function stripeGet(path, key) {
  const r = await fetch('https://api.stripe.com/v1/' + path, {
    headers: { authorization: 'Bearer ' + key }
  });
  const j = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, body: j };
}

/* A subscription opens the app while Stripe says it is active or in trial, and only
   if it was bought for THIS product — a Truss OS subscription must never unlock
   a children's history app. */
function subOpens(sub) {
  if (!sub || sub.object !== 'subscription') return false;
  if (!['active', 'trialing', 'past_due'].includes(sub.status)) return false;
  const meta = sub.metadata || {};
  if (meta.product && String(meta.product).toLowerCase() !== 'espohystory') return false;
  return true;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const session = norm(url.searchParams.get('session'));
    const code = norm(url.searchParams.get('code'));
    const key = process.env.STRIPE_SECRET_KEY || '';

    // ---- a comp code: Anthony, Jessica. Checked before Stripe is ever called.
    if (code && compCodes().includes(code.toLowerCase())) {
      return send(res, 200, { ok: true, code, via: 'comp', free: FREE_ID, stories: PAID });
    }

    // ---- exchange a completed Checkout Session for the durable code
    if (session) {
      if (!key) return send(res, 503, { ok: false, error: 'NOT_CONNECTED' });
      if (!/^cs_/.test(session)) return send(res, 400, { ok: false, error: 'BAD_SESSION' });
      const s = await stripeGet('checkout/sessions/' + encodeURIComponent(session), key);
      if (!s.ok) return send(res, 404, { ok: false, error: 'NO_SESSION' });
      const paid = s.body && (s.body.payment_status === 'paid' || s.body.status === 'complete');
      const subId = s.body && (typeof s.body.subscription === 'string'
        ? s.body.subscription : (s.body.subscription && s.body.subscription.id));
      if (!paid || !subId) return send(res, 402, { ok: false, error: 'NOT_PAID' });
      const sub = await stripeGet('subscriptions/' + encodeURIComponent(subId), key);
      if (!sub.ok || !subOpens(sub.body)) return send(res, 402, { ok: false, error: 'NOT_ACTIVE' });
      return send(res, 200, { ok: true, code: subId, via: 'purchase', free: FREE_ID, stories: PAID });
    }

    // ---- a returning customer: their saved subscription id, re-checked every time
    if (code) {
      if (!/^sub_/.test(code)) return send(res, 403, { ok: false, error: 'BAD_CODE' });
      if (!key) return send(res, 503, { ok: false, error: 'NOT_CONNECTED' });
      const sub = await stripeGet('subscriptions/' + encodeURIComponent(code), key);
      if (!sub.ok) return send(res, 403, { ok: false, error: 'BAD_CODE' });
      if (!subOpens(sub.body)) return send(res, 403, { ok: false, error: 'NOT_ACTIVE', status: sub.body && sub.body.status });
      return send(res, 200, { ok: true, code, via: 'subscription', free: FREE_ID, stories: PAID });
    }

    return send(res, 400, { ok: false, error: 'NEED_CODE_OR_SESSION' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
