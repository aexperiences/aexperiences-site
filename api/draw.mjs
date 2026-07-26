// ESPOdraw — the whole back end. Accelerated Experiences LLC.
//
// One endpoint, POST /api/draw. You draw a word, everyone else guesses, then it comes
// back round to the next person. Two to eight players. Turn-based, not real-time, so
// nobody has to be sitting there at the same moment as anybody else.
//
// SHARED IDENTITY, SEPARATE GAMES. Users, sessions, handles and the one-tap sign-in
// links live under the same `ew:` keys ESPOwords uses, so one account plays both games
// and one link signs you into both. The games themselves live under `ed:` where nothing
// can reach across and corrupt a word game.
//
// A drawing is stored as the STROKES, not a picture — a list of points. Two reasons:
// it is a few kilobytes instead of a few hundred, and it means the drawing can replay
// itself in the order it was drawn, which turns out to be the nicest part of the game.

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
const WHO = 'ew:';   // identity, shared with ESPOwords
const GAME = 'ed:';  // this game's own records
const U = (s) => WHO + s;
const D = (s) => GAME + s;
const getJSON = async (k) => { const v = await redis('GET', k); return v ? JSON.parse(v) : null; };
const setJSON = (k, v) => redis('SET', k, JSON.stringify(v));

const CAS = `
local cur = redis.call('GET', KEYS[2])
if cur == ARGV[1] then
  redis.call('SET', KEYS[1], ARGV[2])
  redis.call('SET', KEYS[2], ARGV[3])
  return 1
end
return 0`;
async function saveGame(g) {
  const expect = String(g.rev), next = String(g.rev + 1);
  g.rev += 1;
  g.updated = Date.now();
  const ok = await redis('EVAL', CAS, '2', D('g:' + g.id), D('gr:' + g.id), expect, JSON.stringify(g), next);
  if (!ok) { g.rev -= 1; throw new Error('busy'); }
}

/* ---------------------------------------------------------------- words -- */
// Ours, written for this game: things a person can actually draw, in three sizes of
// difficulty. Nothing that needs a shared cultural reference, nothing that turns into
// an argument, nothing a child would have to ask about. Family table words.

const WORDS = {
  easy: ('cat dog sun moon star tree house car boat fish bird apple banana hat shoe sock ball cup ' +
    'key door window chair table bed book pen cake egg cloud rain snow flower leaf bone duck cow ' +
    'pig sheep frog bee ant worm shark whale crab hand foot eye nose ear mouth smile heart arrow ' +
    'box bag hammer nail spoon fork knife plate bowl clock lamp candle brush comb ring crown bell ' +
    'drum flag kite balloon bubble ladder fence bridge road hill lake island beach shell rock ' +
    'mountain river cactus mushroom carrot corn pear plum cherry lemon grape onion potato bread ' +
    'cheese pizza burger fries donut cookie candy ice milk tea coffee juice water fire smoke').split(' '),
  medium: ('bicycle tractor helicopter submarine rocket lighthouse windmill castle igloo tent barn ' +
    'church school hospital library museum theatre stadium airport station harbour garage kitchen ' +
    'bathroom garden greenhouse beehive birdhouse mailbox scarecrow snowman campfire hammock swing ' +
    'slide seesaw trampoline skateboard surfboard sailboat canoe raft anchor compass telescope ' +
    'microscope binoculars camera guitar piano violin trumpet accordion harmonica banjo saxophone ' +
    'typewriter telephone radio television toaster kettle blender fridge washer vacuum umbrella ' +
    'raincoat mitten scarf sweater apron backpack suitcase wallet passport ticket stamp envelope ' +
    'postcard newspaper magazine dictionary calendar notebook pencil eraser scissors stapler ' +
    'paintbrush palette easel puzzle marble kaleidoscope pinwheel windchime sundial fountain ' +
    'statue archway staircase chimney weathervane hedgehog squirrel raccoon beaver otter penguin ' +
    'flamingo peacock owl eagle parrot toucan pelican seahorse jellyfish starfish octopus lobster ' +
    'butterfly dragonfly ladybird caterpillar grasshopper snail lizard turtle camel llama donkey ' +
    'goose rooster turkey deer moose bison zebra giraffe hippo rhino panda koala sloth').split(' '),
  hard: ('avalanche earthquake volcano tornado hurricane rainbow eclipse constellation galaxy ' +
    'gravity magnet electricity battery engine propeller pulley gearbox scaffold blueprint ' +
    'skyscraper aqueduct catapult drawbridge portcullis labyrinth pyramid obelisk totem ' +
    'hieroglyph parchment quill inkwell abacus hourglass metronome gramophone zeppelin ' +
    'penny-farthing wheelbarrow plough anvil bellows forge kiln loom spindle sewing thimble ' +
    'corkscrew colander whisk rolling-pin cleaver mortar pestle decanter goblet teapot ' +
    'candelabra chandelier lantern periscope sextant barometer thermometer stethoscope ' +
    'wheelchair crutches bandage plaster syringe magnifier tweezers padlock keyhole hinge ' +
    'doorknob letterbox drainpipe gutter shingle turret balcony veranda pergola trellis ' +
    'topiary bonsai terrarium aquarium birdcage kennel stable trough scarecrow beekeeper ' +
    'blacksmith carpenter plumber painter gardener fisherman lifeguard astronaut deep-sea-diver ' +
    'tightrope juggler acrobat magician puppet marionette carousel ferris-wheel rollercoaster').split(' '),
};

