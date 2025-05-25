const CACHE_NAME = 'habi-v1.0.0';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

// Install - cache podstawowe pliki
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Service Worker: Caching files');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('✅ Service Worker: Installation complete');
        return self.skipWaiting(); // Aktywuj natychmiast
      })
  );
});

// Activate - wyczyść stare cache
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('✅ Service Worker: Activation complete');
      return self.clients.claim(); // Przejmij kontrolę nad wszystkimi klientami
    })
  );
});

// Fetch - strategia Network First z Cache Fallback
self.addEventListener('fetch', (event) => {
  // Tylko dla GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Różne strategie dla różnych typów zasobów
  if (event.request.url.includes('/api/')) {
    // API calls - zawsze z sieci, cache jako backup
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Zapisz w cache tylko udane odpowiedzi
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Jeśli sieć nie działa, spróbuj z cache
          return caches.match(event.request);
        })
    );
  } else {
    // Statyczne pliki - Cache First
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          if (response) {
            return response;
          }

          // Jeśli nie ma w cache, pobierz z sieci
          return fetch(event.request).then((response) => {
            // Nie cache-uj jeśli to nie 200 response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });

            return response;
          });
        })
    );
  }
});

// Background Sync - dla offline functionality
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('🔄 Service Worker: Background sync');
    event.waitUntil(
      // Tutaj możesz dodać logikę synchronizacji offline danych
      Promise.resolve()
    );
  }
});

// Push notifications (opcjonalnie)
self.addEventListener('push', (event) => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      data: data.url
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.notification.data) {
    event.waitUntil(
      clients.openWindow(event.notification.data)
    );
  }
});