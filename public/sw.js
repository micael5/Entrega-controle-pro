const CACHE_NAME = 'controlpro-cache-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).then(() => {
        // Read index.html to dynamically find and cache compiled assets (JS, CSS, fonts)
        return fetch('/index.html')
          .then((res) => res.text())
          .then((html) => {
            const regex = /src=["']([^"']+)["']|href=["']([^"']+)["']/g;
            const matches = [];
            let match;
            while ((match = regex.exec(html)) !== null) {
              const url = match[1] || match[2];
              if (url && (url.startsWith('/assets/') || url.includes('fonts.googleapis') || url.includes('fonts.gstatic'))) {
                matches.push(url);
              }
            }
            if (matches.length > 0) {
              console.log('Dynamic pre-caching compiled assets:', matches);
              return cache.addAll(matches);
            }
          });
      }).catch((err) => {
        console.warn('Initial caching warning: ', err);
      });
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

// Advanced offline-first fetch interception caching strategy
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Skip web socket / HMR requests and browser extensions
  if (
    event.request.url.includes('/vite') || 
    event.request.url.includes('hmr') || 
    requestUrl.protocol === 'ws:' || 
    requestUrl.protocol === 'wss:' ||
    !event.request.url.startsWith(self.location.origin) && !event.request.url.includes('gstatic') && !event.request.url.includes('googleapis') && !event.request.url.includes('icons8')
  ) {
    return;
  }

  // Handle requests with Cache-First & Network Fallback Strategy with auto caching
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch in background to update cache (Stale-While-Revalidate)
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && event.request.method === 'GET') {
            const cacheCopy = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, cacheCopy);
            });
          }
        }).catch(() => {/* Ignore background fetch errors when offline */});
        
        return cachedResponse;
      }

      // If not cached, fetch from network and dynamically store in cache
      return fetch(event.request).then((networkResponse) => {
        if (!networkResponse || networkResponse.status !== 200 || event.request.method !== 'GET') {
          return networkResponse;
        }

        const cacheCopy = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, cacheCopy);
        });

        return networkResponse;
      }).catch(() => {
        // Fallback for document navigation if completely offline
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') || caches.match('/');
        }
      });
    })
  );
});

// NATIVE ANDROID WIDGET MANIFEST EVENTS & INTERACTIONS
// Triggered when the user clicks on the native widget on their Android Home Screen
self.addEventListener('widgetclick', (event) => {
  const action = event.action; // e.g., 'open_app'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      // Focus on already open instance of EntregaControle Pro
      const matchingClient = clientsArr.find((c) => {
        return new URL(c.url).pathname === '/';
      });
      if (matchingClient) {
        return matchingClient.focus();
      }
      // If none is found, open a new browser window of the app
      if (self.clients.openWindow) {
        return self.clients.openWindow('/');
      }
    })
  );
});

// Sync data update triggers for widgets
self.addEventListener('widgetinstall', (event) => {
  console.log('Native widget installed successfully:', event.widget);
  // Perform first-time rendering fetch to sync values
});

self.addEventListener('widgetuninstall', (event) => {
  console.log('Native widget removed from home screen:', event.widget);
});