const pickWords = (level, n = 3) => {
  const pool = WORDS[level] || WORDS.medium;
  const out = [];
  while (out.length < n) {
    const w = pool[crypto.randomInt(pool.length)];
    if (!out.includes(w)) out.push(w);
  }
  return out;
};

// The letter bank. You never type a guess — you tap letters out of a tray, the way the
// 2012 game did it. It is faster on a phone, it is kinder to anybody who finds typing
// hard, and it makes a wrong guess feel like a puzzle instead of a spelling test.
function makeBank(word) {
  const letters = word.replace(/[^a-z]/gi, '').toUpperCase().split('');
  const size = Math.min(14, Math.max(12, letters.length + 4));
  const filler = 'AEIOURSTLNCDMPBGHFWYKVJXQZ';
  const bank = letters.slice();
  while (bank.length < size) bank.push(filler[crypto.randomInt(filler.length)]);
  for (let i = bank.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [bank[i], bank[j]] = [bank[j], bank[i]];
  }
  return bank;
}

const CORRECT = 3;   // for guessing it
const DREW_IT = 1;   // to the drawer, per person who got it — good drawing pays, but cannot be farmed
const MAX_PLAYERS = 8;
const STROKE_LIMIT = 260000;   // characters of JSON. A generous drawing is a few thousand.

/* ---------------------------------------------------------------- people -- */

const token = () => crypto.randomBytes(24).toString('base64url');
const newId = () => crypto.randomBytes(9).toString('base64url');
const SESSION_DAYS = 120;

async function userByToken(req) {
  const auth = String(req.headers.authorization || '');
  const t = auth.startsWith('Bearer ') ? auth.slice(7) : '';
  if (!t) return null;
  const uid = await redis('GET', U('s:' + t));
  if (!uid) return null;
  await redis('EXPIRE', U('s:' + t), String(SESSION_DAYS * 86400));
  return await getJSON(U('u:' + uid));
}

/* ----------------------------------------------------------------- game -- */

function newGame(host, level) {
  return {
    id: newId(), rev: 0, created: Date.now(), updated: Date.now(),
    status: 'open',            // open | done
    level: WORDS[level] ? level : 'medium',
    players: [{ uid: host.id, handle: host.handle, score: 0 }],
    drawer: 0,
    round: 0,
    phase: 'choosing',         // choosing -> drawing -> guessing
    choices: [], word: null,
    strokes: null, drawnAt: 0, bank: null,
    streak: 0,                 // rounds in a row this table has got it — the 2012 hook
    guesses: [],               // [{uid, handle, text, right, t}]
    done: [],                  // uids finished with this round
    log: [],
    invite: null,
  };
}

