/* ae-gate.js — the door on an Accelerated Experiences CONSUMER app.
   Accelerated Experiences LLC · Sep 17 2026

   ONE LINE puts a storefront in front of an app and opens it for the entitled:

     <script src="/ae-gate.js"            <-- in <head>, and NOT defer/async:
             data-app="thread" data-name="ND Thread"
             data-tag="Hold the thought you're about to lose"
             data-price="$1.99/mo · $19.99/yr" data-trial="3"
             data-accent="#9A7A2C" data-icon="/apps/thread/icon.png"
             data-bundle="neuro-divulge" data-bundle-name="The Neuro-Divulge"
             data-bundle-price="$4.99/mo — all four"
             data-shot="/shots/thread.png"></script>

   ⛔ NEVER put this on an OS hub. Walking into a hub is the sale.

   ⛔ IN <head>, WITHOUT defer OR async. The script hides the page the instant it
      runs and un-hides it once the gate answers. Deferred, the app paints first and
      a non-payer sees the paid screen flash by before the door closes.

   HONEST LIMIT, say it out loud: these apps are client-side, so this is a front
   door, not a vault. It stops everyone who is not deliberately opening devtools.
   Content that must be genuinely unreachable has to live server-side the way
   /api/hystory keeps its stories. For a $1.99 tool a front door is the right trade;
   for anything where the content IS the product, do it the hystory way.       */
