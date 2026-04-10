// Service Worker for Push Notifications and Background Sync
const CACHE_NAME = 'cash-pickup-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(['/', '/logo-192.png', '/logo-512.png']))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch(() => caches.match('/'))
    );
  }
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, body, tag, data } = event.data;
    self.registration.showNotification(title, {
      body,
      icon: '/logo-192.png',
      badge: '/logo-192.png',
      tag: tag || 'cash-pickup',
      vibrate: [200, 100, 200],
      data,
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      return self.clients.openWindow('/dashboard');
    })
  );
});

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-investments') {
    event.waitUntil(
      self.clients.matchAll({ type: 'window' }).then((clients) => {
        clients.forEach((client) => client.postMessage({ type: 'SYNC_DATA' }));
      })
    );
  }
});
