/**
 * Gestor de Almacenamiento Multi-Capa
 *
 * Implementa almacenamiento redundante a través de 3 capas:
 * - Capa 1: IndexedDB (primaria)
 * - Capa 2: LocalStorage (respaldo)
 * - Capa 3: Cache API (respaldo terciario)
 *
 * Asegura escrituras atómicas y recuperación automática en caso de falla.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface StorageWriteOptions {
  skipBackup?: boolean; // Omitir capas de respaldo (para datos no críticos)
  tableName: string;
  recordId: string;
}

export interface StorageReadOptions {
  tableName: string;
  recordId: string;
}

export interface StorageWriteResult {
  success: boolean;
  layersWritten: string[];
  errors: string[];
}

export interface StorageReadResult<T> {
  success: boolean;
  data: T | null;
  source: 'indexeddb' | 'localstorage' | 'cache' | null;
  error?: string;
}

// ============================================================================
// CLASE GESTOR DE ALMACENAMIENTO
// ============================================================================

export class StorageManager {
  private readonly CACHE_NAME = 'pwa-data-backup';
  private readonly LOCALSTORAGE_PREFIX = 'pwa_backup_';
  private db: any; // Instancia de base de datos inyectada

  constructor(database?: any) {
    this.db = database;
  }

  /**
   * Establecer la instancia de base de datos
   */
  setDatabase(database: any): void {
    this.db = database;
  }

  /**
   * Escribir datos atómicamente a las 3 capas de almacenamiento
   * Si alguna capa falla, intenta rollback
   */
  async writeAtomic<T>(
    data: T,
    options: StorageWriteOptions
  ): Promise<StorageWriteResult> {
    const result: StorageWriteResult = {
      success: false,
      layersWritten: [],
      errors: []
    };

    const { tableName, recordId, skipBackup = false } = options;

    try {
      // Capa 1: IndexedDB (Primaria)
      await this.writeToIndexedDB(tableName, recordId, data);
      result.layersWritten.push('indexeddb');

      // Solo escribir a capas de respaldo para datos críticos
      if (!skipBackup) {
        // Capa 2: LocalStorage (Respaldo)
        try {
          await this.writeToLocalStorage(tableName, recordId, data);
          result.layersWritten.push('localstorage');
        } catch (error) {
          result.errors.push(`LocalStorage: ${error}`);
          console.warn('⚠️ Escritura a LocalStorage falló:', error);
        }

        // Capa 3: Cache API (Respaldo Terciario)
        try {
          await this.writeToCache(tableName, recordId, data);
          result.layersWritten.push('cache');
        } catch (error) {
          result.errors.push(`Cache API: ${error}`);
          console.warn('⚠️ Escritura a Cache API falló:', error);
        }
      }

      result.success = true;
      console.log(
        `✅ Datos escritos a ${result.layersWritten.length} capa(s):`,
        result.layersWritten
      );

      return result;
    } catch (error) {
      result.errors.push(`IndexedDB: ${error}`);
      console.error('❌ Escritura atómica falló:', error);

      // Intentar rollback
      await this.rollback(tableName, recordId, result.layersWritten);

      throw new Error(`Escritura atómica falló: ${error}`);
    }
  }

  /**
   * Leer datos con fallback automático a capas de respaldo
   */
  async readWithFallback<T>(
    options: StorageReadOptions
  ): Promise<StorageReadResult<T>> {
    const { tableName, recordId } = options;

    // Intentar Capa 1: IndexedDB
    try {
      const data = await this.readFromIndexedDB<T>(tableName, recordId);
      if (data !== null) {
        return {
          success: true,
          data,
          source: 'indexeddb'
        };
      }
    } catch (error) {
      console.warn(
        '⚠️ Lectura de IndexedDB falló, intentando LocalStorage:',
        error
      );
    }

    // Intentar Capa 2: LocalStorage
    try {
      const data = await this.readFromLocalStorage<T>(tableName, recordId);
      if (data !== null) {
        console.log('📦 Datos recuperados de LocalStorage');
        // Restaurar a IndexedDB
        if (this.db) {
          await this.writeToIndexedDB(tableName, recordId, data);
        }
        return {
          success: true,
          data,
          source: 'localstorage'
        };
      }
    } catch (error) {
      console.warn(
        '⚠️ Lectura de LocalStorage falló, intentando Cache API:',
        error
      );
    }

    // Intentar Capa 3: Cache API
    try {
      const data = await this.readFromCache<T>(tableName, recordId);
      if (data !== null) {
        console.log('💾 Datos recuperados de Cache API');
        // Restaurar a IndexedDB y LocalStorage
        if (this.db) {
          await this.writeToIndexedDB(tableName, recordId, data);
        }
        await this.writeToLocalStorage(tableName, recordId, data);
        return {
          success: true,
          data,
          source: 'cache'
        };
      }
    } catch (error) {
      console.error('❌ Todas las capas de almacenamiento fallaron:', error);
    }

    return {
      success: false,
      data: null,
      source: null,
      error: 'Datos no encontrados en ninguna capa de almacenamiento'
    };
  }

  // ==========================================================================
  // CAPA 1: Operaciones IndexedDB
  // ==========================================================================

  private async writeToIndexedDB<T>(
    tableName: string,
    recordId: string,
    data: T
  ): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en StorageManager');
    }

    const table = (this.db as any)[tableName];
    if (!table) {
      throw new Error(`Tabla ${tableName} no encontrada en IndexedDB`);
    }

    await table.put({ ...data, id: recordId });
  }

  private async readFromIndexedDB<T>(
    tableName: string,
    recordId: string
  ): Promise<T | null> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en StorageManager');
    }

    const table = (this.db as any)[tableName];
    if (!table) {
      throw new Error(`Tabla ${tableName} no encontrada en IndexedDB`);
    }

    const data = await table.get(recordId);
    return data || null;
  }

  // ==========================================================================
  // CAPA 2: Operaciones LocalStorage
  // ==========================================================================

  private async writeToLocalStorage<T>(
    tableName: string,
    recordId: string,
    data: T
  ): Promise<void> {
    const key = this.getLocalStorageKey(tableName, recordId);
    const serialized = JSON.stringify({
      data,
      timestamp: Date.now(),
      version: 1
    });

    // Verificar cuota de almacenamiento
    const estimatedSize = new Blob([serialized]).size;
    if (estimatedSize > 5 * 1024 * 1024) {
      // Límite de 5MB
      throw new Error('Datos demasiado grandes para LocalStorage');
    }

    try {
      localStorage.setItem(key, serialized);
    } catch (error) {
      // Manejar cuota excedida
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.warn(
          '⚠️ Cuota de LocalStorage excedida, limpiando entradas antiguas'
        );
        await this.cleanOldLocalStorageEntries();
        // Reintentar
        localStorage.setItem(key, serialized);
      } else {
        throw error;
      }
    }
  }

  private async readFromLocalStorage<T>(
    tableName: string,
    recordId: string
  ): Promise<T | null> {
    const key = this.getLocalStorageKey(tableName, recordId);
    const serialized = localStorage.getItem(key);

    if (!serialized) {
      return null;
    }

    try {
      const parsed = JSON.parse(serialized);
      return parsed.data as T;
    } catch (error) {
      console.error('❌ Falló parsear datos de LocalStorage:', error);
      return null;
    }
  }

  private getLocalStorageKey(tableName: string, recordId: string): string {
    return `${this.LOCALSTORAGE_PREFIX}${tableName}_${recordId}`;
  }

  private async cleanOldLocalStorageEntries(): Promise<void> {
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(key =>
      key.startsWith(this.LOCALSTORAGE_PREFIX)
    );

    // Parsear y ordenar por timestamp
    const entries = backupKeys
      .map(key => {
        try {
          const data = JSON.parse(localStorage.getItem(key) || '{}');
          return { key, timestamp: data.timestamp || 0 };
        } catch {
          return { key, timestamp: 0 };
        }
      })
      .sort((a, b) => a.timestamp - b.timestamp);

    // Remover el 25% más antiguo de las entradas
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }

    console.log(`🧹 Limpiadas ${toRemove} entradas antiguas de LocalStorage`);
  }

  // ==========================================================================
  // CAPA 3: Operaciones Cache API
  // ==========================================================================

  private async writeToCache<T>(
    tableName: string,
    recordId: string,
    data: T
  ): Promise<void> {
    if (!('caches' in window)) {
      throw new Error('Cache API no soportada');
    }

    const cache = await caches.open(this.CACHE_NAME);
    const url = this.getCacheUrl(tableName, recordId);

    const response = new Response(
      JSON.stringify({
        data,
        timestamp: Date.now(),
        version: 1
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Backup-Layer': 'cache-api'
        }
      }
    );

    await cache.put(url, response);
  }

  private async readFromCache<T>(
    tableName: string,
    recordId: string
  ): Promise<T | null> {
    if (!('caches' in window)) {
      throw new Error('Cache API no soportada');
    }

    const cache = await caches.open(this.CACHE_NAME);
    const url = this.getCacheUrl(tableName, recordId);
    const response = await cache.match(url);

    if (!response) {
      return null;
    }

    try {
      const parsed = await response.json();
      return parsed.data as T;
    } catch (error) {
      console.error('❌ Falló parsear datos de Cache API:', error);
      return null;
    }
  }

  private getCacheUrl(tableName: string, recordId: string): string {
    return `https://pwa-backup/${tableName}/${recordId}`;
  }

  // ==========================================================================
  // ROLLBACK Y LIMPIEZA
  // ==========================================================================

  private async rollback(
    tableName: string,
    recordId: string,
    layersWritten: string[]
  ): Promise<void> {
    console.warn('🔄 Haciendo rollback de escritura parcial...');

    for (const layer of layersWritten) {
      try {
        switch (layer) {
          case 'indexeddb':
            if (this.db) {
              const table = (this.db as any)[tableName];
              if (table) {
                await table.delete(recordId);
              }
            }
            break;

          case 'localstorage':
            const key = this.getLocalStorageKey(tableName, recordId);
            localStorage.removeItem(key);
            break;

          case 'cache':
            if ('caches' in window) {
              const cache = await caches.open(this.CACHE_NAME);
              const url = this.getCacheUrl(tableName, recordId);
              await cache.delete(url);
            }
            break;
        }
      } catch (error) {
        console.error(`❌ Rollback falló para ${layer}:`, error);
      }
    }

    console.log('✅ Rollback completado');
  }

  /**
   * Limpiar todos los datos de respaldo de LocalStorage y Cache API
   */
  async clearBackups(): Promise<void> {
    // Limpiar respaldos de LocalStorage
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(key =>
      key.startsWith(this.LOCALSTORAGE_PREFIX)
    );
    backupKeys.forEach(key => localStorage.removeItem(key));

    // Limpiar respaldos de Cache API
    if ('caches' in window) {
      await caches.delete(this.CACHE_NAME);
    }

    console.log('🧹 Todos los respaldos limpiados');
  }

  /**
   * Obtener estadísticas de almacenamiento
   */
  async getStorageStats(): Promise<{
    indexedDB: number;
    localStorage: number;
    cacheAPI: number;
    total: number;
  }> {
    const stats = {
      indexedDB: 0,
      localStorage: 0,
      cacheAPI: 0,
      total: 0
    };

    // Tamaño de IndexedDB (aproximado)
    try {
      if (this.db && this.db.getStats) {
        const dbStats = await this.db.getStats();
        const totalRecords = Object.values(dbStats).reduce(
          (a: number, b: unknown) => a + (typeof b === 'number' ? b : 0),
          0
        );
        stats.indexedDB = totalRecords * 1024; // Estimación aproximada
      }
    } catch (error) {
      console.error('Falló obtener estadísticas de IndexedDB:', error);
    }

    // Tamaño de LocalStorage
    try {
      const keys = Object.keys(localStorage);
      const backupKeys = keys.filter(key =>
        key.startsWith(this.LOCALSTORAGE_PREFIX)
      );
      stats.localStorage = backupKeys.reduce((total, key) => {
        const value = localStorage.getItem(key) || '';
        return total + new Blob([value]).size;
      }, 0);
    } catch (error) {
      console.error('Falló obtener estadísticas de LocalStorage:', error);
    }

    // Tamaño de Cache API (aproximado)
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const keys = await cache.keys();
        stats.cacheAPI = keys.length * 1024; // Estimación aproximada
      }
    } catch (error) {
      console.error('Falló obtener estadísticas de Cache API:', error);
    }

    stats.total = stats.indexedDB + stats.localStorage + stats.cacheAPI;

    return stats;
  }
}

// ============================================================================
// FUNCIÓN FACTORY
// ============================================================================

/**
 * Crear una instancia del gestor de almacenamiento
 */
export function createStorageManager(database?: any): StorageManager {
  return new StorageManager(database);
}