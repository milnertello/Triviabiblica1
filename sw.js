// © 2026 Milner Tello Guzman. Todos los derechos reservados.

// Service Worker para cacheo offline y PWA
const CACHE_NAME = 'trivia-biblica-v1.5';
const urlsToCache = [
  'index.html',
  'juego.html',
  'manifest.json',
  'css/style.css',
  'js/script.js',
  'js/daily-texts.js',
  'js/daily-texts.json',
  'icons/icon-192x192.png',
  'icons/icon-512x512.png',
].map(path => new URL(path, self.registration.scope).href);

// Instalación del service worker
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting())
  );
});

// Activación y limpieza de caches antiguos
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de cache: Cache First para recursos estáticos, Network First para preguntas
self.addEventListener('fetch', event => {
  if (new URL(event.request.url).pathname.includes('/preguntas/')) {
    event.respondWith((async () => {
      try {
        const response = await fetch(event.request);
        if (response.ok) {
          const cache = await caches.open(CACHE_NAME);
          await cache.put(event.request, response.clone());
        }
        return response;
      } catch (error) {
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        throw error;
      }
    })());
  } else {
    // Cache First para otros recursos
    event.respondWith((async () => {
      const cachedResponse = await caches.match(event.request);
      return cachedResponse || fetch(event.request);
    })());
  }
});