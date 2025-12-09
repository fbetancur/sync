/**
 * Tests for CRDT Conflict Resolver
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver, type CRDTRecord, type FieldVersion } from './conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('Append-only records (pagos)', () => {
    it('should never have conflicts for pagos', () => {
      const local: CRDTRecord = {
        id: 'pago-1',
        monto: 50000,
      };

      const remote: CRDTRecord = {
        id: 'pago-1',
        monto: 60000,
      };

      const result = resolver.resolveConflict(local, remote, 'pago');

      expect(result.strategy).toBe('append_only');
      expect(result.resolved).toEqual(local);
      expect(result.conflicts_detected).toHaveLength(0);
    });
  });

  describe('Version vector dominance', () => {
    it('should detect when local dominates', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 2, 'device-2': 1 },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 1, 'device-2': 1 },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('local_wins');
      expect(result.resolved).toEqual(local);
    });

    it('should detect when remote dominates', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 1, 'device-2': 1 },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 2, 'device-2': 1 },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('remote_wins');
      expect(result.resolved).toEqual(remote);
    });

    it('should detect concurrent edits', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 2, 'device-2': 1 },
        field_versions: {},
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 1, 'device-2': 2 },
        field_versions: {},
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('merged');
    });
  });

  describe('Field-level merge', () => {
    it('should merge non-conflicting fields', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '123456',
        version_vector: { 'device-1': 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 1000, device_id: 'device-1' },
        },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '789012',
        version_vector: { 'device-2': 1 },
        field_versions: {
          telefono: { value: '789012', timestamp: 2000, device_id: 'device-2' },
        },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('merged');
      expect(result.resolved.nombre).toBe('Juan');
      expect(result.resolved.telefono).toBe('789012');
    });

    it('should use Last-Write-Wins for conflicting fields', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        version_vector: { 'device-1': 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 1000, device_id: 'device-1' },
        },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        nombre: 'Pedro',
        version_vector: { 'device-2': 1 },
        field_versions: {
          nombre: { value: 'Pedro', timestamp: 2000, device_id: 'device-2' },
        },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('merged');
      expect(result.resolved.nombre).toBe('Pedro'); // Remote wins (newer timestamp)
    });

    it('should use device_id as tie-breaker for same timestamp', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        version_vector: { 'device-1': 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 1000, device_id: 'device-a' },
        },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        nombre: 'Pedro',
        version_vector: { 'device-2': 1 },
        field_versions: {
          nombre: { value: 'Pedro', timestamp: 1000, device_id: 'device-b' },
        },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('merged');
      expect(result.resolved.nombre).toBe('Pedro'); // device-b > device-a
      expect(result.conflicts_detected).toContain('nombre');
    });
  });

  describe('Version vector operations', () => {
    it('should increment version vector', () => {
      const versionVector = { 'device-1': 5, 'device-2': 3 };

      const incremented = resolver.incrementVersion(versionVector, 'device-1');

      expect(incremented['device-1']).toBe(6);
      expect(incremented['device-2']).toBe(3);
    });

    it('should initialize version for new device', () => {
      const versionVector = { 'device-1': 5 };

      const incremented = resolver.incrementVersion(versionVector, 'device-2');

      expect(incremented['device-1']).toBe(5);
      expect(incremented['device-2']).toBe(1);
    });
  });

  describe('Field version creation', () => {
    it('should create field version with all required fields', () => {
      const fieldVersion = resolver.createFieldVersion('test-value', 'device-1', 1000);

      expect(fieldVersion.value).toBe('test-value');
      expect(fieldVersion.device_id).toBe('device-1');
      expect(fieldVersion.timestamp).toBe(1000);
    });

    it('should use current timestamp if not provided', () => {
      const before = Date.now();
      const fieldVersion = resolver.createFieldVersion('test-value', 'device-1');
      const after = Date.now();

      expect(fieldVersion.timestamp).toBeGreaterThanOrEqual(before);
      expect(fieldVersion.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('Record updates', () => {
    it('should update record with new field values', () => {
      const record: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '123456',
        version_vector: { 'device-1': 1 },
        field_versions: {},
      };

      const updates = {
        telefono: '789012',
        direccion: 'Calle 123',
      };

      const updated = resolver.updateRecord(record, updates, 'device-1');

      expect(updated.telefono).toBe('789012');
      expect(updated.direccion).toBe('Calle 123');
      expect(updated.nombre).toBe('Juan'); // Unchanged
    });

    it('should increment version vector on update', () => {
      const record: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 5 },
        field_versions: {},
      };

      const updated = resolver.updateRecord(record, { nombre: 'Juan' }, 'device-1');

      expect(updated.version_vector?.['device-1']).toBe(6);
    });

    it('should create field versions for updated fields', () => {
      const record: CRDTRecord = {
        id: 'record-1',
        field_versions: {},
      };

      const updated = resolver.updateRecord(record, { nombre: 'Juan' }, 'device-1');

      expect(updated.field_versions?.nombre).toBeDefined();
      expect(updated.field_versions?.nombre.value).toBe('Juan');
      expect(updated.field_versions?.nombre.device_id).toBe('device-1');
    });
  });

  describe('Concurrent detection', () => {
    it('should detect concurrent edits', () => {
      const record1: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 2, 'device-2': 1 },
      };

      const record2: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 1, 'device-2': 2 },
      };

      const areConcurrent = resolver.areConcurrent(record1, record2);

      expect(areConcurrent).toBe(true);
    });

    it('should detect non-concurrent edits when one dominates', () => {
      const record1: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 2, 'device-2': 2 },
      };

      const record2: CRDTRecord = {
        id: 'record-1',
        version_vector: { 'device-1': 1, 'device-2': 2 },
      };

      const areConcurrent = resolver.areConcurrent(record1, record2);

      expect(areConcurrent).toBe(false);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle three-way merge', () => {
      // Device 1 edits nombre
      const device1Edit: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '111111',
        version_vector: { 'device-1': 2, 'device-2': 1, 'device-3': 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 2000, device_id: 'device-1' },
        },
      };

      // Device 2 edits telefono
      const device2Edit: CRDTRecord = {
        id: 'record-1',
        nombre: 'Original',
        telefono: '222222',
        version_vector: { 'device-1': 1, 'device-2': 2, 'device-3': 1 },
        field_versions: {
          telefono: { value: '222222', timestamp: 2000, device_id: 'device-2' },
        },
      };

      const result = resolver.resolveConflict(device1Edit, device2Edit, 'cliente');

      expect(result.strategy).toBe('merged');
      expect(result.resolved.nombre).toBe('Juan'); // From device 1
      expect(result.resolved.telefono).toBe('222222'); // From device 2
    });

    it('should preserve unchanged fields during merge', () => {
      const local: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '111111',
        direccion: 'Calle 1',
        version_vector: { 'device-1': 2 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 2000, device_id: 'device-1' },
        },
      };

      const remote: CRDTRecord = {
        id: 'record-1',
        nombre: 'Juan',
        telefono: '222222',
        direccion: 'Calle 1',
        version_vector: { 'device-2': 2 },
        field_versions: {
          telefono: { value: '222222', timestamp: 2000, device_id: 'device-2' },
        },
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.resolved.direccion).toBe('Calle 1'); // Preserved
    });
  });
});
