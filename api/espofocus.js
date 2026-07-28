// /api/espofocus — the shared database for ESPOfocus (child ADHD weekly/daily monitoring).
//
// Real store: Upstash Redis REST (SAME env-var names as api/trail-reports.js / the AE Connect stack):
//   UPSTASH_REDIS_REST_URL    (required to switch sync on)
//   UPSTASH_REDIS_REST_TOKEN  (required to switch sync on)
//
// Env-gated: with no store configured every action returns { ok:true, enabled:false }, and the
// app stays fully usable on-device (localStorage) — honest, never a broken button. The moment the
// two Upstash vars are set on this Vercel project, sync + the teacher/specialist rater link go live.
//
// PRIVACY: stores a child's FIRST NAME OR INITIALS ONLY (no birthdate, no diagnosis, no address).
// A "space" is one family account addressed by an unguessable capability id the parent keeps.
// A "rater token" lets a teacher/specialist submit ONE day for ONE child — they never see history.
//
// CommonJS (this repo — aexperiences-site — is NOT using ESM .mjs functions). Built by Accelerated Experiences, LLC.

var SP = 'ef:sp:';   // space state:  ef:sp:<space> -> JSON {kids,days,markers,cur}
var TK = 'ef:tk:';   // rater token:  ef:tk:<token> -> JSON {space,kid}
var MAXDAYS = 800;   // generous cap per space

function enabled() {
  return !!((process.env.UPSTASH_REDIS_REST_URL || '').trim() && (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim());
}
async function redis(cmds) {
  var url = (process.env.UPSTASH_REDIS_REST_URL || '').trim();
  var tok = (process.env.UPSTASH_REDIS_REST_TOKEN || '').trim();
  var r = await fetch(url + '/pipeline', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json' },
    body: JSON.stringify(cmds)
  });
  if (!r.ok) throw new Error('store');
  return r.json();
}
async function getJSON(key, fallback) {
  var out = await redis([['GET', key]]);
  var v = out && out[0] && out[0].result;
  if (!v) return fallback;
  try { return JSON.parse(v); } catch (e) { return fallback; }
}
async function setJSON(key, obj) { await redis([['SET', key, JSON.stringify(obj)]]); }

function rid(n) { var s = ''; var a = 'abcdefghijklmnopqrstuvwxyz0123456789'; for (var i = 0; i < (n || 24); i++) s += a[Math.floor(Math.random() * a.length)]; return s; }
function cleanId(s) { return String(s || '').replace(/[^a-z0-9]/gi, '').slice(0, 48); }
function emptySpace() { return { kids: [], days: [], markers: [], cur: null }; }
function clampScores(a) { if (!Array.isArray(a)) return null; if (a.length !== 15) return null; var out = []; for (var i = 0; i < 15; i++) { var n = Math.round(Number(a[i])); if (!(n >= 0 && n <= 3)) return null; out.push(n); } return out; }
function str(s, n) { return String(s == null ? '' : s).slice(0, n || 200); }
function today() { var d = new Date(); function p(x){return (x<10?'0':'')+x;} return d.getUTCFullYear() + '-' + p(d.getUTCMonth() + 1) + '-' + p(d.getUTCDate()); }
function uid() { return Date.now().toString(36) + rid(5); }

async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') { try { return JSON.parse(req.body); } catch (e) {} }
  var chunks = []; try { for await (var c of req) chunks.push(typeof c === 'string' ? Buffer.from(c) : c); } catch (e) {}
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'); } catch (e) { return {}; }
}
function send(res, code, obj) { res.statusCode = code; res.setHeader('content-type', 'application/json'); res.setHeader('cache-control', 'no-store'); res.setHeader('access-control-allow-origin', '*'); res.end(JSON.stringify(obj)); }

/* upsert a day into a space state (identity = kid + date + role) */
function upsertDay(state, e) {
  var i = state.days.findIndex(function (d) { return d.kid === e.kid && d.date === e.date && d.role === e.role; });
  if (i >= 0) { e.id = state.days[i].id; state.days[i] = e; } else { e.id = uid(); state.days.push(e); }
  if (state.days.length > MAXDAYS) state.days = state.days.slice(-MAXDAYS);
}

