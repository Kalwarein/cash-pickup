// Lightweight service worker for showing push-style notifications
// This runs in a separate thread and can show notifications even when the tab isn't focused.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Listen for messages from the main app to trigger notifications
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

// When user clicks a notification, focus the app
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
