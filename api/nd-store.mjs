import { ndWho } from './_nd-auth.mjs';
// /api/nd-store — one shelf for every ND OS room that keeps records.
// Accelerated Experiences LLC · Sep 2026
//
// The rooms differ; keeping things does not. Rather than a fourth, fifth and sixth
// endpoint that all do LPUSH/GET/DEL slightly differently, every room that stores
// items stores them here, in its own named collection. Adding a room costs a name in
// COLLECTIONS and nothing else (Art. XVII: no new service, and no new shape either).
//
//   GET  ?c=list                -> every item in that collection
//   GET  ?c=list&id=x           -> one
//   POST ?c=list  { …item }     -> create or update (id optional; one is minted)
//   POST ?c=list  { id, delete:true }
//
// Fields are whatever the room needs; a few are reserved and always present:
//   id, createdAt, updatedAt, done (bool), at (ISO, for anything with a time)
// Everything is stored and returned as PLAIN TEXT. This endpoint never emits HTML
// and never interprets what it is given.
//
// Locked behind ND_BLOG_KEY, same as the rest of the back end.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';

// name -> how many items it may hold, and how big one item may be
const COLLECTIONS = {
  list:    { cap: 600,  field: 4000  },   // the master list
  cal:     { cap: 800,  field: 4000  },   // the calendar
  docs:    { cap: 300,  field: 90000 },   // documents
  records: { cap: 1500, field: 20000 }    // the hall of records
};

async function redis(...cmd) {
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
const K = (c, id) => 'nd:' + c + ':' + id;
const INDEX = (c) => 'nd:' + c + ':all';
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

/* Whatever the room sends is kept, with three guards: keys are sane, strings are
   capped, and nothing nested goes in. A record you cannot read back plainly is not
   a record. */
function shape(raw, spec, existing) {
  const out = {};
  for (const k of Object.keys(raw || {})) {
    if (!/^[a-zA-Z][a-zA-Z0-9_]{0,23}$/.test(k)) continue;
    if (k === 'delete') continue;
    const v = raw[k];
    if (v === null || v === undefined) continue;
    if (typeof v === 'string') out[k] = v.slice(0, spec.field);
    else if (typeof v === 'number' && isFinite(v)) out[k] = v;
    else if (typeof v === 'boolean') out[k] = v;
    else if (Array.isArray(v)) out[k] = v.slice(0, 40).map((x) => String(x).slice(0, 200));
    // objects are refused on purpose — flat records stay readable
  }
  const now = new Date().toISOString();
  out.id = (existing && existing.id) || String(raw.id || '').slice(0, 60) || mint();
  out.createdAt = (existing && existing.createdAt) || now;
  out.updatedAt = now;
  if (out.at && isNaN(Date.parse(out.at))) delete out.at;
  return out;
}

async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = [];
  for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOK) return send(res, 503, { ok: false, error: 'NO_STORE' });
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);   // AE OS session or the machine word (_nd-auth.mjs)
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    const c = String(url.searchParams.get('c') || '').toLowerCase();
    const spec = COLLECTIONS[c];
    if (!spec) return send(res, 400, { ok: false, error: 'NO_SUCH_ROOM' });

    if (req.method === 'GET') {
      const one = String(url.searchParams.get('id') || '').slice(0, 60);
      if (one) {
        const it = await getJSON(K(c, one));
        if (!it) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
        return send(res, 200, { ok: true, item: it });
      }
      const ids = (await redis('LRANGE', INDEX(c), '0', String(spec.cap - 1))) || [];
      const items = [];
      for (const id of ids) { const it = await getJSON(K(c, id)); if (it) items.push(it); }
      return send(res, 200, { ok: true, collection: c, items });
    }

    if (req.method === 'POST') {
      const b = await body(req);
      if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

      if (b.delete) {
        const id = String(b.id || '').slice(0, 60);
        if (!id) return send(res, 400, { ok: false, error: 'NEED_ID' });
        await redis('DEL', K(c, id));
        await redis('LREM', INDEX(c), '0', id);
        return send(res, 200, { ok: true, deleted: id });
      }

      const id = String(b.id || '').slice(0, 60);
      const existing = id ? await getJSON(K(c, id)) : null;
      const item = shape(b, spec, existing);
      await redis('SET', K(c, item.id), JSON.stringify(item));
      if (!existing) {
        await redis('LPUSH', INDEX(c), item.id);
        await redis('LTRIM', INDEX(c), '0', String(spec.cap - 1));
      }
      return send(res, 200, { ok: true, item });
    }

    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
