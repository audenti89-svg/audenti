// Service Worker para Audenti — DentalCloud Pro (Windows, macOS, Linux, iOS, Android)
const CACHE_NAME = 'audenti-pro-pwa-v2'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  '/dashboard',
]

// Instalación
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precaching fallido para algunos recursos:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación y limpieza de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache)
          }
        })
      )
    })
  )
  self.clients.claim()
})

// Estrategia Network-First con fallback a Cache para soporte offline continuo
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)

  // Ignorar peticiones a APIs dinámicas y WebSockets de Supabase/9Router
  if (url.pathname.startsWith('/api/') || url.pathname.includes('/realtime/')) {
    return
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // Guardar copia en cache si es respuesta válida
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache)
          })
        }
        return networkResponse
      })
      .catch(() => {
        // En caso de estar sin conexión, responder con el cache
        return caches.match(event.request)
      })
  )
})
