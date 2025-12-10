/**
 * Configuración centralizada para CrediSync
 *
 * Este archivo define la configuración de la aplicación usando el API factory
 * de @sync/core para inicializar todos los servicios de manera centralizada.
 *
 * Requirements: 4.4, 4.5, 4.6
 */

import {
  createSyncApp,
  createDevConfig,
  createProdConfig,
  type SyncApp
} from '@sync/core';

// ============================================================================
// CONFIGURACIÓN DE LA APLICACIÓN
// ============================================================================

/**
 * Crear configuración basada en el entorno
 */
function createAppConfig() {
  const isDev = import.meta.env.DEV;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (isDev) {
    return createDevConfig('credisync');
  } else {
    if (!supabaseUrl || !supabaseKey) {
      throw new Error(
        'Variables de entorno de Supabase requeridas en producción'
      );
    }
    return createProdConfig('credisync', supabaseUrl, supabaseKey);
  }
}

// ============================================================================
// INSTANCIA GLOBAL DE LA APLICACIÓN
// ============================================================================

/**
 * Instancia global de la aplicación CrediSync
 * Proporciona acceso centralizado a todos los servicios
 */
export const crediSyncApp: SyncApp = createSyncApp(createAppConfig());

// ============================================================================
// SERVICIOS EXPORTADOS PARA COMPATIBILIDAD
// ============================================================================

/**
 * Exportar servicios individuales para mantener compatibilidad
 * con el código existente durante la migración
 */
export const {
  db,
  checksum,
  sync: syncManager,
  syncQueue,
  conflictResolver,
  changeTracker,
  storage: storageManager,
  audit: auditLogger,
  encryption: encryptionService
} = crediSyncApp.services;

// ============================================================================
// FUNCIONES DE UTILIDAD
// ============================================================================

/**
 * Inicializar la aplicación CrediSync
 * Debe llamarse al inicio de la aplicación
 */
export async function initializeCrediSync(): Promise<void> {
  try {
    console.log('🚀 Inicializando CrediSync...');
    await crediSyncApp.start();
    console.log('✅ CrediSync inicializado exitosamente');
  } catch (error) {
    console.error('❌ Error inicializando CrediSync:', error);
    throw error;
  }
}

/**
 * Obtener el estado actual de la aplicación
 */
export async function getAppStatus() {
  return await crediSyncApp.getStatus();
}

/**
 * Detener la aplicación (útil para cleanup)
 */
export async function shutdownCrediSync(): Promise<void> {
  try {
    console.log('🛑 Deteniendo CrediSync...');
    await crediSyncApp.stop();
    console.log('✅ CrediSync detenido exitosamente');
  } catch (error) {
    console.error('❌ Error deteniendo CrediSync:', error);
    throw error;
  }
}

/**
 * Limpiar todos los datos (para desarrollo/testing)
 */
export async function clearAllData(): Promise<void> {
  if (crediSyncApp.isStarted) {
    throw new Error(
      'No se puede limpiar datos mientras la aplicación está iniciada'
    );
  }

  await crediSyncApp.clearData();
}
