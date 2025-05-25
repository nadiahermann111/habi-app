const CACHE_NAME = 'habi-v2.0.0'; // ZWIĘKSZONA WERSJA!
const urlsToCache = [
  '/',
  '/manifest.json'
  // USUNIĘTO ikony które nie istnieją
];

// Install - cache tylko podstawowe pliki
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker v2: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker v2: Caching essential files only');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker v2: Installation complete');
        return self.skipWaiting(); // Aktywuj natychmiast
      })
  );
});

// Activate - wyczyść WSZYSTKIE stare cache
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker v2: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Usuń WSZYSTKIE stare cache, nie tylko inne wersje
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker v2: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker v2: All old caches cleared');
      return self.clients.claim(); // Przejmij kontrolę natychmiast
    })
  );
});

// Fetch - NETWORK FIRST dla wszystkiego!
self.addEventListener('fetch', (event) => {
  // Zawsze próbuj z sieci NAJPIERW
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        console.log('🌐 Service Worker v2: Network response for:', event.request.url);

        // Cache tylko udane GET responses (nie API calls)
        if (event.request.method === 'GET' &&
            response.status === 200 &&
            !event.request.url.includes('/api/')) {

          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch((error) => {
        console.log('❌ Service Worker v2: Network failed for:', event.request.url);

        // Fallback do cache tylko dla GET requests (nie API)
        if (event.request.method === 'GET' && !event.request.url.includes('/api/')) {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              console.log('📦 Service Worker v2: Serving from cache:', event.request.url);
              return cachedResponse;
            }
            // Jeśli nie ma w cache, zwróć basic error response
            return new Response('Offline - content not available', {
              status: 503,
              statusText: 'Service Unavailable'
            });
          });
        }

        // Dla API calls - nie cache, nie fallback, po prostu przepuść błąd
        throw error;
      })
  );
});