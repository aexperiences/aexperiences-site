import { randomBytes } from 'node:crypto';
import { hub, ndWho, BRAND } from './_nd-auth.mjs';
import { webSearch, webFetch } from './_nd-web.mjs';
// /api/nd-helper — Jessica's own helper, an agent on the AETRIAD. Accelerated Experiences LLC · Sep 19 2026
//
// Promised in her video brief: "A helper of your own, right inside your office. You will be able to
// just ask it." Then Anthony, the same night: make it an agent; it "needs to write to everything in
// there as well as be able to go out and search the internet and not be fenced to the OS"; it "must
// fetch ssot/constitution from her hall of records before anything"; and it runs on the bus and the
// triad, like everything else in her office.
//
// THE ORDER OF EVERY TURN
//   0. Constitution. Read from HER Hall of Records (records:nd:*, folder "Constitution") before anything
//      else. No constitution, no turn: the helper says so and does nothing.
//   1. The Doer (a model) reads her question, her office as her rooms sent it, and the manual pages.
//      It may ask for the web first: up to three searches or page reads. Then it answers and PROPOSES
//      actions. It never performs one.
//   2. The Guard (a model, sealed from the Doer's reasoning) reads ONLY the proposed actions and the
//      constitution, and argues against each one.
//   3. The Pacemaker (code) releases an action only when it is well-formed and the Guard cleared it.
//      A held action comes back with the Guard's reason, never silently dropped.
//   4. Her hand. Every released action is a card. Nothing is written, queued or sent until SHE taps
//      Do it, and then it goes through the same door her room uses (/api/nd-store, nd-jobs, nd-books,
//      nd-records, nd-queue, nd-blog, nd-inbox). The room then speaks on the bus.
//
//   POST { q, history, manual:[{t,b}], room, now, office:{list,cal,docs,jobs} }
//        -> { ok, text, actions:[{…, triad:{released, why}}], web:[{kind,q|url,ok}], constitution:{id,at}, via }
//   GET  ?probe=1 -> { ok, said, constitution }
//
// Model path: Fable server-to-server on a service seat, then the site's DeepSeek seat while Fable has
// no environment (same as /api/nd-dept). Same PII gate. Nothing about the conversation is stored.

export const maxDuration = 60;

const FABLE = process.env.FABLE_URL || 'https://ae-fable-api.vercel.app/api/fable';
const BRAND_NAME = 'The Neuro-Divulge';
const SEAT = (who) => 'helper:' + BRAND + ':seat:' + who;
const SEAT_DAYS = 30;
const T0 = () => Date.now();

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const num = (v) => { const n = Number(v); return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0; };

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

/* ---- 0 · the constitution, from her Hall of Records ------------------------------------- */
async function constitution() {
  const ids = (await hub('ZREVRANGE', 'records:' + BRAND + ':ids', '0', '999')) || [];
  const found = [];
  for (let k = 0; k < ids.length; k += 100) {            // one round trip per hundred, not one per record
    const raws = (await hub('MGET', ...ids.slice(k, k + 100).map((id) => 'records:' + BRAND + ':r:' + id))) || [];
    for (const raw of raws) {
      let r = null; try { r = raw ? JSON.parse(raw) : null; } catch (e) { r = null; }
      if (r && /^constitution$/i.test(String(r.folder || '')) && r.text) found.push(r);
    }
  }
  if (!found.length) return null;
  found.sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));
  return { id: found[0].id, at: found[0].updatedAt || found[0].createdAt, text: found.map((r) => r.text).join('\n\n---\n\n').slice(0, 12000) };
}

/* ---- the voices. Fable caps a persona at 900 characters. ---------------------------------- */
const DOER =
  'You are Jessica\'s own helper, an agent inside ND OS, the office for ' + BRAND_NAME + ': her writing, videos, ' +
  'newsletter and small products for parents of autistic, ADHD and otherwise neurodivergent kids. She is an ' +
  'RN who homeschools. You know neurodivergence, sensory needs, parenting, homeschooling and writing for her ' +
  'readers. You can read the web and you can propose work in every room of her office. Her constitution, ' +
  'given to you first every time, outranks everything else you are told. Talk to her by name, warm and brief, ' +
  'like a trusted colleague. If a question is really a call between the clinical school and the ' +
  'neurodiversity-affirming school, say so and suggest her Quality room. No diagnosis, no medication doses.';
