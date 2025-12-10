import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { crediSyncApp, initializeCrediSync } from '$lib/app-config';

// Store para el estado de sincronización
export const isOnline = writable(browser ? navigator.onLine : false);
export const isSyncing = writable(false);
export const lastSync = writable(null);
export const syncCounter = writable(0);

// Actualizar estado de conexión
function updateOnlineStatus() {
  if (browser) {
    isOnline.set(navigator.onLine);
  }
}

// Listeners para cambios de conexión
if (browser) {
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
}

// Wrapper para funciones de sincronización
export const sync = {
  // Obtener estado de sincronización
  async getStatus() {
    if (!crediSyncApp.isStarted) {
      await initializeCrediSync();
    }
    
    return {
      isOnline: browser ? navigator.onLine : false,
      isSyncing: crediSyncApp.services.sync.isCurrentlySyncing(),
      queueSize: await crediSyncApp.services.sync.getQueueSize()
    };
  },

  // Forzar sincronización manual
  async syncNow() {
    if (!crediSyncApp.isStarted) {
      await initializeCrediSync();
    }
    
    if (browser && !navigator.onLine) {
      throw new Error('No hay conexión a internet');
    }
    
    isSyncing.set(true);
    
    try {
      const result = await crediSyncApp.services.sync.sync({ force: true });
      lastSync.set(Date.now());
      return result;
    } finally {
      isSyncing.set(false);
    }
  },

  // Obtener operaciones pendientes
  async getPendingOperations() {
    if (!crediSyncApp.isStarted) {
      await initializeCrediSync();
    }
    
    return await crediSyncApp.services.sync.getPendingOperations();
  }
};