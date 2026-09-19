// /api/nd-people — her people. The Neuro-Divulge's own contact book.
// Accelerated Experiences LLC · Sep 18 2026
//
// Anthony: "i want her to have her own database that it just goes to and looks like a crm...
// she is collecting emails from people that put theirs in... it should share the database."
//
// Anthony, later the same day: "Her people should go into my CRM and be flagged as her people
// (like a ND Flag), which feeds her CRM." So there is ONE CRM — AE OS Contacts on the hub — and
// this room is what the ND flag feeds. A person whose flag is on lives here, one key per person
// in the SHARED hub store (HUB_KV_* = aehub's KV_*); AE OS lists, edits, flags and unflags them
// through its own /api/contacts, and she sees exactly the flagged set and nothing else. Someone
// who signs up on her site is born flagged. Nothing is copied: one record, two doors.
//
//   crm:<brand>:p:<id>        one person, JSON
//   crm:<brand>:ids           sorted set, newest last (score = when they first came in)
//   crm:<brand>:em:<sha>      email -> id, so one person is one record however often they ask
//
// Nothing here is read-modify-write on a shared list: a person is a key, the index is a set.
//
//   POST { join:{name,email,source} }   PUBLIC — her site's forms. Honeypot + 30 an hour per address.
//   GET                                  everyone, newest first            (signed in)
//   GET  ?csv=1                          the same, as a spreadsheet file   (signed in)
//   POST { save:{id?,name,email,phone,tags,notes,consent} }                (signed in)
//   POST { remove:id }                                                      (signed in)
//
// consent: a person who asked for the free checklist was promised "no list, no drip". They are
// stored so she knows who asked, with consent:false. Only consent:true may ever be blasted.
import { randomBytes } from 'node:crypto';
import { hub, sha, ndWho, BRAND } from './_nd-auth.mjs';

const P = (id) => 'crm:' + BRAND + ':p:' + id;
const IDS = 'crm:' + BRAND + ':ids';
const EM = (e) => 'crm:' + BRAND + ':em:' + sha(e);
const clean = (s, n) => String(s == null ? '' : s).replace(/[<>]/g, '').trim().slice(0, n);
const okEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);

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
const tagsOf = (t) => (Array.isArray(t) ? t : String(t || '').split(','))
  .map((x) => clean(x, 40)).filter(Boolean).slice(0, 12);

async function getPerson(id) {
  const raw = await hub('GET', P(id));
  try { return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
async function everyone() {
  const ids = (await hub('ZREVRANGE', IDS, '0', '1999')) || [];
  if (!ids.length) return [];
  const raws = await hub('MGET', ...ids.map(P));
  return raws.map((r) => { try { return r ? JSON.parse(r) : null; } catch (e) { return null; } }).filter(Boolean);
}
async function put(p) {
  await hub('SET', P(p.id), JSON.stringify(p));
  await hub('ZADD', IDS, String(p.createdAt), p.id);
  if (p.email) await hub('SET', EM(p.email), p.id);
}
const csvCell = (v) => { const s = String(v == null ? '' : v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');

    if (req.method === 'POST') {
      const b = await body(req);
      if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

      /* the public door: someone on her site put their email in */
      if (b.join) {
        const j = b.join;
        if (clean(j._honey, 10)) return send(res, 200, { ok: true });          // a bot; say nothing
        const email = clean(j.email, 200).toLowerCase();
        if (!okEmail(email)) return send(res, 400, { ok: false, error: 'BAD_EMAIL' });
        const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
        const k = 'crm:' + BRAND + ':rate:' + sha(ip);
        const n = await hub('INCR', k); if (n === 1) await hub('EXPIRE', k, '3600');
        if (n > 30) return send(res, 200, { ok: true });                        // quietly
        const now = new Date().toISOString();
        const source = clean(j.source, 80) || 'Her site';
        const known = await hub('GET', EM(email));
        let p = known ? await getPerson(known) : null;
        if (p) {
          p.asks = (p.asks || 1) + 1; p.lastSeen = now; p.updatedAt = now;
          if (!p.name && j.name) p.name = clean(j.name, 80);
          if (source && (p.sources || []).indexOf(source) < 0) p.sources = (p.sources || []).concat(source).slice(-8);
        } else {
          p = { id: Date.now().toString(36) + randomBytes(3).toString('hex'), name: clean(j.name, 80), email,
            phone: '', tags: tagsOf(j.tags), notes: '', source, sources: [source], consent: false, stage: 'new',
            asks: 1, createdAt: Date.now(), firstSeen: now, lastSeen: now, updatedAt: now, by: 'site' };
        }
        await put(p);
        return send(res, 200, { ok: true });
      }

      const who = await ndWho(req, url);
      if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

      if (b.remove) {
        const p = await getPerson(clean(b.remove, 40));
        if (!p) return send(res, 404, { ok: false, error: 'NO_PERSON' });
        await hub('DEL', P(p.id)); await hub('ZREM', IDS, p.id);
        if (p.email) await hub('DEL', EM(p.email));
        return send(res, 200, { ok: true });
      }

      if (b.save) {
        const s = b.save, now = new Date().toISOString();
        const email = clean(s.email, 200).toLowerCase();
        if (email && !okEmail(email)) return send(res, 400, { ok: false, error: 'BAD_EMAIL' });
        if (!email && !clean(s.name, 80)) return send(res, 400, { ok: false, error: 'NEED_NAME' });
        let p = s.id ? await getPerson(clean(s.id, 40)) : null;
        if (!p && email) { const known = await hub('GET', EM(email)); if (known) p = await getPerson(known); }
        if (p && p.email && email !== p.email) await hub('DEL', EM(p.email));
        p = Object.assign(p || { id: Date.now().toString(36) + randomBytes(3).toString('hex'), createdAt: Date.now(),
          firstSeen: now, source: 'Added by hand', sources: ['Added by hand'], asks: 0, stage: 'new', by: who.name || 'ND OS' }, {
          name: clean(s.name, 80), email, phone: clean(s.phone, 40), tags: tagsOf(s.tags),
          notes: clean(s.notes, 4000), consent: !!s.consent, updatedAt: now });
        await put(p);
        return send(res, 200, { ok: true, person: p });
      }
      return send(res, 400, { ok: false, error: 'NEED_ACTION' });
    }

    if (req.method === 'GET') {
      const who = await ndWho(req, url);
      if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });
      const all = await everyone();
      if (url.searchParams.get('csv') === '1') {
        const head = ['Name', 'Email', 'Phone', 'Tags', 'Said yes to emails', 'Came from', 'First seen', 'Last seen', 'Times asked', 'Notes'];
        const rows = all.map((p) => [p.name, p.email, p.phone, (p.tags || []).join('; '), p.consent ? 'yes' : 'no',
          (p.sources || [p.source]).join('; '), p.firstSeen, p.lastSeen || '', p.asks || 0, p.notes]);
        res.statusCode = 200;
        res.setHeader('content-type', 'text/csv; charset=utf-8');
        res.setHeader('cache-control', 'no-store');
        return res.end([head].concat(rows).map((r) => r.map(csvCell).join(',')).join('\r\n'));
      }
      return send(res, 200, { ok: true, people: all });
    }
    res.setHeader('allow', 'GET, POST');
    return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER' });
  }
}
