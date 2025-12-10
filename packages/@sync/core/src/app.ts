/**
 * Factory principal de aplicación para @sync/core
 * 
 * Proporciona una API centralizada para crear y configurar aplicaciones sync
 * con todos los servicios integrados.
 * 
 * Requirements: 4.4, 4.5, 4.6
 */

import { createDatabase, type MicrocreditosDB } from './db/database';
import { ChecksumService } from './utils/checksum';
import { SyncManager } from './sync/sync-manager';
import { SyncQueue } from './sync/sync-queue';
import { ConflictResolver } from './sync/conflict-resolver';
import { ChangeTracker } from './sync/change-tracker';
import { StorageManager } from './storage/storage-manager';
import { AuditLogger } from './audit/audit-logger';
import { EncryptionService } from './security/encryption-service';

// ============================================================================
// INTERFACES DE CONFIGURACIÓN
// ============================================================================

export interface SyncAppConfig {
  appName: string;
  supabaseUrl?: string;
  supabaseKey?: string;
  encryptionEnabled?: boolean;
  auditEnabled?: boolean;
  syncInterval?: number;
  databaseName?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

export interface SyncAppServices {
  db: MicrocreditosDB;
  checksum: ChecksumService;
  sync: SyncManager;
  syncQueue: SyncQueue;
  conflictResolver: ConflictResolver;
  changeTracker: ChangeTracker;
  storage: StorageManager;
  audit: AuditLogger;
  encryption: EncryptionService;
}

export interface SyncApp {
  // Servicios principales
  services: SyncAppServices;
  
  // Configuración
  config: SyncAppConfig;
  
  // Estado
  isStarted: boolean;
  
  // Métodos de ciclo de vida
  start(): Promise<void>;
  stop(): Promise<void>;
  