// What a given player may see. The word is the whole game — it never leaves the
// server for anybody except the person drawing it.
function view(g, uid) {
  const me = g.players.findIndex((p) => p.uid === uid);
  const drawing = g.drawer === me;
  const finished = g.done.includes(uid);
  const revealed = g.phase === 'guessing' && (finished || allDone(g));
  return {
    id: g.id, rev: g.rev, status: g.status, level: g.level, phase: g.phase,
    created: g.created, updated: g.updated, invite: g.invite || null,
    round: g.round, you: me, youAreDrawing: drawing,
    drawer: g.players[g.drawer] ? g.players[g.drawer].handle : null,
    players: g.players.map((p) => ({ handle: p.handle, score: p.score })),
    // the drawer sees their own word; everyone else sees it only once they are done
    word: (drawing && g.phase !== 'choosing') || revealed ? g.word : null,
    choices: drawing && g.phase === 'choosing' ? g.choices : null,
    strokes: g.phase === 'guessing' ? g.strokes : null,
    blanks: g.phase === 'guessing' && g.word ? g.word.replace(/[^a-z]/gi, '').length : 0,
    shape: g.phase === 'guessing' && g.word ? g.word.replace(/[a-z]/gi, 'x') : null,
    bank: g.phase === 'guessing' && !drawing && !finished ? g.bank : null,
    streak: g.streak,
    youFinished: finished,
    yourTurn: g.status === 'open' && (drawing ? (g.phase === 'choosing' || g.phase === 'drawing') : (g.phase === 'guessing' && !finished)),
    // guesses are public once made — half the fun is seeing what everyone tried
    guesses: g.guesses.map((x) => ({ handle: x.handle, text: x.right ? x.text : x.text, right: x.right, t: x.t })),
    waitingOn: g.phase === 'guessing'
      ? g.players.filter((p, i) => i !== g.drawer && !g.done.includes(p.uid)).map((p) => p.handle)
      : (g.players[g.drawer] ? [g.players[g.drawer].handle] : []),
    log: g.log.slice(-40),
  };
}

const guessers = (g) => g.players.filter((p, i) => i !== g.drawer);
const allDone = (g) => guessers(g).every((p) => g.done.includes(p.uid));

function nextRound(g) {
  const got = g.guesses.filter((x) => x.right).length;
  g.streak = got > 0 ? g.streak + 1 : 0;
  g.log.push({ t: Date.now(), kind: 'reveal', word: g.word, by: g.players[g.drawer].handle, got, streak: g.streak });
  g.drawer = (g.drawer + 1) % g.players.length;
  g.round += 1;
  g.phase = 'choosing';
  g.choices = [];
  g.word = null;
  g.strokes = null;
  g.bank = null;
  g.guesses = [];
  g.done = [];
}

/* --------------------------------------------------------------- routes -- */

const ok = (res, body) => { res.statusCode = 200; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(body)); };
const bad = (res, code, error) => { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ ok: false, error })); };

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '', dead = false;
    req.on('data', (c) => {
      if (dead) return;
      raw += c;
      // stop reading rather than hang: a body this size is not a drawing, it is a mistake
      if (raw.length > 400000) { dead = true; reject(new Error('too_big')); req.destroy(); }
    });
    req.on('end', () => { if (dead) return; try { resolve(raw ? JSON.parse(raw) : {}); } catch (e) { reject(e); } });
    req.on('error', (e) => { if (!dead) { dead = true; reject(e); } });
  });
}

const tidy = (s) => String(s || '').toLowerCase().replace(/[^a-z]/g, '');

