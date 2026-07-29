/* ESPOfocus service worker — network-first for the page (fresh deploys win),
   cache-first for assets. Weekly logging works offline. Accelerated Experiences LLC */
var C = "espofocus-v2";
var ASSETS = ["./","./index.html","./icon.svg","./icon.png","./manifest.webmanifest",
  "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700;800&display=swap"];
self.addEventListener("install", function(e){ e.waitUntil(caches.open(C).then(function(c){
  return Promise.all(ASSETS.map(function(u){return c.add(u).catch(function(){return null;});})); }).then(function(){return self.skipWaiting();})); });
self.addEventListener("activate", function(e){ e.waitUntil(caches.keys().then(function(ks){
  return Promise.all(ks.filter(function(k){return k.indexOf("espofocus-")===0&&k!==C;}).map(function(k){return caches.delete(k);})); }).then(function(){return self.clients.claim();})); });
self.addEventListener("fetch", function(e){
  if(e.request.method!=="GET") return;
  var accept=e.request.headers.get("accept")||"";
  var isDoc=e.request.mode==="navigate"||accept.indexOf("text/html")>-1;
  if(isDoc){ e.respondWith(fetch(e.request).then(function(r){ if(r&&r.ok){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp);});} return r; })
    .catch(function(){ return caches.match(e.request).then(function(h){ return h||caches.match("./index.html"); }); })); return; }
  e.respondWith(caches.match(e.request).then(function(h){ var net=fetch(e.request).then(function(r){ if(r&&r.ok){var cp=r.clone();caches.open(C).then(function(c){c.put(e.request,cp);});} return r; }).catch(function(){return h;}); return h||net; }));
});

/* daily reminder — tickle push (no payload): show a gentle notification */
self.addEventListener("push", function (e) {
  var body = "Time for today's quick check-in.";
  try { if (e.data) { var d = e.data.json(); if (d && d.body) body = d.body; } } catch (x) {}
  e.waitUntil(self.registration.showNotification("ESPOfocus", {
    body: body, icon: "./icon.png", badge: "./icon.png", tag: "espofocus-daily", renotify: false
  }));
});
self.addEventListener("notificationclick", function (e) {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
    for (var i = 0; i < list.length; i++) { if (list[i].url.indexOf("/apps/espofocus/") > -1 && "focus" in list[i]) return list[i].focus(); }
    if (clients.openWindow) return clients.openWindow("/apps/espofocus/");
  }));
});
