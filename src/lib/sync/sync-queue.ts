/**
 * Sync Queue Manager
 * 
 * Manages the queue of pending sync operations with:
 * - Priority-based ordering
 * - Exponential backoff retry logic
 * - Queue size monitoring
 * - Batch operations
 * 
 * Requirements: 5.2, 5.8
 */

import { db } from '../db';
import type { SyncQueueItem } from '../db/types';

export interface AddToQueueOptions {
  priority?: number;
  data?: any;
}

export interface QueueStats {
  total: number;
  pending: number;
  synced: number;
  failed: number;
  oldestPending: number | null;
}

export class SyncQueue {
  private readonly MAX_ATTEMPTS = 10;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 second
  private readonly MAX_BACKOFF_MS = 300000; // 5 minutes

  /**
   * Add operation to sync queue
   * Priority: 1 (highest) for pagos, 2 for creditos, 3 for clientes, 4 for others
   */
  async addToQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    options: AddToQueueOptions = {}
  ): Promise<number> {
    const { priority = this.getDefaultPriority(tableName), data = null } = options;

    const item: SyncQueueItem = {
      timestamp: Date.now(),
      table_name: tableName,
      record_id: recordId,
      operation,
      data,
      synced: false,
      priority,
      attempts: 0,
      last_attempt: null,
      error: null,
    };

    const id = await db.sync_queue.add(item);
    return id as number;
  }

  /**
   * Get pending operations ordered by priority (ASC) and timestamp (ASC)
   * Lower priority numbers = higher priority (1 is highest)
   */
  async getPendingOperations(limit?: number): Promise<SyncQueueItem[]> {
    const allItems = await db.sync_queue.toArray();
    
    const items = allItems.filter((item) => {
      // Only include unsynced items
      if (item.synced) return false;
        
      // Only include items that are ready to retry
      if (item.attempts === 0) return true;
      if (item.attempts >= this.MAX_ATTEMPTS) return false;
        
      const backoffMs = this.calculateBackoff(item.attempts);
      const nextRetryTime = (item.last_attempt || 0) + backoffMs;
      return Date.now() >= nextRetryTime;
    });

    // Sort by priority ASC (lower number = higher priority), then timestamp ASC
    items.sort((a, b) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Lower number = higher priority
      }
      return a.timestamp - b.timestamp; // Older first
    });

    return limit ? items.slice(0, limit) : items;
  }

  /**
   * Mark operation as successfully synced
   */
  async markAsSynced(id: number): Promise<void> {
    await db.sync_queue.update(id, {
      synced: true,
      error: null,
    });
  }

  /**
   * Mark operation as failed and increment retry counter
   */
  async markAsFailed(id: number, error: string): Promise<void> {
    const item = await db.sync_queue.get(id);
    if (!item) return;

    await db.sync_queue.update(id, {
      attempts: item.attempts + 1,
      last_attempt: Date.now(),
      error,
    });
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<QueueStats> {
    const all = await db.sync_queue.toArray();
    const pending = all.filter((item) => !item.synced && item.attempts < this.MAX_ATTEMPTS);
    const synced = all.filter((item) => item.synced);
    const failed = all.filter((item) => !item.synced && item.attempts >= this.MAX_ATTEMPTS);

    const oldestPending = pending.length > 0
      ? Math.min(...pending.map((item) => item.timestamp))
      : null;

    return {
      total: all.length,
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      oldestPending,
    };
  }

  /**
   * Get queue size (pending operations only)
   */
  async getQueueSize(): Promise<number> {
    return await db.sync_queue
      .filter((item) => !item.synced && item.attempts < this.MAX_ATTEMPTS)
      .count();
  }

  /**
   * Get failed operations (exceeded max attempts)
   */
  async getFailedOperations(): Promise<SyncQueueItem[]> {
    return await db.sync_queue
      .filter((item) => !item.synced && item.attempts >= this.MAX_ATTEMPTS)
      .toArray();
  }

  /**
   * Retry failed operation (reset attempts)
   */
  async retryFailedOperation(id: number): Promise<void> {
    await db.sync_queue.update(id, {
      attempts: 0,
      last_attempt: null,
      error: null,
    });
  }

  /**
   * Clear synced operations older than specified days
   */
  async clearOldSyncedOperations(daysOld: number = 7): Promise<number> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;
    
    const oldItems = await db.sync_queue
      .filter((item) => item.synced && item.timestamp < cutoffTime)
      .toArray();

    const ids = oldItems.map((item) => item.id!);
    await db.sync_queue.bulkDelete(ids);
    
    return ids.length;
  }

  /**
   * Clear all queue items (use with caution!)
   */
  async clearAll(): Promise<void> {
    await db.sync_queue.clear();
  }

  /**
   * Calculate exponential backoff delay
   */
  private calculateBackoff(attempts: number): number {
    const backoff = this.INITIAL_BACKOFF_MS * Math.pow(2, attempts - 1);
    return Math.min(backoff, this.MAX_BACKOFF_MS);
  }

  /**
   * Get default priority based on table name
   * Priority: 1 (highest) for pagos, 2 for creditos, 3 for clientes, 4 for others
   */
  private getDefaultPriority(tableName: string): number {
    switch (tableName) {
      case 'pagos':
        return 1; // Highest priority
      case 'creditos':
      case 'cuotas':
        return 2;
      case 'clientes':
        return 3;
      default:
        return 4; // Lowest priority
    }
  }

  /**
   * Get next retry time for an operation
   */
  getNextRetryTime(item: SyncQueueItem): number | null {
    if (item.attempts === 0) return Date.now();
    if (item.attempts >= this.MAX_ATTEMPTS) return null;
    
    const backoffMs = this.calculateBackoff(item.attempts);
    return (item.last_attempt || 0) + backoffMs;
  }

  /**
   * Check if operation is ready to retry
   */
  isReadyToRetry(item: SyncQueueItem): boolean {
    if (item.synced) return false;
    if (item.attempts >= this.MAX_ATTEMPTS) return false;
    if (item.attempts === 0) return true;
    
    const nextRetryTime = this.getNextRetryTime(item);
    return nextRetryTime !== null && Date.now() >= nextRetryTime;
  }
}
