/* ESPOnatlparks service worker — offline-first; the whole app must work in a canyon.
   Accelerated Experiences LLC */
var C = "esponatlparks-v3";
var ASSETS = ["./", "./index.html", "./icon.png", "./manifest.webmanifest",
  "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300..700&family=Inter:wght@400;500;600;700;800&display=swap"];
self.addEventListener("install", function (e) {
  /* Cache assets one at a time. addAll() is all-or-nothing: a single 404 or CDN
     hiccup would abort the whole install and silently cost the app its offline
     support. One bad URL should not take the rest down. */
  e.waitUntil(caches.open(C).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () { return null; }); }));
  }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("esponatlparks-") === 0 && k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var accept = e.request.headers.get("accept") || "";
  var isDoc = e.request.mode === "navigate" ||
              e.request.destination === "document" ||
              accept.indexOf("text/html") > -1;
  if (isDoc) {
    /* The page is NETWORK-FIRST. A shipped build must never sit a whole visit
       behind — that bug hid two rounds of ESPOvineyard notebook work on Jul 26
       2026. The cache is the offline fallback here, not the default answer. */
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) { var cp = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          if (hit) return hit;
          return caches.match("./index.html").then(function (idx) {
            return idx || new Response("Offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
          });
        });
      })
    );
    return;
  }
  /* Everything else stays stale-while-revalidate: fast, and still works offline. */
  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok) { var cp = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
