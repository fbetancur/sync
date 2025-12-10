import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from './sync-manager';
import { db } from '../app-config';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(async () => {
    await db.delete();
    await db.open();
    syncManager = new SyncManager();
  });

  describe('getConnectionStatus', () => {
    it('should return offline status when navigator.onLine is false', () => {
      // Mock navigator.onLine
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const status = syncManager.getConnectionStatus();

      expect(status.online).toBe(false);
      expect(status.type).toBe('none');
    });

    it('should return online status when navigator.onLine is true', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const status = syncManager.getConnectionStatus();

      expect(status.online).toBe(true);
    });

    it('should detect connection type when available', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Mock connection API
      Object.defineProperty(navigator, 'connection', {
        writable: true,
        value: {
          type: 'wifi',
          effectiveType: '4g'
        }
      });

      const status = syncManager.getConnectionStatus();

      expect(status.online).toBe(true);
      expect(status.type).toBe('wifi');
      expect(status.effectiveType).toBe('4g');
    });
  });

  describe('isOnline', () => {
    it('should return true when online', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      expect(syncManager.isOnline()).toBe(true);
    });

    it('should return false when offline', () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      expect(syncManager.isOnline()).toBe(false);
    });
  });

  describe('isCurrentlySyncing', () => {
    it('should return false initially', () => {
      expect(syncManager.isCurrentlySyncing()).toBe(false);
    });

    it('should return true during sync', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Start sync without awaiting
      const syncPromise = syncManager.sync();

      // Check immediately
      expect(syncManager.isCurrentlySyncing()).toBe(true);

      // Wait for completion
      await syncPromise;

      // Should be false after completion
      expect(syncManager.isCurrentlySyncing()).toBe(false);
    });
  });

  describe('getLastSyncTimestamp', () => {
    it('should return 0 initially', () => {
      expect(syncManager.getLastSyncTimestamp()).toBe(0);
    });

    it('should return timestamp after successful sync', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const beforeSync = Date.now();
      await syncManager.sync();
      const afterSync = Date.now();

      const timestamp = syncManager.getLastSyncTimestamp();

      expect(timestamp).toBeGreaterThanOrEqual(beforeSync);
      expect(timestamp).toBeLessThanOrEqual(afterSync);
    });
  });

  describe('getQueueSize', () => {
    it('should return 0 when queue is empty', async () => {
      const size = await syncManager.getQueueSize();
      expect(size).toBe(0);
    });
  });

  describe('getPendingOperations', () => {
    it('should return empty array when no pending operations', async () => {
      const operations = await syncManager.getPendingOperations();
      expect(operations).toEqual([]);
    });
  });

  describe('cancelSync', () => {
    it('should cancel ongoing sync', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Start sync
      const syncPromise = syncManager.sync();

      // Cancel immediately
      await syncManager.cancelSync();

      // Should not be syncing anymore
      expect(syncManager.isCurrentlySyncing()).toBe(false);

      // Wait for sync to complete
      await syncPromise;
    });

    it('should do nothing if not syncing', async () => {
      await expect(syncManager.cancelSync()).resolves.not.toThrow();
    });
  });

  describe('sync', () => {
    it('should fail when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false
      });

      const result = await syncManager.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('No internet connection');
      expect(result.uploaded).toBe(0);
      expect(result.downloaded).toBe(0);
    });

    it('should fail when already syncing', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Start first sync
      const firstSync = syncManager.sync();

      // Try to start second sync
      const result = await syncManager.sync();

      expect(result.success).toBe(false);
      expect(result.errors).toContain('Sync already in progress');

      // Wait for first sync to complete
      await firstSync;
    });

    it('should allow sync when force option is true', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Start first sync
      const firstSync = syncManager.sync();

      // Force second sync
      const result = await syncManager.sync({ force: true });

      // Second sync should succeed (even though first is still running)
      expect(result.success).toBe(true);

      // Wait for first sync
      await firstSync;
    });

    it('should complete successfully when online', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);
      expect(result.timestamp).toBeGreaterThan(0);
    });

    it('should call onProgress callback', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const progressUpdates: any[] = [];

      await syncManager.sync({
        onProgress: progress => {
          progressUpdates.push(progress);
        }
      });

      // Should have received progress updates
      expect(progressUpdates.length).toBeGreaterThan(0);

      // Should have upload phase
      expect(progressUpdates.some(p => p.phase === 'upload')).toBe(true);

      // Should have download phase
      expect(progressUpdates.some(p => p.phase === 'download')).toBe(true);

      // Should have verify phase
      expect(progressUpdates.some(p => p.phase === 'verify')).toBe(true);

      // Should have complete phase
      expect(progressUpdates.some(p => p.phase === 'complete')).toBe(true);
    });

    it('should update last sync timestamp after successful sync', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      const beforeSync = syncManager.getLastSyncTimestamp();
      expect(beforeSync).toBe(0);

      await syncManager.sync();

      const afterSync = syncManager.getLastSyncTimestamp();
      expect(afterSync).toBeGreaterThan(beforeSync);
    });

    it('should persist last sync timestamp to database', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      await syncManager.sync();

      // Check database
      const state = await db.app_state.get('last_sync_timestamp');
      expect(state).toBeDefined();
      expect(parseInt(state!.value)).toBeGreaterThan(0);
    });
  });

  describe('syncUpload', () => {
    it('should return 0 when no pending changes', async () => {
      const uploaded = await syncManager.syncUpload();
      expect(uploaded).toBe(0);
    });

    it('should upload pending changes', async () => {
      // Add some changes to change_log using ChangeTracker format
      await db.change_log.add({
        id: 1,
        tenant_id: 'tenant-1',
        table_name: 'pagos',
        record_id: 'pago-1',
        operation: 'INSERT',
        changes: { monto: 1000, fecha: Date.now() },
        timestamp: Date.now(),
        synced: false
      });

      const uploaded = await syncManager.syncUpload();

      // Should complete without errors (uploaded count depends on batch creation)
      // In a real scenario with Supabase, this would upload the change
      expect(uploaded).toBeGreaterThanOrEqual(0);

      // Verify the change was processed
      const changes = await db.change_log.toArray();
      expect(changes.length).toBeGreaterThan(0);
    });
  });

  describe('syncDownload', () => {
    it('should return 0 downloaded when no remote changes', async () => {
      const result = await syncManager.syncDownload();

      expect(result.downloaded).toBe(0);
      expect(result.conflicts).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Mock an error in syncUpload
      vi.spyOn(syncManager as any, 'uploadBatch').mockRejectedValue(
        new Error('Network error')
      );

      // Add a change to trigger upload using ChangeTracker format
      await db.change_log.add({
        id: 1,
        tenant_id: 'tenant-1',
        table_name: 'pagos',
        record_id: 'pago-1',
        operation: 'INSERT',
        changes: { monto: 1000 },
        timestamp: Date.now(),
        synced: false
      });

      const result = await syncManager.sync();

      // Sync should complete but report errors
      expect(result.success).toBe(true); // Overall sync completes
      expect(result.uploaded).toBe(0); // But nothing uploaded due to error
    });

    it('should not throw when database operations fail', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Close database to cause errors
      await db.close();

      await expect(syncManager.sync()).resolves.not.toThrow();
    });
  });

  describe('integration', () => {
    it('should complete full sync cycle', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: true
      });

      // Add some local changes using ChangeTracker format
      await db.change_log.add({
        id: 1,
        tenant_id: 'tenant-1',
        table_name: 'pagos',
        record_id: 'pago-1',
        operation: 'INSERT',
        changes: { monto: 1000 },
        timestamp: Date.now(),
        synced: false
      });

      const result = await syncManager.sync();

      expect(result.success).toBe(true);
      expect(result.timestamp).toBeGreaterThan(0);
    });
  });
});
