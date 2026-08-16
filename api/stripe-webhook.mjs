// /api/stripe-webhook — Stripe event receiver for Accelerated Experiences LLC.
// Verifies the Stripe-Signature (HMAC-SHA256, v1 scheme) against STRIPE_WEBHOOK_SECRET,
// then records the event. Honest scope (v1): business-OS purchases are RECORDED here and
// surfaced for provisioning — hub provisioning for a new business customer is a human step
// (Anthony), so this webhook never pretends to auto-provision. No secret -> 503, never a
// silent accept. Raw body is read manually because signature verification needs exact bytes.
import { createHmac, timingSafeEqual } from 'node:crypto';

export const config = { api: { bodyParser: false } };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(obj));
}
function rawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => { chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function verify(sigHeader, payload, secret, toleranceSec = 300) {
  if (!sigHeader) return false;
  const parts = Object.fromEntries(sigHeader.split(',').map((p) => { const i = p.indexOf('='); return [p.slice(0, i), p.slice(i + 1)]; }));
  const t = parts.t; const v1 = parts.v1;
  if (!t || !v1) return false;
  if (Math.abs(Date.now() / 1000 - Number(t)) > toleranceSec) return false;
  const expected = createHmac('sha256', secret).update(t + '.' + payload).digest('hex');
  try { return timingSafeEqual(Buffer.from(expected), Buffer.from(v1)); } catch (_) { return false; }
}

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'METHOD' }); }
    const secret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!secret) return send(res, 503, { error: 'NOT_CONNECTED', message: 'Webhook secret not set — Stripe is off.' });

    const payload = await rawBody(req);
    if (!verify(req.headers['stripe-signature'], payload.toString('utf8'), secret)) {
      return send(res, 400, { error: 'BAD_SIGNATURE' });
    }

    const event = JSON.parse(payload.toString('utf8'));
    const type = event.type || '';
    const obj = (event.data && event.data.object) || {};

    // The record: one honest console line per event (visible in Vercel runtime logs).
    // checkout.session.completed -> a purchase to provision; subscription events -> lifecycle.
    if (type === 'checkout.session.completed') {
      console.log('[stripe] PURCHASE', JSON.stringify({
        session: obj.id, livemode: !!event.livemode,
        product: obj.metadata && obj.metadata.product, tier: obj.metadata && obj.metadata.tier,
        amount_total: obj.amount_total, currency: obj.currency,
        customer: obj.customer, email: obj.customer_details && obj.customer_details.email,
        subscription: obj.subscription,
      }));
    } else if (/^customer\.subscription\./.test(type)) {
      console.log('[stripe] SUBSCRIPTION', JSON.stringify({ type, sub: obj.id, status: obj.status, livemode: !!event.livemode }));
    } else {
      console.log('[stripe] EVENT', JSON.stringify({ type, livemode: !!event.livemode }));
    }

    return send(res, 200, { received: true });
  } catch (e) {
    return send(res, 500, { error: 'SERVER', message: String((e && e.message) || e) });
  }
}
