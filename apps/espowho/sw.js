/* ESPOwho service worker — Accelerated Experiences LLC.
   HTML network-first so a deploy actually shows up.
   Voice manifest network-first so newly baked lines are picked up.
   Clip files are content-slug names, so they cache forever. */
const CACHE = 'espowho-v1';
const SHELL = ['./','./index.html','./manifest.webmanifest',
               './assets/espowho-icon-192.png','./assets/espowho-icon-512.png'];

self.addEventListener('install', e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate', e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch', e=>{
  const url = new URL(e.request.url);
  if(url.origin !== location.origin) return;                 /* never cache another origin */
  const netFirst = e.request.mode === 'navigate' ||
                   url.pathname.endsWith('.html') ||
                   url.pathname.endsWith('manifest.json');   /* the voice manifest must stay fresh */
  if(netFirst){
    e.respondWith(fetch(e.request).then(r=>{
      const copy = r.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); return r;
    }).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));
  } else {
    e.respondWith(caches.match(e.request).then(r=> r || fetch(e.request).then(res=>{
      const copy = res.clone(); caches.open(CACHE).then(c=>c.put(e.request, copy)); return res;
    })));
  }
});
