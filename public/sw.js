// Service Worker 24/7 de Notificaciones Push de Audenti CRM (Dra. Aura Estudillo)
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Escucha de notificaciones push enviadas desde el servidor
self.addEventListener('push', (event) => {
  let data = {
    title: '🔔 Audenti CRM - Dra. Aura',
    body: 'Tienes una nueva actualización de un paciente en tiempo real.',
    icon: '/logo.png',
    badge: '/logo.png',
    url: '/dashboard/chat',
    tag: 'audenti-notification',
    timestamp: Date.now()
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...parsed };
    } catch (e) {
      data.body = event.data.text() || data.body;
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/logo.png',
    badge: data.badge || '/logo.png',
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || 'audenti-push',
    renotify: true,
    requireInteraction: true,
    data: {
      url: data.url || '/dashboard/chat'
    },
    actions: [
      { action: 'open_chat', title: '💬 Abrir Chat' },
      { action: 'close', title: 'Entendido' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Manejo del clic en la notificación nativa (incluso con app en segundo plano o cerrada)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  const targetUrl = event.notification.data?.url || '/dashboard/chat';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('/dashboard') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
