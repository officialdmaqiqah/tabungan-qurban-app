const CACHE_NAME = 'makt-pwa-v2';

// Static public assets to precache (strictly static icons/manifest/logos only)
const PRECACHE_ASSETS = [
  '/manifest.webmanifest',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/icons/icon-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/logo-dark.png',
  '/logo-white.png',
];

// Install Event: cache static assets and skip waiting immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .catch((err) => {
        console.warn('[SW] Precache asset warning:', err);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate Event: clean up outdated caches (including makt-pwa-v1) & claim clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames.map((name) => {
            if (name !== CACHE_NAME) {
              console.log('[SW] Purging old cache:', name);
              return caches.delete(name);
            }
          })
        )
      )
      .then(() => self.clients.claim())
  );
});

// Fetch Event: strictly enforce network-only for all private/financial/dynamic data & pages
self.addEventListener('fetch', (event) => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);

  // SECURITY RULE:
  // Never cache API routes, admin, dashboard, auth, Supabase queries, mutations, or private tokens.
  const isPrivateOrDynamic =
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/admin') ||
    url.pathname.startsWith('/dashboard') ||
    url.pathname.startsWith('/auth') ||
    url.hostname.includes('supabase.co') ||
    url.searchParams.has('token') ||
    url.pathname.includes('storage/v1/object');

  if (isPrivateOrDynamic) {
    // Pure network only — never touch cache storage
    return;
  }

  // HTML page navigations (e.g. /login, /, /transparansi):
  // ALWAYS Network First to guarantee latest HTML and UI state
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request).catch((err) => {
        return caches.match(event.request).then((cached) => {
          if (cached) return cached;
          return Promise.reject(err);
        });
      })
    );
    return;
  }

  // Static assets (CSS, JS chunks, fonts, icons, images)
  const isStaticAsset =
    url.pathname.startsWith('/_next/static') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.jpeg') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webp') ||
    url.pathname.endsWith('.woff2');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Stale-While-Revalidate in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Default fallback to network
  event.respondWith(fetch(event.request));
});