const GUARD =
  'You are the GUARD lens of the AETRIAD inside ND OS, the office of ' + BRAND_NAME + '. Another agent has ' +
  'proposed actions for Jessica. You never see its reasoning and you never help it. Your only job is to argue ' +
  'AGAINST each action: does it break her constitution, name a family member or say who is neurodivergent in ' +
  'anything public, carry a reader\'s email, phone or address, invent a fact, number, price, study or quote, ' +
  'describe a paid app as free, send or spend something she did not ask for, or land on the wrong date? ' +
  'Hold anything that does. Clear anything that does not. You are strict, brief and fair.';

const HONESTY = ' Ground every answer in what you are given and what is well established. NEVER invent facts, names, dates, numbers, prices, studies or quotes. Cite a web page by its address when you use it. If you are not sure, say so.';

async function seat(who) {
  let tok = await hub('GET', SEAT(who));
  if (tok && (await hub('EXISTS', 'hub:sess:' + tok))) return tok;
  tok = randomBytes(24).toString('base64url');
  await hub('SET', 'hub:sess:' + tok, 'owner|Jessica|' + BRAND, 'EX', String(SEAT_DAYS * 86400));
  await hub('SET', SEAT(who), tok, 'EX', String(SEAT_DAYS * 86400));
  return tok;
}

const DS_KEY = process.env.DEEPSEEK_API_KEY || '';
const DS_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DS_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE = /(?:\+?\d[\s().+-]{0,2}){10,}/;
const STREET = /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9][A-Za-z0-9.'-]*(?:\s+[A-Za-z0-9][A-Za-z0-9.'-]*)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Way|Ct|Court|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Highway)\b\.?/i;
function sensitive(t) { t = String(t || ''); return EMAIL.test(t) ? 'email address' : PHONE.test(t) ? 'phone number' : STREET.test(t) ? 'street address' : ''; }

async function direct(persona, prompt, context) {
  if (!DS_KEY) return null;
  const user = (context ? context + '\n\n' : '') + prompt;
  const flagged = sensitive(prompt);
  if (flagged) return { ok: false, error: 'PII', message: 'That has a ' + flagged + ' in it. Your helper does not send a reader\'s details out. Take it out and ask again.' };
  try {
    const r = await fetch(DS_BASE.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + DS_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: DS_MODEL, temperature: 0.5, max_tokens: 1800,
        messages: [{ role: 'system', content: persona + HONESTY }, { role: 'user', content: user }] })
    });
    const j = await r.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) return { ok: false, error: 'MODEL', message: 'No answer came back. Try again.' };
    return { ok: true, text: String(text).slice(0, 9000), via: 'site' };
  } catch (e) { return { ok: false, error: 'MODEL', message: 'The helper hit a snag. Try again.' }; }
}
async function ask(who, persona, prompt, context) {
  let j = null;
  try {
    const sess = await seat(who);
    const r = await fetch(FABLE, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ns: BRAND, sess, brand: BRAND_NAME, persona, section: 'helper', prompt: prompt + '\n\n(' + HONESTY.trim() + ')', context: context || '' })
    });
    try { j = await r.json(); } catch (e) { j = null; }
  } catch (e) { j = null; }
  if (j && j.ok) return { ok: true, text: String(j.text || ''), via: 'fable' };
  if (j && j.reason === 'pii_blocked') return { ok: false, error: 'PII', message: j.message || 'That has a reader\'s details in it. Take them out and ask again.' };
  const local = await direct(persona, prompt, context);
  if (local) return local;
  return { ok: false, error: 'MODEL', message: 'Your helper could not be reached. Try again in a moment.' };
}
function jsonOf(text) {
  const s = String(text || ''); const i = s.indexOf('{'), k = s.lastIndexOf('}');
  if (i < 0 || k <= i) return null;
  try { return JSON.parse(s.slice(i, k + 1)); } catch (e) { return null; }
}

