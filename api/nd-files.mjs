// /api/nd-files — upload anything, keep it, link to it.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony's ND OS list: "She needs a way to upload files of any kind." And the blog item:
// "post a story, upload a video to it or a picture." A video does not fit through a
// serverless function (4.5 MB body cap), so the phone talks to the file store DIRECTLY:
// this endpoint signs a one-shot upload ticket for one file, the browser PUTs the bytes
// to the store, then tells this endpoint what landed. The file store is the one the site
// already has (BLOB_READ_WRITE_TOKEN, Art. XVII) and the token never leaves the server.
//
//   GET                              signed in -> her files, newest first
//   POST { ticket:{name,type,size} } signed in -> { token, pathname, url } a 30-second ticket
//   POST { done:{pathname,url,name,type,size} }  -> keeps the record
//   POST { remove:id }               deletes the file and the record
import { createHmac } from 'node:crypto';
import { ndWho, BRAND } from './_nd-auth.mjs';

const BLOB = process.env.BLOB_READ_WRITE_TOKEN || '';
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const MAX = 500 * 1024 * 1024;                      // half a gigabyte a file — a phone video fits
// The site's file store is PRIVATE (KangaToDo's photos live there, on purpose), so a file's
// store address is useless on its own. Every file gets a LINK instead: /api/nd-files?f=<id>.<sig>,
// unguessable, permanent, and served through here with the token. That link works in a note, in
// an <img>, in a text message.
const sig = (id) => createHmac('sha256', 'nd-file-link:' + BLOB).update(id).digest('hex').slice(0, 24);
const linkFor = (id) => 'https://www.aexperiences.com/api/nd-files?f=' + id + '.' + sig(id);
const K = (id) => 'nd:files:' + id;
const INDEX = 'nd:files:all';

