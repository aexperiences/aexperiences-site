// _nd-auth — who is asking, for every ND OS endpoint.
// Accelerated Experiences LLC · Sep 18 2026
//
// ND OS is Jessica's private office inside AE OS. It signs in the way AE OS signs in:
// the AE OS session mints a one-time pass, /api/nd-auth trades it for an ND session,
// and the session lives in the SHARED hub database (HUB_KV_* here = KV_* on aehub,
// the same Upstash store), so AE OS can see and revoke it.
//
// Two answers count as "signed in":
//   1. an ND session token  -> { via:'aeos', sub, name, role, brand }
//   2. ND_BLOG_KEY          -> { via:'word' }   kept for machines (Blastpack draining the
//                                                queue) and for phones still holding it.
import { createHash } from 'node:crypto';

const HUB_URL = process.env.HUB_KV_REST_API_URL || '';
const HUB_TOK = process.env.HUB_KV_REST_API_TOKEN || '';

export const BRAND = 'nd';
export const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

export async function hub(...cmd) {
  if (!HUB_URL || !HUB_TOK) throw new Error('NO_HUB_STORE');
  const r = await fetch(HUB_URL, {
    method: 'POST',
    headers: { authorization: 'Bearer ' + HUB_TOK, 'content-type': 'application/json' },
    body: JSON.stringify(cmd)
  });
  if (!r.ok) throw new Error('hub_store_' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('hub_store: ' + j.error);
  return j.result;
}

export async function sessionFor(token) {
  if (!/^[A-Za-z0-9_-]{40,64}$/.test(String(token || ''))) return null;
  let raw = null;
  try { raw = await hub('GET', 'os:sess:' + sha(token)); } catch (e) { return null; }
  if (!raw) return null;
  let s = null; try { s = JSON.parse(raw); } catch (e) { return null; }
  if (!s || s.brand !== BRAND || !s.exp || Date.now() > s.exp) return null;
  return s;
}

export async function ndWho(req, url) {
  const given = String(req.headers['x-nd-key'] || (url && url.searchParams.get('key')) || '');
  if (!given) return null;
  const KEY = process.env.ND_BLOG_KEY || '';
  if (KEY && given === KEY) return { via: 'word' };
  const s = await sessionFor(given);
  return s ? { via: 'aeos', sub: s.sub, name: s.name, role: s.role, brand: s.brand } : null;
}