/* ---- 1 · the Doer's contract ------------------------------------------------------------- */
const ROOMS_ASK =
  'Reply with ONLY a JSON object, no prose around it:\n' +
  '{"web":[<0 to 3 of {"search":"<query>"} or {"read":"<https address>"}; only if you need the web and have not read it yet>],\n' +
  ' "reply":"<what you say to her, plain text, short paragraphs; empty if you asked for the web>",\n' +
  ' "actions":[<0 to 6, only when she asked for them or clearly wants them>]}\n' +
  'You PROPOSE; she confirms each with one tap. Never say you did something; say it is ready for her to tap.\n' +
  'Action shapes (dates are her local YYYY-MM-DD, times HH:MM 24-hour; work them out from TODAY):\n' +
  '{"type":"list_add","text":"","date":""}   {"type":"list_done","id":"<an id from HER OPEN LIST>"}\n' +
  '{"type":"cal_add","text":"","date":"","time":""}\n' +
  '{"type":"doc_add","title":"","body":""}   a real document in Docs\n' +
  '{"type":"record_add","folder":"","kind":"Decision|Money|Sent|Received|Client|Idea|Note","text":""}   her Hall of Records\n' +
  '{"type":"job_add","title":"","kinds":["tiktok|facebook|instagram|youtube|x|blog|email|blast|research|coord|other"],"date":"","notes":"","internal":true}\n' +
  '{"type":"expense_add","what":"","amount":0,"date":"","kind":"","notes":""}   only an amount she told you\n' +
  '{"type":"queue_post","text":"","platforms":["instagram|tiktok|facebook|youtube|pinterest"],"date":"","time":""}   Blastpack queue\n' +
  '{"type":"draft_post","title":"","dek":"","body":""}   a DRAFT blog post; she publishes it herself in Write\n' +
  '{"type":"note_anthony","subject":"","body":""}   {"type":"request_anthony","subject":"","body":"","due":""}\n' +
  'If a date, time or amount is missing, ask her instead of guessing. Use list_done only with an id from her open list.';

const YMD = /^\d{4}-\d{2}-\d{2}$/, HM = /^([01]\d|2[0-3]):[0-5]\d$/;
const JOB_KINDS = new Set(['tiktok', 'facebook', 'instagram', 'youtube', 'x', 'blog', 'email', 'blast', 'research', 'coord', 'other']);
const PLATS = new Set(['instagram', 'tiktok', 'facebook', 'youtube', 'pinterest']);
const REC_KINDS = new Set(['Decision', 'Money', 'Sent', 'Received', 'Client', 'Idea', 'Note']);

/* Pacemaker, part one: an action is well-formed or it does not exist. */
function shapeAction(a, listIds) {
  if (!a || typeof a !== 'object') return null;
  const t = String(a.type || '');
  const d = YMD.test(a.date || '') ? a.date : '';
  switch (t) {
    case 'list_add': { const text = clean(a.text, 300); return text ? { type: t, text, date: d } : null; }
    case 'list_done': { const id = clean(a.id, 60); return listIds.has(id) ? { type: t, id } : null; }
    case 'cal_add': { const text = clean(a.text, 300); return text && d && HM.test(a.time || '') ? { type: t, text, date: d, time: a.time } : null; }
    case 'doc_add': { const title = clean(a.title, 160), b = clean(a.body, 60000); return title && b ? { type: t, title, body: b } : null; }
    case 'record_add': { const text = clean(a.text, 20000); return text ? { type: t, folder: clean(a.folder, 40).replace(/\s+/g, ' ') || 'General', kind: REC_KINDS.has(a.kind) ? a.kind : 'Note', text } : null; }
    case 'job_add': { const title = clean(a.title, 200); if (!title) return null;
      const kinds = (Array.isArray(a.kinds) ? a.kinds : []).map((k) => String(k).toLowerCase()).filter((k) => JOB_KINDS.has(k)).slice(0, 11);
      return { type: t, title, kinds: kinds.length ? kinds : ['other'], date: d, notes: clean(a.notes, 4000), internal: a.internal !== false }; }
    case 'expense_add': { const what = clean(a.what, 200), amount = num(a.amount); return what && amount > 0 ? { type: t, what, amount, date: d, kind: clean(a.kind, 40) || 'Supplies', notes: clean(a.notes, 1000) } : null; }
    case 'queue_post': { const text = clean(a.text, 4000); const platforms = (Array.isArray(a.platforms) ? a.platforms : []).map((p) => String(p).toLowerCase()).filter((p) => PLATS.has(p));
      return text && platforms.length && d && HM.test(a.time || '') ? { type: t, text, platforms, date: d, time: a.time } : null; }
    case 'draft_post': { const title = clean(a.title, 180), b = clean(a.body, 60000); return title && b ? { type: t, title, dek: clean(a.dek, 300), body: b } : null; }
    case 'note_anthony': case 'request_anthony': { const subject = clean(a.subject, 200), b = clean(a.body, 4000); if (!subject && !b) return null;
      const out = { type: t, subject: subject || b.slice(0, 60), body: b }; if (t === 'request_anthony') out.due = YMD.test(a.due || '') ? a.due : ''; return out; }
    default: return null;
  }
}

