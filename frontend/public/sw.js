// Gharelu Sewa Service Worker - Offline/Low-Data Mode
const CACHE_NAME = 'gharelu-sewa-v1';
const OFFLINE_URL = '/offline.html';

// Static assets to pre-cache on install
const PRE_CACHE_ASSETS = [
  '/',
  '/offline.html',
  '/manifest.json',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Pre-caching app shell');
      return cache.addAll(PRE_CACHE_ASSETS);
    }).catch(() => {
      // Don't block install if some assets fail
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

// Fetch: Network-first for API, Cache-first for static assets
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip browser-extension and chrome-extension requests
  if (!url.protocol.startsWith('http')) return;

  // For API requests: network first, fail gracefully (no cache)
  if (url.pathname.startsWith('/api/') || url.hostname !== self.location.hostname) {
    event.respondWith(
      fetch(request).catch(() => {
        // Return a JSON offline response for API calls
        return new Response(
          JSON.stringify({ error: 'You are offline. Please check your internet connection.', offline: true }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // For navigation requests (page loads): network first, then cache, then offline page
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful page responses
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          // Try serving from cache
          const cached = await caches.match(request);
          if (cached) return cached;
          // Fallback to root (SPA)
          const rootCached = await caches.match('/');
          if (rootCached) return rootCached;
          // Last resort: offline page
          return caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  // For static assets (JS, CSS, images): cache first, then network
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response.ok) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
        }
        return response;
      }).catch(() => new Response('', { status: 503 }));
    })
  );
});
