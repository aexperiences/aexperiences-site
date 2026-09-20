import { randomBytes } from 'node:crypto';
import { hub, ndWho, BRAND } from './_nd-auth.mjs';
// /api/nd-helper — Jessica's own helper, inside her office. Accelerated Experiences LLC · Sep 19 2026
//
// Promised in her video brief: "A helper of your own, right inside your office. You will be able
// to just ask it." Anthony's list asked for "an AI for writing or questions that is a skilled Neuro
// specialist, knows the site, is her assistant. She can talk to it."
//
// One voice, not a department. Where a question is really a call between the two schools of
// thought, the helper says so and sends her to the Quality room, which is built for exactly that.
//
//   POST { q, history:[{who:'me'|'helper', t}], manual:[{t,b}], room }  -> { ok, text, via }
//   GET  ?probe=1                                                       -> { ok, said }
//
// Same model path as /api/nd-dept, deliberately copied rather than shared so the Quality
// department cannot be broken by a change made here: Fable server-to-server on a service seat,
// then this site's own DeepSeek seat while Fable carries no environment. Same PII gate.
// Nothing is stored server-side. Her conversation lives on her own device.

export const maxDuration = 60;

const FABLE = process.env.FABLE_URL || 'https://ae-fable-api.vercel.app/api/fable';
const BRAND_NAME = 'The Neuro-Divulge';
const SEAT = 'helper:' + BRAND + ':seat';
const SEAT_DAYS = 30;

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);

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

/* Fable caps a persona at 900 characters. This one is 880 or under — keep it that way. */
const PERSONA =
  'You are Jessica\'s own helper, inside ND OS, the office for ' + BRAND_NAME + ': her writing, videos, ' +
  'newsletter and small products for parents of autistic, ADHD and otherwise neurodivergent kids. She is an ' +
  'RN who homeschools. You know neurodivergence, sensory needs, parenting, homeschooling and writing for her ' +
  'readers, and you know her office from the manual pages you are handed. Help her write, answer her ' +
  'questions and show her how her office works. Talk to her by name, warm and brief, like a trusted ' +
  'colleague. Short paragraphs. If a question is really a call between the clinical school and the ' +
  'neurodiversity-affirming school, say so and suggest her Quality room. No diagnosis, no medication doses; ' +
  'name the kind of professional when one is needed. Never put family names in anything meant for the public.';

const HONESTY = ' Ground every answer in what you are given and what is well established. NEVER invent facts, names, dates, numbers, prices, studies or quotes. If the manual pages do not say how her office does something, say you are not sure and suggest the ? button. Keep it under 220 words unless she asks for a draft.';

async function seat() {
  let tok = await hub('GET', SEAT);
  if (tok && (await hub('EXISTS', 'hub:sess:' + tok))) return tok;
  tok = randomBytes(24).toString('base64url');
  await hub('SET', 'hub:sess:' + tok, 'owner|Jessica|' + BRAND, 'EX', String(SEAT_DAYS * 86400));
  await hub('SET', SEAT, tok, 'EX', String(SEAT_DAYS * 86400));
  return tok;
}

const DS_KEY = process.env.DEEPSEEK_API_KEY || '';
const DS_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DS_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE = /(?:\+?\d[\s().+-]{0,2}){10,}/;
const STREET = /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9][A-Za-z0-9.'-]*(?:\s+[A-Za-z0-9][A-Za-z0-9.'-]*)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Way|Ct|Court|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Highway)\b\.?/i;
function sensitive(t) { t = String(t || ''); return EMAIL.test(t) ? 'email address' : PHONE.test(t) ? 'phone number' : STREET.test(t) ? 'street address' : ''; }

async function direct(prompt, context) {
  if (!DS_KEY) return null;
  const user = (context ? context + '\n\n' : '') + prompt;
  const flagged = sensitive(user);
  if (flagged) return { ok: false, error: 'PII', message: 'That has a ' + flagged + ' in it. Your helper does not send a reader\'s details out. Take it out and ask again.' };
  try {
    const r = await fetch(DS_BASE.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + DS_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: DS_MODEL, temperature: 0.6, max_tokens: 1400,
        messages: [{ role: 'system', content: PERSONA + HONESTY }, { role: 'user', content: user }] })
    });
    const j = await r.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) return { ok: false, error: 'MODEL', message: 'No answer came back. Try again.' };
    return { ok: true, text: String(text).slice(0, 6000), via: 'site' };
  } catch (e) { return { ok: false, error: 'MODEL', message: 'The helper hit a snag. Try again.' }; }
}

async function ask(prompt, context) {
  let j = null, status = 0;
  try {
    const sess = await seat();
    const r = await fetch(FABLE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ns: BRAND, sess, brand: BRAND_NAME, persona: PERSONA, section: 'helper', prompt: prompt + '\n\n(' + HONESTY.trim() + ')', context: context || '' })
    });
    status = r.status;
    try { j = await r.json(); } catch (e) { j = null; }
  } catch (e) { j = null; }
  if (j && j.ok) return { ok: true, text: String(j.text || ''), via: 'fable' };
  if (j && j.reason === 'pii_blocked') return { ok: false, error: 'PII', message: j.message || 'That has a reader\'s details in it. Take them out and ask again.' };
  const local = await direct(prompt, context);
  if (local) return local;
  return { ok: false, error: (j && (j.error || j.reason)) || ('FABLE_' + status), message: 'Your helper could not be reached. Try again in a moment.' };
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      if (url.searchParams.get('probe') === '1') {
        const r = await ask('Reply with the single word: ready.', '');
        return send(res, 200, r.ok ? { ok: true, via: r.via, said: clean(r.text, 80) } : r);
      }
      return send(res, 200, { ok: true });
    }
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' }); }

    const b = await body(req);
    if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });
    const q = clean(b.q, 2000);
    if (q.length < 2) return send(res, 400, { ok: false, error: 'NEED_MORE' });

    const hist = (Array.isArray(b.history) ? b.history : []).slice(-8)
      .map((h) => (h && h.who === 'helper' ? 'HELPER: ' : 'JESSICA: ') + clean(h && h.t, 900)).join('\n');
    const man = (Array.isArray(b.manual) ? b.manual : []).slice(0, 4)
      .map((m) => '- ' + clean(m && m.t, 120) + ': ' + clean(m && m.b, 700)).join('\n');
    const room = clean(b.room, 40);

    const context =
      (man ? 'PAGES FROM HER OFFICE MANUAL THAT MAY BEAR ON THIS:\n' + man + '\n\n' : '') +
      (room ? 'SHE CAME FROM THE ROOM: ' + room + '\n\n' : '') +
      (hist ? 'THE CONVERSATION SO FAR:\n' + hist + '\n\n' : '');

    const r = await ask('JESSICA ASKS: ' + q, context);
    if (!r.ok) return send(res, 200, r);
    return send(res, 200, { ok: true, text: clean(r.text, 6000), via: r.via });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER' });
  }
}