/* ---- 2 · the Guard, sealed, argues against every action --------------------------------- */
async function guard(actions, law, today, asked) {
  const ask1 = 'Here are the proposed actions, numbered from 0. For EACH, decide hold or clear against the ' +
    'constitution and your rules. Reply with ONLY JSON: {"verdicts":[{"i":0,"hold":true|false,"why":"<one plain sentence>"}]}\n\n' +
    actions.map((a, i) => i + ': ' + JSON.stringify(a)).join('\n');
  const r = await ask('guard', GUARD, ask1, 'TODAY: ' + today + '\n\nWHAT JESSICA ASKED, IN HER OWN WORDS (an action she plainly asked for, with the date or amount she gave, is hers to have; you judge whether it breaks the constitution, not whether it is useful):\n' + asked + '\n\nHER CONSTITUTION:\n' + law);
  const o = r.ok ? jsonOf(r.text) : null;
  const v = new Map();
  for (const x of (o && Array.isArray(o.verdicts) ? o.verdicts : [])) if (x && Number.isInteger(x.i)) v.set(x.i, x);
  // Pacemaker, part two: no verdict is not a pass. An action the Guard did not clear is held.
  return actions.map((a, i) => {
    const x = v.get(i);
    const pii = sensitive(JSON.stringify(a));
    if (pii) return Object.assign(a, { triad: { released: false, why: 'It carries a ' + pii + '. That does not go into her office from the helper.' } });
    if (!x) return Object.assign(a, { triad: { released: false, why: r.ok ? 'The Guard did not rule on this one, so it is held.' : 'The Guard could not be reached, so this is held. Ask again in a moment.' } });
    return Object.assign(a, { triad: { released: !x.hold, why: clean(x.why, 300) } });
  });
}

