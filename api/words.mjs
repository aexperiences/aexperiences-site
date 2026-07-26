// ESPOwords — the whole back end. Accelerated Experiences LLC.
//
// One endpoint, POST /api/words, body {do:'...'}. Server-authoritative on purpose:
// the board, the bag, both racks and every dictionary ruling live here, so a player
// cannot read the other rack, salt the bag, or talk the client into an illegal word.
//
// Store: Upstash Redis over REST (env-injected by Vercel when the store is connected).
// Nothing is hardcoded and no key is ever sent to the browser. With no store connected
// the endpoint says so plainly — it does not pretend to work.
//
// Dictionary: ENABLE (172,823 words), public domain, used UNMODIFIED. We publish the
// exact source so any player can check a ruling themselves. We add nothing secret.

import crypto from 'node:crypto';

/* ---------------------------------------------------------------- store -- */

const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '';
const KV_TOK = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const storeReady = () => !!(KV_URL && KV_TOK);

async function redis(...cmd) {
  const r = await fetch(KV_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${KV_TOK}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmd),
  });
  if (!r.ok) throw new Error('store_' + r.status);
  const j = await r.json();
  if (j.error) throw new Error('store: ' + j.error);
  return j.result;
}
// Every key this game writes is namespaced, so it can share a Redis database with
// another AE product without either one ever stepping on the other's keys.
const NS = 'ew:';
const K = (s) => NS + s;
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };
const setJSON = (k, v, ttl) => ttl ? redis('SET', k, JSON.stringify(v), 'EX', String(ttl))
                                   : redis('SET', k, JSON.stringify(v));

// Compare-and-set on a game, so two devices submitting at once cannot both win.
const CAS = `
local cur = redis.call('GET', KEYS[2])
if cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  redis.call('SET', KEYS[2], ARGV[3])
  return 1
end
return 0`;
async function saveGame(g) {
  const next = String(g.rev + 1);
  const expect = String(g.rev);
  g.rev += 1;
  g.updated = Date.now();
  const ok = await redis('EVAL', CAS, '2', K('g:' + g.id), K('gr:' + g.id), expect, JSON.stringify(g), next);
  if (!ok) { g.rev -= 1; throw new Error('busy'); }
}

/* ----------------------------------------------------------- dictionary -- */
// Fetched once per cold start and held in module scope. Two mirrors of the same
// public-domain file; if both are unreachable we refuse to rule on a word rather
// than guess at it.

const SOURCES = [
  process.env.WORDLIST_URL,
  'https://cdn.jsdelivr.net/gh/dolph/dictionary@master/enable1.txt',
  'https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt',
].filter(Boolean);
export const DICT_NAME = 'ENABLE (public domain), unmodified';
let DICT = null, dictLoading = null;

async function dictionary() {
  if (DICT) return DICT;
  if (!dictLoading) dictLoading = (async () => {
    for (const url of SOURCES) {
      try {
        const r = await fetch(url, { cache: 'no-store' });
        if (!r.ok) continue;
        const set = new Set();
        for (const w of (await r.text()).split('\n')) {
          const t = w.trim().toUpperCase();
          if (t.length > 1 && t.length < 16 && /^[A-Z]+$/.test(t)) set.add(t);
        }
        if (set.size > 100000) { DICT = set; return set; }
      } catch (_) { /* try the mirror */ }
    }
    dictLoading = null;
    throw new Error('dictionary_unreachable');
  })();
  return dictLoading;
}

/* ------------------------------------------------------------ the board -- */
// Our own premium layout: 60 premium squares, eight-fold symmetric, triple-words
// pulled off the corners, and a PLAIN centre square so going first is not an edge.
// Not Scrabble's arrangement and not Words With Friends'.

const LAYOUT = [
  '....T..t..T....',
  '..d...D.D...d..',
  '.d...t...t...d.',
  '...D.......D...',
  'T.....ddd.....T',
  '..t..D...D..t..',
  '.D..d.d.d.d..D.',
  't...d..+..d...t',
  '.D..d.d.d.d..D.',
  '..t..D...D..t..',
  'T.....ddd.....T',
  '...D.......D...',
  '.d...t...t...d.',
  '..d...D.D...d..',
  '....T..t..T....',
].join('');

// Our own tile set: 102 tiles, two blanks, a touch more vowel and H/D than the
// old parlour standard so racks stall less often. Values are ours.
const TILES = {
  A: [9, 1], B: [2, 4], C: [2, 4], D: [5, 2], E: [12, 1], F: [2, 4], G: [3, 3],
  H: [3, 4], I: [9, 1], J: [1, 9], K: [1, 6], L: [4, 2], M: [2, 3], N: [6, 1],
  O: [8, 1], P: [2, 3], Q: [1, 10], R: [6, 1], S: [4, 1], T: [6, 1], U: [4, 1],
  V: [2, 5], W: [2, 4], X: [1, 8], Y: [2, 4], Z: [1, 10], '?': [2, 0],
};
const VALUE = Object.fromEntries(Object.entries(TILES).map(([k, v]) => [k, v[1]]));
const BINGO = 40;      // ours. Scrabble pays 50, Words With Friends 35.
const RACK = 7;
const CENTRE = 7 * 15 + 7;

