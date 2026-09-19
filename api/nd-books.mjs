// /api/nd-books — her books. Estimates and expenses for The Neuro-Divulge.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony, from his ND OS list: "She needs accounting that also flows into AE OS. She needs to
// be able to track her expenses. I will give her an estimating machine like mine... her internal
// projects are flagged as Neuro-Divulge." And: "she should only be looking at her stuff."
//
// So this is HIS estimate machine's math, on HER shelf, in the SHARED store:
//
//   books:<office>:est:<id>     one estimate, JSON — the same record shape his machine saves
//                               (estNo, type, title, client, gpm, salary, costs[], pass[])
//   books:<office>:est:ids      sorted set, newest last
//   books:<office>:exp:<id>     one expense (a cost she actually paid), JSON
//   books:<office>:exp:ids      sorted set
//   books:<office>:seq:est      the running estimate number
//
// One key per record, listed by a set — never a shared index (VIII.5.2). Every record carries
// office:'nd' and flag:'Neuro-Divulge', so AE OS reads books:*:* and sees the whole company,
// and ND OS asks only for BRAND and sees only hers.
//
// The math, copied from estimate-machine.html on the hub and not redesigned (XVIII.8.2):
//   costBase = costs + salary            price = costBase / (1 - gpm/100)   (external only)
//   total to client = price + pass-throughs (at cost)      internal: total = costBase + pass
import { hub, ndWho, BRAND } from './_nd-auth.mjs';

const E = (id) => 'books:' + BRAND + ':est:' + id;
const X = (id) => 'books:' + BRAND + ':exp:' + id;
const EIDS = 'books:' + BRAND + ':est:ids';
const XIDS = 'books:' + BRAND + ':exp:ids';
const SEQ = 'books:' + BRAND + ':seq:est';
const STATUS = new Set(['estimate', 'sent', 'won', 'lost', 'invoiced', 'paid']);

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v) => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const lines = (a) => (Array.isArray(a) ? a : []).slice(0, 40)
  .map((r) => ({ d: clean(r && r.d, 120), a: num(r && r.a) }))
  .filter((r) => r.d || r.a);

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
async function getJSON(k) { const raw = await hub('GET', k); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
async function all(ids, K) {
  const list = (await hub('ZREVRANGE', ids, '0', '999')) || [];
  if (!list.length) return [];
  const raws = await hub('MGET', ...list.map(K));
  return raws.map((r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }).filter(Boolean);
}

// The quote, computed the way his machine computes it.
export function quote(e) {
  const cw = (e.costs || []).reduce((t, c) => t + num(c.a), 0);
  const pass = (e.pass || []).reduce((t, c) => t + num(c.a), 0);
  const pay = num(e.salary);
  const cb = cw + pay;
  const gpm = num(e.gpm);
  const ext = e.type === 'external';
  const price = ext && gpm < 100 ? cb / (1 - gpm / 100) : 0;
  const total = ext ? price + pass : cb + pass;
  return { costs: num(cw), salary: pay, costBase: num(cb), pass: num(pass), gpm, price: num(price), total: num(total), profit: num(ext ? price - cb : 0) };
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      const [estimates, expenses] = await Promise.all([all(EIDS, E), all(XIDS, X)]);
      return send(res, 200, { ok: true, office: BRAND, estimates, expenses });
    }

    if (req.method === 'POST') {
      const b = await body(req);
      if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
      const now = new Date().toISOString();

      if (b.save) {
        const s = b.save;
        const id = clean(s.id, 40);
        const cur = id ? await getJSON(E(id)) : null;
        const type = s.type === 'internal' ? 'internal' : 'external';
        const rec = Object.assign({}, cur || { id: id || mint(), createdAt: Date.now(), by: who.name || 'ND OS' }, {
          office: BRAND, flag: 'Neuro-Divulge',
          type, title: clean(s.title, 160) || 'Untitled job', client: clean(s.client, 160),
          gpm: type === 'external' ? Math.min(99, Math.max(0, num(s.gpm))) : 0,
          salary: num(s.salary), costs: lines(s.costs), pass: lines(s.pass),
          status: STATUS.has(s.status) ? s.status : (cur && cur.status) || 'estimate',
          notes: clean(s.notes, 2000), updatedAt: now
        });
        if (!rec.estNo) rec.estNo = 'ND-EST-' + String(await hub('INCR', SEQ)).padStart(4, '0');
        rec.quote = quote(rec);
        await hub('SET', E(rec.id), JSON.stringify(rec));
        await hub('ZADD', EIDS, String(rec.createdAt), rec.id);
        return send(res, 200, { ok: true, estimate: rec });
      }

      if (b.remove) {
        const id = clean(b.remove, 40);
        await hub('DEL', E(id)); await hub('ZREM', EIDS, id);
        return send(res, 200, { ok: true, removed: id });
      }

      if (b.expense) {
        const x = b.expense;
        const id = clean(x.id, 40);
        const cur = id ? await getJSON(X(id)) : null;
        const what = clean(x.what, 200);
        if (!what) return send(res, 400, { ok: false, error: 'NEED_TEXT' });
        const on = clean(x.on, 10);
        const rec = Object.assign({}, cur || { id: id || mint(), createdAt: Date.now(), by: who.name || 'ND OS' }, {
          office: BRAND, flag: 'Neuro-Divulge',
          what, amount: num(x.amount), on: on && !isNaN(Date.parse(on)) ? on : now.slice(0, 10),
          kind: clean(x.kind, 40) || 'Supplies', job: clean(x.job, 40), notes: clean(x.notes, 1000), updatedAt: now
        });
        await hub('SET', X(rec.id), JSON.stringify(rec));
        await hub('ZADD', XIDS, String(rec.createdAt), rec.id);
        return send(res, 200, { ok: true, expense: rec });
      }

      if (b.removeExpense) {
        const id = clean(b.removeExpense, 40);
        await hub('DEL', X(id)); await hub('ZREM', XIDS, id);
        return send(res, 200, { ok: true, removed: id });
      }

      return send(res, 400, { ok: false, error: 'UNKNOWN' });
    }

    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    const m = String((e && e.message) || e);
    return send(res, m === 'NO_HUB_STORE' ? 503 : 500, { ok: false, error: m === 'NO_HUB_STORE' ? 'NOT_CONFIGURED' : 'SERVER', message: m });
  }
}
