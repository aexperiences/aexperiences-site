// /api/nd-dept — her Quality Department. Two sealed lenses, a Pacemaker, and a Head she talks to.
// Accelerated Experiences LLC · Sep 19 2026
//
// Anthony: "She needs a quality Department... the lenses should specialize in what this subject
// is, but differ... like are there two schools of thought when it comes to the spectrum, ADHD
// and other neurodivergent... that differ greatly." And: the Pacemaker talks to a department
// head, "and then that is her assistant."
//
// So this is the AETRIAD with a model behind the lenses instead of a pure function — the ONE
// model the fleet runs on, Fable (ae-fable-api), server-to-server, so this office carries no
// key of its own. The shape is the same as nd-triad.js:
//
//   Lens A · CLINIC   the clinical / behavioral school. Evidence, structure, measurable goals,
//                     skills taught step by step, professionals in the loop.
//   Lens B · AFFIRM   the neurodiversity-affirming school. Difference, not deficit. Autonomy,
//                     sensory needs, accommodation over compliance, the child's own voice.
//   Both read the SAME thing and NEVER see each other. Opposing reads are the point.
//
//   Pacemaker         code, not a model. It releases only when both lenses answered, neither
//                     raised a safety flag, and both cleared the confidence bar. Otherwise it
//                     holds and says what it is waiting on. It never bluffs.
//
//   The Head          the department head — her assistant. It is the only voice she hears by
//                     default. It gets her question and BOTH lens reads, says where they agree
//                     once, says who is right for THIS case where they differ, and tells her
//                     what to do. When the Pacemaker holds, the Head says so in plain words.
//
// Two steps, so the room can show the lenses as they land and no one request runs long:
//   POST { read:{ q, ctx } }            -> { ok, a, b, gate }           (both lenses, in parallel)
//   POST { rule:{ q, ctx, a, b } }      -> { ok, gate, head, ruling }   (Pacemaker + Head, logged)
//   GET                                 -> { ok, log:[...] }             the last rulings
//   GET  ?probe=1                       -> { ok, fable:{...} }           is Fable answering this office?
//   POST { remove:id }                  -> { ok }                        forget a ruling
//
// Signing in: the room holds her ND session (x-nd-key). Fable wants a HUB session, so this
// endpoint keeps one service seat per lens in the shared store — hub:sess:<token> = "owner|Jessica|nd"
// — minted here, refreshed when missing, never shown to a browser. Rate limits then fall per lens.
//
// PII: Fable refuses anything carrying an email, phone or street address (it will not send a
// reader's details to an outside model). That refusal is passed through in plain words.
import { randomBytes } from 'node:crypto';
import { hub, ndWho, BRAND } from './_nd-auth.mjs';

export const maxDuration = 60;

const FABLE = process.env.FABLE_URL || 'https://ae-fable-api.vercel.app/api/fable';
const BRAND_NAME = 'The Neuro-Divulge';
const BAR = 55;                 // the confidence bar, out of 100
const LOG = 'dept:' + BRAND + ':log';
const SEAT = (lens) => 'dept:' + BRAND + ':seat:' + lens;
const SEAT_DAYS = 30;

const clean = (s, n) => String(s == null ? '' : s).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim().slice(0, n);
const num = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

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