function freshBag() {
  const bag = [];
  for (const [l, [n]] of Object.entries(TILES)) for (let i = 0; i < n; i++) bag.push(l);
  for (let i = bag.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  return bag;
}

/* -------------------------------------------------------------- scoring -- */

function wordsFormed(board, placed) {
  // placed: [{i, l, blank}] already written into a copy of board
  const idx = placed.map((p) => p.i).sort((a, b) => a - b);
  const rows = new Set(idx.map((i) => Math.floor(i / 15)));
  const cols = new Set(idx.map((i) => i % 15));
  const horizontal = rows.size === 1;
  const vertical = cols.size === 1;
  if (!horizontal && !vertical) return { error: 'Tiles must line up in one row or one column.' };

  const walk = (start, step) => {
    let a = start;
    while (true) {
      const prev = a - step;
      if (prev < 0 || prev >= 225) break;
      if (step === 1 && Math.floor(prev / 15) !== Math.floor(a / 15)) break;
      if (!board[prev]) break;
      a = prev;
    }
    const cells = [];
    let b = a;
    while (b >= 0 && b < 225 && board[b]) {
      cells.push(b);
      const nxt = b + step;
      if (step === 1 && Math.floor(nxt / 15) !== Math.floor(b / 15)) break;
      b = nxt;
    }
    return cells;
  };

  const out = [];
  const seen = new Set();
  const main = horizontal && idx.length > 1 ? walk(idx[0], 1)
             : vertical && idx.length > 1 ? walk(idx[0], 15)
             : null;
  const push = (cells) => {
    if (cells.length < 2) return;
    const key = cells[0] + ':' + cells.length + ':' + (cells[1] - cells[0]);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(cells);
  };
  if (main) push(main);
  else { push(walk(idx[0], 1)); push(walk(idx[0], 15)); }
  for (const i of idx) { push(walk(i, horizontal ? 15 : 1)); if (!main) push(walk(i, horizontal ? 1 : 15)); }

  // contiguity: every square between the first and last tile you laid must be filled
  if (idx.length > 1) {
    const step = horizontal ? 1 : 15;
    const lo = idx[0], hi = idx[idx.length - 1];
    for (let i = lo; i <= hi; i += step) if (!board[i]) return { error: 'There is a gap in your word.' };
    if (main) { const set = new Set(main); for (const i of idx) if (!set.has(i)) return { error: 'Tiles must line up in one row or one column.' }; }
  }
  return { words: out };
}

function scoreWords(board, wordCells, placedSet) {
  let total = 0;
  const detail = [];
  for (const cells of wordCells) {
    let sum = 0, mult = 1;
    for (const i of cells) {
      const t = board[i];
      let v = t.b ? 0 : VALUE[t.l];
      if (placedSet.has(i)) {
        const p = LAYOUT[i];
        if (p === 'd') v *= 2;
        else if (p === 't') v *= 3;
        else if (p === 'D') mult *= 2;
        else if (p === 'T') mult *= 3;
      }
      sum += v;
    }
    const pts = sum * mult;
    total += pts;
    detail.push({ word: cells.map((i) => board[i].l).join(''), points: pts });
  }
  return { total, detail };
}

/* ------------------------------------------------------ one shared judge --
   Both a person's move and the computer's move go through this exact function.
   That is the whole trick: the computer physically cannot propose something the
   game would refuse, because it is asking the same judge. */

function evaluatePlacement(prevBoard, placed, first, dict) {
  const board = prevBoard.slice();
  const placedSet = new Set();
  const used = [];
  for (const t of placed) {
    const r = Number(t.r), c = Number(t.c);
    if (!(r >= 0 && r < 15 && c >= 0 && c < 15)) return { error: 'A tile landed off the board.' };
    const i = r * 15 + c;
    if (board[i]) return { error: 'One of those squares is already taken.', taken: true };
    if (placedSet.has(i)) return { error: 'Two tiles on one square.' };
    const letter = String(t.letter || '').toUpperCase();
    if (!/^[A-Z]$/.test(letter)) return { error: 'That is not a letter.' };
    board[i] = { l: letter, b: !!t.blank };
    placedSet.add(i);
    used.push(t.blank ? '?' : letter);
  }
  if (first && !placedSet.has(CENTRE)) return { error: 'The first word has to cross the centre square.' };
  if (!first) {
    const touches = [...placedSet].some((i) => {
      const r = Math.floor(i / 15), c = i % 15;
      return [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
        .some(([a, b]) => a >= 0 && a < 15 && b >= 0 && b < 15 && prevBoard[a * 15 + b]);
    });
    if (!touches) return { error: 'Your word has to touch a word already on the board.' };
  }
  const found = wordsFormed(board, [...placedSet].map((i) => ({ i })));
  if (found.error) return { error: found.error };
  if (!found.words.length) return { error: 'A single tile on its own is not a word.' };
  const spelled = found.words.map((cells) => cells.map((i) => board[i].l).join(''));
  const rejected = spelled.filter((w) => !dict.has(w));
  if (rejected.length) return { error: null, rejected };
  const { total, detail } = scoreWords(board, found.words, placedSet);
  return { board, placedSet, words: detail, total, used };
}

/* ------------------------------------------------------ the computer --
   A real opponent, not a lookup table of canned words. It reads the board,
   works out every legal word it could actually play from the tiles it holds,
   and then picks one according to how hard you asked it to be.
   It is always shown as the computer. Nobody here is ever fooled into
   thinking they are playing a person — that is the one thing the big word
   games did that there is no excuse for. */

let PREFIX = null, prefixLoading = null;
async function prefixSet() {
  if (PREFIX) return PREFIX;
  if (!prefixLoading) prefixLoading = (async () => {
    const d = await dictionary();
    const p = new Set();
    for (const w of d) for (let i = 1; i < w.length; i++) p.add(w.slice(0, i));
    PREFIX = p;
    return p;
  })();
  return prefixLoading;
}

const LEVELS = {
  easy:  { label: 'Computer · easy',  cap: 14, pick: 'low'  },
  even:  { label: 'Computer · even',  cap: 28, pick: 'mid'  },
  tough: { label: 'Computer · tough', cap: 999, pick: 'best' },
};

async function findMoves(board, rack, first, budgetMs = 3000) {
  const dict = await dictionary();
  const pre = await prefixSet();
  const started = Date.now();
  const out = [];
  const seen = new Set();
  const letters = rack.slice();

  const consider = (placed) => {
    if (!placed.length) return;
    const key = placed.map((p) => p.r + ',' + p.c + p.letter + (p.blank ? '*' : '')).sort().join('|');
    if (seen.has(key)) return;
    seen.add(key);
    const ev = evaluatePlacement(board, placed, first, dict);
    if (ev.error || ev.rejected || !ev.words) return;
    out.push({ tiles: placed.slice(), score: ev.total, words: ev.words });
  };

  for (const dir of [1, 15]) {
    for (let line = 0; line < 15; line++) {
      const at = (pos) => (dir === 1 ? line * 15 + pos : pos * 15 + line);
      const rc = (pos) => (dir === 1 ? { r: line, c: pos } : { r: pos, c: line });
      for (let start = 0; start < 15; start++) {
        if (start > 0 && board[at(start - 1)]) continue;   // never begin mid-word
        const walk = (pos, pool, placed, word) => {
          if (Date.now() - started > budgetMs) return;
          if (pos > 14) { if (placed.length && dict.has(word)) consider(placed); return; }
          const sq = board[at(pos)];
          if (sq) return walk(pos + 1, pool, placed, word + sq.l);
          // stopping here is a candidate, as long as we actually laid something down
          if (placed.length && word.length > 1 && dict.has(word)) consider(placed);
          if (!pool.length) return;
          const tried = new Set();
          for (let k = 0; k < pool.length; k++) {
            const tile = pool[k];
            const options = tile === '?' ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('') : [tile];
            for (const L of options) {
              const tag = tile + L;
              if (tried.has(tag)) continue;
              tried.add(tag);
              const next = word + L;
              if (!pre.has(next) && !dict.has(next)) continue;
              const { r, c } = rc(pos);
              const rest = pool.slice(0, k).concat(pool.slice(k + 1));
              walk(pos + 1, rest, placed.concat([{ r, c, letter: L, blank: tile === '?' }]), next);
            }
          }
        };
        walk(start, letters, [], '');
      }
    }
  }
  out.sort((a, b) => b.score - a.score);
  return out;
}

function chooseMove(moves, level) {
  if (!moves.length) return null;
  const cfg = LEVELS[level] || LEVELS.even;
  if (cfg.pick === 'best') return moves[0];
  // Easy and even play like a relaxed human: a decent word, not the optimal one,
  // and never a crushing score. Losing to a machine that plays perfectly is not fun,
  // and being flattened is exactly why people stop playing.
  const fits = moves.filter((m) => m.score <= cfg.cap);
  const pool = fits.length ? fits : moves.slice(-Math.max(1, Math.floor(moves.length / 4)));
  if (cfg.pick === 'low') {
    const bottom = pool.slice(Math.floor(pool.length * 0.55));
    const arr = bottom.length ? bottom : pool;
    return arr[crypto.randomInt(arr.length)];
  }
  const mid = pool.slice(0, Math.max(1, Math.ceil(pool.length * 0.4)));
  return mid[crypto.randomInt(mid.length)];
}

// The computer takes its turn, in the same game record, under the same rules.
async function computerTurn(g) {
  const seat = g.players.findIndex((p) => p.bot);
  if (seat < 0 || g.status !== 'open' || g.turn !== seat) return;
  const me = g.players[seat];
  const first = g.moves.every((m) => m.kind !== 'play');
  let moves = [];
  try { moves = await findMoves(g.board, me.rack, first); } catch (_) { moves = []; }
  const pick = chooseMove(moves, me.level);

  if (!pick) {
    // Nothing playable: trade tiles if it can, otherwise pass. Same options a person has.
    if (g.bag.length >= 3) {
      const give = me.rack.slice(0, Math.min(3, me.rack.length));
      const keep = me.rack.slice(give.length);
      const drawn = g.bag.splice(0, give.length);
      me.rack = keep.concat(drawn);
      g.bag = g.bag.concat(give);
      for (let i = g.bag.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [g.bag[i], g.bag[j]] = [g.bag[j], g.bag[i]]; }
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'swap', n: give.length });
    } else {
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'pass' });
    }
    g.scoreless += 1;
    g.turn = 1 - g.turn;
    if (g.scoreless >= 6) endGame(g, 'passed out');
    return;
  }

  const dict = await dictionary();
  const ev = evaluatePlacement(g.board, pick.tiles, first, dict);
  if (ev.error || ev.rejected || !ev.words) { // belt and braces — should never happen
    g.moves.push({ t: Date.now(), by: me.handle, kind: 'pass' });
    g.scoreless += 1; g.turn = 1 - g.turn;
    return;
  }
  const rack = me.rack.slice();
  for (const u of ev.used) { const at = rack.indexOf(u); if (at >= 0) rack.splice(at, 1); }
  const bingo = pick.tiles.length === RACK;
  const points = ev.total + (bingo ? BINGO : 0);
  g.board = ev.board;
  me.score += points;
  const drawn = g.bag.splice(0, Math.min(RACK - rack.length, g.bag.length));
  me.rack = rack.concat(drawn);
  g.scoreless = 0;
  g.moves.push({ t: Date.now(), by: me.handle, kind: 'play', points, bingo, words: ev.words,
    at: [...ev.placedSet] });
  g.turn = 1 - g.turn;
  if (!me.rack.length && !g.bag.length) endGame(g, 'out of tiles');
}

