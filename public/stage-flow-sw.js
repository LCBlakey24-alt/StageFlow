// Temporary safety reset while Stage Flow's app-shell caching is rebuilt.
// This clears existing caches and unregisters the service worker so the live app
// always loads the newest Vercel build instead of a stale cached shell.
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.map(key => caches.delete(key))))
      .then(() => self.registration.unregister())
      .then(() => self.clients.matchAll({ type: 'window', includeUncontrolled: true }))
      .then(clients => {
        clients.forEach(client => {
          if ('navigate' in client) {
            client.navigate(client.url);
          }
        });
      })
      .catch(() => undefined)
  );
});

self.addEventListener('fetch', () => {
  // No fetch interception while the service worker is disabled.
});
