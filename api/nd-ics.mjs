// /api/nd-ics — her calendar, as a subscription her phone keeps up to date by itself.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony's ND OS list: "Calendar subscription. And link calendar to schedule of social
// media automation." So one feed carries everything the Calendar room already gathers:
// what she put on the calendar, what the list says is due, and every post waiting in the
// Blastpack queue — the posting schedule, on her phone's own calendar, with no re-typing.
//
//   POST { feed:true }        signed in   -> mints (or returns) her private feed address
//   POST { feed:'new' }       signed in   -> throws the old address away and mints a new one
//   GET  ?t=<feed token>      public      -> text/calendar
//
// The token is the only key. It is long, it opens nothing but this read-only feed, and
// it can be replaced from the room in one tap. Same store as the rooms (Art. XVII).
import { randomBytes, createHash } from 'node:crypto';
import { ndWho } from './_nd-auth.mjs';

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const FEED = 'nd:feed';                       // sha of the live token
const SITE = 'https://www.aexperiences.com';
const sha = (s) => createHash('sha256').update(String(s)).digest('hex');

async function redis(...cmd) {
  const r = await fetch(KV_URL, { method: 'POST', headers: { authorization: 'Bearer ' + KV_TOK, 'content-type': 'application/json' }, body: JSON.stringify(cmd) });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json(); if (j.error) throw new Error('store: ' + j.error); return j.result;
}
const getJSON = async (k) => { const v = await redis('GET', k); try { return v ? JSON.parse(v) : null; } catch (e) { return null; } };
async function listOf(index, K) {
  const ids = (await redis('LRANGE', index, '0', '999')) || [];
  const out = []; for (const id of ids) { const i = await getJSON(K(id)); if (i) out.push(i); } return out;
}
function send(res, code, obj) {
  res.statusCode = code; res.setHeader('content-type', 'application/json; charset=utf-8'); res.setHeader('cache-control', 'no-store'); res.end(JSON.stringify(obj));
}
async function body(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  const chunks = []; for await (const c of req) chunks.push(c);
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return null; }
}

/* ---- ICS ---- */
const esc = (s) => String(s == null ? '' : s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/[,;]/g, (m) => '\\' + m);
const stamp = (d) => new Date(d).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
const fold = (line) => { const out = []; let s = line; while (s.length > 72) { out.push(s.slice(0, 72)); s = ' ' + s.slice(72); } out.push(s); return out.join('\r\n'); };
function vevent(uid, at, summary, desc, url, minutes) {
  const start = new Date(at); if (isNaN(start)) return '';
  const end = new Date(start.getTime() + (minutes || 30) * 60000);
  return ['BEGIN:VEVENT', 'UID:' + uid + '@nd.aexperiences.com', 'DTSTAMP:' + stamp(Date.now()),
    'DTSTART:' + stamp(start), 'DTEND:' + stamp(end), fold('SUMMARY:' + esc(summary)),
    desc ? fold('DESCRIPTION:' + esc(desc)) : '', url ? 'URL:' + url : '', 'END:VEVENT'].filter(Boolean).join('\r\n');
}

export default async function handler(req, res) {
  try {
    if (!KV_URL || !KV_TOK) return send(res, 503, { ok: false, error: 'NO_STORE' });
    const url = new URL(req.url, SITE);

    if (req.method === 'GET') {
      const t = String(url.searchParams.get('t') || '');
      if (!/^[A-Za-z0-9_-]{40,64}$/.test(t) || (await redis('GET', FEED)) !== sha(t)) {
        res.statusCode = 404; res.setHeader('content-type', 'text/plain'); return res.end('No such calendar.');
      }
      const [cal, list, queue] = await Promise.all([
        listOf('nd:cal:all', (id) => 'nd:cal:' + id),
        listOf('nd:list:all', (id) => 'nd:list:' + id),
        listOf('nd:queue', (id) => 'nd:q:' + id)
      ]);
      const ev = [];
      cal.forEach((i) => { if (i.at) ev.push(vevent('cal-' + i.id, i.at, i.text || 'On the calendar', '', SITE + '/nd/os/calendar/', 30)); });
      list.forEach((i) => { if (i.at && !i.done) ev.push(vevent('due-' + i.id, i.at, 'Due: ' + (i.text || ''), 'From your list', SITE + '/nd/os/list/', 30)); });
      queue.forEach((i) => { if (i.at && i.status !== 'failed') ev.push(vevent('post-' + i.id, i.at,
        (i.status === 'sent' ? 'Posted' : 'Blastpack posts') + ': ' + (i.platforms || []).join(', '),
        String(i.text || '').slice(0, 400), SITE + '/nd/os/blast/', 15)); });
      const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Accelerated Experiences LLC//ND OS//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
        'X-WR-CALNAME:The Neuro-Divulge', 'X-WR-CALDESC:Her calendar, her list, and the Blastpack schedule.', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H',
        ...ev.filter(Boolean), 'END:VCALENDAR'].join('\r\n') + '\r\n';
      res.statusCode = 200;
      res.setHeader('content-type', 'text/calendar; charset=utf-8');
      res.setHeader('content-disposition', 'inline; filename="the-neuro-divulge.ics"');
      res.setHeader('cache-control', 'no-store');
      return res.end(ics);
    }

    if (req.method === 'POST') {
      const who = await ndWho(req, url);
      if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });
      const b = await body(req); if (!b || !b.feed) return send(res, 400, { ok: false, error: 'BAD_JSON' });
      let tok = await redis('GET', FEED + ':tok');
      if (!tok || b.feed === 'new') {
        tok = randomBytes(36).toString('base64url').slice(0, 48);
        await redis('SET', FEED, sha(tok)); await redis('SET', FEED + ':tok', tok);
      }
      const https = SITE + '/api/nd-ics?t=' + tok;
      return send(res, 200, { ok: true, url: https, webcal: https.replace(/^https:/, 'webcal:') });
    }
    res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' });
  } catch (e) { return send(res, 500, { ok: false, error: 'SERVER', message: String((e && e.message) || e) }); }
}