/* --------------------------------------------------------------- people -- */

const norm = (s) => String(s || '').trim().toLowerCase();
const hashPw = (pw, salt) => crypto.pbkdf2Sync(pw, salt, 210000, 32, 'sha512').toString('hex');
const token = () => crypto.randomBytes(24).toString('base64url');
const newId = () => crypto.randomBytes(9).toString('base64url');
// Recovery code: no email service is wired, and we are not about to collect an
// address we would then have to protect. You get a code at signup; it is the only
// way back in. Said plainly on the signup screen.
const recoveryCode = () => Array.from({ length: 3 }, () =>
  crypto.randomBytes(3).toString('hex').toUpperCase()).join('-');

const SESSION_DAYS = 120;
const publicUser = (u) => ({ id: u.id, handle: u.handle });

// A permanent, reusable one-tap sign-in link.
//
// Why permanent and not single-use: iOS evicts a web app's stored login after about
// a week of not opening it. Someone who plays twice a month would be silently signed
// out and, on a phone they are still learning, simply never come back. So the link a
// family member keeps in their text messages has to work every single time.
//
// The trade is deliberate and stated in the app: anyone holding the link can open that
// account. There is no payment method, no address, and no personal data in here — a
// word game with your family is worth exactly this much friction and no more. Anyone
// who wants the stricter thing uses the password instead, and the link can be replaced.
const newKey = () => crypto.randomBytes(16).toString('base64url');

