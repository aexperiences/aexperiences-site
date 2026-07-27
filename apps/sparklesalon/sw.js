/* Sparkle Salon service worker — offline-first; the whole game must work with no signal.
   Network-first for the page so a fresh deploy is never hidden behind the cache;
   assets are cached one at a time so one bad URL can't kill offline support.
   Accelerated Experiences LLC */
var C = "sparklesalon-v2";
var VOICE = ["welcome","c01","c02","c03","c04","c05","c06","c07","c08","c09","c10","c11","c12","c13","c14","p1","p2","p3","p4","p5","p6"]
  .map(function(id){ return "./voice/" + id + ".mp3"; });
var ASSETS = ["./", "./index.html", "./icon.png", "./manifest.webmanifest",
  "https://fonts.googleapis.com/css2?family=Baloo+2:wght@500;600;700;800&family=Nunito:wght@600;700;800&display=swap"]
  .concat(VOICE);

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(C).then(function (c) {
    return Promise.all(ASSETS.map(function (u) { return c.add(u).catch(function () { return null; }); }));
  }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k.indexOf("sparklesalon-") === 0 && k !== C; })
      .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  var accept = e.request.headers.get("accept") || "";
  var isDoc = e.request.mode === "navigate" || e.request.destination === "document" || accept.indexOf("text/html") > -1;
  if (isDoc) {
    e.respondWith(
      fetch(e.request).then(function (res) {
        if (res && res.ok) { var cp = res.clone(); caches.open(C).then(function (c) { c.put(e.request, cp); }); }
        return res;
      }).catch(function () {
        return caches.match(e.request).then(function (hit) {
          return hit || caches.match("./index.html").then(function (idx) {
            return idx || new Response("Offline.", { status: 503, headers: { "Content-Type": "text/plain" } });
          });
        });
      })
    );
    return;
  }
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
