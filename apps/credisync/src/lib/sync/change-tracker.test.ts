/**
 * Unit tests for ChangeTracker
 *
 * Tests differential sync (delta sync) functionality:
 * - Change logging
 * - Change compression
 * - Batch creation
 * - Delta application
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChangeTracker } from './change-tracker';
import { db } from '../app-config';

describe('ChangeTracker', () => {
  let tracker: ChangeTracker;

  beforeEach(async () => {
    tracker = new ChangeTracker();
    await db.change_log.clear();
    await db.pagos.clear();
  });

  describe('logChange', () => {
    it('should log a change to the change log', async () => {
      const id = await tracker.logChange('pagos', 'p1', 'INSERT', {
        monto: 1000,
        cliente_id: 'c1'
      });

      const entry = await db.change_log.get(id);
      expect(entry).toBeDefined();
      expect(entry!.table_name).toBe('pagos');
      expect(entry!.record_id).toBe('p1');
      expect(entry!.operation).toBe('INSERT');
      expect(entry!.changes).toEqual({ monto: 1000, cliente_id: 'c1' });
      expect(entry!.synced).toBe(false);
    });

    it('should log multiple changes', async () => {
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('pagos', 'p1', 'UPDATE', { monto: 1500 });
      await tracker.logChange('pagos', 'p2', 'INSERT', { monto: 2000 });

      const all = await db.change_log.toArray();
      expect(all).toHaveLength(3);
    });
  });

  describe('getPendingChanges', () => {
    it('should get pending changes for a specific record', async () => {
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('pagos', 'p1', 'UPDATE', { monto: 1500 });
      await tracker.logChange('pagos', 'p2', 'INSERT', { monto: 2000 });

      const changes = await tracker.getPendingChanges('pagos', 'p1');
      expect(changes).toHaveLength(2);
      expect(changes[0].changes).toEqual({ monto: 1000 });
      expect(changes[1].changes).toEqual({ monto: 1500 });
    });

    it('should not return synced changes', async () => {
      const id = await tracker.logChange('pagos', 'p1', 'INSERT', {
        monto: 1000
      });
      await db.change_log.update(id, { synced: true });

      const changes = await tracker.getPendingChanges('pagos', 'p1');
      expect(changes).toHaveLength(0);
    });
  });

  describe('getAllPendingChanges', () => {
    it('should get all pending changes', async () => {
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('creditos', 'c1', 'INSERT', { monto: 5000 });
      await tracker.logChange('clientes', 'cl1', 'INSERT', { nombre: 'Juan' });

      const changes = await tracker.getAllPendingChanges();
      expect(changes).toHaveLength(3);
    });

    it('should return changes sorted by timestamp', async () => {
      const id1 = await tracker.logChange('pagos', 'p1', 'INSERT', {
        monto: 1000
      });
      await new Promise(resolve => setTimeout(resolve, 10));
      const id2 = await tracker.logChange('pagos', 'p2', 'INSERT', {
        monto: 2000
      });

      const changes = await tracker.getAllPendingChanges();
      expect(changes[0].id).toBe(id1);
      expect(changes[1].id).toBe(id2);
    });
  });

  describe('compressChanges', () => {
    it('should compress multiple changes to same field', async () => {
      await tracker.logChange('clientes', 'c1', 'INSERT', { nombre: 'Juan' });
      await tracker.logChange('clientes', 'c1', 'UPDATE', {
        nombre: 'Juan Pérez'
      });
      await tracker.logChange('clientes', 'c1', 'UPDATE', {
        nombre: 'Juan Pérez García'
      });

      const pending = await tracker.getAllPendingChanges();
      const compressed = tracker.compressChanges(pending);

      expect(compressed).toHaveLength(1);
      expect(compressed[0].table_name).toBe('clientes');
      expect(compressed[0].record_id).toBe('c1');
      expect(compressed[0].changes).toHaveLength(1);
      expect(compressed[0].changes[0].field).toBe('nombre');
      expect(compressed[0].changes[0].newValue).toBe('Juan Pérez García');
    });

    it('should compress changes to different fields', async () => {
      await tracker.logChange('clientes', 'c1', 'INSERT', {
        nombre: 'Juan',
        telefono: '123'
      });
      await tracker.logChange('clientes', 'c1', 'UPDATE', {
        direccion: 'Calle 1'
      });
      await tracker.logChange('clientes', 'c1', 'UPDATE', { telefono: '456' });

      const pending = await tracker.getAllPendingChanges();
      const compressed = tracker.compressChanges(pending);

      expect(compressed).toHaveLength(1);
      expect(compressed[0].changes).toHaveLength(3);

      const fields = compressed[0].changes.map(c => c.field).sort();
      expect(fields).toEqual(['direccion', 'nombre', 'telefono']);

      const telefonoChange = compressed[0].changes.find(
        c => c.field === 'telefono'
      );
      expect(telefonoChange!.newValue).toBe('456');
    });

    it('should handle DELETE operation', async () => {
      await tracker.logChange('clientes', 'c1', 'INSERT', { nombre: 'Juan' });
      await tracker.logChange('clientes', 'c1', 'UPDATE', { nombre: 'Pedro' });
      await tracker.logChange('clientes', 'c1', 'DELETE', {});

      const pending = await tracker.getAllPendingChanges();
      const compressed = tracker.compressChanges(pending);

      expect(compressed).toHaveLength(1);
      expect(compressed[0].changes).toHaveLength(1);
      expect(compressed[0].changes[0].field).toBe('__deleted__');
      expect(compressed[0].changes[0].newValue).toBe(true);
    });

    it('should group changes by record', async () => {
      await tracker.logChange('clientes', 'c1', 'INSERT', { nombre: 'Juan' });
      await tracker.logChange('clientes', 'c2', 'INSERT', { nombre: 'Pedro' });
      await tracker.logChange('clientes', 'c1', 'UPDATE', { telefono: '123' });

      const pending = await tracker.getAllPendingChanges();
      const compressed = tracker.compressChanges(pending);

      expect(compressed).toHaveLength(2);

      const c1Batch = compressed.find(b => b.record_id === 'c1');
      const c2Batch = compressed.find(b => b.record_id === 'c2');

      expect(c1Batch!.changes).toHaveLength(2); // nombre + telefono
      expect(c2Batch!.changes).toHaveLength(1); // nombre
    });
  });

  describe('createUploadBatches', () => {
    it('should create batches with max size', async () => {
      // Create 75 changes
      for (let i = 0; i < 75; i++) {
        await tracker.logChange('pagos', `p${i}`, 'INSERT', { monto: 1000 });
      }

      const batches = await tracker.createUploadBatches(50);

      expect(batches).toHaveLength(2);
      expect(batches[0]).toHaveLength(50);
      expect(batches[1]).toHaveLength(25);
    });

    it('should prioritize pagos over other tables', async () => {
      await tracker.logChange('clientes', 'c1', 'INSERT', { nombre: 'Juan' });
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('creditos', 'cr1', 'INSERT', { monto: 5000 });

      const batches = await tracker.createUploadBatches(10);

      expect(batches[0][0].table_name).toBe('pagos');
      expect(batches[0][1].table_name).toBe('creditos');
      expect(batches[0][2].table_name).toBe('clientes');
    });
  });

  describe('applyDeltas', () => {
    it('should apply INSERT delta', async () => {
      const deltas = [
        {
          table_name: 'pagos',
          record_id: 'p1',
          changes: [
            {
              field: 'monto',
              oldValue: null,
              newValue: 1000,
              timestamp: Date.now()
            },
            {
              field: 'cliente_id',
              oldValue: null,
              newValue: 'c1',
              timestamp: Date.now()
            }
          ],
          compressed: true,
          timestamp: Date.now()
        }
      ];

      const applied = await tracker.applyDeltas(deltas);
      expect(applied).toBe(1);

      const record = await db.pagos.get('p1');
      expect(record).toBeDefined();
      expect(record!.monto).toBe(1000);
      expect(record!.cliente_id).toBe('c1');
    });

    it('should apply UPDATE delta', async () => {
      // Insert initial record
      await db.pagos.add({
        id: 'p1',
        monto: 1000,
        cliente_id: 'c1'
      } as any);

      const deltas = [
        {
          table_name: 'pagos',
          record_id: 'p1',
          changes: [
            {
              field: 'monto',
              oldValue: 1000,
              newValue: 1500,
              timestamp: Date.now()
            }
          ],
          compressed: true,
          timestamp: Date.now()
        }
      ];

      await tracker.applyDeltas(deltas);

      const record = await db.pagos.get('p1');
      expect(record!.monto).toBe(1500);
    });

    it('should apply DELETE delta', async () => {
      // Insert initial record
      await db.pagos.add({
        id: 'p1',
        monto: 1000,
        cliente_id: 'c1'
      } as any);

      const deltas = [
        {
          table_name: 'pagos',
          record_id: 'p1',
          changes: [
            {
              field: '__deleted__',
              oldValue: null,
              newValue: true,
              timestamp: Date.now()
            }
          ],
          compressed: true,
          timestamp: Date.now()
        }
      ];

      await tracker.applyDeltas(deltas);

      const record = await db.pagos.get('p1');
      expect(record).toBeUndefined();
    });
  });

  describe('markChangesSynced', () => {
    it('should mark changes as synced', async () => {
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('pagos', 'p1', 'UPDATE', { monto: 1500 });

      await tracker.markChangesSynced('pagos', 'p1');

      const pending = await tracker.getPendingChanges('pagos', 'p1');
      expect(pending).toHaveLength(0);
    });
  });

  describe('clearOldSyncedChanges', () => {
    it('should clear old synced changes', async () => {
      const id1 = await tracker.logChange('pagos', 'p1', 'INSERT', {
        monto: 1000
      });
      const id2 = await tracker.logChange('pagos', 'p2', 'INSERT', {
        monto: 2000
      });

      // Mark as synced
      await db.change_log.update(id1, { synced: true });
      await db.change_log.update(id2, { synced: true });

      // Set old timestamp for id1
      await db.change_log.update(id1, {
        timestamp: Date.now() - 40 * 24 * 60 * 60 * 1000 // 40 days ago
      });

      const cleared = await tracker.clearOldSyncedChanges(30);
      expect(cleared).toBe(1);

      const remaining = await db.change_log.toArray();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].id).toBe(id2);
    });
  });

  describe('getStats', () => {
    it('should return statistics', async () => {
      await tracker.logChange('pagos', 'p1', 'INSERT', { monto: 1000 });
      await tracker.logChange('pagos', 'p2', 'INSERT', { monto: 2000 });
      await tracker.logChange('creditos', 'c1', 'INSERT', { monto: 5000 });

      const id1 = await tracker.logChange('clientes', 'cl1', 'INSERT', {
        nombre: 'Juan'
      });
      await db.change_log.update(id1, { synced: true });

      const stats = await tracker.getStats();

      expect(stats.total).toBe(4);
      expect(stats.pending).toBe(3);
      expect(stats.synced).toBe(1);
      expect(stats.byTable).toEqual({
        pagos: 2,
        creditos: 1
      });
    });
  });
});
