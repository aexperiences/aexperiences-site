// /api/nd-records — her Hall of Records, with folders and files.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony: "her hall of records needs to be like mine, hers is limited. I would like for hers to
// be able to have a folder system... she can save and also upload to her hall of records."
//
// Records live in the SHARED hub store (the spine), one key per record, office-flagged, so AE OS
// reads every office's records and ND OS reads only hers:
//
//   records:<office>:r:<id>      one record, JSON
//   records:<office>:ids         sorted set, newest last
//   records:<office>:folders     set of folder names (a folder exists the moment it is named)
//
// A record is a written note, or a file (uploaded through api/nd-files and attached here by id),
// or both. Files stay in the private file store and are served by their signed link.
//
//   GET                         { folders, records }
//   POST { save:{…} }           create or update (id optional)
//   POST { remove:id }
//   POST { folder:{name} }      make a folder
//   POST { folder:{name, rename} }  rename a folder (moves its records)
//
// The old text-only records (nd-store c=records, site store) are carried over on the first read
// into the folder "General", then that shelf is emptied. Nothing she wrote is lost.
import { hub, ndWho, BRAND } from './_nd-auth.mjs';

const R = (id) => 'records:' + BRAND + ':r:' + id;
const IDS = 'records:' + BRAND + ':ids';
const FOLDERS = 'records:' + BRAND + ':folders';
const KINDS = ['Decision', 'Money', 'Sent', 'Received', 'Client', 'Idea', 'Note', 'File'];

// the old shelf (site store), read once for the carry-over
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
async function site(...cmd) {
  if (!KV_URL || !KV_TOK) return null;
  const r = await fetch(KV_URL, { method: 'POST', headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) return null; const j = await r.json(); return j.error ? null : j.result;
}

const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const folderName = (s) => clean(s, 40).replace(/\s+/g, ' ') || 'General';
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
async function getJSON(k) { const raw = await hub('GET', k); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }
async function all() {
  const ids = (await hub('ZREVRANGE', IDS, '0', '2999')) || [];
  if (!ids.length) return [];
  const raws = await hub('MGET', ...ids.map(R));
  return raws.map((r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }).filter(Boolean);
}
async function put(rec) { await hub('SET', R(rec.id), JSON.stringify(rec)); await hub('ZADD', IDS, String(rec.createdAt), rec.id); }

// the one-time carry-over from the old text-only shelf
async function carryOver(who) {
  const ids = (await site('LRANGE', 'nd:records:all', '0', '1999')) || [];
  if (!ids.length) return 0;
  let n = 0;
  for (const id of ids) {
    const raw = await site('GET', 'nd:records:' + id); if (!raw) continue;
    let old = null; try { old = JSON.parse(raw); } catch (e) { continue; }
    const rec = { id: 'old-' + id, office: BRAND, flag: 'Neuro-Divulge', folder: 'General', kind: clean(old.kind, 30) || 'Note',
      text: clean(old.text, 20000), createdAt: Date.parse(old.createdAt) || Date.now(), by: who.name || 'ND OS', updatedAt: new Date().toISOString(), carried: true };
    await put(rec); await site('DEL', 'nd:records:' + id); n++;
  }
  await site('DEL', 'nd:records:all');
  await hub('SADD', FOLDERS, 'General');
  return n;
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      let carried = 0; try { carried = await carryOver(who); } catch (e) {}
      const [records, folders] = await Promise.all([all(), hub('SMEMBERS', FOLDERS)]);
      const names = new Set(folders || []); names.add('General'); records.forEach((r) => names.add(r.folder || 'General'));
      return send(res, 200, { ok: true, office: BRAND, kinds: KINDS, folders: [...names].sort((a, b) => a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b)), records, carried });
    }

    if (req.method === 'POST') {
      const b = await body(req); if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
      const now = new Date().toISOString();

      if (b.folder) {
        const name = folderName(b.folder.name);
        if (b.folder.rename) {
          const to = folderName(b.folder.rename);
          const recs = await all();
          for (const r of recs) if ((r.folder || 'General') === name) { r.folder = to; r.updatedAt = now; await put(r); }
          await hub('SREM', FOLDERS, name); await hub('SADD', FOLDERS, to);
          return send(res, 200, { ok: true, folder: to });
        }
        await hub('SADD', FOLDERS, name);
        return send(res, 200, { ok: true, folder: name });
      }

      if (b.save) {
        const s = b.save;
        const id = clean(s.id, 40);
        const cur = id ? await getJSON(R(id)) : null;
        const text = clean(s.text, 20000);
        const file = s.file && typeof s.file === 'object' ? {
          id: clean(s.file.id, 40), name: clean(s.file.name, 160), type: clean(s.file.type, 100), size: Number(s.file.size) || 0, link: clean(s.file.link, 400)
        } : (cur && cur.file) || null;
        if (!text && !(file && file.link)) return send(res, 400, { ok: false, error: 'NEED_TEXT' });
        const folder = folderName(s.folder || (cur && cur.folder));
        const rec = Object.assign({}, cur || { id: id || mint(), createdAt: Date.now(), by: who.name || 'ND OS' }, {
          office: BRAND, flag: 'Neuro-Divulge', folder,
          kind: KINDS.indexOf(clean(s.kind, 30)) >= 0 ? clean(s.kind, 30) : (file ? 'File' : (cur && cur.kind) || 'Note'),
          text, file, updatedAt: now
        });
        await put(rec); await hub('SADD', FOLDERS, folder);
        return send(res, 200, { ok: true, record: rec });
      }

      if (b.remove) {
        const id = clean(b.remove, 40);
        await hub('DEL', R(id)); await hub('ZREM', IDS, id);
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