/* ---- the three voices. Personas are capped at 900 characters by Fable. ------------------- */
const LENS = {
  a: {
    name: 'Clinic', side: 'clinical / behavioral',
    persona:
      'You are CLINIC, one of two sealed reviewers inside the quality department of ' + BRAND_NAME + ', a small ' +
      'media brand for parents of autistic, ADHD and otherwise neurodivergent kids. You hold the clinical and ' +
      'behavioral school: evidence and effect sizes, structure and routine, skills taught in steps, measurable ' +
      'goals, data before conclusions, and licensed professionals (pediatrician, OT, SLP, psychologist, BCBA) in ' +
      'the loop. You value what has been shown to work and you say when a claim is unproven. You are not cold: ' +
      'you want the child to gain skills and the parent to get relief. You do not know what the other reviewer ' +
      'thinks and you never guess at it. You are candid about the limits of your school. Plain English, no jargon ' +
      'without a gloss, no diagnosis, no medication doses, never a fabricated study or number.'
  },
  b: {
    name: 'Affirm', side: 'neurodiversity-affirming',
    persona:
      'You are AFFIRM, one of two sealed reviewers inside the quality department of ' + BRAND_NAME + ', a small ' +
      'media brand for parents of autistic, ADHD and otherwise neurodivergent kids. You hold the neurodiversity-' +
      'affirming school: difference, not deficit; the child\'s own voice and autonomy; sensory and regulation ' +
      'needs before behavior; accommodation over compliance; strengths first; the lived experience of autistic ' +
      'and ADHD adults; masking and burnout as real costs. You are wary of approaches that train a child to look ' +
      'typical, and you say so. You are not anti-help: you want support that respects the child. You do not ' +
      'know what the other reviewer thinks and you never guess at it. You are candid about the limits of your ' +
      'school. Plain English, no jargon without a gloss, no diagnosis, no medication doses, never a fabricated ' +
      'study or number.'
  }
};
const HEAD = {
  name: 'The Head',
  persona:
    'You are the head of the quality department at ' + BRAND_NAME + ', and Jessica\'s own assistant. Jessica runs ' +
    'the brand: posts, videos, a newsletter and small products for parents of autistic, ADHD and otherwise ' +
    'neurodivergent kids. Two sealed reviewers have already read what she brought — CLINIC (clinical / ' +
    'behavioral) and AFFIRM (neurodiversity-affirming) — and you have both reads. Your job: say where they agree, ' +
    'once; where they differ, say who is right for THIS case and why, in one breath; then tell her exactly what ' +
    'to do or change. Talk to her by name, warmly, like a trusted colleague, never like a form. Short paragraphs. ' +
    'Never invent a fact, a study, a number or a quote. No diagnosis, no medication doses. If something needs a ' +
    'professional, say so plainly and say which kind. Under 220 words.'
};

/* what a lens is asked to hand back — the Pacemaker reads this, not prose */
const LENS_ASK =
  'Review what follows from your school only. Reply with ONLY a JSON object, no prose around it:\n' +
  '{"take":"<your read, 3 to 5 sentences, to the author>",' +
  '"points":["<the 2 to 4 things that matter most, one line each>"],' +
  '"fix":["<0 to 3 concrete changes or actions>"],' +
  '"safety":<true only if this touches self-harm, abuse, a crisis, medication dosing, restraint, or a medical decision that needs a professional now>,' +
  '"confidence":<0-100, how sure your school can be about this from what is given>,' +
  '"needs":["<0 to 3 things you would need to know to be surer>"]}\n\n';

/* ---- Fable, server-to-server, on a service seat per lens ---------------------------------- */
async function seat(lens) {
  let tok = await hub('GET', SEAT(lens));
  if (tok && (await hub('EXISTS', 'hub:sess:' + tok))) return tok;
  tok = randomBytes(24).toString('base64url');
  await hub('SET', 'hub:sess:' + tok, 'owner|Jessica|' + BRAND, 'EX', String(SEAT_DAYS * 86400));
  await hub('SET', SEAT(lens), tok, 'EX', String(SEAT_DAYS * 86400));
  return tok;
}
async function fable(lens, persona, prompt, context, section) {
  const sess = await seat(lens);
  let j = null, status = 0;
  try {
    const r = await fetch(FABLE, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ns: BRAND, sess, brand: BRAND_NAME, persona, section: section || 'quality', prompt, context: context || '' })
    });
    status = r.status;
    try { j = await r.json(); } catch (e) { j = null; }
  } catch (e) { j = null; }
  if (j && j.ok) return { ok: true, text: String(j.text || ''), via: 'fable' };
  // Fable refused on content (a reader's email, phone or address): that is final, say so.
  if (j && j.reason === 'pii_blocked') return { ok: false, error: 'PII', message: j.message || '' };
  // Fable is not switched on for this office yet (no store, no key, or unreachable): the site's own seat.
  const local = await direct(persona, prompt, context);
  if (local) return local;
  return { ok: false, error: (j && (j.error || j.reason)) || ('FABLE_' + status), message: (j && j.message) || 'Fable did not answer.' };
}

