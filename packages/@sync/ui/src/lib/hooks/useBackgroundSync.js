/**
 * Hook de Svelte para integración de Background Sync
 *
 * Proporciona integración fácil de Background Sync en componentes Svelte
 */

import { onMount, onDestroy } from 'svelte';

/**
 * Crear hook de background sync con servicios inyectados
 */
export function createBackgroundSyncHook(backgroundSyncManager, syncManager) {
  if (!backgroundSyncManager || !syncManager) {
    throw new Error(
      'backgroundSyncManager y syncManager son requeridos para createBackgroundSyncHook'
    );
  }

  return function useBackgroundSync(options = {}) {
    let messageHandler = null;

    onMount(() => {
      // Configurar listener de mensajes para mensajes del Service Worker
      messageHandler = async event => {
        if (event.data && event.data.type === 'BACKGROUND_SYNC') {
          console.log('📨 Recibida solicitud de background sync del SW');

          try {
            const result = await syncManager.sync();

            if (result.success) {
              options.onSyncComplete?.(result);
            } else {
              options.onSyncError?.(new Error(result.errors.join(', ')));
            }
          } catch (error) {
            options.onSyncError?.(error);
          }
        }

        // Manejar mensaje PERFORM_SYNC con puerto de respuesta
        if (event.data && event.data.type === 'PERFORM_SYNC') {
          console.log('📨 Realizando sync para SW...');

          try {
            const result = await syncManager.sync();

            // Enviar respuesta de vuelta a través del puerto de mensaje
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({
                success: result.success,
                uploaded: result.uploaded,
                downloaded: result.downloaded,
                error: result.success ? null : result.errors.join(', ')
              });
            }

            if (result.success) {
              options.onSyncComplete?.(result);
            } else {
              options.onSyncError?.(new Error(result.errors.join(', ')));
            }
          } catch (error) {
            // Enviar respuesta de error
            if (event.ports && event.ports[0]) {
              event.ports[0].postMessage({
                success: false,
                error: error.message
              });
            }

            options.onSyncError?.(error);
          }
        }
      };

      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.addEventListener('message', messageHandler);
      }

      // Auto-registrar sync si está habilitado
      if (options.autoRegister) {
        backgroundSyncManager.registerSync({
          onSuccess: () => {
            console.log('✅ Background sync completado');
            options.onSyncComplete?.({ success: true });
          },
          onFailure: error => {
            console.error('❌ Background sync falló:', error);
            options.onSyncError?.(error);
          }
        });
      }
    });

    onDestroy(() => {
      // Limpiar listener de mensajes
      if (
        messageHandler &&
        typeof navigator !== 'undefined' &&
        navigator.serviceWorker
      ) {
        navigator.serviceWorker.removeEventListener('message', messageHandler);
      }

      // Detener sync de fallback
      if (backgroundSyncManager.stopFallback) {
        backgroundSyncManager.stopFallback();
      }
    });

    return {
      /**
       * Activar manualmente el registro de background sync
       */
      registerSync: async () => {
        return await backgroundSyncManager.registerSync({
          onSuccess: () => options.onSyncComplete?.({ success: true }),
          onFailure: error => options.onSyncError?.(error)
        });
      },

      /**
       * Verificar si Background Sync está soportado
       */
      isSupported: () => backgroundSyncManager.isSupported(),

      /**
       * Solicitar permiso de notificación
       */
      requestNotificationPermission: async () => {
        if (backgroundSyncManager.requestNotificationPermission) {
          return await backgroundSyncManager.requestNotificationPermission();
        }
        return false;
      },

      /**
       * Obtener tags de sync pendientes
       */
      getPendingTags: async () => {
        if (backgroundSyncManager.getPendingTags) {
          return await backgroundSyncManager.getPendingTags();
        }
        return [];
      },

      /**
       * Mostrar una notificación de sync
       */
      showNotification: async (title, body) => {
        if (backgroundSyncManager.showSyncNotification) {
          return await backgroundSyncManager.showSyncNotification(title, body);
        }
        return false;
      }
    };
  };
}

/**
 * Hook de background sync básico (requiere inyección de servicios)
 * Para usar este hook, primero debe crear una instancia con createBackgroundSyncHook()
 */
export function useBackgroundSync(
  backgroundSyncManager,
  syncManager,
  options = {}
) {
  if (!backgroundSyncManager || !syncManager) {
    console.warn(
      'useBackgroundSync: backgroundSyncManager y syncManager no proporcionados. Use createBackgroundSyncHook() en su lugar.'
    );
    return {
      registerSync: async () => false,
      isSupported: () => false,
      requestNotificationPermission: async () => false,
      getPendingTags: async () => [],
      showNotification: async () => false
    };
  }

  const hookFactory = createBackgroundSyncHook(
    backgroundSyncManager,
    syncManager
  );
  return hookFactory(options);
}
