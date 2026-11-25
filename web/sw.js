const cacheName = 'rivqo-offline-v1';
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(c => c.add('/offline.html'))));
self.addEventListener('activate', event => event.waitUntil(Promise.all(['ma-renovation-offline-v1', 'quoterelay-offline-v2'].map(key => caches.delete(key)))));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