/* ---- the same model, on the seat this site already holds --------------------------------
   ae-fable-api carries no environment yet (Sep 19 2026: KV and DEEPSEEK unset, every hub door
   answers 401). Until it does, the department runs on the DEEPSEEK_API_KEY this site has held
   since the label reader — same model, same honesty line, same PII gate as Fable's. The day
   Fable is configured, the call above succeeds and this path is never taken. */
const DS_KEY = process.env.DEEPSEEK_API_KEY || '';
const DS_BASE = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
const DS_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const HONESTY = ' Ground every answer in the real data you are given. NEVER invent facts — names, dates, numbers, prices, quotes. If you don\'t know or weren\'t given it, say so or say \'verify\'. Be warm, concise, and useful.';
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;
const PHONE = /(?:\+?\d[\s().+-]{0,2}){10,}/;
const STREET = /\b\d{1,6}\s+(?:[NSEW]\.?\s+)?[A-Za-z0-9][A-Za-z0-9.'-]*(?:\s+[A-Za-z0-9][A-Za-z0-9.'-]*)*\s+(?:St|Street|Ave|Avenue|Rd|Road|Dr|Drive|Ln|Lane|Blvd|Boulevard|Way|Ct|Court|Pl|Place|Ter|Terrace|Cir|Circle|Hwy|Highway)\b\.?/i;
function sensitive(t) { t = String(t || ''); return EMAIL.test(t) ? 'email address' : PHONE.test(t) ? 'phone number' : STREET.test(t) ? 'street address' : ''; }
async function direct(persona, prompt, context) {
  if (!DS_KEY) return null;
  const user = (context ? 'Context (the real data):\n' + context + '\n\n' : '') + prompt;
  const flagged = sensitive(user);
  if (flagged) return { ok: false, error: 'PII', message: 'That carries a ' + flagged + ' — the department does not send a reader\'s details to an outside model. Take it out and send it again.' };
  try {
    const r = await fetch(DS_BASE.replace(/\/+$/, '') + '/chat/completions', {
      method: 'POST',
      headers: { authorization: 'Bearer ' + DS_KEY, 'content-type': 'application/json' },
      body: JSON.stringify({ model: DS_MODEL, temperature: 0.6, max_tokens: 1400,
        messages: [{ role: 'system', content: persona + HONESTY }, { role: 'user', content: user }] })
    });
    const j = await r.json();
    const text = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
    if (!text) return { ok: false, error: 'MODEL', message: 'No answer came back — try again.' };
    return { ok: true, text: String(text).slice(0, 6000), via: 'site' };
  } catch (e) { return { ok: false, error: 'MODEL', message: 'The model hit a snag — try again.' }; }
}
function parseLens(text) {
  const s = String(text || '');
  const i = s.indexOf('{'), k = s.lastIndexOf('}');
  let o = null;
  if (i > -1 && k > i) { try { o = JSON.parse(s.slice(i, k + 1)); } catch (e) { o = null; } }
  if (!o) return { take: clean(s, 1400), points: [], fix: [], safety: false, confidence: 0, needs: ['a clean read — the reviewer did not answer in the shape asked'] };
  const list = (v, n, len) => (Array.isArray(v) ? v : []).map((x) => clean(x, len)).filter(Boolean).slice(0, n);
  return {
    take: clean(o.take, 1400), points: list(o.points, 4, 220), fix: list(o.fix, 3, 220),
    safety: o.safety === true, confidence: Math.max(0, Math.min(100, Math.round(num(o.confidence, 0)))),
    needs: list(o.needs, 3, 160)
  };
}
async function read(lens, q, ctx) {
  const L = LENS[lens];
  const r = await fable(lens, L.persona, LENS_ASK + 'WHAT SHE BROUGHT:\n' + q, ctx, 'quality');
  if (!r.ok) return { name: L.name, side: L.side, ok: false, error: r.error, message: r.message };
  return Object.assign({ name: L.name, side: L.side, ok: true, via: r.via }, parseLens(r.text));
}

