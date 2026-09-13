/* AE BEACON — Accelerated Experiences LLC
   One line on any AE property:
     <script src="https://www.aexperiences.com/px.js" data-site="store" defer></script>

   It records the visit, not the visitor's identity: no name, no email, nothing typed.
   No third party is involved and no cookie is set — the visitor id is a random string in
   this browser's own localStorage, so a returning reader can be recognised as "the same
   browser" and nothing more. */
(function () {
  try {
    var me = document.currentScript || (function () { var s = document.getElementsByTagName('script'); return s[s.length - 1]; })();
    var SITE = (me && me.getAttribute('data-site')) || 'unknown';
    var EP = (me && me.getAttribute('data-endpoint')) || 'https://www.aexperiences.com/api/px';

    var K = 'ae_vid';
    var vid = '', isNew = false;
    try {
      vid = localStorage.getItem(K) || '';
      if (!vid) { vid = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); localStorage.setItem(K, vid); isNew = true; }
    } catch (_) { vid = 'nostore'; }

    var sid = '';
    try {
      sid = sessionStorage.getItem('ae_sid') || '';
      if (!sid) { sid = Math.random().toString(36).slice(2, 10); sessionStorage.setItem('ae_sid', sid); }
    } catch (_) { sid = 'nosess'; }

    var qs = {};
    try { new URL(location.href).searchParams.forEach(function (v, k) { if (k.indexOf('utm_') === 0) qs[k] = v; }); } catch (_) {}

    var started = Date.now();
    function payload(extra) {
      var o = {
        s: SITE, p: location.pathname + location.search, ti: document.title,
        r: document.referrer || '', v: vid, sid: sid, nv: isNew ? '1' : '0',
        l: navigator.language || '', sc: (screen.width || 0) + 'x' + (screen.height || 0)
      };
      for (var k in qs) o[k] = qs[k];
      for (var j in (extra || {})) o[j] = extra[j];
      return o;
    }
    function send(o, beacon) {
      var body = JSON.stringify(o);
      if (beacon && navigator.sendBeacon) {
        try { navigator.sendBeacon(EP, new Blob([body], { type: 'application/json' })); return; } catch (_) {}
      }
      try {
        fetch(EP, { method: 'POST', headers: { 'content-type': 'application/json' }, body: body, keepalive: true, mode: 'cors' })
          .catch(function () { var i = new Image(); i.src = EP + '?s=' + encodeURIComponent(SITE) + '&p=' + encodeURIComponent(o.p) + '&v=' + encodeURIComponent(vid); });
      } catch (_) {}
    }

    send(payload({}), false);

    // How long they actually stayed — sent once, on the way out.
    var sent = false;
    function leave() {
      if (sent) return; sent = true;
      send(payload({ d: Math.round((Date.now() - started) / 1000), p: location.pathname + location.search + '#exit' }), true);
    }
    addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') leave(); });
    addEventListener('pagehide', leave);
  } catch (_) { /* a beacon never breaks the page it is measuring */ }
})();
