/* ESPOhystory service worker — offline-first, stale-while-revalidate.
   Accelerated Experiences, LLC */
var C = "espohystory-v2";
var ASSETS = ["./", "./index.html", "./icon.png", "./manifest.webmanifest"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
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
