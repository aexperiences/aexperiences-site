/* ND OS — the service worker, so a message reaches her phone with nothing open.
   Accelerated Experiences LLC · Sep 19 2026
   It does ONE job: show what the Inbox pushed, and open the room when she taps it.
   It deliberately caches nothing. Her office is live data and a stale cache would lie to her. */
self.addEventListener('install', (e) => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch (e) { d = { title: 'The Neuro~Divulge', body: (event.data && event.data.text()) || '' }; }
  const title = d.title || 'The Neuro~Divulge';
  event.waitUntil(self.registration.showNotification(title, {
    body: d.body || '',
    icon: '/nd/os/icon-maskable-512.png',
    badge: '/nd/os/icon-maskable-512.png',
    tag: d.tag || 'nd-inbox',
    renotify: true,
    data: { url: d.url || '/nd/os/inbox/' }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const want = (event.notification.data && event.notification.data.url) || '/nd/os/inbox/';
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if (c.url.indexOf('/nd/os/') > -1 && 'focus' in c) { c.navigate(want); return c.focus(); } }
    return self.clients.openWindow(want);
  }));
});
