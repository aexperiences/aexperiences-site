// ESPOwho — the whole back end. Accelerated Experiences LLC.
//
// POST /api/who. One of you thinks of somebody, the other asks up to twenty
// yes-or-no questions. Turn-based, not real-time — nobody has to be sitting
// there at the same moment as anybody else, which is the only way a game
// survives a household with school in it.
//
// ⚠ ONE DELIBERATE DIFFERENCE FROM ESPOdraw, and it is on purpose:
// ESPOdraw hangs its games off the shared `ew:` account (email, password,
// recovery code). ESPOwho does NOT. This is a game for a six-year-old, and
// Art. XIII says COPPA-clean: no email, no password, no recovery code, no
// way for a child to be identified. A player here is a random id the device
// made up and a first name they typed. Nothing else is ever stored, and
// nothing can be traced back to a person. Games live under `ewh:` where they
// cannot reach the word or drawing games.
//
// It deploys DORMANT. With no store connected it answers politely and the
// app quietly hides the friend mode — playing against the computer never
// touches this file at all.

import crypto from 'node:crypto';

/* ---------------------------------------------------------------- store -- */
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const storeReady = () => !!(KV_URL && KV_TOK);

async function redis(...cmd){
  const r = await fetch(KV_URL, { method:'POST',
    headers:{ authorization:`Bearer ${KV_TOK}`, 'content-type':'application/json' },
    body: JSON.stringify(cmd) });
  if(!r.ok) throw new Error('store_' + r.status);
  const j = await r.json();
  if(j.error) throw new Error('store: ' + j.error);
  return j.result;
}
const K = s => 'ewh:' + s;
const getJSON = async k => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };

/* compare-and-set, so two people tapping at the same instant cannot both win */
const CAS = `
local cur = redis.call('GET', KEYS[2])
if cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2], 'EX', ARGV[4])
  redis.call('SET', KEYS[2], ARGV[3], 'EX', ARGV[4])
  return 1
end
return 0`;
const LIFE = String(30 * 86400);   // a game keeps for a month, then it lets go

async function saveGame(g){
  const expect = String(g.rev);
  g.rev += 1; g.updated = Date.now();
  const ok = await redis('EVAL', CAS, '2', K('g:'+g.id), K('gr:'+g.id),
                         expect, JSON.stringify(g), String(g.rev), LIFE);
  if(!ok){ g.rev -= 1; throw new Error('busy'); }
}

/* ----------------------------------------------------------------- game -- */
const MAX_Q = 20;
const newId = () => crypto.randomBytes(9).toString('base64url');

/* Codes a child can read down a phone: no O/0, no I/1, no S/5. */
const ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY2346789';
const makeCode = () => Array.from({length:4}, () => ALPHABET[crypto.randomInt(ALPHABET.length)]).join('');

