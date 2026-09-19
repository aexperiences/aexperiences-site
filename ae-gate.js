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

  /* RECEIVER MODE (Sep 18 2026). A buyer comes back from Stripe to the product's home page
     (espogenius.com/, /narcs/open, /apps/nd/), which is a menu or a pitch and carries no door.
     <script src=".../ae-gate.js" data-receive="espo-genius" data-api="..."> on that page trades
     the receipt (?unlocked=cs_...) for the subscription, files it in the slot every app on this
     site reads, and sends the buyer back to the app they bought from. No receipt, no effect. */
  var RECEIVE = D('receive');
  if (!APP && RECEIVE) {
    try {
      var ru = new URL(location.href), cs = ru.searchParams.get('unlocked') || ru.searchParams.get('ae_session');
      if (!cs || !/^cs_/.test(cs)) return;
      ru.searchParams.delete('unlocked'); ru.searchParams.delete('ae_session');
      history.replaceState(null, '', ru.pathname + ru.search + ru.hash);
      fetch(D('api', '/api/gate') + '?app=' + encodeURIComponent(RECEIVE) + '&session=' + encodeURIComponent(cs), { cache: 'no-store' })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          if (!j || !j.ok || !j.code) return;
          try { localStorage.setItem('ae.gate.shared', j.code); localStorage.setItem('ae.gate.' + RECEIVE, j.code); } catch (e) {}
          var back = null; try { back = JSON.parse(localStorage.getItem('ae.gate.back') || 'null'); localStorage.removeItem('ae.gate.back'); } catch (e) {}
          if (back && back.to && Date.now() - back.t < 3600e3 && back.to.indexOf(location.origin + '/') === 0) location.replace(back.to);
        }).catch(function () {});
    } catch (e) {}
    return;
  }
  if (!APP) return;

  /* data-from="2026-10-01": the door exists but opens freely until that day. For a product
     whose page publicly promises free use until a date (Xpense OS: free through Sep 30 2026),
     the gate ships now and switches itself on when the promise ends - nobody has to remember. */
  var FROM = Date.parse(D('from'));
  if (FROM && Date.now() < FROM) return;
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
  /* A comp code is a comp code everywhere, so it is typed ONCE. All the apps sit on
     the same origin, so one shared slot lets ND Thread's unlock open ND Focus too.
     This is only a convenience: the code is still sent to /api/gate on every load
     and the SERVER decides. A stale or revoked code in here opens nothing. */
  var SHARED = 'ae.gate.shared';

  function saved()      { try { return localStorage.getItem(KEY) || localStorage.getItem(SHARED) || ''; } catch (e) { return ''; } }
  function save(c, wide) {
    try {
      if (!c) { localStorage.removeItem(KEY); return; }
      localStorage.setItem(KEY, c);
      if (wide) localStorage.setItem(SHARED, c);
    } catch (e) {}
  }
  /* An app on its own domain (espogenius.com, marketnarc.com) has no /api/gate of
     its own, so it points at the store's. api/gate.mjs answers with
     access-control-allow-origin: *, which is safe because the endpoint only ever
     ANSWERS a yes/no about a code or a subscription id - it hands out nothing. */
  var API = D('api', '/api/gate');
  function ask(qs)      { return fetch(API + '?' + qs, { cache: 'no-store' }).then(function (r) { return r.json(); }).catch(function () { return { ok: false, error: 'OFFLINE' }; }); }

  /* The app stays hidden until the gate has answered, so a paid app never flashes
     its contents to someone who has not paid. Removed again on any outcome. */
  var veil = document.createElement('style');
  veil.textContent = 'html.ae-gate-wait body>*:not(.ae-gate){visibility:hidden!important}';
  document.documentElement.appendChild(veil);
  document.documentElement.classList.add('ae-gate-wait');
  function reveal() { document.documentElement.classList.remove('ae-gate-wait'); }

  function open(code, via) { save(code, via === 'comp'); reveal(); try { document.dispatchEvent(new CustomEvent('ae-gate:open', { detail: { app: APP, via: via } })); } catch (e) {} }

  /* Sep 18 2026 — THIS BUTTON NEVER WORKED. It fetched the GET form of /api/checkout, which
     answers with a 302 straight to Stripe; fetch followed it, got Stripe's HTML page back,
     failed to read it as JSON and said "Could not reach checkout" to every buyer on all
     twelve apps. Anthony's list: "Buttons for her store don't work." Now:
       - same site: POST, which answers { url }, then go there
       - an app on its own domain (data-api): a plain page load of the GET form, which is
         what a 302 is for - no fetch, so nothing to read and nothing cross-origin to block
     Before leaving, it remembers which app sent the buyer, so a bundle bought from inside
     ND Thread comes back to ND Thread, not to the bundle's menu. */
  var BASE = /^https?:\/\//i.test(API) ? API.replace(/\/api\/gate.*$/i, '') : '';
  function buy(product) {
    try { localStorage.setItem('ae.gate.back', JSON.stringify({ to: location.origin + location.pathname, t: Date.now() })); } catch (e) {}
    if (BASE) {
      location.href = BASE + '/api/checkout?product=' + encodeURIComponent(product) + '&plan=Monthly';
      return;
    }
    note('Opening checkout…');
    fetch('/api/checkout', { method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ product: product, plan: 'Monthly' }) })
      .then(function (r) { return r.json(); })
      .then(function (j) {
        if (j && j.url) { location.href = j.url; return; }
        note(j && j.ready === false
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
      /* 11px uppercase grey is how you hide something in plain sight. This row is
         the only way a comp code gets used, so it reads at any text size. */
      '.ae-g-lbl{font-size:14px;font-weight:800;letter-spacing:.01em;color:#4a3a2e}' +
      '.ae-g-or{margin-top:20px;padding-top:18px;border-top:2px solid #e6dbcb}' +
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
        '<div class="ae-g-or"><div class="ae-g-lbl">Have a code? Enter it here</div>' +
          '<div class="ae-g-row"><input id="ae-g-code" placeholder="Paste your code" autocomplete="off" spellcheck="false">' +
          '<button id="ae-g-go">Unlock</button></div>' +
          '<p class="ae-g-note" id="ae-g-note" hidden></p></div>' +
        '<div class="ae-g-foot">' + (TRIAL ? 'Your trial starts today and nothing is charged until it ends. ' : '') +
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

    /* A code in the URL. This is the whole point of a comp code: Anthony hands it
       out. 'Open this and find the small box under the price' is not handing
       something out - a link is. ?code=weirdo (or #code=weirdo, which survives
       being pasted into apps that strip query strings) opens the app and takes
       itself back out of the address bar so nobody screenshots their way in by
       accident. It is still the SERVER that decides. */
    var urlCode = u.searchParams.get('code') || u.searchParams.get('unlock') || '';
    if (!urlCode && /(?:^|[#&])(?:code|unlock)=([^&]+)/.test(location.hash || '')) {
      urlCode = decodeURIComponent(RegExp.$1);
    }
    if (urlCode) {
      ask('app=' + encodeURIComponent(APP) + '&code=' + encodeURIComponent(urlCode)).then(function (j) {
        u.searchParams.delete('code'); u.searchParams.delete('unlock');
        var h = (location.hash || '').replace(/(?:^#|&)(?:code|unlock)=[^&]*/g, '').replace(/^&/, '#');
        try { history.replaceState(null, '', u.pathname + u.search + (h === '#' ? '' : h)); } catch (e) {}
        if (j && j.ok) return open(j.code || urlCode, j.via);
        storefront('That link did not open this app.');
      });
      return;
    }

    /* /api/checkout sends a buyer back with ?unlocked=cs_... — this used to listen only for
       ?ae_session=, so a customer who had just paid landed on the storefront again (Sep 18 2026). */
    var sess = u.searchParams.get('ae_session') || u.searchParams.get('unlocked');
    if (sess && /^cs_/.test(sess)) {
      ask('app=' + encodeURIComponent(APP) + '&session=' + encodeURIComponent(sess)).then(function (j) {
        u.searchParams.delete('ae_session'); u.searchParams.delete('unlocked');
        try { history.replaceState(null, '', u.toString()); } catch (e) {}
        if (j && j.ok) { save(j.code, true); return open(j.code, j.via); }
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
