/**
 * Change Tracker - Differential Sync (Delta Sync)
 * 
 * Tracks all changes to records and creates compressed deltas for efficient sync.
 * Instead of sending entire records, only sends what changed.
 * 
 * Requirements: 5.3, 5.6, 5.7
 */

import { db } from '../app-config';
import type { ChangeLogEntry } from '../db/types';

export interface Change {
  field: string;
  oldValue: any;
  newValue: any;
  timestamp: number;
}

export interface DeltaBatch {
  table_name: string;
  record_id: string;
  changes: Change[];
  compressed: boolean;
  timestamp: number;
}

export class ChangeTracker {
  /**
   * Log a change to a record
   */
  async logChange(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    changes: Record<string, any>
  ): Promise<number> {
    const entry: ChangeLogEntry = {
      timestamp: Date.now(),
      table_name: tableName,
      record_id: recordId,
      operation,
      changes,
      synced: false,
    };

    const id = await db.change_log.add(entry);
    return id as number;
  }

  /**
   * Get pending changes for a specific record
   */
  async getPendingChanges(tableName: string, recordId: string): Promise<ChangeLogEntry[]> {
    return await db.change_log
      .where('[table_name+record_id]')
      .equals([tableName, recordId])
      .and((entry) => !entry.synced)
      .sortBy('timestamp');
  }

  /**
   * Get all pending changes
   */
  async getAllPendingChanges(): Promise<ChangeLogEntry[]> {
    return await db.change_log.filter((entry) => !entry.synced).sortBy('timestamp');
  }

  /**
   * Compress multiple changes to the same field into a single change
   * Example: field "nombre" changed 3 times → only keep the final value
   */
  compressChanges(changes: ChangeLogEntry[]): DeltaBatch[] {
    const grouped = new Map<string, ChangeLogEntry[]>();

    // Group by table_name + record_id
    for (const change of changes) {
      const key = `${change.table_name}:${change.record_id}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(change);
    }

    const batches: DeltaBatch[] = [];

    // Compress each group
    for (const [key, entries] of grouped) {
      const [tableName, recordId] = key.split(':');
      const compressed = this.compressFieldChanges(entries);

      batches.push({
        table_name: tableName,
        record_id: recordId,
        changes: compressed,
        compressed: true,
        timestamp: Math.max(...entries.map((e) => e.timestamp)),
      });
    }

    return batches;
  }

  /**
   * Compress field-level changes
   * If a field changed multiple times, only keep the final value
   */
  private compressFieldChanges(entries: ChangeLogEntry[]): Change[] {
    const fieldMap = new Map<string, Change>();

    for (const entry of entries) {
      if (entry.operation === 'DELETE') {
        // DELETE operation: clear all previous changes
        fieldMap.clear();
        fieldMap.set('__deleted__', {
          field: '__deleted__',
          oldValue: null,
          newValue: true,
          timestamp: entry.timestamp,
        });
        continue;
      }

      if (entry.operation === 'INSERT') {
        // INSERT operation: all fields are new
        for (const [field, value] of Object.entries(entry.changes)) {
          fieldMap.set(field, {
            field,
            oldValue: null,
            newValue: value,
            timestamp: entry.timestamp,
          });
        }
        continue;
      }

      // UPDATE operation: track field changes
      for (const [field, value] of Object.entries(entry.changes)) {
        const existing = fieldMap.get(field);
        if (existing) {
          // Update the newValue but keep the original oldValue
          existing.newValue = value;
          existing.timestamp = entry.timestamp;
        } else {
          fieldMap.set(field, {
            field,
            oldValue: null, // We don't track old values in change log
            newValue: value,
            timestamp: entry.timestamp,
          });
        }
      }
    }

    return Array.from(fieldMap.values());
  }

  /**
   * Create batches for upload (group changes by priority)
   */
  async createUploadBatches(maxBatchSize: number = 50): Promise<DeltaBatch[][]> {
    const pending = await this.getAllPendingChanges();
    const compressed = this.compressChanges(pending);

    // Sort by priority (pagos first, then creditos, then clientes)
    compressed.sort((a, b) => {
      const priorityA = this.getTablePriority(a.table_name);
      const priorityB = this.getTablePriority(b.table_name);

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }
      return a.timestamp - b.timestamp;
    });

    // Split into batches
    const batches: DeltaBatch[][] = [];
    for (let i = 0; i < compressed.length; i += maxBatchSize) {
      batches.push(compressed.slice(i, i + maxBatchSize));
    }

    return batches;
  }

  /**
   * Apply downloaded deltas to local database
   */
  async applyDeltas(deltas: DeltaBatch[]): Promise<number> {
    let applied = 0;

    for (const delta of deltas) {
      try {
        await this.applyDelta(delta);
        applied++;
      } catch (error) {
        console.error(`Failed to apply delta for ${delta.table_name}:${delta.record_id}`, error);
      }
    }

    return applied;
  }

  /**
   * Apply a single delta to the database
   */
  private async applyDelta(delta: DeltaBatch): Promise<void> {
    const table = (db as any)[delta.table_name];
    if (!table) {
      throw new Error(`Table ${delta.table_name} not found`);
    }

    // Check if record is deleted
    const isDeleted = delta.changes.some((c) => c.field === '__deleted__');
    if (isDeleted) {
      await table.delete(delta.record_id);
      return;
    }

    // Get existing record
    const existing = await table.get(delta.record_id);

    // Build updated record
    const updates: Record<string, any> = {};
    for (const change of delta.changes) {
      if (change.field !== '__deleted__') {
        updates[change.field] = change.newValue;
      }
    }

    if (existing) {
      // Update existing record
      await table.update(delta.record_id, updates);
    } else {
      // Insert new record
      await table.add({ id: delta.record_id, ...updates });
    }
  }

  /**
   * Mark changes as synced
   */
  async markChangesSynced(tableName: string, recordId: string): Promise<void> {
    const changes = await this.getPendingChanges(tableName, recordId);
    const ids = changes.map((c) => c.id!);

    for (const id of ids) {
      await db.change_log.update(id, { synced: true });
    }
  }

  /**
   * Clear old synced changes (older than specified days)
   */
  async clearOldSyncedChanges(daysOld: number = 30): Promise<number> {
    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const oldChanges = await db.change_log
      .filter((entry) => entry.synced && entry.timestamp < cutoffTime)
      .toArray();

    const ids = oldChanges.map((c) => c.id!);
    await db.change_log.bulkDelete(ids);

    return ids.length;
  }

  /**
   * Get statistics about change log
   */
  async getStats(): Promise<{
    total: number;
    pending: number;
    synced: number;
    byTable: Record<string, number>;
  }> {
    const all = await db.change_log.toArray();
    const pending = all.filter((c) => !c.synced);
    const synced = all.filter((c) => c.synced);

    const byTable: Record<string, number> = {};
    for (const change of pending) {
      byTable[change.table_name] = (byTable[change.table_name] || 0) + 1;
    }

    return {
      total: all.length,
      pending: pending.length,
      synced: synced.length,
      byTable,
    };
  }

  /**
   * Get table priority for sorting
   */
  private getTablePriority(tableName: string): number {
    switch (tableName) {
      case 'pagos':
        return 1;
      case 'creditos':
      case 'cuotas':
        return 2;
      case 'clientes':
        return 3;
      default:
        return 4;
    }
  }
}
