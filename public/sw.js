const CACHE_NAME = 'monthly-money-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/login',
  '/signup',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/favicon.ico'
];

// Install Event - Pre-cache vital shell pages & assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Pre-caching App Shell');
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - Clean up stale cache registries
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Clearing stale cache:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event - Caching strategy
self.addEventListener('fetch', (event) => {
  const req = event.request;
  
  // Skip non-GET requests (e.g. POST api queries)
  if (req.method !== 'GET') return;

  // Skip chrome extension / internal requests
  if (!req.url.startsWith(self.location.origin)) return;

  // Ignore Hot Module Replacement or dev server polling assets
  if (req.url.includes('_next/webpack-hmr') || req.url.includes('webpack')) return;

  // Caching Strategy:
  // 1. Static Assets (JS, CSS, Images, Fonts) -> Cache First
  if (
    req.url.includes('_next/static') ||
    req.url.endsWith('.png') ||
    req.url.endsWith('.svg') ||
    req.url.endsWith('.ico') ||
    req.url.includes('fonts.googleapis.com') ||
    req.url.includes('fonts.gstatic.com')
  ) {
    event.respondWith(
      caches.match(req).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(req).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
          return networkResponse;
        }).catch(() => cachedResponse);
      })
    );
    return;
  }

  // 2. HTML Pages & Data APIs -> Network First with Cache Fallback
  event.respondWith(
    fetch(req)
      .then((networkResponse) => {
        // Cache successful page/api responses
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(req, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        // Fallback to cache if network is unavailable
        return caches.match(req).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If a page fetch fails and is not in cache, fallback to offline shell if needed
          if (req.mode === 'navigate') {
            return caches.match('/');
          }
          return new Response('Network error occurred and no cached data is available.', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({ 'Content-Type': 'text/plain' })
          });
        });
      })
  );
});