module.exports = async function (req, res) {
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.setHeader('access-control-allow-origin', '*'); res.setHeader('access-control-allow-headers', 'content-type'); res.setHeader('access-control-allow-methods', 'GET,POST,OPTIONS'); res.end(); return; }
  var q = req.query || {};
  var action = str(q.action || (req.url.split('?')[1] || '').replace(/^.*\baction=([^&]*).*$/, '$1'), 40);
  try {
    if (!enabled()) { return send(res, 200, { ok: true, enabled: false }); }
    var body = req.method === 'POST' ? await readBody(req) : {};

    if (action === 'ping') return send(res, 200, { ok: true, enabled: true });

    /* ---- parent (space-scoped) ---- */
    if (action === 'load') {
      var space = cleanId(q.space); if (!space) return send(res, 400, { ok: false, reason: 'space' });
      var st = await getJSON(SP + space, emptySpace());
      return send(res, 200, { ok: true, enabled: true, state: st });
    }
    if (action === 'kid.add') {
      var space = cleanId(body.space); if (!space) return send(res, 400, { ok: false, reason: 'space' });
      var st = await getJSON(SP + space, emptySpace());
      var k = { id: uid(), name: str(body.name, 24) }; if (!k.name.trim()) return send(res, 400, { ok: false, reason: 'name' });
      st.kids.push(k); st.cur = k.id; await setJSON(SP + space, st);
      return send(res, 200, { ok: true, kid: k, state: st });
    }
    if (action === 'cur.set') {
      var space = cleanId(body.space); var st = await getJSON(SP + space, emptySpace()); st.cur = str(body.cur, 40); await setJSON(SP + space, st); return send(res, 200, { ok: true });
    }
    if (action === 'day.save') {
      var space = cleanId(body.space); if (!space) return send(res, 400, { ok: false, reason: 'space' });
      var sc = clampScores(body.scores); if (!sc) return send(res, 400, { ok: false, reason: 'scores' });
      var st = await getJSON(SP + space, emptySpace());
      upsertDay(st, { kid: str(body.kid, 40), date: str(body.date, 10) || today(), role: str(body.role, 16) || 'Parent', scores: sc, note: str(body.note, 400) });
      await setJSON(SP + space, st); return send(res, 200, { ok: true, state: st });
    }
    if (action === 'marker.add') {
      var space = cleanId(body.space); var st = await getJSON(SP + space, emptySpace());
      var m = { id: uid(), kid: str(body.kid, 40), label: str(body.label, 60), date: str(body.date, 10) || today() };
      if (!m.label.trim()) return send(res, 400, { ok: false, reason: 'label' });
      st.markers.push(m); await setJSON(SP + space, st); return send(res, 200, { ok: true, state: st });
    }
    if (action === 'marker.del') {
      var space = cleanId(body.space); var st = await getJSON(SP + space, emptySpace());
      st.markers = st.markers.filter(function (m) { return m.id !== str(body.id, 40); });
      await setJSON(SP + space, st); return send(res, 200, { ok: true, state: st });
    }
    if (action === 'share.create') {
      var space = cleanId(body.space); var kid = str(body.kid, 40); if (!space || !kid) return send(res, 400, { ok: false, reason: 'args' });
      var token = rid(28); await setJSON(TK + token, { space: space, kid: kid });
      return send(res, 200, { ok: true, token: token });
    }

    /* ---- rater (token-scoped; sees only the child's name + today, never history) ---- */
    if (action === 'rate.get') {
      var t = cleanId(q.token); var link = await getJSON(TK + t, null); if (!link) return send(res, 404, { ok: false, reason: 'token' });
      var st = await getJSON(SP + link.space, emptySpace()); var kid = st.kids.find(function (k) { return k.id === link.kid; });
      var done = st.days.some(function (d) { return d.kid === link.kid && d.date === today(); });
      return send(res, 200, { ok: true, enabled: true, name: kid ? kid.name : 'this child', date: today(), alreadyToday: done });
    }
    if (action === 'rate.save') {
      var t = cleanId(body.token); var link = await getJSON(TK + t, null); if (!link) return send(res, 404, { ok: false, reason: 'token' });
      var sc = clampScores(body.scores); if (!sc) return send(res, 400, { ok: false, reason: 'scores' });
      var st = await getJSON(SP + link.space, emptySpace());
      var role = str(body.role, 16); if (['Teacher', 'Specialist', 'Parent'].indexOf(role) < 0) role = 'Teacher';
      upsertDay(st, { kid: link.kid, date: today(), role: role, scores: sc, note: str(body.note, 400) });
      await setJSON(SP + link.space, st); return send(res, 200, { ok: true });
    }

    return send(res, 400, { ok: false, reason: 'action' });
  } catch (e) {
    return send(res, 200, { ok: false, enabled: enabled(), reason: 'store' });
  }
};
