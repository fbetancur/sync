/**
 * Tests for Multi-Layer Storage Manager
 * 
 * Verifies atomic writes, fallback reads, and recovery mechanisms
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StorageManager } from './storage-manager';
import { db } from '../db';

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(async () => {
    storageManager = new StorageManager();
    await db.open();
    
    // Clear all storage layers
    await db.clearAll();
    localStorage.clear();
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }
  });

  afterEach(async () => {
    await storageManager.clearBackups();
    await db.clearAll();
    await db.close();
  });

  describe('Atomic Writes', () => {
    it('should write to all available layers successfully', async () => {
      const testData = {
        id: 'test-1',
        nombre: 'Test Tenant',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      const result = await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-1',
      });

      expect(result.success).toBe(true);
      expect(result.layersWritten).toContain('indexeddb');
      expect(result.layersWritten).toContain('localstorage');
      // Cache API may not be available in test environment
      expect(result.layersWritten.length).toBeGreaterThanOrEqual(2);
    });

    it('should skip backup layers when skipBackup is true', async () => {
      const testData = {
        id: 'test-2',
        nombre: 'Test Tenant 2',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      const result = await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-2',
        skipBackup: true,
      });

      expect(result.success).toBe(true);
      expect(result.layersWritten).toContain('indexeddb');
      expect(result.layersWritten).not.toContain('localstorage');
      expect(result.layersWritten).not.toContain('cache');
    });

    it('should handle write to non-existent table', async () => {
      const testData = { id: 'test-3', data: 'test' };

      await expect(
        storageManager.writeAtomic(testData, {
          tableName: 'non_existent_table',
          recordId: 'test-3',
        })
      ).rejects.toThrow();
    });
  });

  describe('Fallback Reads', () => {
    it('should read from IndexedDB when available', async () => {
      const testData = {
        id: 'test-4',
        nombre: 'Test Tenant 4',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-4',
      });

      const result = await storageManager.readWithFallback({
        tableName: 'tenants',
        recordId: 'test-4',
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(testData);
      expect(result.source).toBe('indexeddb');
    });

    it('should fallback to LocalStorage when IndexedDB fails', async () => {
      const testData = {
        id: 'test-5',
        nombre: 'Test Tenant 5',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      // Write to all layers
      await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-5',
      });

      // Delete from IndexedDB to simulate failure
      await db.tenants.delete('test-5');

      // Should recover from LocalStorage
      const result = await storageManager.readWithFallback({
        tableName: 'tenants',
        recordId: 'test-5',
      });

      expect(result.success).toBe(true);
      expect(result.data?.nombre).toBe('Test Tenant 5');
      expect(result.source).toBe('localstorage');

      // Verify data was restored to IndexedDB
      const restored = await db.tenants.get('test-5');
      expect(restored).toBeDefined();
      expect(restored?.nombre).toBe('Test Tenant 5');
    });

    it('should handle complete storage failure gracefully', async () => {
      const testData = {
        id: 'test-6',
        nombre: 'Test Tenant 6',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      // Write to all layers
      await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-6',
      });

      // Delete from IndexedDB and LocalStorage
      await db.tenants.delete('test-6');
      localStorage.removeItem('pwa_backup_tenants_test-6');

      // Should fail gracefully when all layers are unavailable
      const result = await storageManager.readWithFallback({
        tableName: 'tenants',
        recordId: 'test-6',
      });

      // In test environment without Cache API, this should fail
      // In production with Cache API, it would succeed
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should return null when data not found in any layer', async () => {
      const result = await storageManager.readWithFallback({
        tableName: 'tenants',
        recordId: 'non-existent',
      });

      expect(result.success).toBe(false);
      expect(result.data).toBeNull();
      expect(result.source).toBeNull();
      expect(result.error).toBeDefined();
    });
  });

  describe('Storage Statistics', () => {
    it('should return storage statistics', async () => {
      const testData = {
        id: 'test-7',
        nombre: 'Test Tenant 7',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-7',
      });

      const stats = await storageManager.getStorageStats();

      expect(stats).toHaveProperty('indexedDB');
      expect(stats).toHaveProperty('localStorage');
      expect(stats).toHaveProperty('cacheAPI');
      expect(stats).toHaveProperty('total');
      expect(stats.total).toBeGreaterThan(0);
    });
  });

  describe('Cleanup', () => {
    it('should clear all backups', async () => {
      const testData = {
        id: 'test-8',
        nombre: 'Test Tenant 8',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum',
      };

      await storageManager.writeAtomic(testData, {
        tableName: 'tenants',
        recordId: 'test-8',
      });

      // Verify backups exist
      const keysBefore = Object.keys(localStorage).filter(k => 
        k.startsWith('pwa_backup_')
      );
      expect(keysBefore.length).toBeGreaterThan(0);

      // Clear backups
      await storageManager.clearBackups();

      // Verify backups cleared
      const keysAfter = Object.keys(localStorage).filter(k => 
        k.startsWith('pwa_backup_')
      );
      expect(keysAfter.length).toBe(0);
    });
  });
});
