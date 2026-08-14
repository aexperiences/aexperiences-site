/* ESPO Thread — offline shell. Accelerated Experiences, LLC */
var C='espo-thread-v2';
var FILES=['/apps/thread/','/apps/thread/index.html','/apps/thread/icon.png','/apps/thread/icon-180.png','/apps/thread/icon-192.png','/apps/thread/icon-maskable.png','/apps/thread/manifest.webmanifest'];
self.addEventListener('install',function(e){
  e.waitUntil(caches.open(C).then(function(c){return c.addAll(FILES)}).catch(function(){}).then(function(){return self.skipWaiting()}));
});
self.addEventListener('activate',function(e){
  e.waitUntil(caches.keys().then(function(ks){
    return Promise.all(ks.map(function(k){return k===C?null:caches.delete(k)}));
  }).then(function(){return self.clients.claim()}));
});
/* network-first for the shell so a deploy is picked up, cache as the fallback */
self.addEventListener('fetch',function(e){
  if(e.request.method!=='GET')return;
  var u=new URL(e.request.url);
  if(u.origin!==location.origin||u.pathname.indexOf('/apps/thread/')!==0)return;
  e.respondWith(
    fetch(e.request).then(function(r){
      var copy=r.clone(); caches.open(C).then(function(c){c.put(e.request,copy)}); return r;
    }).catch(function(){
      return caches.match(e.request).then(function(m){return m||caches.match('/apps/thread/')});
    })
  );
});
