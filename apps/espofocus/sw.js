/* ESPOfocus service worker — network-first for the page (fresh deploys win),
   cache-first for assets. Weekly logging works offline. Accelerated Experiences LLC */
var C = "espofocus-v1";
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
