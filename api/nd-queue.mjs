import { ndWho } from './_nd-auth.mjs';
// /api/nd-queue — the Blastpack queue for ND OS. Accelerated Experiences LLC · Sep 2026
//
// Blastpack's pipeline is built; its public door waits on Meta app review. Nothing she
// writes between now and then should be lost, so this is where a post waits.
//
// She schedules. The queue holds. When Blastpack opens it drains — the contract is
// already here, so that day is a switch, not a build:
//
//   GET  ?due=1        + key  -> items whose time has come and are still queued
//   GET                 + key -> the whole queue, soonest first
//   POST { …item }      + key -> create or update  (id optional; one is minted)
//   POST { id, status } + key -> 'queued' | 'sent' | 'held' | 'failed'
//   POST { id, delete:true }  -> remove
//
// Same store, same lock as the blog. No new service (Art. XVII). An item is plain
// text and a list of platform names — this endpoint never holds a social credential,
// and it never posts anything itself. Blastpack does that, with its own tokens.

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const PLATFORMS = new Set(['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest']);
const STATUS = new Set(['queued', 'sent', 'held', 'failed']);

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
const K = (id) => 'nd:q:' + id;
const INDEX = 'nd:queue';
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };

function send(res, code, obj) {
  res.statusCode = code;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(obj));
}
const clean = (s, max) => String(s == null ? '' : s).slice(0, max);
const mint = () => 'q' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

function tidy(i) {
  return {
    id: i.id, text: i.text || '', media: i.media || '',
    platforms: Array.isArray(i.platforms) ? i.platforms : [],
    at: i.at || '', status: STATUS.has(i.status) ? i.status : 'queued',
    note: i.note || '', createdAt: i.createdAt, updatedAt: i.updatedAt
  };
}

async function readAll() {
  const ids = (await redis('LRANGE', INDEX, '0', '-1')) || [];
  const out = [];
  for (const id of ids) { const i = await getJSON(K(id)); if (i) out.push(tidy(i)); }
  out.sort((a, b) => String(a.at || '').localeCompare(String(b.at || '')));
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

    if (req.method === 'GET') {
      const all = await readAll();
      if (url.searchParams.get('due') === '1') {
        const now = new Date().toISOString();
        return send(res, 200, {
          ok: true,
          items: all.filter((i) => i.status === 'queued' && i.at && i.at <= now)
        });
      }
      return send(res, 200, { ok: true, items: all, open: false });
    }

    if (req.method === 'POST') {
      const b = await body(req);
      if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

      if (b.delete) {
        const id = clean(b.id, 60);
        if (!id) return send(res, 400, { ok: false, error: 'NEED_ID' });
        await redis('DEL', K(id));
        await redis('LREM', INDEX, '0', id);
        return send(res, 200, { ok: true, deleted: id });
      }

      const id = clean(b.id, 60);
      const existing = id ? await getJSON(K(id)) : null;

      // a status-only nudge (this is how Blastpack reports back)
      if (existing && b.status && !b.text && !b.at && !b.platforms) {
        if (!STATUS.has(b.status)) return send(res, 400, { ok: false, error: 'BAD_STATUS' });
        existing.status = b.status;
        existing.note = clean(b.note, 300);
        existing.updatedAt = new Date().toISOString();
        await redis('SET', K(id), JSON.stringify(existing));
        return send(res, 200, { ok: true, item: tidy(existing) });
      }

      const text = clean(b.text, 4000).trim();
      if (!text) return send(res, 400, { ok: false, error: 'NEED_TEXT' });
      const plats = (Array.isArray(b.platforms) ? b.platforms : [])
        .map((p) => String(p).toLowerCase()).filter((p) => PLATFORMS.has(p));
      if (!plats.length) return send(res, 400, { ok: false, error: 'NEED_PLATFORM' });

      const at = clean(b.at, 40);
      if (at && isNaN(Date.parse(at))) return send(res, 400, { ok: false, error: 'BAD_TIME' });

      const now = new Date().toISOString();
      const item = {
        id: id || mint(), text, media: clean(b.media, 500),
        platforms: plats, at: at || now,
        status: STATUS.has(b.status) ? b.status : 'queued',
        note: clean(b.note, 300),
        createdAt: (existing && existing.createdAt) || now, updatedAt: now
      };
      await redis('SET', K(item.id), JSON.stringify(item));
      if (!existing) await redis('LPUSH', INDEX, item.id);
      return send(res, 200, { ok: true, item: tidy(item) });
    }

    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) });
  }
}
