const HUB_NOTIFICATION_DEFAULT_URL = '/hub/notificacoes';

self.addEventListener('push', event => {
  let payload = {};

  try {
    payload = event.data?.json?.() || {};
  } catch {
    payload = { body: event.data?.text?.() || '' };
  }

  const title = payload.title || payload.titulo || 'Nova notificação do Hub';
  const options = {
    body: payload.body || payload.descricao || 'Você recebeu uma nova notificação.',
    icon: payload.icon || '/hub/assets/logo-transmares.png',
    badge: payload.badge || '/hub/assets/logo-transmares.png',
    tag: payload.tag || payload.id || 'hub-notificacao',
    data: { url: payload.url || payload.rota || HUB_NOTIFICATION_DEFAULT_URL }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || HUB_NOTIFICATION_DEFAULT_URL, self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clients => {
      const cliente = clients.find(item => item.url.startsWith(self.location.origin));
      if (cliente) {
        cliente.focus();
        return cliente.navigate(url);
      }
      return self.clients.openWindow(url);
    })
  );
});
