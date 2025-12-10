/**
 * Property-based tests for SyncQueue
 * 
 * Property 2: Sync Queue Ordering
 * Validates: Requirements 5.2
 * 
 * Tests that the sync queue always returns operations in the correct order:
 * - Lower priority number = higher priority (1 is highest)
 * - Within same priority, older timestamp comes first
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fc from 'fast-check';
import { SyncQueue } from './sync-queue';
import { db } from '../db';

describe('SyncQueue - Property-Based Tests', () => {
  let syncQueue: SyncQueue;

  beforeEach(async () => {
    syncQueue = new SyncQueue();
    await db.sync_queue.clear();
  });

  describe('Property 2: Sync Queue Ordering', () => {
    it('should always return operations ordered by priority ASC, timestamp ASC', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate array of random operations
          fc.array(
            fc.record({
              tableName: fc.constantFrom('pagos', 'creditos', 'clientes', 'rutas', 'users'),
              recordId: fc.uuid(),
              operation: fc.constantFrom('INSERT', 'UPDATE', 'DELETE'),
              priority: fc.integer({ min: 1, max: 5 }),
              timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            }),
            { minLength: 5, maxLength: 50 }
          ),
          async (operations) => {
            // Clear queue before each test
            await db.sync_queue.clear();

            // Add all operations to queue
            const ids: number[] = [];
            for (const op of operations) {
              const id = await syncQueue.addToQueue(
                op.tableName,
                op.recordId,
                op.operation as 'INSERT' | 'UPDATE' | 'DELETE',
                { priority: op.priority }
              );
              ids.push(id);

              // Update timestamp to match generated value
              await db.sync_queue.update(id, { timestamp: op.timestamp });
            }

            // Get pending operations
            const pending = await syncQueue.getPendingOperations();

            // Verify all operations were retrieved
            expect(pending.length).toBe(operations.length);

            // Verify ordering: priority ASC, then timestamp ASC
            for (let i = 1; i < pending.length; i++) {
              const prev = pending[i - 1];
              const curr = pending[i];

              if (prev.priority === curr.priority) {
                // Same priority: timestamp should be ascending
                expect(prev.timestamp).toBeLessThanOrEqual(curr.timestamp);
              } else {
                // Different priority: priority should be ascending (lower number first)
                expect(prev.priority).toBeLessThan(curr.priority);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain ordering regardless of insertion order', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate operations with specific priorities and timestamps
          fc.array(
            fc.record({
              recordId: fc.uuid(),
              priority: fc.integer({ min: 1, max: 3 }),
              timestamp: fc.integer({ min: 1000000000000, max: 1000000100000 }),
            }),
            { minLength: 10, maxLength: 30 }
          ),
          async (operations) => {
            // Clear queue
            await db.sync_queue.clear();

            // Shuffle operations to test different insertion orders
            const shuffled = [...operations].sort(() => Math.random() - 0.5);

            // Add shuffled operations
            for (const op of shuffled) {
              const id = await syncQueue.addToQueue('pagos', op.recordId, 'INSERT', {
                priority: op.priority,
              });
              await db.sync_queue.update(id, { timestamp: op.timestamp });
            }

            // Get pending operations
            const pending = await syncQueue.getPendingOperations();

            // Sort expected result manually
            const expected = [...operations].sort((a, b) => {
              if (a.priority !== b.priority) {
                return a.priority - b.priority;
              }
              return a.timestamp - b.timestamp;
            });

            // Verify same order
            expect(pending.length).toBe(expected.length);
            for (let i = 0; i < pending.length; i++) {
              expect(pending[i].priority).toBe(expected[i].priority);
              expect(pending[i].timestamp).toBe(expected[i].timestamp);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize pagos (priority 1) over other operations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            numPagos: fc.integer({ min: 1, max: 10 }),
            numCreditos: fc.integer({ min: 1, max: 10 }),
            numClientes: fc.integer({ min: 1, max: 10 }),
            baseTimestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
          }),
          async ({ numPagos, numCreditos, numClientes, baseTimestamp }) => {
            // Clear queue
            await db.sync_queue.clear();

            // Add operations in mixed order
            const operations: Array<{ type: string; id: number; timestamp: number }> = [];

            // Add clientes (priority 3)
            for (let i = 0; i < numClientes; i++) {
              const id = await syncQueue.addToQueue('clientes', `c${i}`, 'INSERT');
              await db.sync_queue.update(id, { timestamp: baseTimestamp + i });
              operations.push({ type: 'clientes', id, timestamp: baseTimestamp + i });
            }

            // Add creditos (priority 2)
            for (let i = 0; i < numCreditos; i++) {
              const id = await syncQueue.addToQueue('creditos', `cr${i}`, 'INSERT');
              await db.sync_queue.update(id, { timestamp: baseTimestamp + i });
              operations.push({ type: 'creditos', id, timestamp: baseTimestamp + i });
            }

            // Add pagos (priority 1)
            for (let i = 0; i < numPagos; i++) {
              const id = await syncQueue.addToQueue('pagos', `p${i}`, 'INSERT');
              await db.sync_queue.update(id, { timestamp: baseTimestamp + i });
              operations.push({ type: 'pagos', id, timestamp: baseTimestamp + i });
            }

            // Get pending operations
            const pending = await syncQueue.getPendingOperations();

            // First numPagos items should all be pagos
            for (let i = 0; i < numPagos; i++) {
              expect(pending[i].table_name).toBe('pagos');
              expect(pending[i].priority).toBe(1);
            }

            // Next numCreditos items should all be creditos
            for (let i = 0; i < numCreditos; i++) {
              expect(pending[numPagos + i].table_name).toBe('creditos');
              expect(pending[numPagos + i].priority).toBe(2);
            }

            // Last numClientes items should all be clientes
            for (let i = 0; i < numClientes; i++) {
              expect(pending[numPagos + numCreditos + i].table_name).toBe('clientes');
              expect(pending[numPagos + numCreditos + i].priority).toBe(3);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle operations with same priority and timestamp', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            priority: fc.integer({ min: 1, max: 3 }),
            timestamp: fc.integer({ min: 1000000000000, max: 9999999999999 }),
            count: fc.integer({ min: 2, max: 10 }),
          }),
          async ({ priority, timestamp, count }) => {
            // Clear queue
            await db.sync_queue.clear();

            // Add multiple operations with same priority and timestamp
            const ids: number[] = [];
            for (let i = 0; i < count; i++) {
              const id = await syncQueue.addToQueue('pagos', `p${i}`, 'INSERT', {
                priority,
              });
              await db.sync_queue.update(id, { timestamp });
              ids.push(id);
            }

            // Get pending operations
            const pending = await syncQueue.getPendingOperations();

            // All should have same priority and timestamp
            expect(pending.length).toBe(count);
            for (const op of pending) {
              expect(op.priority).toBe(priority);
              expect(op.timestamp).toBe(timestamp);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should exclude synced operations from ordering', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalOps: fc.integer({ min: 10, max: 30 }),
            syncedIndices: fc.array(fc.integer({ min: 0, max: 29 }), {
              minLength: 1,
              maxLength: 10,
            }),
          }),
          async ({ totalOps, syncedIndices }) => {
            // Clear queue
            await db.sync_queue.clear();

            // Add operations
            const ids: number[] = [];
            for (let i = 0; i < totalOps; i++) {
              const id = await syncQueue.addToQueue('pagos', `p${i}`, 'INSERT', {
                priority: (i % 3) + 1,
              });
              await db.sync_queue.update(id, { timestamp: 1000000000000 + i });
              ids.push(id);
            }

            // Mark some as synced (use Set to avoid duplicates)
            const validIndices = [...new Set(syncedIndices.filter((idx) => idx < totalOps))];
            for (const idx of validIndices) {
              await syncQueue.markAsSynced(ids[idx]);
            }

            // Get pending operations
            const pending = await syncQueue.getPendingOperations();

            // Should only return unsynced operations
            expect(pending.length).toBe(totalOps - validIndices.length);

            // All returned operations should be unsynced
            for (const op of pending) {
              expect(op.synced).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should respect limit parameter while maintaining order', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            totalOps: fc.integer({ min: 20, max: 50 }),
            limit: fc.integer({ min: 1, max: 15 }),
          }),
          async ({ totalOps, limit }) => {
            // Clear queue
            await db.sync_queue.clear();

            // Add operations with random priorities
            for (let i = 0; i < totalOps; i++) {
              const id = await syncQueue.addToQueue('pagos', `p${i}`, 'INSERT', {
                priority: (i % 4) + 1,
              });
              await db.sync_queue.update(id, { timestamp: 1000000000000 + i });
            }

            // Get limited pending operations
            const pending = await syncQueue.getPendingOperations(limit);

            // Should return at most 'limit' operations
            expect(pending.length).toBeLessThanOrEqual(limit);

            // Should still be ordered correctly
            for (let i = 1; i < pending.length; i++) {
              const prev = pending[i - 1];
              const curr = pending[i];

              if (prev.priority === curr.priority) {
                expect(prev.timestamp).toBeLessThanOrEqual(curr.timestamp);
              } else {
                expect(prev.priority).toBeLessThan(curr.priority);
              }
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