/* ---- the Pacemaker — code. It gates; it never writes prose. ------------------------------- */
function pace(a, b) {
  const waiting = [], because = [];
  if (!a || !a.ok) waiting.push('Clinic did not answer' + (a && a.message ? ': ' + a.message : '.'));
  if (!b || !b.ok) waiting.push('Affirm did not answer' + (b && b.message ? ': ' + b.message : '.'));
  const safety = !!((a && a.safety) || (b && b.safety));
  if (safety) waiting.push('One lens raised a safety flag. This one goes to a professional, not to a post.');
  const ca = a && a.ok ? a.confidence : 0, cb = b && b.ok ? b.confidence : 0;
  if (a && a.ok && ca < BAR) waiting.push('Clinic is only ' + ca + '% sure' + (a.needs.length ? ' — it wants: ' + a.needs.join('; ') : '.'));
  if (b && b.ok && cb < BAR) waiting.push('Affirm is only ' + cb + '% sure' + (b.needs.length ? ' — it wants: ' + b.needs.join('; ') : '.'));
  const conf = Math.round(Math.min(ca, cb) * (safety ? 0.4 : 1));
  const released = waiting.length === 0;
  if (released) {
    because.push('Both lenses read it and both cleared the bar (' + ca + '% and ' + cb + '%).');
    const agree = (a.points || []).filter((p) => (b.points || []).some((x) => x.toLowerCase().slice(0, 24) === p.toLowerCase().slice(0, 24)));
    if (agree.length) because.push('They agree on: ' + agree[0]);
    if (!a.safety && !b.safety) because.push('No safety flag from either school.');
  }
  return {
    released, confidence: conf, bar: BAR, safety,
    verdict: released ? 'Released. The Head has a ruling for you.'
           : safety ? 'Held — this one needs a professional.'
           : 'Held. The department is not sure enough yet.',
    because: released ? because : waiting.slice(0, 3),
    waiting
  };
}