(function () {
  'use strict';
  var S = document.currentScript || (function () {
    var a = document.getElementsByTagName('script'); return a[a.length - 1];
  })();
  var D = function (k, d) { return (S && S.getAttribute('data-' + k)) || d || ''; };

  var APP    = D('app');
  if (!APP) return;
  var NAME   = D('name', APP);
  var TAG    = D('tag');
  var PRICE  = D('price');
  var TRIAL  = parseInt(D('trial', '3'), 10) || 0;
  var ACCENT = D('accent', '#a85f38');
  var ICON   = D('icon');
  var SHOT   = D('shot');
  var BUND   = D('bundle');
  var BNAME  = D('bundle-name');
  var BPRICE = D('bundle-price');
  var KEY    = 'ae.gate.' + APP;

  function saved()      { try { return localStorage.getItem(KEY) || ''; } catch (e) { return ''; } }
  function save(c)      { try { c ? localStorage.setItem(KEY, c) : localStorage.removeItem(KEY); } catch (e) {} }
  function ask(qs)      { return fetch('/api/gate?' + qs, { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'OFFLINE' }; }); }

  /* The app stays hidden until the gate has answered, so a paid app never flashes
     its contents to someone who has not paid. Removed again on any outcome. */
  var veil = document.createElement('style');
  veil.textContent = 'html.ae-gate-wait body>*:not(.ae-gate){visibility:hidden!important}';
  document.documentElement.appendChild(veil);
  document.documentElement.classList.add('ae-gate-wait');
  function reveal() { document.documentElement.classList.remove('ae-gate-wait'); }

  function open(code, via) { save(code); reveal(); try { document.dispatchEvent(new CustomEvent('ae-gate:open', { detail: { app: APP, via: via } })); } catch (e) {} }

  function buy(product) {
    var u = '/api/checkout?product=' + encodeURIComponent(product) +
            '&plan=Monthly&home=' + encodeURIComponent(location.origin + location.pathname + '?ae_session={CHECKOUT_SESSION_ID}');
    fetch(u, { cache: 'no-store' }).then(function (r) { return r.json(); }).then(function (j) {
      if (j && j.url) { location.href = j.url; return; }
      note(j && j.error === 'NOT_CONNECTED'
        ? 'Payments are not switched on yet. Nothing was charged.'
        : 'Could not start checkout just now. Nothing was charged.');
    }).catch(function () { note('Could not reach checkout. Nothing was charged.'); });
  }

  var noteEl;
  function note(t) { if (noteEl) { noteEl.textContent = t; noteEl.hidden = false; } }

  function storefront() {
    if (!document.body) {                 // running in <head>: wait for a body to attach to
      document.addEventListener('DOMContentLoaded', storefront, { once: true });
      return;
    }
    /* The veil deliberately STAYS UP behind the storefront. Only an entitled visitor
       ever gets the page revealed, so deleting the overlay by hand leaves a blank
       page rather than the app. */
    var w = document.createElement('div');
    w.className = 'ae-gate';
    w.innerHTML =
      '<style>' +
      '.ae-gate{position:fixed;inset:0;z-index:2147483000;overflow:auto;background:#f8f2e6;' +
        'font-family:"Karla",system-ui,-apple-system,"Helvetica Neue",Arial,sans-serif;color:#2b1a12;' +
        '-webkit-font-smoothing:antialiased;padding:24px 16px 40px;display:flex;align-items:flex-start;justify-content:center}' +
      '.ae-gate *{box-sizing:border-box}' +
      '.ae-g-card{background:#fffdf7;border:1px solid #e3d5bd;border-radius:6px;max-width:520px;width:100%;' +
        'box-shadow:0 1px 0 rgba(43,26,18,.05),0 18px 40px -26px rgba(43,26,18,.5);overflow:hidden;margin:auto}' +
      '.ae-g-top{height:6px;background:' + ACCENT + '}' +
      '.ae-g-in{padding:26px 24px 24px}' +
      '.ae-g-hd{display:flex;align-items:center;gap:14px}' +
      '.ae-g-hd img{width:54px;height:54px;border-radius:13px;flex:none}' +
      '.ae-g-nm{font-size:22px;font-weight:800;letter-spacing:-.01em;line-height:1.15}' +
      '.ae-g-tag{font-size:14px;color:#6d5647;margin-top:3px;line-height:1.45}' +
      '.ae-g-shot{margin:20px 0 0;border:1px solid #e3d5bd;border-radius:5px;display:block;width:100%}' +
      '.ae-g-price{margin:20px 0 0;font-size:15px;font-weight:700}' +
      '.ae-g-price b{font-size:20px}' +
      '.ae-g-sub{font-size:13px;color:#6d5647;margin-top:3px}' +
      '.ae-g-btn{display:block;width:100%;margin-top:14px;padding:14px 16px;border-radius:4px;' +
        'font:inherit;font-size:15px;font-weight:700;cursor:pointer;text-align:center;border:1.5px solid ' + ACCENT + ';' +
        'background:' + ACCENT + ';color:#fffdf7}' +
      '.ae-g-btn.alt{background:#fffdf7;color:' + ACCENT + '}' +
      '.ae-g-or{margin-top:18px;padding-top:16px;border-top:1px solid #ece0cb}' +
      '.ae-g-row{display:flex;gap:8px;margin-top:9px}' +
      '.ae-g-row input{flex:1;min-width:0;font:inherit;font-size:15px;padding:11px 12px;border:1px solid #e3d5bd;' +
        'border-radius:4px;background:#f8f2e6;color:#2b1a12}' +
      '.ae-g-row button{flex:none;padding:11px 15px;border-radius:4px;border:1.5px solid #a85f38;background:#fffdf7;' +
        'color:#8c4a28;font:inherit;font-weight:700;cursor:pointer}' +
      '.ae-g-lbl{font-size:11px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#6d5647}' +
      '.ae-g-note{margin-top:12px;font-size:13.5px;color:#8c4a28;font-weight:600}' +
      '.ae-g-foot{margin-top:18px;font-size:12px;color:#6d5647;line-height:1.5}' +
      '.ae-g-foot a{color:#8c4a28}' +
      '@media(prefers-reduced-motion:reduce){.ae-gate *{transition:none!important}}' +
      '</style>' +
      '<div class="ae-g-card"><div class="ae-g-top"></div><div class="ae-g-in">' +
        '<div class="ae-g-hd">' + (ICON ? '<img src="' + ICON + '" alt="">' : '') +
          '<div><div class="ae-g-nm"></div><div class="ae-g-tag"></div></div></div>' +
        (SHOT ? '<img class="ae-g-shot" src="' + SHOT + '" alt="" loading="lazy">' : '') +
        '<div class="ae-g-price"></div><div class="ae-g-sub"></div>' +
        '<button class="ae-g-btn" id="ae-g-buy"></button>' +
        (BUND ? '<button class="ae-g-btn alt" id="ae-g-bundle"></button>' : '') +
        '<div class="ae-g-or"><div class="ae-g-lbl">Already bought it?</div>' +
          '<div class="ae-g-row"><input id="ae-g-code" placeholder="Paste your code" autocomplete="off" spellcheck="false">' +
          '<button id="ae-g-go">Unlock</button></div>' +
          '<p class="ae-g-note" id="ae-g-note" hidden></p></div>' +
        '<div class="ae-g-foot">Your trial starts today and nothing is charged until it ends. ' +
          'Cancel any time from the receipt in your email.<br>' +
          '<a href="https://www.aexperiences.com/shop.html">Accelerated Experiences LLC</a></div>' +
      '</div></div>';
    document.body.appendChild(w);

    w.querySelector('.ae-g-nm').textContent = NAME;
    w.querySelector('.ae-g-tag').textContent = TAG;
    w.querySelector('.ae-g-price').innerHTML = '<b>' + PRICE.split('·')[0].trim() + '</b>' +
      (PRICE.indexOf('·') > -1 ? ' <span style="font-weight:600;color:#6d5647">· ' + PRICE.split('·').slice(1).join('·').trim() + '</span>' : '');
    w.querySelector('.ae-g-sub').textContent = TRIAL ? TRIAL + '-day free trial. Card taken now, charged when the trial ends.' : '';
    var b = w.querySelector('#ae-g-buy');
    b.textContent = TRIAL ? 'Start the ' + TRIAL + '-day free trial' : 'Get ' + NAME;
    b.addEventListener('click', function () { buy(APP); });
    if (BUND) {
      var bb = w.querySelector('#ae-g-bundle');
      bb.textContent = BNAME ? 'Or get ' + BNAME + (BPRICE ? ' — ' + BPRICE : '') : 'Get the bundle';
      bb.addEventListener('click', function () { buy(BUND); });
    }
    noteEl = w.querySelector('#ae-g-note');
    var inp = w.querySelector('#ae-g-code');
    function tryCode() {
      var c = (inp.value || '').trim();
      if (!c) { inp.focus(); return; }
      note('Checking…');
      ask('app=' + encodeURIComponent(APP) + '&code=' + encodeURIComponent(c)).then(function (j) {
        if (j && j.ok) { w.remove(); open(j.code || c, j.via); return; }
        note(j && j.error === 'NOT_ACTIVE' ? 'That subscription is not active any more.'
           : j && j.error === 'NOT_CONNECTED' ? 'Payments are not switched on yet.'
           : 'That code does not open this app.');
      });
    }
    w.querySelector('#ae-g-go').addEventListener('click', tryCode);
    inp.addEventListener('keydown', function (e) { if (e.key === 'Enter') tryCode(); });
  }

  function start() {
    var u = new URL(location.href);
    var sess = u.searchParams.get('ae_session');
    if (sess && /^cs_/.test(sess)) {
      ask('app=' + encodeURIComponent(APP) + '&session=' + encodeURIComponent(sess)).then(function (j) {
        u.searchParams.delete('ae_session');
        try { history.replaceState(null, '', u.toString()); } catch (e) {}
        if (j && j.ok) return open(j.code, j.via);
        storefront();
      });
      return;
    }
    var c = saved();
    if (!c) return storefront();
    ask('app=' + encodeURIComponent(APP) + '&code=' + encodeURIComponent(c)).then(function (j) {
      if (j && j.ok) return open(j.code || c, j.via);
      /* Offline should never lock a paying customer out of something they bought. */
      if (j && j.error === 'OFFLINE') return open(c, 'offline');
      save('');
      storefront();
    });
  }

  start();   // the check begins at once; storefront() waits for <body> if it must.
})();
