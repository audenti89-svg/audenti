// Audenti CRM — Service Worker Cleaner & Auto-Purge v5
// Este worker auto-purga cualquier caché residual y se desregistra de inmediato
// para garantizar que Android WebView, WhatsApp y navegadores móviles nunca se bloqueen.
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          console.log('[SW-Cleaner] Purgando caché:', cache);
          return caches.delete(cache);
        })
      );
    }).then(() => {
      console.log('[SW-Cleaner] Desregistrando Service Worker residual...');
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Sin listener de 'fetch' para permitir que el 100% de las peticiones fluyan de forma nativa por la red.