export default async function handler(req, res) {
  const start = T0();
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    // 0 · the constitution, before anything
    let law = null;
    try { law = await constitution(); } catch (e) { law = null; }
    const lawTag = law ? { id: law.id, at: law.at } : null;

    if (req.method === 'GET') {
      if (url.searchParams.get('probe') === '1') {
        const r = await ask('doer', DOER, 'Reply with the single word: ready.', '');
        return send(res, 200, r.ok ? { ok: true, via: r.via, said: clean(r.text, 80), constitution: lawTag } : Object.assign(r, { constitution: lawTag }));
      }
      return send(res, 200, { ok: true, constitution: lawTag });
    }
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' }); }
    if (!law) return send(res, 200, { ok: false, error: 'NO_CONSTITUTION', message: 'Your helper reads your constitution before it does anything, and there is not one in your Hall of Records yet (folder: Constitution). Nothing was done.' });

    const b = await body(req);
    if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
    const q = clean(b.q, 2000);
    if (q.length < 2) return send(res, 400, { ok: false, error: 'NEED_MORE' });

    const hist = (Array.isArray(b.history) ? b.history : []).slice(-8)
      .map((h) => (h && h.who === 'helper' ? 'HELPER: ' : 'JESSICA: ') + clean(h && h.t, 900)).join('\n');
    const man = (Array.isArray(b.manual) ? b.manual : []).slice(0, 4)
      .map((m) => '- ' + clean(m && m.t, 120) + ': ' + clean(m && m.b, 700)).join('\n');
    const office = (b.office && typeof b.office === 'object') ? b.office : {};
    const rows = (a, n, f) => (Array.isArray(a) ? a : []).slice(0, n).map(f).filter(Boolean);
    const list = rows(office.list, 60, (x) => x && x.id && x.text ? { id: clean(x.id, 60), text: clean(x.text, 240), at: clean(x.at, 40) } : null);
    const cal = rows(office.cal, 60, (x) => x && x.text ? clean(x.at, 40) + ' | ' + clean(x.text, 200) : null);
    const docs = rows(office.docs, 40, (x) => x && x.title ? clean(x.title, 120) : null);
    const jobs = rows(office.jobs, 40, (x) => x && x.title ? clean(x.title, 120) + ' (' + clean(x.status, 20) + ')' : null);
    const listIds = new Set(list.map((x) => x.id));
    const today = clean(b.now, 60) || new Date().toISOString();
    const room = clean(b.room, 40);

    const base =
      'HER CONSTITUTION (read first; it outranks everything below):\n' + law.text + '\n\n' +
      'TODAY, HER LOCAL TIME: ' + today + '\n\n' +
      'HER OPEN LIST (id | to-do | when):\n' + (list.length ? list.map((x) => x.id + ' | ' + x.text + ' | ' + (x.at || '-')).join('\n') : '(empty)') + '\n\n' +
      'HER CALENDAR, NEXT WEEKS:\n' + (cal.length ? cal.join('\n') : '(nothing booked)') + '\n\n' +
      (docs.length ? 'HER DOCS: ' + docs.join(' · ') + '\n\n' : '') +
      (jobs.length ? 'HER JOBS: ' + jobs.join(' · ') + '\n\n' : '') +
      (man ? 'PAGES FROM HER OFFICE MANUAL:\n' + man + '\n\n' : '') +
      (room ? 'SHE CAME FROM THE ROOM: ' + room + '\n\n' : '') +
      (hist ? 'THE CONVERSATION SO FAR:\n' + hist + '\n\n' : '');

    // 1 · the Doer, with up to one trip to the web
    let r = await ask('doer', DOER, ROOMS_ASK + '\n\nJESSICA ASKS: ' + q, base);
    if (!r.ok) return send(res, 200, Object.assign(r, { constitution: lawTag }));
    let o = jsonOf(r.text);
    const trips = [];
    if (o && Array.isArray(o.web) && o.web.length && T0() - start < 25000) {
      const asks = o.web.slice(0, 3);
      const got = await Promise.all(asks.map(async (w) => {
        try {
          if (w && w.search) { const s = await webSearch(w.search); trips.push({ kind: 'search', q: clean(w.search, 200), ok: true });
            return 'SEARCH "' + clean(w.search, 200) + '":\n' + s.results.map((x) => '- ' + x.title + ' — ' + x.url + (x.snippet ? ' — ' + x.snippet : '')).join('\n'); }
          if (w && w.read) { const p = await webFetch(w.read); trips.push({ kind: 'read', url: p.url, ok: true });
            return 'PAGE ' + p.url + (p.title ? ' (' + p.title + ')' : '') + ':\n' + p.text; }
        } catch (e) { trips.push({ kind: w && w.search ? 'search' : 'read', q: clean(w && (w.search || w.read), 200), ok: false, why: clean(e && e.message, 160) }); return 'WEB REQUEST FAILED: ' + clean(w && (w.search || w.read), 200) + ' (' + clean(e && e.message, 100) + ')'; }
        return '';
      }));
      r = await ask('doer', DOER, ROOMS_ASK + '\nYou have now read the web below. Do not ask for the web again.\n\nJESSICA ASKS: ' + q,
        base + 'WHAT THE WEB SAID:\n' + got.filter(Boolean).join('\n\n').slice(0, 14000));
      if (!r.ok) return send(res, 200, Object.assign(r, { constitution: lawTag, web: trips }));
      o = jsonOf(r.text);
    }
    if (!o || typeof o.reply !== 'string') return send(res, 200, { ok: true, text: clean(r.text, 9000), actions: [], web: trips, constitution: lawTag, via: r.via });

    // 2 + 3 · the Guard argues, the Pacemaker releases
    let actions = (Array.isArray(o.actions) ? o.actions : []).slice(0, 6).map((a) => shapeAction(a, listIds)).filter(Boolean);
    if (actions.length) actions = await guard(actions, law.text, today, q);

    return send(res, 200, { ok: true, text: clean(o.reply, 9000) || (actions.length ? 'Here is what I would do. Tap the ones you want.' : (trips.length && trips.every((t) => !t.ok) ? 'I tried the web and could not get through just now, so I have nothing sourced to tell you. Ask me again in a minute.' : 'I do not have a good answer for that yet. Try asking it another way.')), actions, web: trips, constitution: lawTag, via: r.via });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER' });
  }
}
