/**
 * Unit tests for SyncQueue
 * 
 * Tests:
 * - Adding operations to queue
 * - Priority-based ordering
 * - Retry logic with exponential backoff
 * - Queue statistics
 * - Failed operations handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SyncQueue } from './sync-queue';
import { db } from '../db';

describe('SyncQueue', () => {
  let syncQueue: SyncQueue;

  beforeEach(async () => {
    syncQueue = new SyncQueue();
    await db.sync_queue.clear();
  });

  describe('addToQueue', () => {
    it('should add operation to queue with default priority', async () => {
      const id = await syncQueue.addToQueue('pagos', 'pago-1', 'INSERT');
      
      const item = await db.sync_queue.get(id);
      expect(item).toBeDefined();
      expect(item!.table_name).toBe('pagos');
      expect(item!.record_id).toBe('pago-1');
      expect(item!.operation).toBe('INSERT');
      expect(item!.priority).toBe(1); // pagos have highest priority
      expect(item!.synced).toBe(false);
      expect(item!.attempts).toBe(0);
    });

    it('should use custom priority when provided', async () => {
      const id = await syncQueue.addToQueue('clientes', 'cliente-1', 'UPDATE', {
        priority: 5,
      });
      
      const item = await db.sync_queue.get(id);
      expect(item!.priority).toBe(5);
    });

    it('should assign correct default priorities', async () => {
      const pagoId = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      const creditoId = await syncQueue.addToQueue('creditos', 'c1', 'INSERT');
      const clienteId = await syncQueue.addToQueue('clientes', 'cl1', 'INSERT');
      const otherId = await syncQueue.addToQueue('rutas', 'r1', 'INSERT');

      const pago = await db.sync_queue.get(pagoId);
      const credito = await db.sync_queue.get(creditoId);
      const cliente = await db.sync_queue.get(clienteId);
      const other = await db.sync_queue.get(otherId);

      expect(pago!.priority).toBe(1); // Highest
      expect(credito!.priority).toBe(2);
      expect(cliente!.priority).toBe(3);
      expect(other!.priority).toBe(4); // Lowest
    });

    it('should store data when provided', async () => {
      const data = { monto: 1000, cliente_id: 'c1' };
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT', { data });
      
      const item = await db.sync_queue.get(id);
      expect(item!.data).toEqual(data);
    });
  });

  describe('getPendingOperations', () => {
    it('should return operations ordered by priority DESC, timestamp ASC', async () => {
      // Add operations with different priorities
      // Use addToQueue with explicit priorities to ensure correct assignment
      const baseTime = Date.now();
      
      const id1 = await syncQueue.addToQueue('clientes', 'c1', 'INSERT', { priority: 3 });
      const id2 = await syncQueue.addToQueue('pagos', 'p1', 'INSERT', { priority: 1 });
      const id3 = await syncQueue.addToQueue('creditos', 'cr1', 'INSERT', { priority: 2 });
      const id4 = await syncQueue.addToQueue('pagos', 'p2', 'INSERT', { priority: 1 });
      
      // Update timestamps to ensure proper ordering
      await db.sync_queue.update(id1, { timestamp: baseTime });
      await db.sync_queue.update(id2, { timestamp: baseTime + 100 });
      await db.sync_queue.update(id3, { timestamp: baseTime + 200 });
      await db.sync_queue.update(id4, { timestamp: baseTime + 300 });

      const pending = await syncQueue.getPendingOperations();
      
      expect(pending).toHaveLength(4);
      
      // Priority 1 items first (pagos), ordered by timestamp
      expect(pending[0].priority).toBe(1);
      expect(pending[0].record_id).toBe('p1');
      expect(pending[1].priority).toBe(1);
      expect(pending[1].record_id).toBe('p2');
      // Then priority 2 (creditos)
      expect(pending[2].priority).toBe(2);
      expect(pending[2].record_id).toBe('cr1');
      // Then priority 3 (clientes)
      expect(pending[3].priority).toBe(3);
      expect(pending[3].record_id).toBe('c1');
    });

    it('should not return synced operations', async () => {
      const id1 = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      
      await syncQueue.markAsSynced(id1);

      const pending = await syncQueue.getPendingOperations();
      expect(pending).toHaveLength(1);
      expect(pending[0].record_id).toBe('p2');
    });

    it('should not return operations that exceeded max attempts', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      // Fail 10 times (max attempts)
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id, 'Network error');
      }

      const pending = await syncQueue.getPendingOperations();
      expect(pending).toHaveLength(0);
    });

    it('should respect limit parameter', async () => {
      await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p3', 'INSERT');

      const pending = await syncQueue.getPendingOperations(2);
      expect(pending).toHaveLength(2);
    });

    it('should not return operations in backoff period', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      // Fail once (backoff = 1 second)
      await syncQueue.markAsFailed(id, 'Network error');

      // Immediately check - should not be ready
      const pending = await syncQueue.getPendingOperations();
      expect(pending).toHaveLength(0);
    });
  });

  describe('markAsSynced', () => {
    it('should mark operation as synced', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.markAsSynced(id);

      const item = await db.sync_queue.get(id);
      expect(item!.synced).toBe(true);
      expect(item!.error).toBeNull();
    });
  });

  describe('markAsFailed', () => {
    it('should increment attempts and set error', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.markAsFailed(id, 'Network timeout');

      const item = await db.sync_queue.get(id);
      expect(item!.attempts).toBe(1);
      expect(item!.error).toBe('Network timeout');
      expect(item!.last_attempt).toBeGreaterThan(0);
    });

    it('should increment attempts on multiple failures', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      await syncQueue.markAsFailed(id, 'Error 1');
      await syncQueue.markAsFailed(id, 'Error 2');
      await syncQueue.markAsFailed(id, 'Error 3');

      const item = await db.sync_queue.get(id);
      expect(item!.attempts).toBe(3);
      expect(item!.error).toBe('Error 3');
    });
  });

  describe('getStats', () => {
    it('should return correct statistics', async () => {
      const id1 = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      const id2 = await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      const id3 = await syncQueue.addToQueue('pagos', 'p3', 'INSERT');
      
      await syncQueue.markAsSynced(id1);
      
      // Fail id3 10 times
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id3, 'Error');
      }

      const stats = await syncQueue.getStats();
      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(1); // Only p2
      expect(stats.synced).toBe(1); // p1
      expect(stats.failed).toBe(1); // p3
      expect(stats.oldestPending).toBeGreaterThan(0);
    });

    it('should return null for oldestPending when no pending operations', async () => {
      const stats = await syncQueue.getStats();
      expect(stats.oldestPending).toBeNull();
    });
  });

  describe('getQueueSize', () => {
    it('should return count of pending operations', async () => {
      await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      const id3 = await syncQueue.addToQueue('pagos', 'p3', 'INSERT');
      
      await syncQueue.markAsSynced(id3);

      const size = await syncQueue.getQueueSize();
      expect(size).toBe(2);
    });
  });

  describe('getFailedOperations', () => {
    it('should return operations that exceeded max attempts', async () => {
      const id1 = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      
      // Fail p1 10 times
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id1, 'Error');
      }

      const failed = await syncQueue.getFailedOperations();
      expect(failed).toHaveLength(1);
      expect(failed[0].record_id).toBe('p1');
    });
  });

  describe('retryFailedOperation', () => {
    it('should reset attempts for failed operation', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      // Fail 10 times
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id, 'Error');
      }

      await syncQueue.retryFailedOperation(id);

      const item = await db.sync_queue.get(id);
      expect(item!.attempts).toBe(0);
      expect(item!.last_attempt).toBeNull();
      expect(item!.error).toBeNull();
    });
  });

  describe('clearOldSyncedOperations', () => {
    it('should clear synced operations older than specified days', async () => {
      const id1 = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      const id2 = await syncQueue.addToQueue('pagos', 'p2', 'INSERT');
      
      await syncQueue.markAsSynced(id1);
      await syncQueue.markAsSynced(id2);

      // Manually set old timestamp
      await db.sync_queue.update(id1, {
        timestamp: Date.now() - 10 * 24 * 60 * 60 * 1000, // 10 days ago
      });

      const cleared = await syncQueue.clearOldSyncedOperations(7);
      expect(cleared).toBe(1);

      const remaining = await db.sync_queue.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(id2);
    });
  });

  describe('clearAll', () => {
    it('should clear all queue items', async () => {
      await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.addToQueue('pagos', 'p2', 'INSERT');

      await syncQueue.clearAll();

      const items = await db.sync_queue.toArray();
      expect(items).toHaveLength(0);
    });
  });

  describe('getNextRetryTime', () => {
    it('should return current time for first attempt', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      const item = await db.sync_queue.get(id);

      const nextRetry = syncQueue.getNextRetryTime(item!);
      expect(nextRetry).toBeLessThanOrEqual(Date.now());
    });

    it('should return null for operations exceeding max attempts', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id, 'Error');
      }

      const item = await db.sync_queue.get(id);
      const nextRetry = syncQueue.getNextRetryTime(item!);
      expect(nextRetry).toBeNull();
    });

    it('should calculate exponential backoff correctly', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      await syncQueue.markAsFailed(id, 'Error');
      let item = await db.sync_queue.get(id);
      let nextRetry = syncQueue.getNextRetryTime(item!);
      // First retry: 1 second backoff
      expect(nextRetry).toBeGreaterThanOrEqual(item!.last_attempt! + 1000);

      await syncQueue.markAsFailed(id, 'Error');
      item = await db.sync_queue.get(id);
      nextRetry = syncQueue.getNextRetryTime(item!);
      // Second retry: 2 seconds backoff
      expect(nextRetry).toBeGreaterThanOrEqual(item!.last_attempt! + 2000);
    });
  });

  describe('isReadyToRetry', () => {
    it('should return true for first attempt', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      const item = await db.sync_queue.get(id);

      expect(syncQueue.isReadyToRetry(item!)).toBe(true);
    });

    it('should return false for synced operations', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      await syncQueue.markAsSynced(id);
      const item = await db.sync_queue.get(id);

      expect(syncQueue.isReadyToRetry(item!)).toBe(false);
    });

    it('should return false for operations exceeding max attempts', async () => {
      const id = await syncQueue.addToQueue('pagos', 'p1', 'INSERT');
      
      for (let i = 0; i < 10; i++) {
        await syncQueue.markAsFailed(id, 'Error');
      }

      const item = await db.sync_queue.get(id);
      expect(syncQueue.isReadyToRetry(item!)).toBe(false);
    });
  });
});
