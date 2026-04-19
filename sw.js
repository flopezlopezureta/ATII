const CACHE_NAME = 'condo-access-cache-v6'; // Incremented cache version for a clean update
const URLS_TO_PRECACHE = [
  '/',
  'index.html',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'dist/bundle.js'
  // Note: We do not precache tailwindcss CDN as it causes a CORS error.
  // It will be cached on the first successful fetch instead.
];

self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log(`Opened cache ${CACHE_NAME}`);
        return cache.addAll(URLS_TO_PRECACHE);
      })
      .then(() => {
        console.log('All specified URLs have been cached.');
      })
      .catch(err => {
        console.error('Failed to cache one or more resources during install:', err);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

self.addEventListener('fetch', event => {
  // We only handle GET requests and ignore other schemes like chrome-extension
  if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(cache => {
      return cache.match(event.request)
        .then(response => {
          // If the resource is in the cache, return it
          if (response) {
            return response;
          }

          // If not in cache, fetch from the network
          return fetch(event.request).then(networkResponse => {
            // Check if we received a valid response before caching
            // This is especially important for opaque responses (like from a CDN without CORS)
            // which have a status of 0. We will cache them anyway.
            if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
               // Clone the response because it's a stream and can only be consumed once.
               const responseToCache = networkResponse.clone();
               // Cache the new response for future use.
               cache.put(event.request, responseToCache);
            }
            return networkResponse;
          });
        }).catch(error => {
            console.error('Fetch error:', error);
            // Optional: return a fallback page if network fails
            // For now, it will just fail as the browser would.
        });
    })
  );
});