export default async function handler(req, res) {
  res.setHeader('cache-control', 'no-store');
  if (req.method === 'GET') {
    return ok(res, { ok: true, service: 'espodraw', store: storeReady(),
      levels: Object.keys(WORDS), wordCount: Object.fromEntries(Object.entries(WORDS).map(([k, v]) => [k, v.length])),
      scoring: { guessedIt: CORRECT, perPersonWhoGuessedYours: DREW_IT }, maxPlayers: MAX_PLAYERS,
      guessing: 'letter bank — tap letters, never type', replay: 'drawings play back stroke by stroke' });
  }
  if (req.method !== 'POST') return bad(res, 405, 'POST only');

  let body;
  try { body = await readBody(req); }
  catch (e) {
    return bad(res, 413, String(e && e.message) === 'too_big'
      ? 'That drawing is enormous. Try it with fewer strokes.' : 'Bad request body.');
  }
  const act = body.do;
  if (act === 'ping') return ok(res, { ok: true, store: storeReady() });

  if (!storeReady()) return bad(res, 503, 'Not switched on yet — the game store has not been connected to this site.');

  try {
    const me = await userByToken(req);
    if (!me) return bad(res, 401, 'Sign in first. The same account works for ESPOwords and ESPOdraw.');

    if (act === 'me') return ok(res, { ok: true, user: { id: me.id, handle: me.handle } });

    /* ---- your games ---- */
    if (act === 'games') {
      const ids = (me.drawGames || []).slice(-60).reverse();
      const list = [];
      for (const id of ids) {
        const g = await getJSON(D('g:' + id));
        if (!g) continue;
        const i = g.players.findIndex((p) => p.uid === me.id);
        const drawing = g.drawer === i;
        list.push({
          id: g.id, status: g.status, updated: g.updated, invite: g.invite || null,
          phase: g.phase, round: g.round, level: g.level,
          players: g.players.map((p) => p.handle), scores: g.players.map((p) => p.score),
          drawer: g.players[g.drawer] ? g.players[g.drawer].handle : null,
          youAreDrawing: drawing,
          yourTurn: g.status === 'open' && (drawing
            ? (g.phase === 'choosing' || g.phase === 'drawing')
            : (g.phase === 'guessing' && !g.done.includes(me.id))),
        });
      }
      return ok(res, { ok: true, games: list, user: { id: me.id, handle: me.handle } });
    }

    /* ---- starting one ---- */
    if (act === 'newgame') {
      const g = newGame(me, body.level);
      const names = Array.isArray(body.handles) ? body.handles.slice(0, MAX_PLAYERS - 1) : [];
      const added = [];
      for (const raw of names) {
        const h = String(raw || '').trim();
        if (!h || h.toLowerCase() === me.handle.toLowerCase()) continue;
        const uid = await redis('GET', U('h:' + h.toLowerCase()));
        if (!uid || uid === 'pending') return bad(res, 404, `Nobody here goes by "${h}".`);
        if (g.players.some((p) => p.uid === uid)) continue;
        const u = await getJSON(U('u:' + uid));
        if (!u) continue;
        g.players.push({ uid: u.id, handle: u.handle, score: 0 });
        added.push(u);
      }
      // an invite code so more people can wander in later — a family game should not need
      // everybody to already have an account before it can start
      g.invite = crypto.randomBytes(4).toString('hex').toUpperCase();
      await redis('SET', D('inv:' + g.invite), g.id, 'EX', String(30 * 86400));
      await redis('SET', D('gr:' + g.id), '1');
      await redis('SET', D('g:' + g.id), JSON.stringify({ ...g, rev: 1 }));
      g.rev = 1;
      for (const u of [me, ...added]) {
        u.drawGames = (u.drawGames || []).concat(g.id);
        await setJSON(U('u:' + u.id), u);
      }
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'join') {
      const code = String(body.code || '').trim().toUpperCase();
      const gid = await redis('GET', D('inv:' + code));
      if (!gid) return bad(res, 404, 'That invite code has expired or was never a code.');
      const g = await getJSON(D('g:' + gid));
      if (!g) return bad(res, 404, 'That game is gone.');
      if (g.players.some((p) => p.uid === me.id)) return ok(res, { ok: true, game: view(g, me.id) });
      if (g.players.length >= MAX_PLAYERS) return bad(res, 409, `That game is full — ${MAX_PLAYERS} is the limit.`);
      g.players.push({ uid: me.id, handle: me.handle, score: 0 });
      g.log.push({ t: Date.now(), kind: 'joined', by: me.handle });
      await saveGame(g);
      me.drawGames = (me.drawGames || []).concat(g.id);
      await setJSON(U('u:' + me.id), me);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    /* ---- one game ---- */
    const g = body.id ? await getJSON(D('g:' + body.id)) : null;
    if (['game', 'choose', 'submit', 'guess', 'giveup', 'leave'].includes(act)) {
      if (!g) return bad(res, 404, 'No such game.');
      if (!g.players.some((p) => p.uid === me.id)) return bad(res, 403, 'That is not your game.');
    }

    const seat = g ? g.players.findIndex((p) => p.uid === me.id) : -1;
    const iAmDrawing = g && g.drawer === seat;

    if (act === 'game') {
      // the drawer arriving at a fresh round gets their three words dealt
      if (g.status === 'open' && iAmDrawing && g.phase === 'choosing' && !g.choices.length && g.players.length >= 2) {
        g.choices = pickWords(g.level, 3);
        await saveGame(g);
      }
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'choose') {
      if (!iAmDrawing) return bad(res, 409, 'It is not your turn to draw.');
      if (g.phase !== 'choosing') return bad(res, 409, 'You have already picked a word.');
      if (g.players.length < 2) return bad(res, 409, 'You need somebody to guess — send them the invite code first.');
      const want = tidy(body.word);
      const match = g.choices.find((c) => tidy(c) === want);
      if (!match) return bad(res, 400, 'Pick one of the three words you were given.');
      g.word = match;
      g.phase = 'drawing';
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'submit') {
      if (!iAmDrawing) return bad(res, 409, 'It is not your turn to draw.');
      if (g.phase !== 'drawing') return bad(res, 409, 'Pick your word first.');
      const strokes = body.strokes;
      if (!Array.isArray(strokes) || !strokes.length) return bad(res, 400, 'Draw something first.');
      const packed = JSON.stringify(strokes);
      if (packed.length > STROKE_LIMIT) return bad(res, 400, 'That drawing is enormous. Try it with fewer strokes.');
      g.strokes = strokes;
      g.drawnAt = Date.now();
      g.bank = makeBank(g.word);
      g.phase = 'guessing';
      g.log.push({ t: Date.now(), kind: 'drew', by: me.handle });
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    if (act === 'guess') {
      if (g.phase !== 'guessing') return bad(res, 409, 'Nothing to guess yet.');
      if (iAmDrawing) return bad(res, 409, 'You drew it — you already know.');
      if (g.done.includes(me.id)) return bad(res, 409, 'You are done with this round.');
      const text = String(body.text || '').trim().slice(0, 40);
      if (!text) return bad(res, 400, 'Type a guess.');
      const right = tidy(text) === tidy(g.word);
      const answer = g.word;                      // hold it — nextRound() is about to wipe it
      g.guesses.push({ uid: me.id, handle: me.handle, text, right, t: Date.now() });
      let tries = 0;
      if (right) {
        tries = g.guesses.filter((x) => x.uid === me.id).length;
        g.players[seat].score += CORRECT;
        g.players[g.drawer].score += DREW_IT;
        g.done.push(me.id);
      }
      let finished = false;
      if (allDone(g)) { nextRound(g); finished = true; }
      await saveGame(g);
      // the word comes back on a correct guess even when the round rolled over in the same
      // breath — otherwise the person who just got it never sees what they got
      return ok(res, { ok: true, right, tries, roundEnded: finished,
        word: right ? answer : null, game: view(g, me.id) });
    }

    if (act === 'giveup') {
      if (g.phase !== 'guessing') return bad(res, 409, 'Nothing to give up on.');
      if (iAmDrawing) return bad(res, 409, 'You drew it.');
      if (g.done.includes(me.id)) return ok(res, { ok: true, word: g.word, game: view(g, me.id) });
      const answer = g.word;
      g.done.push(me.id);
      g.log.push({ t: Date.now(), kind: 'gaveup', by: me.handle });
      let finished = false;
      if (allDone(g)) { nextRound(g); finished = true; }
      await saveGame(g);
      return ok(res, { ok: true, roundEnded: finished, word: answer, game: view(g, me.id) });
    }

    if (act === 'leave') {
      if (g.players.length <= 2) {
        g.status = 'done';
        g.log.push({ t: Date.now(), kind: 'ended', by: me.handle });
      } else {
        const i = g.players.findIndex((p) => p.uid === me.id);
        const wasDrawing = g.drawer === i;
        g.players.splice(i, 1);
        if (g.drawer >= g.players.length) g.drawer = 0;
        else if (g.drawer > i) g.drawer -= 1;
        g.done = g.done.filter((x) => x !== me.id);
        g.log.push({ t: Date.now(), kind: 'left', by: me.handle });
        if (wasDrawing) {
          // the person drawing walked out. Scrap the round rather than hand their
          // half-finished word to whoever inherits the seat.
          g.phase = 'choosing'; g.choices = []; g.word = null;
          g.strokes = null; g.bank = null; g.guesses = []; g.done = [];
          g.log.push({ t: Date.now(), kind: 'scrapped' });
        } else if (g.phase === 'guessing' && allDone(g)) nextRound(g);
      }
      await saveGame(g);
      return ok(res, { ok: true, game: view(g, me.id) });
    }

    return bad(res, 400, 'Unknown request.');
  } catch (err) {
    const m = String(err && err.message || err);
    if (m === 'busy') return bad(res, 409, 'Somebody moved at the same moment — open the game again.');
    if (m.startsWith('store')) return bad(res, 503, 'The game store did not answer. Nothing was lost — try again.');
    return bad(res, 500, 'Something went wrong on our side. Nothing was lost.');
  }
}