  // Métodos de utilidad
  getStatus(): Promise<AppStatus>;
  clearData(): Promise<void>;
}

export interface AppStatus {
  isStarted: boolean;
  isOnline: boolean;
  isSyncing: boolean;
  queueSize: number;
  lastSync: number | null;
  encryptionReady: boolean;
  dbStats: any;
}

// ============================================================================
// FACTORY PRINCIPAL
// ============================================================================

/**
 * Crea una nueva instancia de aplicación sync
 */
export function createSyncApp(config: SyncAppConfig): SyncApp {
  // Configuración por defecto
  const defaultConfig: SyncAppConfig = {
    appName: 'sync-app',
    encryptionEnabled: true,
    auditEnabled: true,
    syncInterval: 30000, // 30 segundos
    databaseName: undefined, // Usar nombre por defecto
    logLevel: 'info'
  };

  const finalConfig: SyncAppConfig = {
    ...defaultConfig,
    ...config
  };

  // Crear instancias de servicios
  const db = createDatabase(finalConfig.databaseName);
  const checksumService = new ChecksumService();
  const syncQueue = new SyncQueue(db);
  const conflictResolver = new ConflictResolver();
  const changeTracker = new ChangeTracker(db);
  const syncManager = new SyncManager(db);
  const storageManager = new StorageManager(db);
  const auditLogger = AuditLogger.getInstance(db);
  const encryptionService = EncryptionService.getInstance();

  // Configurar dependencias
  syncManager.setDatabase(db);
  storageManager.setDatabase(db);
  auditLogger.setDatabase(db);

  const services: SyncAppServices = {
    db,
    checksum: checksumService,
    sync: syncManager,
    syncQueue,
    conflictResolver,
    changeTracker,
    storage: storageManager,
    audit: auditLogger,
    encryption: encryptionService
  };

  let isStarted = false;
  let syncInterval: NodeJS.Timeout | null = null;

  const app: SyncApp = {
    services,
    config: finalConfig,
    isStarted: false,

    async start() {
      if (isStarted) {
        console.warn(`⚠️ ${finalConfig.appName} ya está iniciado`);
        return;
      }

      try {
        console.log(`🚀 Iniciando ${finalConfig.appName}...`);

        // 1. Inicializar base de datos
        await db.initialize();
        console.log('✅ Base de datos inicializada');

        // 2. Configurar encriptación si está habilitada
        if (finalConfig.encryptionEnabled) {
          console.log('🔐 Encriptación habilitada (requiere PIN del usuario)');
        }

        // 3. Configurar auditoría si está habilitada
        if (finalConfig.auditEnabled) {
          console.log('📋 Sistema de auditoría habilitado');
        }

        // 4. Iniciar sincronización periódica si hay configuración de servidor
        if (finalConfig.supabaseUrl && finalConfig.syncInterval) {
          syncInterval = setInterval(async () => {
            try {
              if (syncManager.isOnline() && !syncManager.isCurrentlySyncing()) {
                await syncManager.sync();
              }
            } catch (error) {
              console.error('Error en sincronización automática:', error);
            }
          }, finalConfig.syncInterval);
          
          console.log(`🔄 Sincronización automática cada ${finalConfig.syncInterval}ms`);
        }

        isStarted = true;
        app.isStarted = true;
        
        console.log(`✅ ${finalConfig.appName} iniciado exitosamente`);
      } catch (error) {
        console.error(`❌ Error iniciando ${finalConfig.appName}:`, error);
        throw error;
      }
    },

    async stop() {
      if (!isStarted) {
        console.warn(`⚠️ ${finalConfig.appName} no está iniciado`);
        return;
      }

      try {
        console.log(`🛑 Deteniendo ${finalConfig.appName}...`);

        // 1. Detener sincronización automática
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
          console.log('🔄 Sincronización automática detenida');
        }

        // 2. Cancelar sincronización en curso
        if (syncManager.isCurrentlySyncing()) {
          await syncManager.cancelSync();
          console.log('🚫 Sincronización en curso cancelada');
        }

        // 3. Limpiar encriptación si está habilitada
        if (finalConfig.encryptionEnabled) {
          encryptionService.clearEncryptionKey();
          console.log('🧹 Claves de encriptación limpiadas');
        }

        // 4. Cerrar base de datos
        await db.close();
        console.log('🗄️ Base de datos cerrada');

        isStarted = false;
        app.isStarted = false;
        
        console.log(`✅ ${finalConfig.appName} detenido exitosamente`);
      } catch (error) {
        console.error(`❌ Error deteniendo ${finalConfig.appName}:`, error);
        throw error;
      }
    },

    async getStatus(): Promise<AppStatus> {
      const queueSize = await syncQueue.getQueueSize();
      const dbStats = await db.getStats();
      
      return {
        isStarted,
        isOnline: syncManager.isOnline(),
        isSyncing: syncManager.isCurrentlySyncing(),
        queueSize,
        lastSync: syncManager.getLastSyncTimestamp(),
        encryptionReady: encryptionService.isInitialized(),
        dbStats
      };
    },

    async clearData() {
      if (isStarted) {
        throw new Error('No se puede limpiar datos mientras la aplicación está iniciada');
      }

      console.log('🧹 Limpiando todos los datos...');
      
      // Limpiar base de datos
      await db.clearAll();
      
      // Limpiar almacenamiento de respaldo
      await storageManager.clearBackups();
      
      console.log('✅ Todos los datos limpiados');
    }
  };

  return app;
}

// ============================================================================
// UTILIDADES DE CONFIGURACIÓN
// ============================================================================

/**
 * Crear configuración por defecto para una aplicación
 */
export function createDefaultConfig(appName: string): SyncAppConfig {
  return {
    appName,
    encryptionEnabled: true,
    auditEnabled: true,
    syncInterval: 30000,
    logLevel: 'info'
  };
}

/**
 * Crear configuración para desarrollo
 */
export function createDevConfig(appName: string): SyncAppConfig {
  return {
    ...createDefaultConfig(appName),
    logLevel: 'debug',
    syncInterval: 10000, // Sync más frecuente en desarrollo
    databaseName: `${appName}_dev`
  };
}

/**
 * Crear configuración para producción
 */
export function createProdConfig(appName: string, supabaseUrl: string, supabaseKey: string): SyncAppConfig {
  return {
    ...createDefaultConfig(appName),
    supabaseUrl,
    supabaseKey,
    logLevel: 'warn',
    syncInterval: 60000 // Sync menos frecuente en producción
  };
}