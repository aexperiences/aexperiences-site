var C='esposketch-v3';
var A=['./','./index.html','./manifest.webmanifest','./icon.png'];
self.addEventListener('install',function(e){e.waitUntil(caches.open(C).then(function(c){
 return Promise.all(A.map(function(a){return c.add(a).catch(function(){})}))}).then(function(){return self.skipWaiting()}))});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(k){
 return Promise.all(k.filter(function(x){return x!==C}).map(function(x){return caches.delete(x)}))}).then(function(){return self.clients.claim()}))});
self.addEventListener('fetch',function(e){var r=e.request;if(r.method!=='GET')return;
 var u=new URL(r.url); if(u.origin!==location.origin)return;
 if(r.mode==='navigate'){e.respondWith(fetch(r).then(function(res){var c=res.clone();caches.open(C).then(function(x){x.put(r,c)});return res})
  .catch(function(){return caches.match(r).then(function(m){return m||caches.match('./index.html')})}));return}
 e.respondWith(caches.match(r).then(function(m){return m||fetch(r)}))});