async function userByToken(req) {
  const auth = String(req.headers.authorization || '');
  const t = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!t) return null;
  const uid = await redis('GET', K('s:' + t));
  if (!uid) return null;
  await redis('EXPIRE', K('s:' + t), String(SESSION_DAYS * 86400));
  return await getJSON(K('u:' + uid));
}

/* ---------------------------------------------------------------- games -- */

function newGame(a, b) {
  const bag = freshBag();
  return {
    id: newId(), rev: 0, created: Date.now(), updated: Date.now(),
    status: 'open', turn: 0, scoreless: 0,
    board: Array(225).fill(null),
    bag,
    players: [
      { uid: a.id, handle: a.handle, score: 0, rack: bag.splice(0, RACK) },
      b ? { uid: b.id, handle: b.handle, score: 0, rack: bag.splice(0, RACK) } : null,
    ].filter(Boolean),
    moves: [],
  };
}

// What a given player is allowed to see. Never the other rack, never the bag order.
function view(g, uid) {
  const me = g.players.findIndex((p) => p.uid === uid);
  return {
    id: g.id, rev: g.rev, status: g.status, created: g.created, updated: g.updated,
    board: g.board, bagLeft: g.bag.length, turn: g.turn, you: me,
    yourTurn: g.status === 'open' && g.players.length === 2 && g.turn === me,
    invite: g.invite || null,
    players: g.players.map((p, i) => ({
      handle: p.handle, score: p.score, tiles: p.rack.length,
      bot: !!p.bot,
      rack: i === me ? p.rack : undefined,
    })),
    moves: g.moves.slice(-40),
    chat: (g.chat || []).slice(-60),
    result: g.result || null,
  };
}

