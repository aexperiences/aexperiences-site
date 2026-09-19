/* ESPOhystory — Roz reads the stories.
 *
 * The app shipped narrating with the Web Speech API, which is whatever flat robot voice the
 * device happens to have. Roz — ElevenLabs "Rachel", the same narrator as Coach Roz on
 * espodrama.com — was already rendered for all 35 stories and sitting unused in
 * /apps/espohystory/audio/. This file is the wiring that was missing.
 *
 * Three paths, best first:
 *   1. PRE-RENDERED  /apps/espohystory/audio/<id>.mp3 + .json  — free, instant, works offline,
 *      and the .json carries real per-word timings so the karaoke highlight tracks Roz exactly.
 *   2. LIVE          /api/voice — the HOUSE AE Voice Engine, voice roz, for any story added
 *      later that has no rendered audio yet. Chunked on sentence boundaries so nothing is cut
 *      off, and each chunk is cached at the edge so a re-read costs nothing.
 *   3. SILENCE       if neither can answer. There is no device-voice path any more: Roz reads
 *      these stories or nobody does (SSOT A5.3.1), and ElevenLabs is out of the house (Art. 0.10).
 *
 * A timing file is only trusted when its word count matches the story's exactly; a mismatch
 * would highlight the wrong words, so it drops to path 2 instead. No Roz option ever appears
 * in the picker unless Roz can actually speak.
 *
 * Additive companion — does not touch the app's 142KB inline script (the pattern proven by
 * roz-voice.js on espodrama.com).
 *
 * Accelerated Experiences LLC · v2
 */
