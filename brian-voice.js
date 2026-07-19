/*
 * brian-voice.js — adds talk-out-loud + mic input to the AE Brian concierge widget,
 * site-wide (index.html, products.html, every hubs/*.html page).
 *
 * Self-contained on purpose: injects its own CSS and buttons via DOM manipulation and
 * hooks the EXISTING #brianInput / #brianSend / #brianBody markup that already ships on
 * every page, instead of requiring each page's inline widget code to be rewritten.
 * That means this is the ONLY file that needs to change to add/adjust voice sitewide.
 *
 * Ported from Barry Burris NMD hub's bb-assistant.js (same ElevenLabs "Brian" voice,
 * same iOS-safe unlock pattern) so AE Brian sounds and behaves like the rest of the
 * AE family's assistants. Talks to /api/voice (ElevenLabs TTS) and reuses Web Speech
 * API for mic input — both degrade silently if unavailable, text chat still works.
 *
 * Built by Accelerated Experiences, LLC.
 */
(function () {
  if (window.__aeBrianVoiceLoaded) return;
  window.__aeBrianVoiceLoaded = true;

  // Hub pages (hubs/*.html) suffix every widget id with "2" (brianBody2, brianInput2, etc.)
  // to avoid collisions; index.html/products.html use the plain ids. Classes are the same
  // either way, so fall back to class/structural lookups when the plain id isn't found.
  var head = document.querySelector('.brian-head');
  var inputRow = document.querySelector('.brian-inputrow');
  var body = document.getElementById('brianBody') || document.getElementById('brianBody2') || document.querySelector('.brian-body');
  var input = document.getElementById('brianInput') || document.getElementById('brianInput2') || (inputRow && inputRow.querySelector('input[type="text"]'));
  var sendBtn = document.getElementById('brianSend') || document.getElementById('brianSend2') || (inputRow && inputRow.querySelector('button'));
  var closeBtn = document.getElementById('brianClose') || document.getElementById('brianClose2') || (head && head.querySelector('.x'));
  if (!head || !body || !input || !sendBtn || !inputRow) return; // widget not on this page

  var VOICE_KEY = 'ae_brian_voice';
  function voiceOn() { return localStorage.getItem(VOICE_KEY) !== '0'; }
  function setVoiceOn(v) { localStorage.setItem(VOICE_KEY, v ? '1' : '0'); }

  // ---------- CSS ----------
  var css = ''
    + '.brian-voice-toggle,.brian-mic{display:inline-flex;align-items:center;justify-content:center;'
    + 'width:30px;height:30px;border-radius:50%;border:1px solid var(--line);background:var(--card);'
    + 'color:var(--navy);cursor:pointer;font-size:14px;line-height:1;flex:none;padding:0;transition:background .15s,border-color .15s;}'
    + '.brian-voice-toggle:hover,.brian-mic:hover{border-color:var(--blue-deep);}'
    + '.brian-voice-toggle.off{opacity:.45;}'
    + '.brian-mic.listening{background:var(--blue-deep);color:#fff;border-color:var(--blue-deep);animation:aeBrianPulse 1s ease-in-out infinite;}'
    + '@keyframes aeBrianPulse{0%,100%{box-shadow:0 0 0 0 rgba(168,95,56,.45);}50%{box-shadow:0 0 0 6px rgba(168,95,56,0);}}'
    + '.brian-head{position:relative;}'
    + '.brian-head .brian-voice-toggle{margin-left:auto;margin-right:4px;}'
    + '.brian-speaking{display:inline-flex;gap:2px;align-items:flex-end;height:11px;margin-left:6px;vertical-align:middle;}'
    + '.brian-speaking i{display:block;width:2px;background:var(--blue-deep);border-radius:1px;animation:aeBrianBar .8s ease-in-out infinite;}'
    + '.brian-speaking i:nth-child(1){height:5px;animation-delay:0s;}'
    + '.brian-speaking i:nth-child(2){height:11px;animation-delay:.15s;}'
    + '.brian-speaking i:nth-child(3){height:7px;animation-delay:.3s;}'
    + '@keyframes aeBrianBar{0%,100%{transform:scaleY(.4);}50%{transform:scaleY(1);}}';
  var styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // ---------- buttons ----------
  var voiceBtn = document.createElement('button');
  voiceBtn.type = 'button';
  voiceBtn.className = 'brian-voice-toggle';
  voiceBtn.setAttribute('aria-label', 'Toggle Brian\'s voice');
  voiceBtn.title = "Brian's voice";
  voiceBtn.textContent = voiceOn() ? '🔊' : '🔇'; // 🔊 / 🔇
  if (closeBtn && closeBtn.parentNode === head) {
    head.insertBefore(voiceBtn, closeBtn);
  } else {
    head.appendChild(voiceBtn);
  }
  function refreshVoiceBtn() {
    voiceBtn.textContent = voiceOn() ? '🔊' : '🔇';
    voiceBtn.classList.toggle('off', !voiceOn());
  }
  refreshVoiceBtn();
  voiceBtn.addEventListener('click', function () {
    primeAudio();
    setVoiceOn(!voiceOn());
    refreshVoiceBtn();
    if (!voiceOn() && currentAudio) { try { currentAudio.pause(); } catch (e) {} }
  });

  var micBtn = document.createElement('button');
  micBtn.type = 'button';
  micBtn.className = 'brian-mic';
  micBtn.setAttribute('aria-label', 'Talk to Brian');
  micBtn.title = 'Talk to Brian';
  micBtn.textContent = '🎤'; // 🎤
  inputRow.insertBefore(micBtn, input);

  // ---------- audio unlock (iOS Safari requires priming inside a real user gesture) ----------
  var audioCtx = null;
  var primed = false;
  function primeAudio() {
    if (primed) return;
    primed = true;
    try {
      var Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) {
        audioCtx = new Ctx();
        var buf = audioCtx.createBuffer(1, 1, 22050);
        var src = audioCtx.createBufferSource();
        src.buffer = buf;
        src.connect(audioCtx.destination);
        src.start(0);
        if (audioCtx.state === 'suspended') audioCtx.resume();
      }
    } catch (e) {}
    try {
      var silent = new Audio('data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
      silent.play().catch(function () {});
    } catch (e) {}
  }
  [micBtn, sendBtn, voiceBtn].forEach(function (el) {
    el.addEventListener('click', primeAudio, { once: false });
  });
  var fab = document.getElementById('brianFab') || document.getElementById('brianFab2') || document.querySelector('.brian-fab');
  if (fab) fab.addEventListener('click', primeAudio);

  // ---------- speak() ----------
  var currentAudio = null;
  function speak(text) {
    if (!text || !voiceOn()) return;
    var clean = String(text).replace(/\s+/g, ' ').trim().slice(0, 1500);
    if (!clean) return;
    fetch('/api/voice', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: clean })
    }).then(function (r) {
      if (!r.ok) return null;
      var ct = r.headers.get('content-type') || '';
      if (ct.indexOf('audio') === -1) return null; // graceful no_key / error response, stay silent
      return r.arrayBuffer();
    }).then(function (buf) {
      if (!buf) return;
      if (currentAudio) { try { currentAudio.pause(); } catch (e) {} }
      if (audioCtx) {
        audioCtx.decodeAudioData(buf.slice(0), function (decoded) {
          var src = audioCtx.createBufferSource();
          src.buffer = decoded;
          src.connect(audioCtx.destination);
          src.start(0);
          currentAudio = { pause: function () { try { src.stop(); } catch (e) {} } };
        }, function () { playViaTag(buf); });
      } else {
        playViaTag(buf);
      }
    }).catch(function () {});
  }
  function playViaTag(buf) {
    try {
      var blob = new Blob([buf], { type: 'audio/mpeg' });
      var url = URL.createObjectURL(blob);
      var audio = new Audio(url);
      currentAudio = audio;
      audio.play().catch(function () {});
      audio.addEventListener('ended', function () { URL.revokeObjectURL(url); });
    } catch (e) {}
  }

  // ---------- auto-speak new bot replies ----------
  var seen = new WeakSet();
  var mo = new MutationObserver(function (mutations) {
    if (!voiceOn()) return;
    mutations.forEach(function (m) {
      m.addedNodes && m.addedNodes.forEach(function (node) {
        if (node.nodeType !== 1) return;
        if (node.classList && node.classList.contains('brian-msg') && node.classList.contains('bot')) {
          if (seen.has(node)) return;
          seen.add(node);
          var txt = node.textContent || '';
          // small delay so it doesn't race the DOM insert / scroll
          setTimeout(function () { speak(txt); }, 120);
        }
      });
    });
  });
  mo.observe(body, { childList: true });

  // ---------- mic input (Web Speech API) ----------
  var Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { micBtn.style.display = 'none'; return; }
  var recognizer = null;
  var listening = false;
  function startListen() {
    primeAudio();
    if (listening) { stopListen(); return; }
    try {
      recognizer = new Recognition();
      recognizer.lang = 'en-US';
      recognizer.interimResults = true;
      recognizer.maxAlternatives = 1;
      var finalTranscript = '';
      recognizer.onresult = function (e) {
        var t = '';
        for (var i = e.resultIndex; i < e.results.length; i++) {
          t += e.results[i][0].transcript;
          if (e.results[i].isFinal) finalTranscript = t;
        }
        input.value = finalTranscript || t;
      };
      recognizer.onerror = function () { stopListen(); };
      recognizer.onend = function () {
        listening = false;
        micBtn.classList.remove('listening');
        var val = input.value.trim();
        if (val) sendBtn.click();
      };
      recognizer.start();
      listening = true;
      micBtn.classList.add('listening');
    } catch (e) { listening = false; micBtn.classList.remove('listening'); }
  }
  function stopListen() {
    listening = false;
    micBtn.classList.remove('listening');
    if (recognizer) { try { recognizer.stop(); } catch (e) {} }
  }
  micBtn.addEventListener('click', startListen);
})();
