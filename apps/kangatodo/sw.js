/* KangaToDo — service worker. Accelerated Experiences LLC.
   Two jobs: catch the buzz, and keep the app openable on a bad signal.
   It never caches /api/* — a stale job list is worse than no job list. */

const CACHE = 'kangatodo-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg', './icon-180.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;          // never cached, never served stale
  if (url.origin !== self.location.origin) return;

  // Network-first for the document, so a fix reaches a kid's phone next time they open it.
  if (e.request.mode === 'navigate' || e.request.destination === 'document') {
    e.respondWith(
      fetch(e.request)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return r; })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  e.respondWith(caches.match(e.request).then((hit) => hit || fetch(e.request)));
});

/* ------------------------------------------------------------------ push -- */

self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch { d = { title: 'KangaToDo', body: e.data ? e.data.text() : '' }; }

  const title = d.title || 'A job just hopped in';
  const opts = {
    body: d.body || '',
    icon: './icon-180.png',
    badge: './icon-180.png',
    image: d.image || undefined,      // the proof photo, shown inline where supported
    tag: d.choreId ? 'job-' + d.choreId : 'kangatodo',
    renotify: true,
    vibrate: [40, 60, 40],       // a kid should feel it, not just find it later
    requireInteraction: false,
    data: { url: d.url || './', choreId: d.choreId || null },
  };

  e.waitUntil(
    self.registration.showNotification(title, opts).then(() =>
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((cs) => cs.forEach((c) => c.postMessage({ type: 'refresh' })))
    )
  );
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const target = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((cs) => {
      for (const c of cs) {
        if (c.url.includes('/apps/kangatodo') && 'focus' in c) { c.postMessage({ type: 'refresh' }); return c.focus(); }
      }
      return self.clients.openWindow(target);
    })
  );
});
