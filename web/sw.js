const cacheName = 'quoterelay-offline-v2';
self.addEventListener('install', event => event.waitUntil(caches.open(cacheName).then(c => c.add('/offline.html'))));
self.addEventListener('activate', event => event.waitUntil(caches.delete('ma-renovation-offline-v1')));
self.addEventListener('fetch', event => {
  if (event.request.mode === 'navigate') event.respondWith(fetch(event.request).catch(() => caches.match('/offline.html')));
});