/* ---- the Head — the one voice she hears -------------------------------------------------- */
function lensBrief(L) {
  if (!L || !L.ok) return L && L.name ? L.name + ': did not answer.' : '';
  return L.name.toUpperCase() + ' (' + L.side + ', ' + L.confidence + '% sure)\n' +
    'Take: ' + clean(L.take, 700) + '\n' +
    (L.points.length ? 'Points: ' + L.points.join(' | ') + '\n' : '') +
    (L.fix.length ? 'Would change: ' + L.fix.join(' | ') + '\n' : '') +
    (L.needs.length ? 'Wants to know: ' + L.needs.join(' | ') + '\n' : '');
}
async function rule(q, ctx, a, b, gate) {
  const context = 'WHAT JESSICA BROUGHT:\n' + clean(q, 900) + (ctx ? '\n\nHER NOTE: ' + clean(ctx, 300) : '') +
    '\n\n' + lensBrief(a) + '\n' + lensBrief(b);
  const ask = gate.released
    ? 'Give Jessica the department\'s ruling on what she brought.'
    : gate.safety
      ? 'The department is HOLDING this: a lens raised a safety flag. Tell Jessica plainly, in a few warm sentences, that this is one for a professional — say which kind — and what she can safely say or do in the meantime. Do not give the ruling itself.'
      : 'The department is HOLDING this because a lens is not sure enough. Tell Jessica what it is waiting on (' + gate.waiting.join(' ') + ') and what one thing she could add so it can rule. Keep it short.';
  return fable('head', HEAD.persona, ask, context, 'quality');
}

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'https://www.aexperiences.com');
    const who = await ndWho(req, url);
    if (!who) return send(res, 401, { ok: false, error: 'NEED_KEY' });

    if (req.method === 'GET') {
      if (url.searchParams.get('probe') === '1') {
        const r = await fable('a', LENS.a.persona, 'Reply with the single word: ready.', '', 'probe');
        return send(res, 200, { ok: true, fable: r.ok ? { ok: true, via: r.via, said: clean(r.text, 80) } : r });
      }
      const raws = (await hub('LRANGE', LOG, '0', '39')) || [];
      const log = raws.map((r) => { try { return JSON.parse(r); } catch (e) { return null; } }).filter(Boolean);
      return send(res, 200, { ok: true, log, bar: BAR });
    }
    if (req.method !== 'POST') { res.setHeader('allow', 'GET, POST'); return send(res, 405, { ok: false, error: 'METHOD' }); }

    const b = await body(req);
    if (!b) return send(res, 400, { ok: false, error: 'BAD_JSON' });

    if (b.remove) {
      const id = clean(b.remove, 40);
      const raws = (await hub('LRANGE', LOG, '0', '199')) || [];
      for (const raw of raws) { let o = null; try { o = JSON.parse(raw); } catch (e) {} if (o && o.id === id) await hub('LREM', LOG, '1', raw); }
      return send(res, 200, { ok: true });
    }

    if (b.read) {
      const q = clean(b.read.q, 1100), ctx = clean(b.read.ctx, 300);
      if (q.length < 12) return send(res, 400, { ok: false, error: 'NEED_MORE' });
      const [a, bb] = await Promise.all([read('a', q, ctx), read('b', q, ctx)]);
      return send(res, 200, { ok: true, a, b: bb, gate: pace(a, bb) });
    }

    if (b.rule) {
      const q = clean(b.rule.q, 1100), ctx = clean(b.rule.ctx, 300);
      const fix = (L, lens) => {
        if (!L || typeof L !== 'object') return { name: LENS[lens].name, side: LENS[lens].side, ok: false };
        return Object.assign({ name: LENS[lens].name, side: LENS[lens].side, ok: L.ok !== false, message: clean(L.message, 200) }, parseLens(JSON.stringify(L)));
      };
      const a = fix(b.rule.a, 'a'), bb = fix(b.rule.b, 'b');
      const gate = pace(a, bb);
      const h = await rule(q, ctx, a, bb, gate);
      const head = h.ok ? clean(h.text, 2400) : '';
      const ruling = {
        id: Date.now().toString(36) + randomBytes(2).toString('hex'), at: new Date().toISOString(),
        q: clean(q, 400), released: gate.released, confidence: gate.confidence, safety: gate.safety,
        verdict: gate.verdict, head: clean(head, 1200),
        a: { take: clean(a.take, 500), confidence: a.confidence }, b: { take: clean(bb.take, 500), confidence: bb.confidence }
      };
      // a run where nobody answered is an outage, not a ruling — it does not go on the record
      if (a.ok || bb.ok) { await hub('LPUSH', LOG, JSON.stringify(ruling)); await hub('LTRIM', LOG, '0', '199'); }
      return send(res, 200, { ok: true, gate, head: h.ok ? { ok: true, name: HEAD.name, text: head, via: h.via } : { ok: false, name: HEAD.name, error: h.error, message: h.message }, ruling });
    }

    return send(res, 400, { ok: false, error: 'NEED_ACTION' });
  } catch (e) {
    return send(res, 500, { ok: false, error: 'SERVER' });
  }
}
