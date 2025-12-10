/**
 * Service Worker - Background Sync Handler
 *
 * This file handles background sync events when the app is offline
 * or closed. It integrates with the SyncManager to perform
 * automatic synchronization.
 *
 * Requirements: 5.9
 */

// Listen for sync events
self.addEventListener('sync', event => {
  console.log('[SW] Sync event received:', event.tag);

  if (event.tag === 'credisync-sync') {
    event.waitUntil(performSync());
  }
});

/**
 * Perform synchronization
 */
async function performSync() {
  console.log('[SW] Starting background sync...');

  try {
    // Get all clients (open tabs/windows)
    const clients = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    // If there's an open client, send message to perform sync
    if (clients.length > 0) {
      console.log('[SW] Found open client, delegating sync...');

      // Send message to client to perform sync
      clients[0].postMessage({
        type: 'BACKGROUND_SYNC',
        tag: 'credisync-sync'
      });

      // Wait for response from client
      return new Promise((resolve, reject) => {
        const messageChannel = new MessageChannel();

        messageChannel.port1.onmessage = event => {
          if (event.data.success) {
            console.log('[SW] Sync completed successfully');
            showSyncNotification(true, event.data);
            resolve();
          } else {
            console.error('[SW] Sync failed:', event.data.error);
            showSyncNotification(false, event.data);
            reject(new Error(event.data.error));
          }
        };

        clients[0].postMessage(
          {
            type: 'PERFORM_SYNC',
            tag: 'credisync-sync'
          },
          [messageChannel.port2]
        );
      });
    } else {
      // No open clients, we can't perform sync without IndexedDB access
      console.log(
        '[SW] No open clients, sync will be performed when app opens'
      );
      return Promise.resolve();
    }
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    showSyncNotification(false, { error: error.message });
    throw error;
  }
}

/**
 * Show notification after sync
 */
async function showSyncNotification(success, data) {
  try {
    const title = success
      ? '✅ Sincronización completada'
      : '❌ Error de sincronización';

    let body = '';
    if (success) {
      const uploaded = data.uploaded || 0;
      const downloaded = data.downloaded || 0;
      body = `Subidos: ${uploaded}, Descargados: ${downloaded}`;
    } else {
      body = data.error || 'Error desconocido';
    }

    await self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'sync-notification',
      requireInteraction: false,
      silent: false,
      data: {
        timestamp: Date.now(),
        success
      }
    });
  } catch (error) {
    console.error('[SW] Failed to show notification:', error);
  }
}

/**
 * Handle notification clicks
 */
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.notification.tag);

  event.notification.close();

  // Open app when notification is clicked
  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url === self.registration.scope && 'focus' in client) {
            return client.focus();
          }
        }

        // Otherwise, open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
  );
});

console.log('[SW] Background sync handler loaded');