function endGame(g, reason) {
  g.status = 'done';
  if (reason !== 'resign') {
    // Whoever went out collects what is left on the other rack; everyone else drops theirs.
    const out = g.players.find((p) => p.rack.length === 0);
    for (const p of g.players) {
      const left = p.rack.reduce((s, l) => s + VALUE[l], 0);
      if (out && p !== out) { p.score -= left; out.score += left; }
      else if (!out) p.score -= left;
    }
  }
  const [x, y] = g.players;
  g.result = { reason, scores: g.players.map((p) => ({ handle: p.handle, score: p.score })),
    winner: x.score === y.score ? null : (x.score > y.score ? x.handle : y.handle) };
  g.moves.push({ t: Date.now(), kind: 'end', reason });
}

/* ---------------------------------------------------------------- routes -- */

const ok = (res, body) => { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
const bad = (res, code, error) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, error })); };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (c) => { raw += c; if (raw.length > 200000) req.destroy(); });
    req.on('end', () => { try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'GET') {
    return ok(res, { ok: true, service: 'espowords', store: storeReady(), dictionary: DICT_NAME, layout: LAYOUT, tiles: TILES, bingo: BINGO });
  }
  if (req.method !== 'POST') return bad(res, 405, 'POST only');

  let body;
  try { body = await readBody(req); } catch { return bad(res, 400, 'Bad request body.'); }
  const act = body.do;

  if (act === 'ping') return ok(res, { ok: true, store: storeReady(), dictionary: DICT_NAME });
  if (act === 'lookup') {
    const w = String(body.word || '').trim().toUpperCase();
    if (!/^[A-Z]{2,15}$/.test(w)) return ok(res, { ok: true, word: w, valid: false, note: 'Two to fifteen letters.' });
    try { const d = await dictionary(); return ok(res, { ok: true, word: w, valid: d.has(w), dictionary: DICT_NAME }); }
    catch { return bad(res, 503, 'The word list is unreachable right now — no ruling either way.'); }
  }

  if (!storeReady()) {
    return bad(res, 503, 'Accounts and games are not switched on yet — the game store has not been connected to this site.');
  }

  try {
    /* ---- accounts ---- */
    if (act === 'signup') {
      const email = norm(body.email);
      const handle = String(body.handle || '').trim();
      const pw = String(body.password || '');
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return bad(res, 400, 'That email address does not look right.');
      if (pw.length < 8) return bad(res, 400, 'Password needs at least 8 characters.');
      if (!/^[A-Za-z0-9_.-]{3,16}$/.test(handle)) return bad(res, 400, 'Name: 3–16 letters, numbers, dot, dash or underscore.');
      const emailKey = K('e:') + crypto.createHash('sha256').update(email).digest('hex').slice(0, 32);
      const claimedHandle = await redis('SET', K('h:' + handle.toLowerCase()), 'pending', 'NX');
      if (!claimedHandle) return bad(res, 409, 'That name is taken — pick another.');
      const claimedEmail = await redis('SET', emailKey, 'pending', 'NX');
      if (!claimedEmail) { await redis('DEL', K('h:' + handle.toLowerCase())); return bad(res, 409, 'There is already an account on that email.'); }
      const salt = crypto.randomBytes(16).toString('hex');
      const recov = recoveryCode();
      const u = { id: newId(), handle, emailKey, salt, hash: hashPw(pw, salt),
        recovSalt: salt, recovHash: hashPw(recov, salt), created: Date.now(), games: [] };
      await setJSON(K('u:' + u.id), u);
      await redis('SET', K('h:' + handle.toLowerCase()), u.id);
      await redis('SET', emailKey, u.id);
      const t = token();
      await redis('SET', K('s:' + t), u.id, 'EX', String(SESSION_DAYS * 86400));
      return ok(res, { ok: true, token: t, user: publicUser(u), recovery: recov });
    }

    if (act === 'login') {
      const email = norm(body.email);
      const emailKey = K('e:') + crypto.createHash('sha256').update(email).digest('hex').slice(0, 32);
      const uid = await redis('GET', emailKey);
      if (!uid || uid === 'pending') return bad(res, 401, 'No account on that email and password.');
      const u = await getJSON(K('u:' + uid));
      if (!u || hashPw(String(body.password || ''), u.salt) !== u.hash) return bad(res, 401, 'No account on that email and password.');
      const t = token();
      await redis('SET', K('s:' + t), u.id, 'EX', String(SESSION_DAYS * 86400));
      return ok(res, { ok: true, token: t, user: publicUser(u) });
    }

    if (act === 'recover') {
      const email = norm(body.email);
      const emailKey = K('e:') + crypto.createHash('sha256').update(email).digest('hex').slice(0, 32);
      const uid = await redis('GET', emailKey);
      if (!uid || uid === 'pending') return bad(res, 401, 'That email and recovery code do not match an account.');
      const u = await getJSON(K('u:' + uid));
      const code = String(body.code || '').trim().toUpperCase();
      const pw = String(body.password || '');
      if (!u || hashPw(code, u.recovSalt) !== u.recovHash) return bad(res, 401, 'That email and recovery code do not match an account.');
      if (pw.length < 8) return bad(res, 400, 'New password needs at least 8 characters.');
      u.salt = crypto.randomBytes(16).toString('hex');
      u.hash = hashPw(pw, u.salt);
      await setJSON(K('u:' + u.id), u);
      const t = token();
      await redis('SET', K('s:' + t), u.id, 'EX', String(SESSION_DAYS * 86400));
      return ok(res, { ok: true, token: t, user: publicUser(u) });
    }

    // One tap from a text message and you are in — no email, no password, no typing.
    if (act === 'redeem') {
      const key = String(body.key || '').trim();
      if (!key) return bad(res, 400, 'That link is missing its code.');
      const uid = await redis('GET', K('key:' + key));
      if (!uid) return bad(res, 401, 'That link no longer works. Ask for a fresh one.');
      const u = await getJSON(K('u:' + uid));
      if (!u) return bad(res, 401, 'That link no longer works. Ask for a fresh one.');
      const t = token();
      await redis('SET', K('s:' + t), u.id, 'EX', String(SESSION_DAYS * 86400));
      return ok(res, { ok: true, token: t, user: publicUser(u) });
    }

    const me = await userByToken(req);
    if (!me) return bad(res, 401, 'Sign in first.');

    // Hand someone a phone that is already signed in.
    if (act === 'signinlink' || act === 'newsigninlink') {
      if (act === 'newsigninlink' && me.signinKey) await redis('DEL', K('key:' + me.signinKey));
      if (!me.signinKey || act === 'newsigninlink') {
        me.signinKey = newKey();
        await setJSON(K('u:' + me.id), me);
      }
      await redis('SET', K('key:' + me.signinKey), me.id);
      return ok(res, { ok: true, key: me.signinKey });
    }

    if (act === 'me') return ok(res, { ok: true, user: publicUser(me) });

    /* ---- what should we add, what should we take away ----
       The people playing it get to shape it, and they get to see that they did.
       Suggestions are listed with the name of whoever asked, so when a thing turns
       up in the game a fortnight later everyone knows whose idea it was. */
    if (act === 'idea') {
      const text = String(body.text || '').trim().slice(0, 500);
      if (!text) return bad(res, 400, 'Tell us the idea first.');
      const list = (await getJSON(K('ideas'))) || [];
      list.push({ t: Date.now(), by: me.handle, text });
      await setJSON(K('ideas'), list.slice(-150));
      return ok(res, { ok: true, ideas: list.slice(-40).reverse() });
    }
    if (act === 'ideas') {
      const list = (await getJSON(K('ideas'))) || [];
      return ok(res, { ok: true, ideas: list.slice(-40).reverse() });
    }
    if (act === 'signout') {
      const auth = String(req.headers.authorization || '');
      if (auth.startsWith('Bearer ')) await redis('DEL', K('s:' + auth.slice(7)));
      return ok(res, { ok: true });
    }

    /* ---- the games list ---- */
    if (act === 'games') {
      const ids = (me.games || []).slice(-60).reverse();
      const list = [];
      for (const id of ids) {
        const g = await getJSON(K('g:' + id));
        if (!g) continue;
        const i = g.players.findIndex((p) => p.uid === me.id);
        list.push({
          id: g.id, status: g.status, updated: g.updated, invite: g.invite || null,
          waiting: g.players.length < 2,
          yourTurn: g.status === 'open' && g.players.length === 2 && g.turn === i,
          you: g.players[i] ? g.players[i].handle : null,
          them: g.players.filter((p) => p.uid !== me.id).map((p) => p.handle)[0] || null,
          vsComputer: g.players.some((p) => p.bot),
          scores: g.players.map((p) => p.score),
          result: g.result || null,
        });
      }
      return ok(res, { ok: true, games: list, user: publicUser(me) });
    }

    /* ---- starting a game ---- */
    if (act === 'newgame') {
      // Play the computer. Useful on its own, and the gentlest possible way to try
      // the game for the first time without anybody watching you learn it.
      if (body.vs === 'computer') {
        const level = LEVELS[body.level] ? body.level : 'even';
        const g = newGame(me, null);
        g.players.push({ uid: 'computer:' + level, handle: LEVELS[level].label, score: 0,
          rack: g.bag.splice(0, RACK), bot: true, level });
        await redis('SET', K('gr:' + g.id), '1');
        await redis('SET', K('g:' + g.id), JSON.stringify({ ...g, rev: 1 }));
        g.rev = 1;
        me.games = (me.games || []).concat(g.id);
        await setJSON(K('u:' + me.id), me);
        return ok(res, { ok: true, game: view(g, me.id) });
      }
      const other = String(body.handle || '').trim();
      let opp = null;
      if (other) {
        if (other.toLowerCase() === me.handle.toLowerCase()) return bad(res, 400, 'You cannot start a game with yourself.');
        const uid = await redis('GET', K('h:' + other.toLowerCase()));
        if (!uid || uid === 'pending') return bad(res, 404, `Nobody here goes by "${other}".`);
        opp = await getJSON(K('u:' + uid));
      }
      const g = newGame(me, opp);
      if (!opp) {
        g.invite = crypto.randomBytes(4).toString('hex').toUpperCase();
        await redis('SET', K('inv:' + g.invite), g.id, 'EX', String(30 * 86400));
      }
      await redis('SET', K('gr:' + g.id), '1');
      await redis('SET', K('g:' + g.id), JSON.stringify({ ...g, rev: 1 }));
      g.rev = 1;
      for (const u of [me, opp].filter(Boolean)) {
        u.games = (u.games || []).concat(g.id);
        await setJSON(K('u:' + u.id), u);
      }
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'join') {
      const code = String(body.code || '').trim().toUpperCase();
      const gid = await redis('GET', K('inv:' + code));
      if (!gid) return bad(res, 404, 'That invite code has expired or was never a code.');
      const g = await getJSON(K('g:' + gid));
      if (!g) return bad(res, 404, 'That game is gone.');
      if (g.players.some((p) => p.uid === me.id)) return ok(res, { ok: true, game: view(g, me.id) });
      if (g.players.length >= 2) return bad(res, 409, 'Someone already took that invite.');
      g.players.push({ uid: me.id, handle: me.handle, score: 0, rack: g.bag.splice(0, RACK) });
      delete g.invite;
      await redis('DEL', K('inv:' + code));
      await saveGame(g);
      me.games = (me.games || []).concat(g.id);
      await setJSON(K('u:' + me.id), me);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    /* ---- one game ---- */
    const g = body.id ? await getJSON(K('g:' + body.id)) : null;
    if (['game', 'play', 'swap', 'pass', 'resign', 'say', 'voice'].includes(act)) {
      if (!g) return bad(res, 404, 'No such game.');
      if (!g.players.some((p) => p.uid === me.id)) return bad(res, 403, 'That is not your game.');
    }
    if (act === 'game') return ok(res, { ok: true, game: view(g, me.id) });

    /* ---- talking to each other ----
       Chat exists ONLY between two people already in a game together, which means
       only people who invited each other. There is no inbox, no discovery and no way
       to reach a stranger — the thing that makes these games a hunting ground stays
       shut. Inside a family game, talking is the entire point. */
    if (act === 'say' || act === 'voice') {
      if (!g) return bad(res, 404, 'No such game.');
      const entry = { t: Date.now(), by: me.handle };
      if (act === 'say') {
        const text = String(body.text || '').trim().slice(0, 400);
        if (!text) return bad(res, 400, 'Nothing to send.');
        entry.text = text;
      } else {
        // A voice note lives under its own key so the game record stays small and quick.
        const audio = String(body.audio || '');
        if (!audio || audio.length > 900000) return bad(res, 400, 'That note is too long — keep it under about half a minute.');
        const vid = newId();
        await redis('SET', K('v:' + vid), audio, 'EX', String(400 * 86400));
        entry.v = vid;
        entry.secs = Math.min(60, Math.max(1, Math.round(Number(body.secs) || 0)));
        entry.mime = String(body.mime || 'audio/mp4').slice(0, 40);
      }
      g.chat = (g.chat || []).concat(entry).slice(-200);
      await saveGame(g);
      return ok(res, { ok: true, chat: g.chat.slice(-60) });
    }

    if (act === 'voiceget') {
      const vid = String(body.vid || '');
      if (!/^[A-Za-z0-9_-]{6,32}$/.test(vid)) return bad(res, 400, 'No such note.');
      const audio = await redis('GET', K('v:' + vid));
      if (!audio) return bad(res, 404, 'That note has expired.');
      return ok(res, { ok: true, audio });
    }

    const seat = g ? g.players.findIndex((p) => p.uid === me.id) : -1;
    const mustBeYourTurn = () => {
      if (g.status !== 'open') return 'This game is finished.';
      if (g.players.length < 2) return 'Still waiting for someone to take the invite.';
      if (g.turn !== seat) return 'It is not your turn yet.';
      return null;
    };

    if (act === 'pass') {
      const e = mustBeYourTurn(); if (e) return bad(res, 409, e);
      g.scoreless += 1;
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'pass' });
      g.turn = 1 - g.turn;
      if (g.scoreless >= 6) endGame(g, 'passed out');
      await computerTurn(g);
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'resign') {
      if (g.status !== 'open') return bad(res, 409, 'This game is finished.');
      const other = g.players[1 - seat];
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'resign' });
      g.status = 'done';
      g.result = { reason: 'resign', scores: g.players.map((p) => ({ handle: p.handle, score: p.score })), winner: other ? other.handle : null };
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'swap') {
      const e = mustBeYourTurn(); if (e) return bad(res, 409, e);
      const want = Array.isArray(body.letters) ? body.letters.map(String) : [];
      if (!want.length) return bad(res, 400, 'Pick the tiles you want to swap.');
      if (g.bag.length < want.length) return bad(res, 409, `Only ${g.bag.length} tiles left in the bag — not enough to swap that many.`);
      const rack = g.players[seat].rack.slice();
      for (const l of want) {
        const at = rack.indexOf(l);
        if (at < 0) return bad(res, 400, 'Those are not all your tiles.');
        rack.splice(at, 1);
      }
      const drawn = g.bag.splice(0, want.length);
      g.players[seat].rack = rack.concat(drawn);
      g.bag = g.bag.concat(want);
      for (let i = g.bag.length - 1; i > 0; i--) { const j = crypto.randomInt(i + 1); [g.bag[i], g.bag[j]] = [g.bag[j], g.bag[i]]; }
      g.scoreless += 1;
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'swap', n: want.length });
      g.turn = 1 - g.turn;
      if (g.scoreless >= 6) endGame(g, 'passed out');
      await computerTurn(g);
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'play') {
      const e = mustBeYourTurn(); if (e) return bad(res, 409, e);
      const placed = Array.isArray(body.tiles) ? body.tiles : [];
      if (!placed.length) return bad(res, 400, 'Put some tiles down first.');
      if (placed.length > RACK) return bad(res, 400, 'That is more tiles than you have.');

      // if a square is already taken, say that — it is the more useful complaint,
      // and it is what the player can actually see on their screen
      for (const t of placed) {
        const r = Number(t.r), c = Number(t.c);
        if (r >= 0 && r < 15 && c >= 0 && c < 15 && g.board[r * 15 + c]) {
          return bad(res, 409, 'One of those squares is already taken.');
        }
      }

      // your tiles must actually be yours
      const rack = g.players[seat].rack.slice();
      for (const t of placed) {
        const from = t.blank ? '?' : String(t.letter || '').toUpperCase();
        const at = rack.indexOf(from);
        if (at < 0) return bad(res, 400, 'Those are not all your tiles.');
        rack.splice(at, 1);
      }

      let dict;
      try { dict = await dictionary(); }
      catch { return bad(res, 503, 'The word list is unreachable right now — your turn is untouched, try again in a moment.'); }

      const first = g.moves.every((m) => m.kind !== 'play');
      const ev = evaluatePlacement(g.board, placed, first, dict);
      if (ev.error) return bad(res, ev.taken ? 409 : 400, ev.error);
      if (ev.rejected) {
        // Nothing is committed. You keep your tiles and your turn, and you are told
        // exactly which word failed — the thing every other word game refuses to do.
        return bad(res, 422, `${ev.rejected.join(', ')} ${ev.rejected.length > 1 ? 'are not' : 'is not'} in the word list. Nothing was played — your tiles are still yours.`);
      }

      const bingo = placed.length === RACK;
      const points = ev.total + (bingo ? BINGO : 0);

      g.board = ev.board;
      g.players[seat].score += points;
      const drawn = g.bag.splice(0, Math.min(RACK - rack.length, g.bag.length));
      g.players[seat].rack = rack.concat(drawn);
      g.scoreless = 0;
      g.moves.push({ t: Date.now(), by: me.handle, kind: 'play', points, bingo, words: ev.words,
        at: [...ev.placedSet] });
      g.turn = 1 - g.turn;
      if (!g.players[seat].rack.length && !g.bag.length) endGame(g, 'out of tiles');
      await computerTurn(g);
      await saveGame(g);
      return ok(res, { ok: true, points, bingo, words: ev.words, game: view(g, me.id) });
    }

    return bad(res, 400, 'Unknown request.');
  } catch (err) {
    const m = String(err && err.message || err);
    if (m === 'busy') return bad(res, 409, 'Your opponent moved at the same moment — reopen the game.');
    if (m.startsWith('store')) return bad(res, 503, 'The game store did not answer. Nothing was lost — try again.');
    return bad(res, 500, 'Something went wrong on our side. Nothing was lost.');
  }
}
