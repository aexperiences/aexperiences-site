/* shop-nav.js — AE_BACKBAR
   One shared way back to the store, from any page that is not the store.

   WHY THIS EXISTS: the seven hub pricing pages are reachable from the App Shop but had no
   honest way back — their only "back" link pointed at /#products, an old homepage section,
   so a visitor who wanted the shop again landed somewhere else and gave up. A page you can
   get into but not out of is a dead end no matter how good the information on it is.

   WHY IT IS A SCRIPT AND NOT SEVEN EDITS: the hub pages are large and are edited by other
   people. Injecting one shared bar means the fix lands on all of them at once and cannot
   accidentally revert page content. Add <script src="/shop-nav.js" defer></script> to any
   page that should have it — nothing else to wire.

   It is deliberately quiet: a slim top bar, not a second navigation system competing with
   the page's own header.
   Accelerated Experiences, LLC */
(function () {
  if (window.__aeBackbar) return; window.__aeBackbar = true;

  var STORE = '/shop.html';
  var here = location.pathname.replace(/\/index\.html$/, '/');

  // Never show it on the store itself, or on the homepage.
  if (here === STORE || here === '/' || here === '/products.html') return;

  // Which aisle did they come from? A hub page belongs to the business aisle.
  var isHub = /^\/hubs\//.test(here);
  var backHref = STORE + (isHub ? '#hubs' : '');
  var backText = isHub ? 'All business hubs' : 'The AE App Shop';

  function build() {
    if (document.getElementById('ae-backbar')) return;

    var css = document.createElement('style');
    css.textContent = [
      '#ae-backbar{position:sticky;top:0;z-index:900;background:#122a18;border-bottom:1px solid rgba(255,255,255,.12);',
      'font-family:Outfit,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;-webkit-font-smoothing:antialiased}',
      '#ae-backbar .in{max-width:1140px;margin:0 auto;padding:0 16px;display:flex;align-items:center;gap:10px;min-height:46px}',
      '#ae-backbar a{display:inline-flex;align-items:center;gap:8px;color:#f4eede;text-decoration:none;font-size:14px;font-weight:600;',
      'min-height:38px;padding:0 12px 0 8px;border-radius:10px}',
      '#ae-backbar a:hover{background:rgba(255,255,255,.09)}',
      '#ae-backbar a:focus-visible{outline:3px solid #e0a83a;outline-offset:2px}',
      '#ae-backbar svg{width:17px;height:17px;stroke:#e0a83a;fill:none;stroke-width:2.4;stroke-linecap:round;stroke-linejoin:round}',
      '#ae-backbar .sep{flex:1}',
      '#ae-backbar .home{color:#9db09f;font-size:13px;font-weight:600}',
      '#ae-backbar .home:hover{color:#f4eede}',
      '@media print{#ae-backbar{display:none}}'
    ].join('');
    document.head.appendChild(css);

    var bar = document.createElement('div');
    bar.id = 'ae-backbar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Back to the store');
    bar.innerHTML =
      '<div class="in">' +
        '<a href="' + backHref + '"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6"/></svg>' + backText + '</a>' +
        '<span class="sep"></span>' +
        '<a class="home" href="/">Home</a>' +
      '</div>';

    // First element in the body, above the page's own header.
    document.body.insertBefore(bar, document.body.firstChild);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', build);
  else build();

  /* Repair the old dead link in place. These pages point "back" at /#products — a homepage
     section that is no longer where products live. Rewrite them to the store so the link a
     visitor is most likely to click actually goes where they expect. */
  function fixOldLinks() {
    var a = document.querySelectorAll('a[href*="#products"], a[href$="/products.html"]');
    for (var i = 0; i < a.length; i++) {
      if (a[i].closest('#ae-backbar')) continue;
      a[i].setAttribute('href', STORE);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', fixOldLinks);
  else fixOldLinks();
})();
