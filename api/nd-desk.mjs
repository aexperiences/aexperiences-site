import { ndWho } from './_nd-auth.mjs';
// /api/nd-desk — what the Desk in ND OS reads. Accelerated Experiences LLC · Sep 2026
//
// One endpoint, three shelves that already exist: the AE beacon's traffic rows
// (api/px.mjs writes them), Stripe's subscriptions, and the blog's own list. No new
// service, no new bill (Art. XVII).
//
// It answers only to the ND key, and it answers HONESTLY: every number ships with the
// sample it came from, so the Triad on the page can say "not enough yet" instead of
// drawing a confident line through four visits. Nothing here invents a figure.
//
//   GET ?days=14   -> { traffic, money, notes, sample }

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

// What counts as ND. A hit belongs to the family if the beacon tagged it neurodivulge,
// or the path is under /nd/, or it is one of the four apps sold under the ND label.
const ND_SITES = new Set(['neurodivulge', 'nd']);
const ND_APPS = ['thread', 'espotendency', 'esporegulator', 'espofocus'];
const ND_PRODUCTS = new Set(['neuro-divulge', ...ND_APPS]);

async function redis(cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('store: ' + j.error);
  return j.result;
}
async function pipe(cmds) {
  const r = await fetch(KV_URL.replace(/\/$/, '') + '/pipeline', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('store_' + r.status);
  return (await r.json()).map((x) => (x && x.result !== undefined ? x.result : null));
}

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}

const isND = (h) =>
  ND_SITES.has(String(h.site || '').toLowerCase()) ||
  /^\/nd(\/|$)/.test(String(h.path || '')) ||
  ND_APPS.some((a) => String(h.path || '').toLowerCase().includes(a));

function tally(rows, pick, cap = 8) {
  const m = new Map();
  for (const r of rows) {
    const k = pick(r);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, cap).map(([k, n]) => ({ k, n }));
}

/* ---- Stripe: what the ND label actually collected ------------------------- */
async function money() {
  const key = process.env.STRIPE_SECRET_KEY || '';
  if (!key) return { ready: false, reason: 'Payments are not switched on here yet.' };
  const get = async (path) => {
    const r = await fetch('https://api.stripe.com/v1/' + path, {
      headers: { authorization: 'Bearer ' + key }
    });
    if (!r.ok) throw new Error('stripe_' + r.status);
    return r.json();
  };
  const subs = await get('subscriptions?status=all&limit=100&expand[]=data.items.data.price');
  let mrrCents = 0, live = 0, trialing = 0, cancelled = 0;
  const rows = [];
  for (const s of subs.data || []) {
    const prod = String((s.metadata || {}).product || '').toLowerCase();
    if (!ND_PRODUCTS.has(prod)) continue;
    const it = (s.items && s.items.data && s.items.data[0]) || null;
    const price = it && it.price ? it.price : null;
    const amt = price ? Number(price.unit_amount || 0) * Number(it.quantity || 1) : 0;
    const per = price && price.recurring ? price.recurring.interval : '';
    const monthly = per === 'year' ? Math.round(amt / 12) : per === 'week' ? amt * 4 : amt;
    if (s.status === 'active') { live++; mrrCents += monthly; }
    else if (s.status === 'trialing') { trialing++; }
    else if (['canceled', 'incomplete_expired', 'unpaid'].includes(s.status)) { cancelled++; }
    rows.push({ product: prod, status: s.status, cents: amt, per, started: s.created });
  }
  return {
    ready: true, mrrCents, live, trialing, cancelled,
    counted: rows.length, more: !!subs.has_more, rows: rows.slice(0, 40)
  };
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOK) return send(res, 503, { ok: false, error: 'NO_STORE' });
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);   // AE OS session or the machine word (_nd-auth.mjs)
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    const days = Math.min(60, Math.max(1, Number(url.searchParams.get('days') || 14)));
    const today = new Date();
    const dayKeys = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(today.getTime() - i * 86400000);
      dayKeys.push(d.toISOString().slice(0, 10));
    }

    // rows, newest day first; 400 per day is plenty and keeps this honest about cost
    const lists = await pipe(dayKeys.map((d) => ['LRANGE', 'ae:tr:' + d, '0', '399']));
    const uniq = await pipe(dayKeys.map((d) => ['PFCOUNT', 'ae:tr:vis:' + d]));

    const perDay = [];
    let all = [];
    dayKeys.forEach((d, i) => {
      const raw = lists[i] || [];
      const rows = [];
      for (const s of raw) {
        try {
          const h = JSON.parse(s);
          if (h.bot) continue;
          if (!isND(h)) continue;
          rows.push(h);
        } catch (_) {}
      }
      perDay.push({ day: d, hits: rows.length, visitorsAllSites: Number(uniq[i] || 0) });
      all = all.concat(rows);
    });
    perDay.reverse();

    const people = new Set(all.map((h) => h.vid || h.ip).filter(Boolean));
    const recent = all
      .sort((a, b) => String(b.t).localeCompare(String(a.t)))
      .slice(0, 30)
      .map((h) => ({
        t: h.t, path: h.path, ip: h.ip, city: h.city, region: h.region, country: h.country,
        device: h.device, ref: h.refHost, nv: !!h.nv
      }));

    let notes = { posts: 0, published: 0, drafts: 0 };
    try {
      const slugs = (await redis(['LRANGE', 'nd:posts', '0', '-1'])) || [];
      notes.posts = slugs.length;
      if (slugs.length) {
        const got = await pipe(slugs.map((s) => ['GET', 'nd:post:' + s]));
        for (const g of got) {
          try { (JSON.parse(g).status === 'published' ? notes.published++ : notes.drafts++); } catch (_) {}
        }
      }
    } catch (_) {}

    let cash;
    try { cash = await money(); }
    catch (e) { cash = { ready: false, reason: 'Stripe did not answer just now.' }; }

    return send(res, 200, {
      ok: true,
      window: { days, from: dayKeys[dayKeys.length - 1], to: dayKeys[0] },
      traffic: {
        hits: all.length,
        people: people.size,
        perDay,
        pages: tally(all, (h) => h.path),
        from: tally(all, (h) => h.refHost || 'direct'),
        places: tally(all, (h) => [h.city, h.region].filter(Boolean).join(', ') || h.country),
        devices: tally(all, (h) => h.device, 4),
        recent
      },
      money: cash,
      notes,
      // the sample, always, so the page can refuse to over-read it
      sample: { rows: all.length, people: people.size, days, capPerDay: 400 }
    });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
