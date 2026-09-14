/* nd-nav.js — the Neuro Divulge line strip.
   One file, no dependencies, no build step. Drop one <script defer src="/nd-nav.js">
   into any ND app and it gains: a way OUT, a way to the other three, and a way to the store.

   Why a top strip and not a bottom bar: every ND app already owns its own bottom nav
   (Thread: Now/List/Quests/Find · Tendency: Check-in/Trends/Wins/Settings ·
   Regulator: Today/SOS/Ladder/Settings · Focus: a tabbar that appears after onboarding).
   A second bottom bar would stack two bars on a phone. The line switcher belongs up top —
   the same place ESPO Music puts "Explore".

   Accelerated Experiences LLC · Sep 2026
*/
(function () {
  'use strict';
  if (window.__ND_NAV__) return;           // never inject twice
  window.__ND_NAV__ = true;

  /* ── the line. One list, one place to add the fifth app. ───────────────── */
  var HOME = '/apps/nd/';
  var SHOP = 'https://www.aexperiences.com/shop.html#a=personal';
  var APPS = [
    { id: 'thread',        name: 'ND Thread',    tag: 'Your master list',    url: '/apps/thread/',        acc: '#9A7A2C' },
    { id: 'espotendency',  name: 'ND Tendency',  tag: 'Mood & habits',       url: '/apps/espotendency/',  acc: '#C23359' },
    { id: 'esporegulator', name: 'ND Regulator', tag: 'Emotional skills',    url: '/apps/esporegulator/', acc: '#A32226' },
    { id: 'espofocus',     name: 'ND Focus',     tag: 'ADHD weekly tracker', url: '/apps/espofocus/',     acc: '#93A82F' }
  ];

  /* Which app are we in? Read it off the path, never off a data attribute a
     page might forget to set. Unknown path = still useful, just nothing marked. */
  var here = (function () {
    var p = location.pathname;
    for (var i = 0; i < APPS.length; i++) if (p.indexOf(APPS[i].url) === 0) return APPS[i];
    return null;
  })();

  var CLAY = '#a85f38', CREAM = '#f8f2e6', INK = '#2b1a12';

  /* ── styles. Scoped hard: every rule starts .ndn- so nothing here can reach
        into the host app, and nothing in the host app can restyle the strip. ── */
  var css = ''
    + '.ndn-strip{position:sticky;top:0;left:0;right:0;z-index:2147483000;display:flex;'
    + 'align-items:center;gap:10px;height:44px;padding:0 12px;background:' + CLAY + ';'
    + 'color:' + CREAM + ';font:600 14px/1 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;'
    + 'box-sizing:border-box;box-shadow:0 1px 0 rgba(0,0,0,.18)}'
    + '.ndn-strip *{box-sizing:border-box}'
    + '.ndn-strip svg{flex:none;display:block}'
    + '.ndn-strip .ndn-btn{appearance:none!important;-webkit-appearance:none!important;border:0!important;'
    + 'background:rgba(255,255,255,.12);color:#f8f2e6!important;font:600 14px/1 inherit;'
    + 'font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif!important;'
    + 'display:inline-flex!important;flex-direction:row!important;flex-wrap:nowrap!important;'
    + 'align-items:center!important;justify-content:center!important;gap:7px!important;'
    + 'height:32px!important;min-height:0!important;padding:0 12px!important;margin:0!important;'
    + 'border-radius:999px!important;cursor:pointer;white-space:nowrap!important;flex:none!important;'
    + 'text-decoration:none!important;text-transform:none!important;letter-spacing:normal!important;'
    + 'width:auto!important;box-shadow:none!important}'
    + '.ndn-strip .ndn-btn:hover{background:rgba(255,255,255,.2)}'
    + '.ndn-strip .ndn-btn:focus-visible{outline:2px solid ' + CREAM + ';outline-offset:2px}'
    + '.ndn-strip .ndn-here{flex:1 1 0!important;min-width:0;text-align:center;font-weight:700;'
    + 'font-size:14px;letter-spacing:.01em;'
    + 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;opacity:.95}'
    + '.ndn-strip .ndn-shop{font-weight:600!important}'
    + '@media(max-width:420px){.ndn-strip .ndn-shop span{display:none!important}}'
    /* the sheet */
    + '.ndn-veil{position:fixed;inset:0;z-index:2147483001;background:rgba(20,12,8,.5);'
    + 'display:flex;align-items:flex-start;justify-content:center;padding:56px 14px 14px;'
    + 'overflow:auto;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)}'
    + '.ndn-sheet{width:100%;max-width:430px;background:' + CREAM + ';color:' + INK + ';'
    + 'border-radius:16px;padding:14px;box-shadow:0 24px 60px rgba(0,0,0,.35);'
    + 'font:400 15px/1.45 ui-sans-serif,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}'
    + '.ndn-sheet h2{margin:2px 0 2px;font-size:17px;letter-spacing:-.01em}'
    + '.ndn-sub{margin:0 0 12px;font-size:13px;opacity:.7}'
    + '.ndn-item{display:flex;align-items:center;gap:11px;width:100%;text-align:left;'
    + 'padding:11px 12px;margin-bottom:7px;border:1px solid rgba(43,26,18,.14);border-radius:12px;'
    + 'background:#fff;color:inherit;text-decoration:none;font:inherit;cursor:pointer;min-height:56px}'
    + '.ndn-item:hover{border-color:rgba(43,26,18,.34)}'
    + '.ndn-dot{width:11px;height:11px;border-radius:50%;flex:none}'
    + '.ndn-col{flex:1;min-width:0}'
    + '.ndn-nm{display:block;font-weight:700;font-size:15px;line-height:1.25}'
    + '.ndn-tg{display:block;font-size:12.5px;opacity:.65;margin-top:2px;line-height:1.3}'
    + '.ndn-you{margin-left:auto;font-size:10.5px;font-weight:700;letter-spacing:.09em;'
    + 'text-transform:uppercase;opacity:.6;flex:none}'
    + '.ndn-rule{height:1px;background:rgba(43,26,18,.14);margin:12px 2px}'
    + '.ndn-foot{display:block;text-align:center;font-size:12.5px;opacity:.75;'
    + 'color:inherit;text-decoration:none;padding:4px}'
    + '.ndn-foot:hover{text-decoration:underline}'
    + '@media(prefers-reduced-motion:no-preference){.ndn-sheet{animation:ndn-up .16s ease-out}'
    + '@keyframes ndn-up{from{transform:translateY(-8px);opacity:0}to{transform:none;opacity:1}}}';

  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  /* ── the strip ─────────────────────────────────────────────────────────── */
  var strip = document.createElement('nav');
  strip.className = 'ndn-strip';
  strip.setAttribute('aria-label', 'Neuro Divulge');

  var out = document.createElement('button');
  out.type = 'button';
  out.className = 'ndn-btn';
  out.setAttribute('aria-haspopup', 'dialog');
  out.innerHTML = '<svg width="8" height="13" viewBox="0 0 8 13" aria-hidden="true" fill="none">'
    + '<path d="M6.5 1.5 1.5 6.5l5 5" stroke="currentColor" stroke-width="2" '
    + 'stroke-linecap="round" stroke-linejoin="round"/></svg> Neuro Divulge';

  var label = document.createElement('div');
  label.className = 'ndn-here';
  label.textContent = here ? here.name : '';

  var shop = document.createElement('a');
  shop.className = 'ndn-btn ndn-shop';
  shop.href = SHOP;
  shop.innerHTML = 'Shop<span> the apps</span>';

  strip.appendChild(out);
  strip.appendChild(label);
  strip.appendChild(shop);

  /* ── the sheet ─────────────────────────────────────────────────────────── */
  var veil = null;

  function close() {
    if (!veil) return;
    veil.remove();
    veil = null;
    document.removeEventListener('keydown', onKey);
    out.focus();
  }

  function onKey(e) { if (e.key === 'Escape') close(); }

  function open() {
    if (veil) return;
    veil = document.createElement('div');
    veil.className = 'ndn-veil';
    veil.addEventListener('click', function (e) { if (e.target === veil) close(); });

    var sheet = document.createElement('div');
    sheet.className = 'ndn-sheet';
    sheet.setAttribute('role', 'dialog');
    sheet.setAttribute('aria-modal', 'true');
    sheet.setAttribute('aria-label', 'Neuro Divulge apps');

    var h = document.createElement('h2');
    h.textContent = 'Neuro Divulge';
    var sub = document.createElement('p');
    sub.className = 'ndn-sub';
    sub.textContent = 'Information, Education, and Tools for Neurodivergent, by the Neurodivergent.';
    sheet.appendChild(h);
    sheet.appendChild(sub);

    APPS.forEach(function (a) {
      var row = document.createElement('a');
      row.className = 'ndn-item';
      row.href = a.url;
      var dot = document.createElement('span');
      dot.className = 'ndn-dot';
      dot.style.background = a.acc;
      var col = document.createElement('span');
      col.className = 'ndn-col';
      col.innerHTML = '<span class="ndn-nm"></span><span class="ndn-tg"></span>';
      col.firstChild.textContent = a.name;
      col.lastChild.textContent = a.tag;
      row.appendChild(dot);
      row.appendChild(col);
      if (here && a.id === here.id) {
        var y = document.createElement('span');
        y.className = 'ndn-you';
        y.textContent = "You're here";
        row.appendChild(y);
        row.setAttribute('aria-current', 'page');
      }
      sheet.appendChild(row);
    });

    var rule = document.createElement('div');
    rule.className = 'ndn-rule';
    sheet.appendChild(rule);

    var home = document.createElement('a');
    home.className = 'ndn-foot';
    home.href = HOME;
    home.textContent = 'All four in one place →';
    sheet.appendChild(home);

    var store = document.createElement('a');
    store.className = 'ndn-foot';
    store.href = SHOP;
    store.textContent = 'Accelerated Experiences';
    sheet.appendChild(store);

    veil.appendChild(sheet);
    document.body.appendChild(veil);
    document.addEventListener('keydown', onKey);
    sheet.querySelector('.ndn-item').focus();
  }

  out.addEventListener('click', open);

  /* Put the strip above everything the app draws. Runs on DOM ready so we never
     race a body that has not been parsed yet. */
  function mount() {
    if (!document.body) return setTimeout(mount, 30);
    document.body.insertBefore(strip, document.body.firstChild);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