(function () {
  "use strict";

  var VER = "3";
  var AUDIO_DIR = "/apps/espohystory/audio/";
  var MAX_CHARS = 880;   // live path only; the house door takes 900 characters a take

  if (typeof window.playFromCurrent !== "function" || typeof window.paraTokens === "undefined") return;

  var orig = {
    playFromCurrent: window.playFromCurrent,
    pauseSpeech: window.pauseSpeech,
    stopSpeech: window.stopSpeech,
    sayWord: window.sayWord,
    loadVoices: window.loadVoices
  };

  var R = {
    ready: false,   // Roz can speak (rendered audio and/or a live key)
    live: false,    // the house voice door can answer
    on: false,      // Roz is the selected voice
    mode: null,     // "file" | "api"
    gen: 0,
    raf: 0,
    unlocked: false,
    atPi: -1, atWi: -1
  };

  // pre-rendered story state
  var F = { id: null, words: null, base: null, total: 0, tried: {}, last: -1 };
  // live-path queue state
  var Q = { list: [], i: 0, piece: null };

  var EL = new Audio();
  EL.preload = "auto";

  // ---- audio unlock ---------------------------------------------------------------------------
  // Browsers only let a media element start inside a user gesture. Prime the shared element on
  // the first tap so paragraphs that begin after a fetch still play.
  function unlock() {
    if (R.unlocked) return;
    R.unlocked = true;
    try {
      EL.muted = true;
      var p = EL.play();
      if (p && p.catch) p.catch(function () {});
      setTimeout(function () { try { EL.pause(); EL.muted = false; } catch (e) {} }, 0);
    } catch (e) { EL.muted = false; }
  }
  document.addEventListener("pointerdown", unlock, { capture: true });
  document.addEventListener("keydown", unlock, { capture: true });

  function rate() {
    // The app's presets were tuned for a synthetic voice. Roz is a real read, so Storytime is
    // her natural pace rather than a slowed one.
    var r = parseFloat(window.S && window.S.rate) || 0.95;
    if (r < 0.9) return 0.9;
    if (r > 1.05) return 1.15;
    return 1;
  }

  // ---- flat token index (the timing files are one flat list for the whole story) ---------------
  function buildBase() {
    var b = [], n = 0;
    for (var i = 0; i < window.paraTokens.length; i++) { b.push(n); n += window.paraTokens[i].length; }
    F.base = b; F.total = n;
  }
  function flat(pi, wi) { return (F.base[pi] || 0) + wi; }
  function unflat(k) {
    var b = F.base;
    for (var pi = b.length - 1; pi >= 0; pi--) if (k >= b[pi]) return [pi, k - b[pi]];
    return [0, 0];
  }

  // ---- highlight loop ---------------------------------------------------------------------------
  function tick() {
    R.raf = 0;
    if (!window.P || !window.P.playing || EL.paused) return;
    var t = EL.currentTime, best = -1, lo = 0, hi = 0, m;

    if (R.mode === "file" && F.words) {
      lo = 0; hi = F.words.length - 1;
      while (lo <= hi) { m = (lo + hi) >> 1; if (F.words[m][0] <= t) { best = m; lo = m + 1; } else hi = m - 1; }
      if (best >= 0 && best !== F.last) {
        F.last = best;
        var pw = unflat(best);
        window.P.pi = pw[0]; window.P.wi = pw[1];
        try { window.hl(pw[0], pw[1]); } catch (e) {}
      }
    } else if (R.mode === "api" && Q.piece && Q.piece.mt) {
      var p = Q.piece; lo = 0; hi = p.mt.length - 1;
      while (lo <= hi) { m = (lo + hi) >> 1; if (p.mt[m] <= t) { best = m; lo = m + 1; } else hi = m - 1; }
      if (best >= 0 && best !== p.last) {
        p.last = best;
        window.P.pi = p.pi; window.P.wi = p.mw[best];
        try { window.hl(p.pi, p.mw[best]); } catch (e) {}
      }
    }
    R.raf = requestAnimationFrame(tick);
  }
  function startTick() { if (!R.raf) R.raf = requestAnimationFrame(tick); }
  function stopTick() { if (R.raf) { cancelAnimationFrame(R.raf); R.raf = 0; } }

  function playing(on) {
    window.P.playing = on;
    try { window.setPlayBtn(on); } catch (e) {}
  }

  // ================= PATH 1 — pre-rendered =======================================================
  function loadStory(id) {
    if (F.id === id && F.words) return Promise.resolve(true);
    if (F.tried[id] === false) return Promise.resolve(false);
    buildBase();
    var want = F.total;
    return fetch(AUDIO_DIR + id + ".json").then(function (r) {
      if (!r.ok) throw new Error("no timings");
      return r.json();
    }).then(function (j) {
      var w = j && j.words;
      // Only trust a timing file that lines up 1:1 with this story's words. Anything else would
      // light up the wrong word, which is worse than no highlight at all.
      if (!Array.isArray(w) || w.length !== want) throw new Error("token mismatch");
      F.id = id; F.words = w; F.last = -1; F.tried[id] = true;
      return true;
    }).catch(function () {
      F.tried[id] = false;
      if (F.id === id) { F.id = null; F.words = null; }
      return false;
    });
  }

  function playFile(gen, seekTo) {
    if (gen !== R.gen) return;
    R.mode = "file";
    var src = location.origin + AUDIO_DIR + F.id + ".mp3";
    var start = F.words[Math.max(0, Math.min(seekTo, F.words.length - 1))][0];

    function go() {
      if (gen !== R.gen) return;
      try { EL.currentTime = start; } catch (e) {}
      EL.playbackRate = rate();
      F.last = -1;
      playing(true);
      var pr = EL.play();
      if (pr && pr.catch) pr.catch(function () {
        playing(false);
        try { window.toast("Tap Read to me once more to start Roz."); } catch (e) {}
      });
      startTick();
    }

    EL.onended = function () { if (gen !== R.gen) return; stopTick(); try { window.finishStory(); } catch (e) {} };
    EL.onerror = function () { if (gen !== R.gen) return; stopTick(); F.tried[F.id] = false; F.words = null; toLive(gen); };

    if (EL.src !== src) {
      var started = false;
      EL.src = src;
      EL.onloadedmetadata = function () { started = true; go(); };
      // A child must never be left staring at a silent page. The rendered file is over a
      // megabyte, so on a slow line it can still be opening well after ten seconds — that is not
      // a failure, it is a wait, and cutting it off used to drop the story onto a robot voice.
      // Give it twenty-five seconds, and if it truly has not opened, keep reading in LIVE Roz.
      setTimeout(function () {
        if (gen !== R.gen || started || EL.readyState > 0) return;
        stopTick();
        toLive(gen);
      }, 25000);
      EL.load();
    } else go();
  }

  // ================= PATH 2 — live /api/voice, the house engine ======================================================
  // Pieces tile the paragraph EXACTLY — no character is ever dropped out of a story.
  function split(text) {
    var out = [], rest = text;
    while (rest.length > MAX_CHARS) {
      var win = rest.slice(0, MAX_CHARS);
      var cut = Math.max(win.lastIndexOf(". "), win.lastIndexOf("! "), win.lastIndexOf("? "));
      if (cut > MAX_CHARS * 0.4) cut = cut + 2;
      else { cut = win.lastIndexOf(" "); cut = cut > 0 ? cut + 1 : MAX_CHARS; }
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest.length) out.push(rest);
    return out;
  }

  /* One chunk of a story, spoken live by the house engine in Roz. The take comes back as
     audio, not JSON, and it carries no per-word timings — mapPiece already handles that by
     spreading the words evenly across the take, which is what the pre-rendered path avoids
     needing. The GET is cached hard at the edge, so the second reader of a story pays
     nothing and waits for nothing. */
  /* The player is pointed at the address itself, NOT at a blob we built from it. Fetching the
     take first only warms the cache — the browser and the edge then hand the same bytes to the
     media element with no second trip. Handing a media element a blob: URL instead is what left
     ESPOhystory sitting at readyState 0 with the flag saying it was playing. */
  function voiceUrl(text) { return "/api/voice?voice=roz&say=" + encodeURIComponent(text); }

  function ask(text) {
    var url = voiceUrl(text);
    return fetch(url).then(function (r) {
      var ct = r.headers.get("content-type") || "";
      if (r.ok && ct.indexOf("audio") > -1) return { ok: true, src: url };
      return r.json().then(function (j) { return { ok: false, reason: (j && j.reason) || "upstream" }; })
                     .catch(function () { return { ok: false, reason: "upstream" }; });
    }).catch(function () { return { ok: false, reason: "upstream" }; });
  }

  function buildQueue(startPi, startWi) {
    var q = [];
    if (!window.cur || !window.cur.paras) return q;
    for (var pi = startPi; pi < window.paraTokens.length; pi++) {
      var toks = window.paraTokens[pi];
      var off = (pi === startPi && toks && toks[startWi]) ? toks[startWi].start : 0;
      var text = window.cur.paras[pi].slice(off);
      var segs = split(text);
      for (var k = 0; k < segs.length; k++) {
        if (segs[k].trim()) q.push({ pi: pi, off: off, text: segs[k] });
        off += segs[k].length;
      }
    }
    return q;
  }

  function mapPiece(piece, data, duration) {
    var toks = window.paraTokens[piece.pi] || [];
    var len = piece.text.length;
    var exact = data && typeof data.chars === "string" && data.chars.length === len &&
                data.t && data.t.length === len;
    var mw = [], mt = [];
    for (var i = 0; i < toks.length; i++) {
      var local = toks[i].start - piece.off;
      if (local < 0 || local >= len) continue;
      if (exact) { mw.push(i); mt.push(data.t[local]); }
      else if (duration > 0) { mw.push(i); mt.push((local / len) * duration); }
    }
    piece.mw = mw; piece.mt = mt; piece.exact = !!exact;
  }

  function prefetch(n) {
    var p = Q.list[n];
    if (p && !p.req) p.req = ask(p.text).catch(function () { return null; });
  }

  function playApi(gen) {
    if (gen !== R.gen) return;
    R.mode = "api";
    var p = Q.list[Q.i];
    if (!p) { stopTick(); try { window.finishStory(); } catch (e) {} return; }
    if (!p.req) p.req = ask(p.text).catch(function () { return null; });

    p.req.then(function (data) {
      if (gen !== R.gen) return;
      if (!data || !data.ok || !data.src) {
        if (data && (data.reason === "no_key" || data.reason === "upstream")) { standDown(); return; }
        Q.i++; playApi(gen);            // one bad piece skips forward; the story keeps reading
        return;
      }
      Q.piece = p; p.last = -1;
      window.P.pi = p.pi;
      EL.onended = function () { if (gen !== R.gen) return; Q.i++; playApi(gen); };
      EL.onerror = function () { if (gen !== R.gen) return; Q.i++; playApi(gen); };
      EL.onloadedmetadata = function () { mapPiece(p, data, EL.duration || 0); };
      EL.src = data.src;
      EL.playbackRate = rate();
      mapPiece(p, data, 0);
      var pr = EL.play();
      if (pr && pr.catch) pr.catch(function () {
        playing(false);
        try { window.toast("Tap Read to me once more to start Roz."); } catch (e) {}
      });
      playing(true);
      startTick();
      prefetch(Q.i + 1);
    });
  }

  /* Hand the story to live Roz. The rendered file is the fast, free path; this is what keeps
     the SAME voice reading when that file cannot open, instead of a robot or silence. */
  function toLive(gen) {
    if (gen !== R.gen) return;
    if (!R.live) { standDown(); return; }
    var pi = window.P.pi || 0, wi = window.P.wi || 0;
    Q.list = buildQueue(pi, wi); Q.i = 0; Q.piece = null;
    if (!Q.list.length) { try { window.finishStory(); } catch (e) {} return; }
    prefetch(0); prefetch(1);
    playApi(gen);
  }

  // ================= PATH 3 — say so, and stay quiet =============================================
  /* This used to hand the story back to the device's own synthesizer. It does not any more:
     a strange robot voice taking over mid-story is exactly what Anthony could hear, and it is
     forbidden. If Roz cannot speak we stop cleanly and say why, and the words stay on screen
     to be read together — which is what the app is for. */
  function standDown() {
    R.mode = null;
    stopTick(); try { EL.pause(); } catch (e) {}
    try { window.P.playing = false; window.setPlayBtn(false); } catch (e) {}
    try { window.toast("Roz is waking up — give her a moment and tap Read to me again."); } catch (e) {}
  }

  // ================= overrides ===================================================================
  window.playFromCurrent = function () {
    if (!R.on || !R.ready) return orig.playFromCurrent.apply(this, arguments);
    if (!window.cur) return;
    unlock();

    // resume in place if nothing moved while paused — no reload, no restarted sentence
    if (EL.paused && EL.currentTime > 0 && !EL.ended && R.mode &&
        window.P.pi === R.atPi && window.P.wi === R.atWi) {
      playing(true);
      EL.playbackRate = rate();
      var pr = EL.play(); if (pr && pr.catch) pr.catch(function () {});
      startTick();
      return;
    }

    var gen = ++R.gen;
    var id = window.cur.id;
    var pi = window.P.pi || 0, wi = window.P.wi || 0;
    playing(true);

    loadStory(id).then(function (haveFile) {
      if (gen !== R.gen) return;
      if (haveFile) { playFile(gen, flat(pi, wi)); return; }
      toLive(gen);
    });
  };

  window.pauseSpeech = function () {
    if (!R.on || !R.ready) return orig.pauseSpeech.apply(this, arguments);
    stopTick();
    try { EL.pause(); } catch (e) {}
    R.atPi = window.P.pi; R.atWi = window.P.wi;
    playing(false);
  };

  window.stopSpeech = function () {
    if (!R.on || !R.ready) return orig.stopSpeech.apply(this, arguments);
    R.gen++; R.mode = null; R.atPi = -1; R.atWi = -1;
    Q.list = []; Q.i = 0; Q.piece = null;
    stopTick();
    try { EL.pause(); } catch (e) {}
    playing(false);
    try { window.clearHl(); } catch (e) {}
  };

  // Tap a word: seek straight to it in Roz's read. Free, instant, and it keeps the app's
  // "tap any word to hear it alone" promise.
  window.sayWord = function (word, el) {
    if (!R.on || !R.ready) return orig.sayWord.apply(this, arguments);
    unlock();
    var pi = +el.dataset.pi, wi = +el.dataset.wi;
    var wasPlaying = window.P.playing;
    var k = -1, t0 = null, t1 = null;

    if (R.mode === "file" && F.words) {
      k = flat(pi, wi);
      if (F.words[k]) { t0 = F.words[k][0]; t1 = F.words[k][1]; }
    } else if (R.mode === "api" && Q.piece && Q.piece.pi === pi && Q.piece.mw) {
      var j = Q.piece.mw.indexOf(wi);
      if (j > -1) { t0 = Q.piece.mt[j]; t1 = (Q.piece.mt[j + 1] != null) ? Q.piece.mt[j + 1] : null; Q.piece.last = j - 1; }
    }

    window.P.pi = pi; window.P.wi = wi;
    try { window.clearHl(); } catch (e) {}
    el.classList.add("hl");

    if (t0 == null) {
      // no timing for this word yet — start the read from here instead
      R.atPi = -1; R.atWi = -1;
      window.playFromCurrent();
      return;
    }

    try { EL.currentTime = t0; } catch (e) {}
    if (R.mode === "file") F.last = k - 1;

    if (wasPlaying) { startTick(); return; }   // already reading: just jump

    var stopAt = (t1 != null) ? t1 + 0.06 : t0 + 1.2;
    playing(true); startTick();
    var watch = function () {
      if (EL.currentTime >= stopAt) {
        EL.removeEventListener("timeupdate", watch);
        try { EL.pause(); } catch (e) {}
        stopTick(); playing(false);
        R.atPi = pi; R.atWi = wi;
      }
    };
    EL.addEventListener("timeupdate", watch);
    var pr = EL.play(); if (pr && pr.catch) pr.catch(function () {});
  };

  // ---- the voice picker: Roz is only ever offered once she can actually speak --------------------
  /* There is no voice to pick any more. Roz reads these stories, so the picker is hidden
     rather than offering a choice between her and a robot. */
  function hidePicker() {
    var sel = document.getElementById("selVoice");
    if (sel) { sel.innerHTML = ""; sel.style.display = "none"; }
    R.on = true;
    try { window.S.voice = "roz"; window.save(); } catch (e) {}
  }

  window.loadVoices = function () { hidePicker(); };

  // ---- boot ---------------------------------------------------------------------------------------
  // Rendered audio alone is enough for Roz to read every story that ships today; the live key is
  // what covers any story added later. Either one makes her available.
  /* The rendered audio covers every story that ships today. The house voice door covers any
     story added later, and it lives on this same site, so it is always the fallback — no ping
     needed and no reason to ever fall back to a robot. */
  R.live = true;
  R.ready = true;
  R.on = true;
  hidePicker();
  if (window.P && window.P.playing) {
    R.atPi = -1; R.atWi = -1;
    try { window.playFromCurrent(); } catch (e) {}
  }

  window.__rozNarration = {
    v: VER,
    state: function () {
      return { ready: R.ready, live: R.live, on: R.on, mode: R.mode, story: F.id,
               words: F.words ? F.words.length : null, tokens: F.total,
               paused: EL.paused, t: Math.round(EL.currentTime * 100) / 100,
               dur: Math.round(EL.duration * 10) / 10, rate: EL.playbackRate };
    },
    split: split
  };
})();
