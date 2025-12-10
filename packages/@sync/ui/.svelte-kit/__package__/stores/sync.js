/**
 * Store de Sincronización
 *
 * Store reactivo para el estado de sincronización global
 */

import { writable, derived } from 'svelte/store';

// Estado de sincronización
const syncState = writable({
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  isSyncing: false,
  lastSync: null,
  queueSize: 0,
  error: null
});

/**
 * Crear store de sincronización con gestor inyectado
 */
export function createSyncStore(syncManager) {
  if (!syncManager) {
    console.warn('createSyncStore: syncManager no proporcionado');
    return syncState;
  }

  const { subscribe, update } = syncState;

  // Actualizar estado de conexión
  function updateOnlineStatus() {
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    update(state => ({ ...state, isOnline }));
  }

  // Listeners de eventos de conexión
  if (typeof window !== 'undefined') {
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
  }

  return {
    subscribe,

    /**
     * Iniciar sincronización
     */
    async startSync() {
      update(state => ({ ...state, isSyncing: true, error: null }));

      try {
        const result = await syncManager.sync();

        update(state => ({
          ...state,
          isSyncing: false,
          lastSync: Date.now(),
          error: result.success ? null : result.errors.join(', ')
        }));

        return result;
      } catch (error) {
        update(state => ({
          ...state,
          isSyncing: false,
          error: error.message
        }));
        throw error;
      }
    },

    /**
     * Actualizar tamaño de la cola
     */
    async updateQueueSize() {
      try {
        const queueSize = await syncManager.getQueueSize();
        update(state => ({ ...state, queueSize }));
      } catch (error) {
        console.error('Error actualizando tamaño de cola:', error);
      }
    },

    /**
     * Limpiar error
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    },

    /**
     * Actualizar estado de conexión manualmente
     */
    updateOnlineStatus
  };
}

// Store básico sin inyección de dependencias
export const syncStore = syncState;

// Stores derivados
export const isOnline = derived(syncState, $state => $state.isOnline);
export const isSyncing = derived(syncState, $state => $state.isSyncing);
export const syncError = derived(syncState, $state => $state.error);
export const queueSize = derived(syncState, $state => $state.queueSize);
