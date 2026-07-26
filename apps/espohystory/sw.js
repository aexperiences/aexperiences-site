/* ESPOhystory service worker — network-first for the page, stale-while-revalidate for assets.
   Accelerated Experiences LLC */
var C = "espohystory-v3";
var ASSETS = ["./", "./index.html", "./icon.png", "./manifest.webmanifest"];
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
    return Promise.all(ks.filter(function (k) { return k.indexOf("espohystory-") === 0 && k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  // Audio files: never intercept. HTMLMediaElement + service-worker-mediated
  // Range requests is a known Chromium gotcha (element stalls at readyState 0
  // even though a plain fetch() for the same URL/Range succeeds) — verified
  // live Jul 21 2026. Let these hit the network directly, untouched.
  if (e.request.url.indexOf("/audio/") !== -1) return;
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
