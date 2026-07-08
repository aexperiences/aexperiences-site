/* ESPO / Accelerated Experiences — universal family nav.
   ONE self-contained sticky top bar, deployed identically to every property.
   It auto-detects which site it's on (by hostname), themes the bar to that
   brand, gives a Back-to-home button, an in-family app switcher (where a
   family has multiple apps), and an "Explore" menu linking EVERY AE property
   — so everything is a part of everything. No dependencies. Drop-in:
       <script src="/family-nav.js" defer></script>
   When PAYWALL flips true, unowned in-family apps grey out and route to pricing.
*/
(function () {
  "use strict";
  if (window.__aeNavLoaded) return; window.__aeNavLoaded = true;

  /* ---- flip true the day a suite goes on sale (in-family lock only) ---- */
  var PAYWALL = false;

  /* ---------- brand marks ---------- */
  var TRIAD = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="232" fill="#1B1148"/><circle cx="512" cy="330" r="148" fill="none" stroke="#FF9E6B" stroke-width="16" opacity=".55"/><g stroke="#36306B" stroke-width="26" stroke-linecap="round"><path d="M330 672H694"/><path d="M330 672 512 330"/><path d="M694 672 512 330"/></g><circle cx="330" cy="672" r="88" fill="#5FE3C0"/><circle cx="694" cy="672" r="88" fill="#5FE3C0"/><circle cx="512" cy="330" r="108" fill="#FF9E6B"/></svg>';
  var GLASS = '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="232" fill="#0E2B2A"/><circle cx="445" cy="430" r="235" fill="none" stroke="#E6A93C" stroke-width="64"/><polyline points="362,525 362,335 528,525 528,335" fill="none" stroke="#E6A93C" stroke-width="46" stroke-linecap="round" stroke-linejoin="round"/><line x1="612" y1="597" x2="775" y2="760" stroke="#E6A93C" stroke-width="82" stroke-linecap="round"/></svg>';
  // generic rounded-badge mark for families without a custom logo
  function badge(bg, accent, letter) {
    return '<svg viewBox="0 0 1024 1024" aria-hidden="true"><rect width="1024" height="1024" rx="232" fill="' + bg + '"/>'
      + '<text x="512" y="512" text-anchor="middle" dominant-baseline="central" font-family="Lato,Arial,sans-serif" '
      + 'font-weight="900" font-size="620" fill="' + accent + '">' + letter + '</text></svg>';
  }

  /* ---------- every property ---------- */
  // Each family: how to detect it, its home, brand words, theme colors, mark, and its in-site apps.
  var FAMILIES = {
    ae: {
      hostRe: /(^|\.)aexperiences\.com$/i, home: "https://aexperiences.com/",
      brand: "Accelerated", accentWord: " Experiences",
      accent: "#3B9DFF", bg: "#0F1F3D", line: "#294066", ink: "#EAF1FC", dim: "#9FB4D6",
      logo: badge("#0F1F3D", "#3B9DFF", "æ"), ownedKey: "ae_owned_ae", apps: []
    },
    music: {
      hostRe: /espomusic\.com$/i, home: "https://espomusic.com/",
      brand: "ESPO", accentWord: "Music",
      accent: "#E8B04B", bg: "#181206", line: "#3E3018", ink: "#F5ECD9", dim: "#CBB88E",
      logo: badge("#181206", "#E8B04B", "&#9834;"), ownedKey: "espo_owned_music",
      apps: [
        { k: "fret", name: "ESPO Fret (guitar)", url: "/fret" },
        { k: "grand", name: "ESPO Grand (piano)", url: "/grand" },
        { k: "harp", name: "ESPO Harp (harmonica)", url: "/harp" },
        { k: "uke", name: "ESPO Uke (ukulele)", url: "/uke" },
        { k: "bass", name: "ESPO Bass", url: "/bass" }
      ]
    },
    learning: {
      hostRe: /espolearning\.com$/i, home: "https://espolearning.com/",
      brand: "ESPO", accentWord: "Learning",
      accent: "#79D2A6", bg: "#0F241C", line: "#274C3C", ink: "#EAF5EE", dim: "#A9CFBB",
      logo: badge("#0F241C", "#79D2A6", "&#9998;"), ownedKey: "espo_owned_learning",
      apps: [
        { k: "handwriting", name: "Handwriting", url: "/handwriting" },
        { k: "reading", name: "Reading", url: "/reading" }
      ]
    },
    genius: {
      hostRe: /espogenius\.com$/i, home: "https://espogenius.com/",
      brand: "ESPO", accentWord: "Genius",
      accent: "#FF9E6B", bg: "#160D3A", line: "#3A2F74", ink: "#EEEAFB", dim: "#B3A5EC",
      logo: TRIAD, ownedKey: "espo_owned_genius",
      apps: [
        { k: "iep", name: "IEP Genius", url: "/espo-iep-genius-app" },
        { k: "care", name: "Care Genius", url: "/espo-care-genius-app" },
        { k: "benefits", name: "Benefits Genius", url: "/espo-benefits-genius-app" },
        { k: "wills", name: "Wills & Probate Genius", url: "/espo-wills-genius-app" }
      ]
    },
    drama: {
      hostRe: /espodrama\.com$/i, home: "https://espodrama.com/",
      brand: "ESPO", accentWord: "Drama",
      accent: "#D98A4E", bg: "#241610", line: "#4A3325", ink: "#F5E9DD", dim: "#CBA98C",
      logo: badge("#241610", "#D98A4E", "&#9673;"), ownedKey: "espo_owned_drama",
      apps: [
        { k: "studio", name: "ESPO Studios", url: "/studio" },
        { k: "stage", name: "ESPO Stage", url: "/stage" }
      ]
    },
    edu: {
      hostRe: /espoedu\.com$/i, home: "https://espoedu.com/",
      brand: "ESPO", accentWord: "Curriculum",
      accent: "#6BA6FF", bg: "#101B2E", line: "#2A3F5C", ink: "#E9F0FA", dim: "#A6C0E0",
      logo: badge("#101B2E", "#6BA6FF", "&#9636;"), ownedKey: "espo_owned_edu", apps: []
    },
    narc: {
      hostRe: /marketnarc\.com$/i, home: "https://marketnarc.com/",
      brand: "Market", accentWord: "Narc",
      accent: "#E6A93C", bg: "#08100F", line: "#214F4C", ink: "#EAF3F0", dim: "#8FC4BB",
      logo: GLASS, ownedKey: "espo_owned_narc",
      apps: [
        { k: "market", name: "MarketNarc", url: "/marketnarc-app" },
        { k: "bill", name: "BillNarc", url: "/billnarc-app" },
        { k: "tax", name: "TaxNarc", url: "/taxnarc-app" },
        { k: "collections", name: "CollectionsNarc", url: "/collectionsnarc-app" },
        { k: "home", name: "HomeNarc", url: "/homenarc-app" },
        { k: "paw", name: "PawNarc", url: "/pawnarc-app" }
      ]
    },
    nd: {
      hostRe: /neurodivulge\.com$/i, home: "https://neurodivulge.com/",
      brand: "Neuro", accentWord: " Divulge",
      accent: "#B65A33", bg: "#26201A", line: "#4A3B2E", ink: "#F8F2E6", dim: "#C9B39C",
      logo: badge("#26201A", "#B65A33", "&#9678;"), ownedKey: "ae_owned_nd", apps: []
    },
    hub: {
      hostRe: /aexperiences\.studio$/i, home: "https://aexperiences.studio/",
      brand: "AE", accentWord: " Hub",
      accent: "#4FA8FF", bg: "#0B1830", line: "#22375A", ink: "#E9F1FC", dim: "#9DB4D6",
      logo: badge("#0B1830", "#4FA8FF", "AE"), ownedKey: "ae_owned_hub", apps: []
    }
  };

  // The universal "whole family" list — every property, in order, absolute links.
  var ALL = [
    { key: "ae", name: "Accelerated Experiences", tag: "Studio", url: "https://aexperiences.com/" },
    { key: "music", name: "ESPO Music", tag: "Learn an instrument", url: "https://espomusic.com/" },
    { key: "learning", name: "ESPO Learning", tag: "Early skills", url: "https://espolearning.com/" },
    { key: "genius", name: "ESPO Genius", tag: "Navigate the system", url: "https://espogenius.com/" },
    { key: "drama", name: "ESPO Drama", tag: "Act & create", url: "https://espodrama.com/" },
    { key: "edu", name: "ESPO Curriculum", tag: "Homeschool K-12", url: "https://espoedu.com/" },
    { key: "narc", name: "The Narcs", tag: "See through it", url: "https://marketnarc.com/" },
    { key: "nd", name: "Neuro Divulge", tag: "Regulation tools", url: "https://neurodivulge.com/" },
    { key: "hub", name: "AE Hub", tag: "Operations", url: "https://aexperiences.studio/" }
  ];

  /* ---------- detect current family + app ---------- */
  var path = location.pathname.replace(/\/+$/, "") || "/";
  function findByPath(fam) {
    return fam.apps.filter(function (a) { return path.indexOf(a.url.replace(/\/+$/, "")) === 0 && a.url !== "/"; })
      .sort(function (a, b) { return b.url.length - a.url.length; })[0] || null;
  }
  var famKey = null, fam = null, current = null;
  Object.keys(FAMILIES).forEach(function (k) { if (FAMILIES[k].hostRe.test(location.hostname)) { fam = FAMILIES[k]; famKey = k; } });
  if (fam) current = findByPath(fam);
  if (!fam) { Object.keys(FAMILIES).forEach(function (k) { var c = findByPath(FAMILIES[k]); if (c) { fam = FAMILIES[k]; famKey = k; current = c; } }); }
  if (!fam) { fam = FAMILIES.ae; famKey = "ae"; }

  /* ---------- entitlement (in-family lock only) ---------- */
  function owned() {
    if (!PAYWALL) return "all";
    try {
      var raw = localStorage.getItem(fam.ownedKey);
      if (!raw) return [];
      if (raw === "suite" || raw === "all") return "all";
      return JSON.parse(raw);
    } catch (e) { return []; }
  }
  function isOwned(k) { var o = owned(); return o === "all" || (o && o.indexOf(k) >= 0); }
  window.AENav = {
    setOwned: function (v) { try { localStorage.setItem(fam.ownedKey, (v === "all" || v === "suite") ? "suite" : JSON.stringify(v)); render(); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(fam.ownedKey); render(); } catch (e) {} }
  };

  /* ---------- helpers ---------- */
  function hexA(hex, a) {
    hex = hex.replace('#', ''); if (hex.length === 3) hex = hex.replace(/(.)/g, '$1$1');
    var r = parseInt(hex.substr(0, 2), 16), g = parseInt(hex.substr(2, 2), 16), b = parseInt(hex.substr(4, 2), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  /* ---------- styles ---------- */
  var css = ''
    + '#aenav{position:fixed;top:0;left:0;right:0;z-index:2147483000;height:50px;display:flex;align-items:center;gap:12px;'
    + 'padding:0 14px;background:' + hexA(fam.bg, .86) + ';backdrop-filter:blur(11px);-webkit-backdrop-filter:blur(11px);'
    + 'border-bottom:1px solid ' + fam.line + ';font-family:Inter,-apple-system,Segoe UI,Roboto,sans-serif;box-sizing:border-box}'
    + '#aenav a{text-decoration:none}'
    + '#aenav .brand{display:flex;align-items:center;gap:9px;color:' + fam.ink + '}'
    + '#aenav .brand svg{width:26px;height:26px;border-radius:7px;display:block}'
    + '#aenav .brand b{font-family:Lato,Inter,sans-serif;font-weight:900;font-size:16px;letter-spacing:.2px;white-space:nowrap}'
    + '#aenav .brand b i{font-style:normal;color:' + fam.accent + '}'
    + '#aenav .brand .hm{color:' + fam.dim + ';font-size:11px;font-weight:700;margin-left:2px;opacity:.9;white-space:nowrap}'
    + '#aenav .spacer{flex:1}'
    + '#aenav .cur{color:' + fam.dim + ';font-size:12.5px;font-weight:600;max-width:34vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'
    + '#aenav .sw{display:flex;align-items:center;gap:7px;background:' + hexA(fam.accent, .14) + ';border:1px solid ' + fam.accent + ';'
    + 'color:' + fam.accent + ';font-family:Lato,Inter,sans-serif;font-weight:900;font-size:12.5px;border-radius:999px;padding:8px 14px;cursor:pointer}'
    + '#aenav .sw:hover{background:' + hexA(fam.accent, .22) + '}'
    + '#aenav .sw svg{width:11px;height:11px;transition:transform .2s}'
    + '#aenav.open .sw svg{transform:rotate(180deg)}'
    + '#aemenu{position:fixed;top:56px;right:12px;z-index:2147483001;width:min(320px,calc(100vw - 24px));max-height:calc(100vh - 72px);overflow:auto;'
    + 'background:' + fam.bg + ';border:1px solid ' + fam.line + ';border-radius:16px;padding:8px;'
    + 'box-shadow:0 18px 50px rgba(0,0,0,.5);opacity:0;transform:translateY(-8px);pointer-events:none;transition:.18s}'
    + '#aemenu.show{opacity:1;transform:translateY(0);pointer-events:auto}'
    + '#aemenu .mh{display:flex;align-items:center;gap:8px;color:' + fam.dim + ';font-size:11px;font-weight:800;'
    + 'text-transform:uppercase;letter-spacing:.08em;padding:10px 10px 6px}'
    + '#aemenu a.home{display:flex;align-items:center;gap:9px;color:' + fam.ink + ';font-weight:800;font-size:14px;'
    + 'padding:11px 12px;border-radius:11px;border:1px solid ' + fam.line + ';margin-bottom:2px}'
    + '#aemenu a.home:hover{border-color:' + fam.accent + '}'
    + '#aemenu a.item{display:flex;align-items:center;gap:10px;color:' + fam.ink + ';font-size:14px;font-weight:600;'
    + 'padding:11px 12px;border-radius:11px}'
    + '#aemenu a.item:hover{background:' + hexA(fam.accent, .12) + '}'
    + '#aemenu a.item .dot{width:9px;height:9px;border-radius:50%;background:' + fam.accent + ';flex:0 0 auto}'
    + '#aemenu a.item .sub{margin-left:auto;color:' + fam.dim + ';font-size:11px;font-weight:600}'
    + '#aemenu a.item.on{background:' + hexA(fam.accent, .16) + '}'
    + '#aemenu a.item.on .tag{margin-left:auto;color:' + fam.accent + ';font-size:10.5px;font-weight:800}'
    + '#aemenu a.item.locked{opacity:.5;filter:grayscale(.7)}'
    + '#aemenu a.item.locked .dot{background:' + fam.dim + '}'
    + '#aemenu a.item.locked .lk{margin-left:auto;font-size:12px;color:' + fam.dim + '}'
    + '#aemenu .div{height:1px;background:' + fam.line + ';margin:8px 6px}'
    + '#aescrim{position:fixed;inset:0;z-index:2147482999;background:transparent;display:none}'
    + '#aescrim.show{display:block}'
    + 'body{padding-top:58px!important}'
    + '@media print{#aenav,#aemenu,#aescrim{display:none!important}body{padding-top:0!important}}';

  var CH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';

  function buildMenu() {
    var h = '';
    // back home
    h += '<a class="home" href="' + fam.home + '">&#8962;&nbsp; Back to ' + fam.brand + fam.accentWord + '</a>';
    // in-family app switcher
    if (fam.apps && fam.apps.length > 1) {
      h += '<div class="mh">Switch app</div>';
      fam.apps.forEach(function (a) {
        var here = current && current.k === a.k;
        var unlocked = isOwned(a.k);
        if (here) {
          h += '<a class="item on" href="' + a.url + '"><span class="dot"></span>' + a.name + '<span class="tag">YOU&rsquo;RE HERE</span></a>';
        } else if (unlocked) {
          h += '<a class="item" href="' + a.url + '"><span class="dot"></span>' + a.name + '</a>';
        } else {
          h += '<a class="item locked" href="' + fam.home + '#pricing" title="Unlock with the suite"><span class="dot"></span>' + a.name + '<span class="lk">&#128274; unlock</span></a>';
        }
      });
    }
    // whole family
    h += '<div class="div"></div><div class="mh">The whole AE family</div>';
    ALL.forEach(function (p) {
      var here = p.key === famKey;
      var dot = FAMILIES[p.key] ? FAMILIES[p.key].accent : fam.accent;
      if (here) {
        h += '<a class="item on" href="' + p.url + '"><span class="dot" style="background:' + dot + '"></span>' + p.name + '<span class="tag">YOU&rsquo;RE HERE</span></a>';
      } else {
        h += '<a class="item" href="' + p.url + '"><span class="dot" style="background:' + dot + '"></span>' + p.name + '<span class="sub">' + p.tag + '</span></a>';
      }
    });
    return h;
  }

  var navEl, menuEl, scrimEl, open = false;
  function render() { if (menuEl) menuEl.innerHTML = buildMenu(); }
  function toggle(v) {
    open = (v === undefined) ? !open : v;
    navEl.classList.toggle('open', open);
    menuEl.classList.toggle('show', open);
    scrimEl.classList.toggle('show', open);
    navEl.querySelector('.sw').setAttribute('aria-expanded', open);
  }

  function mount() {
    var style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);
    navEl = document.createElement('header'); navEl.id = 'aenav';
    navEl.innerHTML =
      '<a class="brand" href="' + fam.home + '" title="Back to ' + fam.brand + fam.accentWord + '">' + fam.logo
      + '<b>' + fam.brand + '<i>' + fam.accentWord + '</i></b><span class="hm">&#8962; home</span></a>'
      + '<span class="spacer"></span>'
      + (current ? '<span class="cur">' + current.name + '</span>' : '')
      + '<button class="sw" aria-haspopup="true" aria-expanded="false">Explore ' + CH + '</button>';
    menuEl = document.createElement('nav'); menuEl.id = 'aemenu'; menuEl.setAttribute('aria-label', 'AE family navigation'); menuEl.innerHTML = buildMenu();
    scrimEl = document.createElement('div'); scrimEl.id = 'aescrim';
    document.body.appendChild(navEl); document.body.appendChild(menuEl); document.body.appendChild(scrimEl);
    navEl.querySelector('.sw').addEventListener('click', function (e) { e.stopPropagation(); toggle(); });
    scrimEl.addEventListener('click', function () { toggle(false); });
    menuEl.addEventListener('click', function (e) { if (e.target.closest('a')) toggle(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') toggle(false); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})();
