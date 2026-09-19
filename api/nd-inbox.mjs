// /api/nd-inbox — her inbox and outbox. The line between her office and the house.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony: "make her an inbox, outbox and me too so we can communicate back and forth, she can
// give production requests through it to me."
//
// Two rooms, one store. This file serves ND OS (/nd/os/inbox/). Its twin, /api/office-inbox on
// the hub, serves AE OS. Both read and write the same keys in the SHARED hub store, the same way
// her jobs and her books do. WHO you are decides your side, not which room you stand in:
// Anthony signed into ND OS still writes as Anthony.
import { createHmac } from 'node:crypto';
import { hub, ndWho, BRAND } from './_nd-auth.mjs';

const ANTHONY = new Set(['ae', 'anthonye', 'anthony']);

// ---- the work itself: files ------------------------------------------------------------------
// A proof file goes into the site's private file store (the one /api/nd-files uses) but NOT into
// her Files list. It is held on the request until she approves. On approval each file proof is
// written as a real Files record (nd:files:<id>, same shape and same link signature as
// /api/nd-files), so it shows up in her Files room and its link works anywhere. Bytes pass through
// this function, so a proof file tops out near 4.4 MB; anything bigger is shown as a link.
const BLOB = process.env.BLOB_READ_WRITE_TOKEN || '';
const FKV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const FKV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
async function filesKV(...cmd) {
  const r = await fetch(FKV_URL, { method: 'POST', headers: { authorization: 'Bearer ' + FKV_TOK, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('files_store_' + r.status);
  const j = await r.json(); if (j.error) throw new Error('files_store: ' + j.error); return j.result;
}
const fileSig = (id) => createHmac('sha256', 'nd-file-link:' + BLOB).update(id).digest('hex').slice(0, 24); // same as nd-files
const fileLink = (id) => 'https://www.aexperiences.com/api/nd-files?f=' + id + '.' + fileSig(id);
const proofSig = (k) => createHmac('sha256', 'nd-proof-link:' + BLOB).update(k).digest('hex').slice(0, 24);
const proofLink = (mid, pid) => 'https://www.aexperiences.com/api/nd-inbox?p=' + mid + '.' + pid + '.' + proofSig(mid + '.' + pid);
const safeName = (n) => clean(n, 120).replace(/[^\w.\- ]+/g, '_').replace(/\s+/g, ' ') || 'file';

async function landInHerFiles(m) {
  const landed = [];
  if (!FKV_URL || !FKV_TOK) return landed;
  for (const p of (m.proofs || [])) {
    if (p.kind !== 'file' || !p.blobUrl || p.fileId) continue;
    const id = mint();
    const f = { id, name: p.name, type: p.type || '', size: p.size || 0, url: p.blobUrl, pathname: p.pathname || '', link: fileLink(id),
      office: BRAND, by: 'Approved work · ' + clean(m.subject, 80), createdAt: new Date().toISOString(), fromRequest: m.id };
    await filesKV('SET', 'nd:files:' + id, JSON.stringify(f));
    await filesKV('LPUSH', 'nd:files:all', id);
    p.fileId = id; p.fileLink = f.link; landed.push({ name: f.name, link: f.link });
  }
  return landed;
}
// THE RECORD (same on both sides, one store):
//   memo:nd:m:<id>   one message, JSON
//   memo:nd:ids      sorted set, newest last
// { id, from:'jessica'|'anthony', to, byName, kind:'note'|'request', work, subject, body, due,
//   status (requests only: new|accepted|doing|review|changes|approved|declined), thread, createdAt, readAt,
//   tucked:{who:true}, proofs:[{pid, kind:'link'|'file', name, url|link, by, at}] }
// A REQUEST IS A WORK ROOM (Anthony, Sep 19 2026: "a room that we can see, ask for changes, communicate, and
// work in. Once approved by her, whatever she had me create is now on her workspace"). The thread is every
// message carrying thread:<request id>. The work is shown as proofs. Only Jessica can ask for changes or
// approve, and approval happens in ND OS, because that is where her Files live.
// Nothing here sends email. Nothing is ever deleted — "tuck away" hides it from that person's list only.
const BR = 'nd';
const M = (id) => 'memo:' + BR + ':m:' + id;
const IDS = 'memo:' + BR + ':ids';
const WORK = ['Picture or graphic', 'Video', 'Blog post', 'Email blast', 'Site or store change', 'App change', 'Research', 'Something else'];
const STATUS = new Set(['new', 'accepted', 'doing', 'review', 'changes', 'approved', 'declined']);
const HERS = new Set(['changes', 'approved']);
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const mint = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const other = (p) => (p === 'jessica' ? 'anthony' : 'jessica');
function send(res, code, obj) {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}
async function getJSON(store, k) { const raw = await store('GET', k); try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; } }

async function run(req, res, store, me, byName, onApprove) {
  if (req.method === 'GET') {
    const ids = (await store('ZREVRANGE', IDS, '0', '499')) || [];
    let all = [];
    if (ids.length) {
      const raws = await store('MGET', ...ids.map(M));
      all = raws.map((r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }).filter(Boolean);
    }
    const mine = all.filter((m) => !(m.tucked && m.tucked[me]));
    const inbox = mine.filter((m) => m.to === me), outbox = mine.filter((m) => m.from === me);
    return send(res, 200, { ok: true, me, work: WORK, inbox, outbox, unread: inbox.filter((m) => !m.readAt).length,
      open: all.filter((m) => m.kind === 'request' && m.status !== 'approved' && m.status !== 'declined').length });
  }
  if (req.method === 'POST') {
    const b = await body(req); if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
    const now = new Date().toISOString();
    if (b.send) {
      const s = b.send;
      const text = clean(s.body, 6000), subject = clean(s.subject, 200);
      if (!text && !subject) return send(res, 400, { ok: false, error: 'NEED_WORDS' });
      const kind = s.kind === 'request' ? 'request' : 'note';
      const due = clean(s.due, 40);
      const rec = { id: mint(), office: BR, from: me, to: other(me), byName: clean(byName, 80), kind,
        work: kind === 'request' && WORK.indexOf(s.work) >= 0 ? s.work : '',
        subject: subject || text.slice(0, 60), body: text,
        due: due && !isNaN(Date.parse(due)) ? due : '', thread: clean(s.thread, 40),
        createdAt: now, at: Date.now(), readAt: '' };
      if (kind === 'request') rec.status = 'new';
      await store('SET', M(rec.id), JSON.stringify(rec));
      await store('ZADD', IDS, String(rec.at), rec.id);
      return send(res, 200, { ok: true, message: rec });
    }
    if (b.read) {
      const m = await getJSON(store, M(clean(b.read, 40)));
      if (!m) return send(res, 404, { ok: false, error: 'GONE' });
      if (m.to === me && !m.readAt) { m.readAt = now; await store('SET', M(m.id), JSON.stringify(m)); }
      return send(res, 200, { ok: true, message: m });
    }
    if (b.status) {
      const m = await getJSON(store, M(clean(b.status.id, 40)));
      if (!m || m.kind !== 'request') return send(res, 404, { ok: false, error: 'GONE' });
      if (!STATUS.has(b.status.status)) return send(res, 400, { ok: false, error: 'BAD_STATUS' });
      if (HERS.has(b.status.status) && me !== 'jessica') return send(res, 403, { ok: false, error: 'HERS_TO_SAY' });
      if (b.status.status === 'approved') {
        if (!onApprove) return send(res, 409, { ok: false, error: 'APPROVE_IN_ND_OS' });
        m.landed = await onApprove(m); m.approvedAt = now;
      }
      m.status = b.status.status; m.statusAt = now; m.statusBy = me;
      await store('SET', M(m.id), JSON.stringify(m));
      return send(res, 200, { ok: true, message: m });
    }
    if (b.proof) {
      const m = await getJSON(store, M(clean(b.proof.id, 40)));
      if (!m || m.kind !== 'request') return send(res, 404, { ok: false, error: 'GONE' });
      const u = clean(b.proof.url, 600);
      if (!/^https:\/\/[^\s]+$/i.test(u)) return send(res, 400, { ok: false, error: 'BAD_LINK' });
      m.proofs = m.proofs || [];
      m.proofs.push({ pid: mint(), kind: 'link', name: clean(b.proof.name, 160) || u, url: u, by: me, at: now });
      await store('SET', M(m.id), JSON.stringify(m));
      return send(res, 200, { ok: true, message: m });
    }
    if (b.tuck) {
      const m = await getJSON(store, M(clean(b.tuck, 40)));
      if (!m) return send(res, 404, { ok: false, error: 'GONE' });
      m.tucked = m.tucked || {}; m.tucked[me] = true;
      await store('SET', M(m.id), JSON.stringify(m));
      return send(res, 200, { ok: true, tucked: m.id });
    }
    return send(res, 400, { ok: false, error: 'UNKNOWN' });
  }
  res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' });
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    // a proof, by its link — no sign-in, the signature is the key (same idea as a Files link)
    const p = String(url.searchParams.get('p') || '');
    if (req.method === 'GET' && p) {
      const [mid, pid, given] = p.split('.');
      if (!mid || !pid || given !== proofSig(mid + '.' + pid)) { res.statusCode = 404; return res.end('No such file.'); }
      const m = await getJSON(hub, M(mid));
      const pr = m && (m.proofs || []).find((x) => x.pid === pid);
      if (!pr || !pr.blobUrl || !BLOB) { res.statusCode = 404; return res.end('No such file.'); }
      const r = await fetch(pr.blobUrl, { headers: { authorization: 'Bearer ' + BLOB } });
      if (!r.ok) { res.statusCode = 502; return res.end('The store did not answer.'); }
      res.statusCode = 200;
      res.setHeader('content-type', pr.type || r.headers.get('content-type') || 'application/octet-stream');
      res.setHeader('content-disposition', 'inline; filename="' + String(pr.name).replace(/"/g, '') + '"');
      res.setHeader('cache-control', 'private, max-age=3600');
      return res.end(Buffer.from(await r.arrayBuffer()));
    }

    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });
    const local = String(who.sub || '').toLowerCase().split('@')[0];
    const me = ANTHONY.has(local) ? 'anthony' : 'jessica';

    // add a file to a work room: POST ?proof=<request id>&name=&type= with the raw bytes as the body
    const pf = String(url.searchParams.get('proof') || '');
    if (req.method === 'POST' && pf) {
      if (!BLOB) return send(res, 503, { ok: false, error: 'NO_FILE_STORE' });
      const m = await getJSON(hub, M(clean(pf, 40)));
      if (!m || m.kind !== 'request') return send(res, 404, { ok: false, error: 'GONE' });
      const name = safeName(url.searchParams.get('name')), type = clean(url.searchParams.get('type'), 100) || 'application/octet-stream';
      const chunks = []; let size = 0;
      for await (const c of req) { size += c.length; if (size > 4.4 * 1024 * 1024) return send(res, 413, { ok: false, error: 'TOO_BIG_HERE' }); chunks.push(c); }
      const bytes = Buffer.concat(chunks);
      if (!bytes.length) return send(res, 400, { ok: false, error: 'EMPTY' });
      const pathname = 'nd/' + BRAND + '/proofs/' + new Date().toISOString().slice(0, 10) + '/' + name;
      const storeId = BLOB.split('_')[3] || '';
      const r = await fetch('https://vercel.com/api/blob/?pathname=' + encodeURIComponent(pathname), { method: 'PUT',
        headers: { authorization: 'Bearer ' + BLOB, 'x-api-version': '12', 'x-vercel-blob-store-id': storeId,
          'x-api-blob-request-id': storeId + ':' + Date.now() + ':' + Math.random().toString(16).slice(2), 'x-api-blob-request-attempt': '0',
          'x-vercel-blob-access': 'private', 'x-content-type': type, 'x-add-random-suffix': '1', 'x-content-length': String(bytes.length) }, body: bytes });
      const text = await r.text();
      if (!r.ok) return send(res, 502, { ok: false, error: 'STORE_SAID_NO', status: r.status, message: text.slice(0, 200) });
      let put = {}; try { put = JSON.parse(text); } catch (e) { return send(res, 502, { ok: false, error: 'STORE_SAID_NO' }); }
      const pid = mint();
      m.proofs = m.proofs || [];
      m.proofs.push({ pid, kind: 'file', name, type, size: bytes.length, blobUrl: put.url, pathname: put.pathname || pathname,
        link: proofLink(m.id, pid), by: me, at: new Date().toISOString() });
      await hub('SET', M(m.id), JSON.stringify(m));
      return send(res, 200, { ok: true, message: m });
    }
    return await run(req, res, hub, me, who.name || (me === 'anthony' ? 'Anthony' : 'Jessica'), landInHerFiles);
  } catch (e) {
    const m = String((e && e.message) || e);
    return send(res, m === 'NO_HUB_STORE' ? 503 : 500, { ok: false, error: m === 'NO_HUB_STORE' ? 'NOT_CONFIGURED' : 'SERVER', message: m });
  }
}
