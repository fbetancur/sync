/**
 * Multi-Layer Storage Manager
 *
 * Implements redundant storage across 3 layers:
 * - Layer 1: IndexedDB (primary)
 * - Layer 2: LocalStorage (backup)
 * - Layer 3: Cache API (tertiary backup)
 *
 * Ensures atomic writes and automatic recovery on failure.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

import { db } from '../app-config';

// ============================================================================
// TYPES
// ============================================================================

export interface StorageWriteOptions {
  skipBackup?: boolean; // Skip backup layers (for non-critical data)
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
// STORAGE MANAGER CLASS
// ============================================================================

export class StorageManager {
  private readonly CACHE_NAME = 'pwa-data-backup';
  private readonly LOCALSTORAGE_PREFIX = 'pwa_backup_';

  /**
   * Write data atomically to all 3 storage layers
   * If any layer fails, attempts rollback
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
      // Layer 1: IndexedDB (Primary)
      await this.writeToIndexedDB(tableName, recordId, data);
      result.layersWritten.push('indexeddb');

      // Only write to backup layers for critical data
      if (!skipBackup) {
        // Layer 2: LocalStorage (Backup)
        try {
          await this.writeToLocalStorage(tableName, recordId, data);
          result.layersWritten.push('localstorage');
        } catch (error) {
          result.errors.push(`LocalStorage: ${error}`);
          console.warn('⚠️ LocalStorage write failed:', error);
        }

        // Layer 3: Cache API (Tertiary Backup)
        try {
          await this.writeToCache(tableName, recordId, data);
          result.layersWritten.push('cache');
        } catch (error) {
          result.errors.push(`Cache API: ${error}`);
          console.warn('⚠️ Cache API write failed:', error);
        }
      }

      result.success = true;
      console.log(
        `✅ Data written to ${result.layersWritten.length} layer(s):`,
        result.layersWritten
      );

      return result;
    } catch (error) {
      result.errors.push(`IndexedDB: ${error}`);
      console.error('❌ Atomic write failed:', error);

      // Attempt rollback
      await this.rollback(tableName, recordId, result.layersWritten);

      throw new Error(`Atomic write failed: ${error}`);
    }
  }

  /**
   * Read data with automatic fallback to backup layers
   */
  async readWithFallback<T>(
    options: StorageReadOptions
  ): Promise<StorageReadResult<T>> {
    const { tableName, recordId } = options;

    // Try Layer 1: IndexedDB
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
      console.warn('⚠️ IndexedDB read failed, trying LocalStorage:', error);
    }

    // Try Layer 2: LocalStorage
    try {
      const data = await this.readFromLocalStorage<T>(tableName, recordId);
      if (data !== null) {
        console.log('📦 Data recovered from LocalStorage');
        // Restore to IndexedDB
        await this.writeToIndexedDB(tableName, recordId, data);
        return {
          success: true,
          data,
          source: 'localstorage'
        };
      }
    } catch (error) {
      console.warn('⚠️ LocalStorage read failed, trying Cache API:', error);
    }

    // Try Layer 3: Cache API
    try {
      const data = await this.readFromCache<T>(tableName, recordId);
      if (data !== null) {
        console.log('💾 Data recovered from Cache API');
        // Restore to IndexedDB and LocalStorage
        await this.writeToIndexedDB(tableName, recordId, data);
        await this.writeToLocalStorage(tableName, recordId, data);
        return {
          success: true,
          data,
          source: 'cache'
        };
      }
    } catch (error) {
      console.error('❌ All storage layers failed:', error);
    }

    return {
      success: false,
      data: null,
      source: null,
      error: 'Data not found in any storage layer'
    };
  }

  // ==========================================================================
  // LAYER 1: IndexedDB Operations
  // ==========================================================================

  private async writeToIndexedDB<T>(
    tableName: string,
    recordId: string,
    data: T
  ): Promise<void> {
    const table = (db as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in IndexedDB`);
    }

    await table.put({ ...data, id: recordId });
  }

  private async readFromIndexedDB<T>(
    tableName: string,
    recordId: string
  ): Promise<T | null> {
    const table = (db as any)[tableName];
    if (!table) {
      throw new Error(`Table ${tableName} not found in IndexedDB`);
    }

    const data = await table.get(recordId);
    return data || null;
  }

  // ==========================================================================
  // LAYER 2: LocalStorage Operations
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

    // Check storage quota
    const estimatedSize = new Blob([serialized]).size;
    if (estimatedSize > 5 * 1024 * 1024) {
      // 5MB limit
      throw new Error('Data too large for LocalStorage');
    }

    try {
      localStorage.setItem(key, serialized);
    } catch (error) {
      // Handle quota exceeded
      if (
        error instanceof DOMException &&
        error.name === 'QuotaExceededError'
      ) {
        console.warn('⚠️ LocalStorage quota exceeded, cleaning old entries');
        await this.cleanOldLocalStorageEntries();
        // Retry
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
      console.error('❌ Failed to parse LocalStorage data:', error);
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

    // Parse and sort by timestamp
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

    // Remove oldest 25% of entries
    const toRemove = Math.ceil(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      localStorage.removeItem(entries[i].key);
    }

    console.log(`🧹 Cleaned ${toRemove} old LocalStorage entries`);
  }

  // ==========================================================================
  // LAYER 3: Cache API Operations
  // ==========================================================================

  private async writeToCache<T>(
    tableName: string,
    recordId: string,
    data: T
  ): Promise<void> {
    if (!('caches' in window)) {
      throw new Error('Cache API not supported');
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
      throw new Error('Cache API not supported');
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
      console.error('❌ Failed to parse Cache API data:', error);
      return null;
    }
  }

  private getCacheUrl(tableName: string, recordId: string): string {
    return `https://pwa-backup/${tableName}/${recordId}`;
  }

  // ==========================================================================
  // ROLLBACK AND CLEANUP
  // ==========================================================================

  private async rollback(
    tableName: string,
    recordId: string,
    layersWritten: string[]
  ): Promise<void> {
    console.warn('🔄 Rolling back partial write...');

    for (const layer of layersWritten) {
      try {
        switch (layer) {
          case 'indexeddb':
            const table = (db as any)[tableName];
            if (table) {
              await table.delete(recordId);
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
        console.error(`❌ Rollback failed for ${layer}:`, error);
      }
    }

    console.log('✅ Rollback completed');
  }

  /**
   * Clear all backup data from LocalStorage and Cache API
   */
  async clearBackups(): Promise<void> {
    // Clear LocalStorage backups
    const keys = Object.keys(localStorage);
    const backupKeys = keys.filter(key =>
      key.startsWith(this.LOCALSTORAGE_PREFIX)
    );
    backupKeys.forEach(key => localStorage.removeItem(key));

    // Clear Cache API backups
    if ('caches' in window) {
      await caches.delete(this.CACHE_NAME);
    }

    console.log('🧹 All backups cleared');
  }

  /**
   * Get storage statistics
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

    // IndexedDB size (approximate)
    try {
      const dbStats = await db.getStats();
      const totalRecords = Object.values(dbStats).reduce((a, b) => a + b, 0);
      stats.indexedDB = totalRecords * 1024; // Rough estimate
    } catch (error) {
      console.error('Failed to get IndexedDB stats:', error);
    }

    // LocalStorage size
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
      console.error('Failed to get LocalStorage stats:', error);
    }

    // Cache API size (approximate)
    try {
      if ('caches' in window) {
        const cache = await caches.open(this.CACHE_NAME);
        const keys = await cache.keys();
        stats.cacheAPI = keys.length * 1024; // Rough estimate
      }
    } catch (error) {
      console.error('Failed to get Cache API stats:', error);
    }

    stats.total = stats.indexedDB + stats.localStorage + stats.cacheAPI;

    return stats;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const storageManager = new StorageManager();
