const CACHE_NAME = 'entrega-pro-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Ignore WebSockets / HMR
  if (
    event.request.url.includes('/vite') || 
    event.request.url.includes('hmr') || 
    requestUrl.protocol === 'ws:' || 
    requestUrl.protocol === 'wss:'
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});

// LISTEN TO PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  let data = {
    title: 'EntregaControle Pro',
    body: 'Bata suas metas diárias!',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
  };

  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'EntregaControle Pro Oficial',
        body: event.data.text(),
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
      };
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/icon-192x192.png',
    vibrate: [300, 100, 300],
    data: {
      url: data.url || '/'
    }
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// HANDLE CLICKING ON NOTIFICATIONS
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      const urlToOpen = event.notification.data?.url || '/';
      
      // Look for a browser window that is already open to this app
      for (const client of clientList) {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(urlToOpen, self.location.origin);
        if (clientUrl.pathname === targetUrl.pathname && 'focus' in client) {
          return client.focus();
        }
      }

      // If no open window, open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
