/* ESPOhystory — Roz's real voice.
 *
 * Replaces the Web Speech API narration (the flat robot "device voice") with Roz — ElevenLabs
 * "Rachel", the same narrator as Coach Roz on espodrama.com — while keeping every behaviour the
 * app already had: karaoke word highlighting, tap-a-word, pause/resume, Cozy/Storytime/Zippy
 * speeds, the star on finish.
 *
 * Word highlighting is driven by the REAL per-character timings that /api/roz returns alongside
 * the audio, so the highlight tracks Roz exactly instead of estimating.
 *
 * Additive companion file — it does not touch the app's 142KB inline script (same pattern proven
 * by roz-voice.js on espodrama.com). If /api/roz has no key or fails, this file steps aside
 * silently and the original device-voice path runs exactly as before. No fake Roz option ever
 * appears unless Roz actually works.
 *
 * Accelerated Experiences LLC · v1
 */
(function () {
  "use strict";

  var VER = "1";
  var MAX_CHARS = 900;          // per request; server ceiling is 1200, ElevenLabs' is ~2000

  // ---- guard: the app's engine must be present ---------------------------------------------
  if (typeof window.playFromCurrent !== "function" || typeof window.paraTokens === "undefined") return;

  var orig = {
    playFromCurrent: window.playFromCurrent,
    pauseSpeech: window.pauseSpeech,
    stopSpeech: window.stopSpeech,
    sayWord: window.sayWord,
    loadVoices: window.loadVoices
  };

  var R = {
    ready: false,     // /api/roz answered yes
    on: false,        // Roz is the selected voice
    gen: 0,           // cancels in-flight work when the story or position changes
    q: [],            // queue of pieces
    i: 0,
    piece: null,      // currently playing piece (with its word-to-time map)
    raf: 0,
    unlocked: false,
    atPi: -1, atWi: -1
  };

  var EL = new Audio();
  EL.preload = "auto";

  // ---- audio unlock: browsers only let a media element start inside a user gesture. Prime the
  // one shared element on the first tap so later paragraphs (which start after a fetch) play.
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

  // ---- fetch + cache -------------------------------------------------------------------------
  function urlFor(text) { return "/api/roz?v=" + VER + "&t=" + encodeURIComponent(text); }

  function ask(text) {
    var url = urlFor(text);
    if (!window.caches) return fetch(url).then(function (r) { return r.json(); });
    return caches.open("roz-v" + VER).then(function (c) {
      return c.match(url).then(function (hit) {
        if (hit) return hit.json();
        return fetch(url).then(function (r) {
          var clone = r.clone();
          return r.json().then(function (j) {
            if (j && j.ok) { try { c.put(url, clone); } catch (e) {} }
            return j;
          });
        });
      });
    }).catch(function () {
      return fetch(url).then(function (r) { return r.json(); });
    });
  }

  // ---- splitting: never split mid-word; prefer sentence ends ---------------------------------
  // The pieces tile the input EXACTLY — no character is ever dropped out of a child's story.
  function split(text) {
    var out = [], rest = text;
    while (rest.length > MAX_CHARS) {
      var win = rest.slice(0, MAX_CHARS);
      var cut = Math.max(win.lastIndexOf(". "), win.lastIndexOf("! "), win.lastIndexOf("? "));
      if (cut > MAX_CHARS * 0.4) cut = cut + 2;
      else {
        cut = win.lastIndexOf(" ");
        cut = cut > 0 ? cut + 1 : MAX_CHARS;
      }
      out.push(rest.slice(0, cut));
      rest = rest.slice(cut);
    }
    if (rest.length) out.push(rest);
    return out;
  }

  // ---- build the play queue from the app's current position -----------------------------------
  function buildQueue(startPi, startWi) {
    var q = [];
    if (!window.cur || !window.cur.paras) return q;
    for (var pi = startPi; pi < window.paraTokens.length; pi++) {
      var toks = window.paraTokens[pi];
      var base = 0;
      if (pi === startPi && toks && toks[startWi]) base = toks[startWi].start;
      var text = window.cur.paras[pi].slice(base);
      var off = base;
      split(text).forEach(function (seg) {
        if (seg.trim()) q.push({ pi: pi, off: off, text: seg });
        off += seg.length;
      });
    }
    return q;
  }

  // ---- word-to-time map for one piece ----------------------------------------------------------
  function buildMap(piece, data, duration) {
    var toks = window.paraTokens[piece.pi] || [];
    var len = piece.text.length;
    var exact = data && typeof data.chars === "string" && data.chars.length === len &&
                data.t && data.t.length === len;
    var mw = [], mt = [];
    for (var i = 0; i < toks.length; i++) {
      var local = toks[i].start - piece.off;
      if (local < 0 || local >= len) continue;
      var time;
      if (exact) time = data.t[local];
      else if (duration > 0) time = (local / len) * duration;   // honest fallback: proportional
      else continue;
      mw.push(i); mt.push(time);
    }
    piece.mw = mw; piece.mt = mt; piece.exact = !!exact;
  }

  // ---- highlight loop --------------------------------------------------------------------------
  function tick() {
    R.raf = 0;
    var p = R.piece;
    if (!p || !window.P || !window.P.playing || EL.paused) return;
    if (p.mt && p.mt.length) {
      var t = EL.currentTime, lo = 0, hi = p.mt.length - 1, best = -1;
      while (lo <= hi) {
        var mid = (lo + hi) >> 1;
        if (p.mt[mid] <= t) { best = mid; lo = mid + 1; } else hi = mid - 1;
      }
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

  function rate() { return parseFloat(window.S && window.S.rate) || 0.95; }

  // ---- playback --------------------------------------------------------------------------------
  function prefetch(n) {
    var p = R.q[n];
    if (p && !p.req) p.req = ask(p.text).catch(function () { return null; });
  }

  function playPiece(gen) {
    if (gen !== R.gen) return;
    var p = R.q[R.i];
    if (!p) { stopTick(); try { window.finishStory(); } catch (e) {} return; }

    if (!p.req) p.req = ask(p.text).catch(function () { return null; });
    p.req.then(function (data) {
      if (gen !== R.gen) return;

      if (!data || !data.ok || !data.audio) {
        // If Roz cannot speak at all, hand the whole story back to the device voice rather than
        // leaving a child staring at a silent page.
        if (data && (data.reason === "no_key" || data.reason === "upstream")) { standDown(); return; }
        R.i++; playPiece(gen);   // one bad piece skips forward; the rest of the story still reads
        return;
      }

      R.piece = p; p.last = -1;
      window.P.pi = p.pi;

      EL.onended = function () { if (gen !== R.gen) return; R.i++; playPiece(gen); };
      EL.onerror = function () { if (gen !== R.gen) return; R.i++; playPiece(gen); };
      EL.onloadedmetadata = function () { buildMap(p, data, EL.duration || 0); };

      EL.src = "data:audio/mpeg;base64," + data.audio;
      EL.playbackRate = rate();
      buildMap(p, data, 0);

      var pr = EL.play();
      if (pr && pr.catch) pr.catch(function () {
        // autoplay refused — do not strand the play button in the "playing" state
        window.P.playing = false;
        try { window.setPlayBtn(false); } catch (e) {}
        try { window.toast("Tap Read to me once more to start Roz."); } catch (e) {}
      });

      window.P.playing = true;
      try { window.setPlayBtn(true); } catch (e) {}
      startTick();
      prefetch(R.i + 1);
    });
  }

  // ---- Roz gives up: restore the original engine mid-story, without losing the reader ----------
  function standDown() {
    R.ready = false; R.on = false;
    stopTick(); try { EL.pause(); } catch (e) {}
    window.playFromCurrent = orig.playFromCurrent;
    window.pauseSpeech = orig.pauseSpeech;
    window.stopSpeech = orig.stopSpeech;
    window.sayWord = orig.sayWord;
    if (orig.loadVoices) window.loadVoices = orig.loadVoices;
    var sel = document.getElementById("selVoice");
    if (sel) { var o = sel.querySelector('option[value="roz"]'); if (o) o.remove(); sel.selectedIndex = 0; }
    try { if (window.P && window.P.playing) window.playFromCurrent(); } catch (e) {}
  }

  // ---- overrides --------------------------------------------------------------------------------
  window.playFromCurrent = function () {
    if (!R.on || !R.ready) return orig.playFromCurrent.apply(this, arguments);
    if (!window.cur) return;
    unlock();

    // resume in place if nothing moved while paused — no refetch, no restarted sentence
    if (R.q.length && R.piece && EL.paused && EL.currentTime > 0 && !EL.ended &&
        window.P.pi === R.atPi && window.P.wi === R.atWi) {
      window.P.playing = true;
      try { window.setPlayBtn(true); } catch (e) {}
      EL.playbackRate = rate();
      var pr0 = EL.play(); if (pr0 && pr0.catch) pr0.catch(function () {});
      startTick();
      return;
    }

    R.gen++; R.i = 0; R.piece = null;
    R.q = buildQueue(window.P.pi || 0, window.P.wi || 0);
    if (!R.q.length) { try { window.finishStory(); } catch (e) {} return; }
    window.P.playing = true;
    try { window.setPlayBtn(true); } catch (e) {}
    prefetch(0); prefetch(1);
    playPiece(R.gen);
  };

  window.pauseSpeech = function () {
    if (!R.on || !R.ready) return orig.pauseSpeech.apply(this, arguments);
    window.P.playing = false;
    stopTick();
    try { EL.pause(); } catch (e) {}
    R.atPi = window.P.pi; R.atWi = window.P.wi;
    try { window.setPlayBtn(false); } catch (e) {}
  };

  window.stopSpeech = function () {
    if (!R.on || !R.ready) return orig.stopSpeech.apply(this, arguments);
    R.gen++; R.q = []; R.i = 0; R.piece = null; R.atPi = -1; R.atWi = -1;
    window.P.playing = false;
    stopTick();
    try { EL.pause(); EL.removeAttribute("src"); EL.load(); } catch (e) {}
    try { window.clearHl(); window.setPlayBtn(false); } catch (e) {}
  };

  // tap a word: seek inside the loaded paragraph when we can (instant, free), otherwise let Roz
  // say the single word on its own.
  window.sayWord = function (word, el) {
    if (!R.on || !R.ready) return orig.sayWord.apply(this, arguments);
    unlock();
    var pi = +el.dataset.pi, wi = +el.dataset.wi;
    var wasPlaying = window.P.playing;
    var p = R.piece;

    if (p && p.pi === pi && p.mw) {
      var k = p.mw.indexOf(wi);
      if (k > -1) {
        window.P.pi = pi; window.P.wi = wi;
        try { window.clearHl(); } catch (e) {}
        el.classList.add("hl");
        try { EL.currentTime = p.mt[k]; } catch (e) {}
        p.last = k - 1;
        if (!wasPlaying) {
          var stopAt = (p.mt[k + 1] != null) ? p.mt[k + 1] + 0.06 : null;
          window.P.playing = true; startTick();
          var watch = function () {
            if (stopAt != null && EL.currentTime >= stopAt) {
              EL.pause(); EL.removeEventListener("timeupdate", watch);
              window.P.playing = false; stopTick();
              R.atPi = pi; R.atWi = wi;
              try { window.setPlayBtn(false); } catch (e) {}
            }
          };
          EL.addEventListener("timeupdate", watch);
          var pr1 = EL.play(); if (pr1 && pr1.catch) pr1.catch(function () {});
        }
        return;
      }
    }

    // word is outside the loaded audio — say it on its own
    window.pauseSpeech();
    try { window.clearHl(); } catch (e) {}
    el.classList.add("hl");
    window.P.pi = pi; window.P.wi = wi; R.atPi = pi; R.atWi = wi;
    var clean = String(word).replace(/[^A-Za-z0-9'-]/g, "");
    if (!clean) return;
    var gen = ++R.gen;
    ask(clean).then(function (d) {
      if (gen !== R.gen) return;
      if (!d || !d.ok || !d.audio) return;
      var one = new Audio("data:audio/mpeg;base64," + d.audio);
      one.playbackRate = 0.85;
      if (wasPlaying) one.onended = function () { if (gen === R.gen) window.playFromCurrent(); };
      var pr2 = one.play(); if (pr2 && pr2.catch) pr2.catch(function () {});
    }).catch(function () {});
  };

  // ---- the voice picker: only ever offer Roz once she has answered -----------------------------
  function addRozOption() {
    var sel = document.getElementById("selVoice");
    if (!sel || !R.ready) return;
    if (!sel.querySelector('option[value="roz"]')) {
      var o = document.createElement("option");
      o.value = "roz";
      o.textContent = "Roz — real voice";
      sel.insertBefore(o, sel.firstChild);
    }
    var saved = window.S && window.S.voice;
    if (!saved || saved === "roz") { sel.value = "roz"; R.on = true; }
    else { R.on = false; }
  }

  window.loadVoices = function () {
    if (orig.loadVoices) { try { orig.loadVoices.apply(this, arguments); } catch (e) {} }
    addRozOption();
  };

  function wirePicker() {
    var sel = document.getElementById("selVoice");
    if (!sel) return;
    sel.onchange = function () {
      var wasPlaying = window.P && window.P.playing;
      if (sel.value === "roz") {
        if (window.speechSynthesis) speechSynthesis.cancel();
        R.on = true; window.S.voice = "roz"; window.save();
      } else {
        window.pauseSpeech();
        R.on = false;
        if (window.voices && window.voices[sel.value]) { window.S.voice = window.voices[sel.value].name; window.save(); }
      }
      if (wasPlaying) { window.pauseSpeech(); window.playFromCurrent(); }
    };
  }

  // ---- boot: ask once whether Roz can speak. Costs zero ElevenLabs characters. -----------------
  fetch("/api/roz?ping=1").then(function (r) { return r.json(); }).then(function (j) {
    if (!j || !j.ok) return;                  // no key -> app untouched, device voice as before
    R.ready = true;
    addRozOption();
    wirePicker();
    if (R.on && window.P && window.P.playing) {
      if (window.speechSynthesis) speechSynthesis.cancel();
      window.playFromCurrent();
    }
  }).catch(function () {});

  window.__rozNarration = {
    v: VER, maxChars: MAX_CHARS,
    state: function () {
      return { ready: R.ready, on: R.on, pieces: R.q.length, i: R.i,
               exact: R.piece ? R.piece.exact : null, paused: EL.paused, t: EL.currentTime };
    },
    split: split
  };
})();
