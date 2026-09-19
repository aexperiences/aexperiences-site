// /api/nd-jobs — her production job board.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony: "Give her a production job board... plugged into her calendar. When she enters a job,
// it is a drop down and you can check multiple if they are a cohesive project... then put a spot
// for expenses that hit the spine and also goes into her little accounting department."
//
// A job lives in the SHARED hub store (the spine), one key per job, office-flagged like her books
// and her people, so AE OS can read the whole company's production and ND OS reads only hers:
//
//   jobs:<office>:j:<id>     one job, JSON
//   jobs:<office>:ids        sorted set, newest last
//
// A JOB IS AN ESTIMATE (Anthony, Sep 18 2026: "her job is like an estimator, and it works like
// mine... gpm default 67% but adjustable"). Every job carries the hub estimate machine's fields —
// costs[], salary (her time), pass[], gpm — and the same math: price = (costs + time) / (1 - gpm),
// pass-throughs added at cost. An internal job is a cost tally with no markup. Books lists these
// as her estimates; there is no second estimate record anywhere.
//
// A job's expenses are NOT stored here twice: they are Books expenses (api/nd-books, books:nd:exp:*)
// carrying job:<id>. One record, two views — the job shows its total, the Books show the line.
//
//   GET                       her jobs, newest first             (signed in)
//   POST { save:{…} }         create or update                   (signed in)
//   POST { remove:id }        remove                              (signed in)
import { hub, ndWho, BRAND } from './_nd-auth.mjs';

const J = (id) => 'jobs:' + BRAND + ':j:' + id;
const IDS = 'jobs:' + BRAND + ':ids';

// The kinds of work she does. `soon` marks a channel that does not exist yet; a job can still be
// planned for it. Labels are hers to rename (Blog Post is getting a new name).
export const KINDS = [
  { id: 'tiktok',    label: 'TikTok' },
  { id: 'facebook',  label: 'Facebook' },
  { id: 'instagram', label: 'Instagram' },
  { id: 'youtube',   label: 'YouTube', soon: true },
  { id: 'x',         label: 'X', soon: true },
  { id: 'blog',      label: 'Blog Post' },
  { id: 'email',     label: 'Email' },
  { id: 'blast',     label: 'Email Blast' },
  { id: 'research',  label: 'Research request' },
  { id: 'coord',     label: 'Social media coordination' },
  { id: 'other',     label: 'Other' }
];
const KIND_IDS = new Set(KINDS.map((k) => k.id));
const STATUS = new Set(['next', 'doing', 'done']);

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const num = (v) => { const n = Number(v); return isFinite(n) ? Math.round(n * 100) / 100 : 0; };
const lines = (a) => (Array.isArray(a) ? a : []).slice(0, 40).map((r) => ({ d: clean(r && r.d, 120), a: num(r && r.a) })).filter((r) => r.d || r.a);
export function quote(e) {
  const cw = (e.costs || []).reduce((t, c) => t + num(c.a), 0);
  const pass = (e.pass || []).reduce((t, c) => t + num(c.a), 0);
  const pay = num(e.salary), cb = cw + pay, gpm = num(e.gpm), ext = e.type !== 'internal';
  // The price is adjustable (Anthony, Sep 18 2026): a typed price wins, and the margin is then
  // read off it — (price - cost) / price — instead of the other way round.
  const set = e.priceSet != null && e.priceSet !== '' && isFinite(Number(e.priceSet)) && Number(e.priceSet) > 0 ? num(e.priceSet) : null;
  const price = !ext ? 0 : set != null ? set : gpm < 100 ? cb / (1 - gpm / 100) : 0;
  const gpmOut = ext && price > 0 ? num((price - cb) / price * 100) : gpm;
  return { costs: num(cw), salary: pay, costBase: num(cb), pass: num(pass), gpm: gpmOut, gpmAsked: gpm, priceSet: set, price: num(price), total: num(ext ? price + pass : cb + pass), profit: num(ext ? price - cb : 0) };
}
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function send(res, code, obj) {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
async function getJSON(k) { const raw = await hub('GET', k); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      const ids = (await hub('ZREVRANGE', IDS, '0', '999')) || [];
      let jobs = [];
      if (ids.length) {
        const raws = await hub('MGET', ...ids.map(J));
        jobs = raws.map((r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }).filter(Boolean);
      }
      return send(res, 200, { ok: true, office: BRAND, kinds: KINDS, jobs });
    }

    if (req.method === 'POST') {
      const b = await body(req); if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
      const now = new Date().toISOString();

      if (b.save) {
        const s = b.save;
        const id = clean(s.id, 40);
        const cur = id ? await getJSON(J(id)) : null;
        const title = clean(s.title, 200);
        if (!title) return send(res, 400, { ok: false, error: 'NEED_TITLE' });
        const kinds = (Array.isArray(s.kinds) ? s.kinds : []).map((k) => clean(k, 20)).filter((k) => KIND_IDS.has(k)).slice(0, 11);
        const at = clean(s.at, 40);
        const type = s.type === 'internal' ? 'internal' : 'client';
        const rec = Object.assign({}, cur || { id: id || mint(), createdAt: Date.now(), by: who.name || 'ND OS' }, {
          office: BRAND, flag: 'Neuro-Divulge',
          title, kinds, other: kinds.indexOf('other') >= 0 ? clean(s.other, 120) : '',
          at: at && !isNaN(Date.parse(at)) ? at : '',
          status: STATUS.has(s.status) ? s.status : (cur && cur.status) || 'next',
          notes: clean(s.notes, 4000), updatedAt: now,
          // the estimate
          type, client: clean(s.client, 160),
          costs: lines(s.costs), pass: lines(s.pass), salary: num(s.salary),
          gpm: type === 'client' ? (s.gpm === '' || s.gpm == null ? 67 : Math.min(99, Math.max(0, num(s.gpm)))) : 0,
          priceSet: type === 'client' && s.priceSet !== '' && s.priceSet != null && num(s.priceSet) > 0 ? num(s.priceSet) : null
        });
        if (!rec.estNo) rec.estNo = 'ND-EST-' + String(await hub('INCR', 'books:' + BRAND + ':seq:est')).padStart(4, '0');
        rec.quote = quote(rec);
        if (rec.status === 'done' && !(cur && cur.doneAt)) rec.doneAt = now;
        if (rec.status !== 'done') delete rec.doneAt;
        await hub('SET', J(rec.id), JSON.stringify(rec));
        await hub('ZADD', IDS, String(rec.createdAt), rec.id);
        return send(res, 200, { ok: true, job: rec });
      }

      if (b.remove) {
        const id = clean(b.remove, 40);
        await hub('DEL', J(id)); await hub('ZREM', IDS, id);
        return send(res, 200, { ok: true, removed: id });
      }
      return send(res, 400, { ok: false, error: 'UNKNOWN' });
    }
    res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    const m = String((e && e.message) || e);
    return send(res, m === 'NO_HUB_STORE' ? 503 : 500, { ok: false, error: m === 'NO_HUB_STORE' ? 'NOT_CONFIGURED' : 'SERVER', message: m });
  }
}
