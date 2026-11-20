// Service Worker para Audenti — DentalCloud Pro v4 (Resiliente, sin interrupción de navegación)
const CACHE_NAME = 'audenti-pro-pwa-v4'
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/favicon.png',
  '/apple-touch-icon.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
]

// Instalación: Precaching solo de activos estáticos esenciales
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[SW] Precaching opcional:', err)
      })
    })
  )
  self.skipWaiting()
})

// Activación: Purga total e inmediata de caches antiguos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purgando cache antiguo:', cache)
            return caches.delete(cache)
          }
        })
      )
    }).then(() => self.clients.claim())
  )
})

// Estrategia de Fetch:
// REGLA DE ORO: Las navegaciones de documentos HTML (request.mode === 'navigate')
// NUNCA deben interceptarse con responder undefined, para evitar que Android WebView
// muestre el error "This page couldn't load" (ERR_FAILED).
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  // 1. Permitir que el navegador maneje directamente la navegación de páginas
  if (event.request.mode === 'navigate') {
    return
  }

  const url = new URL(event.request.url)

  // 2. Ignorar peticiones a APIs dinámicas, autenticación y WebSockets
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/auth/') ||
    url.pathname.includes('/realtime/') ||
    url.hostname.includes('supabase.co')
  ) {
    return
  }

  // 3. Activos estáticos (imágenes, fuentes, css, js)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse
      }

      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseToCache = networkResponse.clone()
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache)
            })
          }
          return networkResponse
        })
        .catch(() => {
          // Si falla y no está en cache, no romper con undefined
          return new Response('', { status: 408, statusText: 'Request Timeout' })
        })
    })
  )
})