async function redis(...cmd) {
  const r = await fetch(KV_URL, { method: 'POST', headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json(); if (j.error) throw new Error('store: ' + j.error); return j.result;
}
const getJSON = async (k) => { const v = await redis('GET', k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj)); }
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const safeName = (n) => clean(n, 120).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ') || 'file';

// A client upload ticket, the way @vercel/blob mints one (no SDK — api/ carries no deps):
// payload = base64(JSON{pathname, ...limits, validUntil}); key = hex HMAC-SHA256(payload, token);
// ticket = vercel_blob_client_<storeId>_base64(key.payload)
function ticket(pathname, type) {
  const storeId = BLOB.split('_')[3] || '';
  const payload = Buffer.from(JSON.stringify({
    pathname, addRandomSuffix: true, maximumSizeInBytes: MAX,
    allowedContentTypes: type ? [type] : undefined,
    validUntil: Date.now() + 5 * 60 * 1000
  })).toString('base64');
  const key = createHmac('sha256', BLOB).update(payload).digest('hex');
  return 'vercel_blob_client_' + storeId + '_' + Buffer.from(key + '.' + payload).toString('base64');
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOK) return send(res, 503, { ok: false, error: 'NO_STORE' });
    const url = new URL(req.url, 'https://www.aexperiences.com');

    // a file, by its link — no sign-in, the signature is the key
    const f = String(url.searchParams.get('f') || '');
    if (req.method === 'GET' && f) {
      const [id, given] = f.split('.');
      if (!id || given !== sig(id)) { res.statusCode = 404; return res.end('No such file.'); }
      const rec = await getJSON(K(id));
      if (!rec || !BLOB) { res.statusCode = 404; return res.end('No such file.'); }
      const r = await fetch(rec.url, { headers: { authorization: 'Bearer ' + BLOB } });
      if (!r.ok) { res.statusCode = 502; return res.end('The store did not answer.'); }
      res.statusCode = 200;
      res.setHeader('content-type', rec.type || r.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('content-disposition', (url.searchParams.get('dl') ? 'attachment' : 'inline') + '; filename="' + rec.name.replace(/"/g, '') + '"');
      res.setHeader('cache-control', 'private, max-age=86400');
      const len = r.headers.get('content-length'); if (len) res.setHeader('content-length', len);
      return res.end(Buffer.from(await r.arrayBuffer()));
    }

    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      const ids = (await redis('LRANGE', INDEX, '0', '999')) || [];
      const files = []; for (const id of ids) { const rec = await getJSON(K(id)); if (rec) { rec.link = rec.link || linkFor(rec.id); files.push(rec); } }
      return send(res, 200, { ok: true, files });
    }

    // The short road, for a photo or a PDF: the bytes come through here (Vercel caps a body
    // near 4.5 MB) and this server puts them in the store. The room tries the direct road first
    // and falls back to this one when a browser will not let it talk to the store itself.
    if (req.method === 'POST' && url.searchParams.get('up') === '1') {
      if (!BLOB) return send(res, 503, { ok: false, error: 'NO_FILE_STORE' });
      const name = safeName(url.searchParams.get('name')), type = clean(url.searchParams.get('type'), 100) || 'application/octet-stream';
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 4.4 * 1024 * 1024) return send(res, 413, { ok: false, error: 'TOO_BIG_HERE' }); chunks.push(c); }
      const bytes = Buffer.concat(chunks);
      if (!bytes.length) return send(res, 400, { ok: false, error: 'EMPTY' });
      const pathname = 'nd/' + BRAND + '/files/' + new Date().toISOString().slice(0, 10) + '/' + name;
      const r = await fetch('https://blob.vercel-storage.com/' + pathname, { method: 'PUT',
        headers: { authorization: 'Bearer ' + BLOB, 'x-api-version': '7', 'x-content-type': type, 'x-add-random-suffix': '1' }, body: bytes });
      const text = await r.text();
      if (!r.ok) { console.error('nd-files store PUT', r.status, text.slice(0, 300)); return send(res, 502, { ok: false, error: 'STORE_SAID_NO', status: r.status, message: text.slice(0, 200) }); }
      let put = {}; try { put = JSON.parse(text); } catch (e) { return send(res, 502, { ok: false, error: 'STORE_SAID_NO', message: 'unreadable reply' }); }
      const id = mint();
      const f = { id, name, type, size: bytes.length, url: put.url, pathname: put.pathname || pathname, link: linkFor(id),
        office: BRAND, by: who.name || 'ND OS', createdAt: new Date().toISOString() };
      await redis('SET', K(f.id), JSON.stringify(f));
      await redis('LPUSH', INDEX, f.id); await redis('LTRIM', INDEX, '0', '1999');
      return send(res, 200, { ok: true, file: f, via: 'server' });
    }

    if (req.method === 'POST') {
      const b = await body(req); if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

      if (b.ticket) {
        if (!BLOB) return send(res, 503, { ok: false, error: 'NO_FILE_STORE' });
        const name = safeName(b.ticket.name), type = clean(b.ticket.type, 100), size = Number(b.ticket.size) || 0;
        if (size > MAX) return send(res, 413, { ok: false, error: 'TOO_BIG' });
        const pathname = 'nd/' + BRAND + '/files/' + new Date().toISOString().slice(0, 10) + '/' + name;
        // The browser PUTs to the blob API the way @vercel/blob's client does today (v12):
        // vercel.com/api/blob/?pathname=..., store id and access as headers.
        return send(res, 200, { ok: true, pathname, token: ticket(pathname, type), storeId: BLOB.split('_')[3] || '',
          put: 'https://vercel.com/api/blob/?pathname=' + encodeURIComponent(pathname) });
      }

      if (b.done) {
        const d = b.done;
        const u = clean(d.url, 500);
        if (!/^https:\/\/[a-z0-9.-]+\.blob\.vercel-storage\.com\//i.test(u)) return send(res, 400, { ok: false, error: 'BAD_URL' });
        const id = mint();
        const f = { id, name: safeName(d.name), type: clean(d.type, 100), size: Number(d.size) || 0, link: linkFor(id),
          url: u, pathname: clean(d.pathname, 300), office: BRAND, by: who.name || 'ND OS', createdAt: new Date().toISOString() };
        await redis('SET', K(f.id), JSON.stringify(f));
        await redis('LPUSH', INDEX, f.id); await redis('LTRIM', INDEX, '0', '1999');
        return send(res, 200, { ok: true, file: f });
      }

      if (b.remove) {
        const id = clean(b.remove, 40); const f = await getJSON(K(id));
        if (!f) return send(res, 404, { ok: false, error: 'NOT_FOUND' });
        if (BLOB) await fetch('https://blob.vercel-storage.com/delete', { method: 'POST',
          headers: { authorization: 'Bearer ' + BLOB, 'content-type': 'application/json', 'x-api-version': '7' },
          body: JSON.stringify({ urls: [f.url] }) }).catch(() => {});
        await redis('DEL', K(id)); await redis('LREM', INDEX, '0', id);
        return send(res, 200, { ok: true, removed: id });
      }
      return send(res, 400, { ok: false, error: 'UNKNOWN' });
    }
    res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) { return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) }); }
}
