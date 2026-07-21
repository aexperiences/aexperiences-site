/* ESPOtrek service worker — offline-first, stale-while-revalidate.
   The whole point: the itinerary works with zero bars. Accelerated Experiences, LLC */
var C = "espotrek-v1";
var ASSETS = ["./", "./index.html", "./icon.png", "./manifest.webmanifest"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) { return c.addAll(ASSETS); }).then(function(){ return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("espotrek-") === 0 && k !== C; }).map(function (k) { return caches.delete(k); }));
  }).then(function(){ return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
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