const clean = (s, n) => String(s || '').replace(/[^\p{L}\p{N} '’-]/gu, '').trim().slice(0, n);
/* a question is text a child reads — it keeps its punctuation */
const cleanQ = (s, n) => String(s || '').replace(/[^\p{L}\p{N} '’\-?.,!&]/gu, '').trim().slice(0, n);

function newGame(host, opts){
  return {
    id:newId(), rev:0, created:Date.now(), updated:Date.now(),
    status:'open',                     // open | done
    rail: [1,2,3].includes(+opts.rail) ? +opts.rail : 2,
    cat:  clean(opts.cat, 12) || 'all',
    players:[{ pid:host.pid, name:host.name, score:0 }],
    thinker:0,                         // seat index of whoever is thinking of somebody
    round:0,
    phase:'thinking',                  // thinking -> asking -> over
    secret:null,                       // never leaves this file for the asker
    asked:[],                          // [{q, answer:'y'|'n'|'m', at}]
    pending:null,                       // the question waiting on an answer
    guesses:[],
    outcome:null,                      // 'got' | 'missed'
    log:[],
    code:null
  };
}

/* What one player is allowed to see. The secret is the whole game. */
function view(g, pid){
  const me = g.players.findIndex(p => p.pid === pid);
  const thinking = g.thinker === me;
  const over = g.phase === 'over';
  return {
    id:g.id, rev:g.rev, code:g.code, status:g.status, phase:g.phase,
    rail:g.rail, cat:g.cat, round:g.round, updated:g.updated,
    you:me, youAreThinking:thinking,
    thinker: g.players[g.thinker] ? g.players[g.thinker].name : null,
    players: g.players.map(p => ({ name:p.name, score:p.score })),
    /* the person thinking sees their own card; the asker only after it is over */
    secret: (thinking || over) ? g.secret : null,
    asked: g.asked.map(a => ({ q:a.q, answer:a.answer })),
    left: MAX_Q - g.asked.length,
    pending: g.pending,
    guesses: g.guesses,
    outcome: g.outcome,
    yourTurn: g.status === 'open' && (
      thinking ? (g.phase === 'thinking' || !!g.pending)
               : (g.phase === 'asking' && !g.pending)),
    waitingOn: g.phase === 'thinking' ? [g.players[g.thinker].name]
             : g.pending ? [g.players[g.thinker].name]
             : g.players.filter((p,i) => i !== g.thinker).map(p => p.name),
    log: g.log.slice(-40)
  };
}

function swapSeats(g){
  g.thinker = (g.thinker + 1) % g.players.length;
  g.round += 1; g.phase = 'thinking';
  g.secret = null; g.asked = []; g.pending = null; g.guesses = []; g.outcome = null;
}

/* --------------------------------------------------------------- routes -- */
const ok  = (res, b) => { res.statusCode = 200; res.setHeader('content-type','application/json'); res.end(JSON.stringify(b)); };
const bad = (res, c, error) => { res.statusCode = c; res.setHeader('content-type','application/json'); res.end(JSON.stringify({ ok:false, error })); };

function readBody(req){
  return new Promise((resolve, reject) => {
    let raw = '', dead = false;
    req.on('data', c => { if(dead) return; raw += c;
      if(raw.length > 60000){ dead = true; reject(new Error('too_big')); req.destroy(); } });
    req.on('end', () => { if(dead) return; try{ resolve(raw ? JSON.parse(raw) : {}); }catch(e){ reject(e); } });
    req.on('error', e => { if(!dead){ dead = true; reject(e); } });
  });
}

export default async function handler(req, res){
  res.setHeader('cache-control','no-store');
  if(req.method === 'GET')
    return ok(res, { ok:true, service:'espowho', store:storeReady(), maxQuestions:MAX_Q,
                     players:2, identity:'device only — no email, no password, no child data' });
  if(req.method !== 'POST') return bad(res, 405, 'POST only');

  let body;
  try{ body = await readBody(req); }
  catch(e){ return bad(res, 413, 'That was too much to send at once.'); }

  const act = body.do;
  if(act === 'ping') return ok(res, { ok:true, store:storeReady() });
  if(!storeReady())
    return bad(res, 503, 'Playing with a friend is not switched on yet. You can still play against me.');

  /* who you are is just an id your own device made up */
  const pid  = clean(body.pid, 40);
  const name = clean(body.name, 16) || 'Player';
  if(!pid) return bad(res, 400, 'Missing player.');
  const me = { pid, name };

  try{
    /* ---- start one ---- */
    if(act === 'new'){
      const g = newGame(me, body);
      for(let tries = 0; tries < 8; tries++){
        const code = makeCode();
        const taken = await redis('SET', K('c:'+code), g.id, 'NX', 'EX', LIFE);
        if(taken){ g.code = code; break; }
      }
      if(!g.code) return bad(res, 503, 'Could not make a code just now. Try once more.');
      await redis('SET', K('gr:'+g.id), '1', 'EX', LIFE);
      await redis('SET', K('g:'+g.id), JSON.stringify({ ...g, rev:1 }), 'EX', LIFE);
      g.rev = 1;
      return ok(res, { ok:true, game:view(g, pid) });
    }

    /* ---- join one ---- */
    if(act === 'join'){
      const code = clean(body.code, 6).toUpperCase();
      const gid = await redis('GET', K('c:'+code));
      if(!gid) return bad(res, 404, 'That code has run out or was never a code. Check it and try again.');
      const g = await getJSON(K('g:'+gid));
      if(!g) return bad(res, 404, 'That game is gone.');
      if(g.players.some(p => p.pid === pid)) return ok(res, { ok:true, game:view(g, pid) });
      if(g.players.length >= 2) return bad(res, 409, 'Two people are already playing that one.');
      g.players.push({ pid, name, score:0 });
      g.log.push({ t:Date.now(), kind:'joined', by:name });
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    /* ---- everything else needs a game you are in ---- */
    const g = body.id ? await getJSON(K('g:'+body.id)) : null;
    if(!g) return bad(res, 404, 'No such game.');
    const seat = g.players.findIndex(p => p.pid === pid);
    if(seat < 0) return bad(res, 403, 'That is not your game.');
    const thinking = g.thinker === seat;

    if(act === 'game') return ok(res, { ok:true, game:view(g, pid) });

    /* the thinker locks in who they picked */
    if(act === 'think'){
      if(!thinking) return bad(res, 409, 'The other one is thinking this round.');
      if(g.phase !== 'thinking') return bad(res, 409, 'You already picked somebody.');
      if(g.players.length < 2) return bad(res, 409, 'Nobody has joined yet. Read them your code first.');
      const secret = clean(body.secret, 40);
      if(!secret) return bad(res, 400, 'Pick somebody first.');
      g.secret = secret; g.phase = 'asking';
      g.log.push({ t:Date.now(), kind:'ready', by:me.name });
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    /* the asker asks */
    if(act === 'ask'){
      if(thinking) return bad(res, 409, 'You are the one being asked.');
      if(g.phase !== 'asking') return bad(res, 409, 'Not yet — they are still thinking.');
      if(g.pending) return bad(res, 409, 'They have not answered your last one yet.');
      if(g.asked.length >= MAX_Q) return bad(res, 409, 'That was your twentieth. Time to guess.');
      const q = cleanQ(body.q, 140);
      if(!q) return bad(res, 400, 'Pick a question.');
      g.pending = q;
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    /* the thinker answers */
    if(act === 'answer'){
      if(!thinking) return bad(res, 409, 'They have to answer that one.');
      if(!g.pending) return bad(res, 409, 'Nothing to answer.');
      const a = ['y','n','m'].includes(body.answer) ? body.answer : null;
      if(!a) return bad(res, 400, 'Yes, no, or maybe.');
      g.asked.push({ q:g.pending, answer:a, at:Date.now() });
      g.pending = null;
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    /* the asker takes a swing */
    if(act === 'guess'){
      if(thinking) return bad(res, 409, 'You know the answer — you picked it.');
      if(g.phase !== 'asking') return bad(res, 409, 'Nothing to guess yet.');
      const guess = clean(body.guess, 40);
      if(!guess) return bad(res, 400, 'Say who you think it is.');
      const tidy = s => s.toLowerCase().replace(/[^a-z0-9]/g,'');
      const right = tidy(guess) === tidy(g.secret);
      g.guesses.push({ by:me.name, guess, right, at:Date.now() });
      if(right){
        g.players[seat].score += Math.max(1, MAX_Q - g.asked.length);
        g.phase = 'over'; g.outcome = 'got';
      } else if(g.guesses.length >= 3 || g.asked.length >= MAX_Q){
        g.players[g.thinker].score += 2;
        g.phase = 'over'; g.outcome = 'missed';
      }
      await saveGame(g);
      return ok(res, { ok:true, right, secret:g.phase === 'over' ? g.secret : null, game:view(g, pid) });
    }

    /* round over — swap who thinks */
    if(act === 'next'){
      if(g.phase !== 'over') return bad(res, 409, 'That round is not finished.');
      swapSeats(g);
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    if(act === 'leave'){
      g.status = 'done';
      g.log.push({ t:Date.now(), kind:'ended', by:me.name });
      await saveGame(g);
      return ok(res, { ok:true, game:view(g, pid) });
    }

    return bad(res, 400, 'Unknown request.');
  }catch(err){
    const m = String(err && err.message || err);
    if(m === 'busy')            return bad(res, 409, 'You both moved at once. Open it again.');
    if(m.startsWith('store'))   return bad(res, 503, 'The game store did not answer. Nothing was lost.');
    return bad(res, 500, 'Something went wrong on our side. Nothing was lost.');
  }
}
