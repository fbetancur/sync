import { createSyncApp } from '@sync/core';
import type { SyncAppConfig } from '@sync/types';

// Configuración de CrediSync usando @sync/core
const crediSyncConfig: SyncAppConfig = {
  appName: 'CrediSync',
  version: '1.0.0',
  
  // Configuración de Supabase (preservando credenciales existentes)
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL || 'https://hmnlriywocnpiktflehr.supabase.co',
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDE4MzIsImV4cCI6MjA4MDg3NzgzMn0.P4ZZdWAPgby89Rc8yYAZB9f2bwRrRuLEsS_6peobkf4'
  },
  
  // Configuración offline-first
  offline: {
    enabled: true,
    syncInterval: 30000, // 30 segundos
    maxRetries: 3,
    retryDelay: 1000
  },
  
  // Configuración de sincronización inteligente
  sync: {
    pauseOnActivity: true,
    activityTimeout: 50000, // 50 segundos de inactividad
    forceOnReconnect: true,
    maxSyncInterval: 300000 // 5 minutos máximo
  },
  
  // Configuración de seguridad
  security: {
    encryption: true,
    auditLog: true,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 horas
  }
};

// Crear instancia de la aplicación CrediSync
export const crediSyncApp = createSyncApp(crediSyncConfig);

// Función de inicialización
export async function initializeCrediSync(): Promise<void> {
  try {
    console.log('🚀 Inicializando CrediSync con @sync/core...');
    
    // Inicializar la aplicación
    await crediSyncApp.start();
    
    // Configurar detección de actividad para sync inteligente
    setupActivityDetection();
    
    console.log('✅ CrediSync inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando CrediSync:', error);
    throw error;
  }
}

// Configurar detección de actividad del usuario
function setupActivityDetection(): void {
  const activityEvents = [
    'scroll', 'mousemove', 'mousedown', 'touchstart', 
    'touchmove', 'keydown', 'click', 'input'
  ];
  
  let activityTimer: NodeJS.Timeout | null = null;
  let isUserActive = false;
  
  function onActivity() {
    isUserActive = true;
    
    // Reiniciar timer
    if (activityTimer) {
      clearTimeout(activityTimer);
    }
    
    // Marcar como inactivo después del timeout
    activityTimer = setTimeout(() => {
      isUserActive = false;
      // Trigger sync cuando el usuario esté inactivo
      if (navigator.onLine) {
        crediSyncApp.services.sync.sync({ force: false });
      }
    }, crediSyncConfig.sync?.activityTimeout || 50000);
  }
  
  // Agregar listeners de actividad
  activityEvents.forEach(event => {
    document.addEventListener(event, onActivity, { passive: true });
  });
  
  // Sync forzado al recuperar conexión
  window.addEventListener('online', () => {
    if (!isUserActive) {
      crediSyncApp.services.sync.sync({ force: true });
    }
  });
  
  // Sync inicial después de un delay
  setTimeout(() => {
    if (navigator.onLine && !isUserActive) {
      crediSyncApp.services.sync.sync({ force: false });
    }
  }, 5000);
}

// Obtener estado de la aplicación
export async function getAppStatus() {
  return {
    isInitialized: crediSyncApp.isStarted,
    isOnline: navigator.onLine,
    syncStatus: crediSyncApp.services.sync.isCurrentlySyncing(),
    queueSize: await crediSyncApp.services.sync.getQueueSize()
  };
}