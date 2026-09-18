// /api/nd-auth — ND OS signs in the same way AE OS does.
// Accelerated Experiences LLC · Sep 18 2026
//
// Anthony: "if you are signed into one, you are the other... it's like a mini hub within
// my hub... a private office for Jessica." So there is no ND password. There are two
// doors and both are AE OS:
//
//   POST { pass }               a one-time pass minted by AE OS (aexperiences.studio/os-pass.html)
//                               while you are signed in there. Lives 2 minutes in the shared
//                               hub store, and GETDEL means it opens exactly once.
//   POST { email, password }    your AE OS email and password, checked BY AE OS
//                               (/api/login on aexperiences.studio). This door exists for the
//                               installed phone app, which cannot always see the AE OS sign-in.
//   GET                         who am I (x-nd-key: token)
//   POST { out:true }           sign out: the session is deleted from the shared store
//
// Only AE OS founder seats get in (Anthony, Jessica). A sales seat does not.
// The session is a random token; the store keeps only its SHA-256.
import { randomBytes } from 'node:crypto';
import { hub, sha, sessionFor, ndWho, BRAND } from './_nd-auth.mjs';

const AEOS = 'https://aexperiences.studio';
const DAYS = 30;
const NAMES = { 'anthonye@aexperiences.studio': 'Anthony', 'jre@aexperiences.studio': 'Jessica' };

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
const nameFor = (sub) => NAMES[String(sub || '').toLowerCase()] || String(sub || '').split('@')[0] || 'there';

async function open(res, sub, role) {
  if (role !== 'founder') return send(res, 403, { ok: false, error: 'NOT_YOURS' });
  const token = randomBytes(32).toString('base64url');
  const s = { sub: String(sub).toLowerCase(), name: nameFor(sub), role, brand: BRAND, at: Date.now(), exp: Date.now() + DAYS * 864e5 };
  await hub('SET', 'os:sess:' + sha(token), JSON.stringify(s), 'EX', String(DAYS * 86400));
  return send(res, 200, { ok: true, token, who: { name: s.name, email: s.sub } });
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');

    if (req.method === 'GET') {
      const who = await ndWho(req, url);
      if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });
      return send(res, 200, { ok: true, who: who.via === 'aeos' ? { name: who.name, email: who.sub } : { name: '', email: '' }, via: who.via });
    }
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' }); }

    const b = await body(req);
    if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

    if (b.out) {
      const t = String(req.headers['x-nd-key'] || '');
      if (await sessionFor(t)) await hub('DEL', 'os:sess:' + sha(t));
      return send(res, 200, { ok: true });
    }

    if (b.pass) {
      const pass = String(b.pass);
      if (!/^[A-Za-z0-9_-]{20,80}$/.test(pass)) return send(res, 400, { ok: false, error: 'BAD_PASS' });
      const raw = await hub('GETDEL', 'os:pass:' + pass);
      let p = null; try { p = raw ? JSON.parse(raw) : null; } catch (e) { p = null; }
      if (!p || p.brand !== BRAND || !p.exp || Date.now() > p.exp) return send(res, 401, { ok: false, error: 'PASS_USED' });
      return open(res, p.sub, p.role);
    }

    if (b.email && b.password) {
      const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'x';
      const tries = await hub('INCR', 'os:nd:tries:' + sha(ip));
      if (tries === 1) await hub('EXPIRE', 'os:nd:tries:' + sha(ip), '900');
      if (tries > 10) return send(res, 429, { ok: false, error: 'SLOW_DOWN' });
      const r = await fetch(AEOS + '/api/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: String(b.email).slice(0, 200), password: String(b.password).slice(0, 200) })
      });
      let j = null; try { j = await r.json(); } catch (e) { j = null; }
      if (!r.ok || !j || !j.ok) return send(res, 401, { ok: false, error: 'AEOS_NO' });
      return open(res, j.email, j.role);
    }

    return send(res, 400, { ok: false, error: 'NEED_PASS' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER' });
  }
}
