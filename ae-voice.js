/* AE Voice — the house voice, for any app on aexperiences.com.
   Accelerated Experiences, LLC.

   One line in the page:
       <script src="/ae-voice.js"></script>

   Then anywhere:
       AEVoice.speak('Nice work!');                     // Brian
       AEVoice.speak('Your turn', { voice: 'roz' });    // anybody on the shelf
       AEVoice.speak('Ready?').then(startRound);        // resolves when the line finishes
       AEVoice.stop();                                  // cut the current line
       AEVoice.warm(['Nice work!', 'Try again']);       // pay for a line once, before you need it

   THE TWO RULES THIS FILE EXISTS TO ENFORCE (SSOT A5.3):
   1. The cast speaks in the cast's voices or it does not speak. There is NO fallback to the
      browser's built-in robot voice. If the engine is down, speak() resolves silently.
   2. Nothing is played except from a real tap or click, so a blocked autoplay can never
      fall through to the device voice on somebody's machine.

   COST: every line goes out as a GET that the edge caches forever, so a phrase your app
   says a hundred times is generated once and is free and instant after that. Keep the
   wording identical for repeated lines and the meter stays where it is. */

(function (w) {
  'use strict';

  var SHELF = ['anthony','barry','bigsean','brian','gianna','jessica','maddox','oliverose','roz','vince'];
  var DEFAULT = 'brian';
  var el = null;       // one audio element, reused
  var token = 0;       // rising id, so an old line can never resolve over a new one
  var warmed = {};

  function src(text, voice) {
    return '/api/voice?voice=' + encodeURIComponent(voice) +
           '&say=' + encodeURIComponent(text);
  }

  function pick(v) {
    v = String(v || DEFAULT).toLowerCase();
    return SHELF.indexOf(v) === -1 ? DEFAULT : v;
  }

  function audio() {
    if (!el) {
      el = new Audio();
      el.preload = 'auto';
      el.setAttribute('playsinline', '');
    }
    return el;
  }

  function stop() {
    token++;
    if (!el) return;
    try { el.pause(); el.removeAttribute('src'); el.load(); } catch (e) {}
  }

  /* Resolves true if the line was heard, false if it was not. Never rejects, never throws,
     and never makes a sound that is not one of ours. */
  function speak(text, opts) {
    opts = opts || {};
    text = String(text == null ? '' : text).trim();
    var done = typeof opts.onend === 'function' ? opts.onend : null;

    function finish(ok) { if (done) { try { done(ok); } catch (e) {} } return ok; }

    if (!text) return Promise.resolve(finish(false));

    stop();
    var mine = token;
    var a = audio();
    a.src = src(text, pick(opts.voice));

    return new Promise(function (resolve) {
      var settled = false;
      function end(ok) {
        if (settled || mine !== token) return;
        settled = true;
        a.onended = a.onerror = null;
        resolve(finish(ok));
      }
      a.onended = function () { end(true); };
      a.onerror = function () { end(false); };   // engine down, busy, offline — stay silent
      var p;
      try { p = a.play(); } catch (e) { return end(false); }
      if (p && typeof p.catch === 'function') p.catch(function () { end(false); });
    });
  }

  /* Generate a line ahead of time so the first time a player hears it there is no wait.
     Safe to call on page load; it makes no sound. */
  function warm(list, opts) {
    opts = opts || {};
    var voice = pick(opts.voice);
    var lines = [].concat(list || []);
    return Promise.all(lines.map(function (t) {
      t = String(t || '').trim();
      var k = voice + '|' + t;
      if (!t || warmed[k]) return Promise.resolve(false);
      warmed[k] = true;
      return fetch(src(t, voice)).then(function (r) { return r.ok; }, function () { return false; });
    }));
  }

  w.AEVoice = { speak: speak, stop: stop, warm: warm, voices: SHELF.slice(), engine: 'ae-voice-cloud' };
})(window);
