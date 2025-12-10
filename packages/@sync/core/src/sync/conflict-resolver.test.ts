/**
 * Tests para Resolución de Conflictos CRDT
 *
 * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 6.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ConflictResolver, type CRDTRecord } from './conflict-resolver';

describe('ConflictResolver', () => {
  let resolver: ConflictResolver;

  beforeEach(() => {
    resolver = new ConflictResolver();
  });

  describe('resolveConflict', () => {
    it('debería usar estrategia append_only para pagos', () => {
      const local: CRDTRecord = {
        id: 'pago-1',
        monto: 50000,
        version_vector: { device1: 1 }
      };

      const remote: CRDTRecord = {
        id: 'pago-1',
        monto: 60000,
        version_vector: { device2: 1 }
      };

      const result = resolver.resolveConflict(local, remote, 'pago');

      expect(result.strategy).toBe('append_only');
      expect(result.resolved).toBe(local);
      expect(result.conflicts_detected).toHaveLength(0);
    });

    it('debería detectar cuando local domina', () => {
      const local: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan Local',
        version_vector: { device1: 2, device2: 1 }
      };

      const remote: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan Remote',
        version_vector: { device1: 1, device2: 1 }
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('local_wins');
      expect(result.resolved).toBe(local);
    });

    it('debería detectar cuando remoto domina', () => {
      const local: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan Local',
        version_vector: { device1: 1, device2: 1 }
      };

      const remote: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan Remote',
        version_vector: { device1: 2, device2: 1 }
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('remote_wins');
      expect(result.resolved).toBe(remote);
    });

    it('debería hacer merge de campos cuando hay ediciones concurrentes', () => {
      const local: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan',
        telefono: '123456789',
        version_vector: { device1: 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 1000, device_id: 'device1' },
          telefono: {
            value: '123456789',
            timestamp: 1000,
            device_id: 'device1'
          }
        }
      };

      const remote: CRDTRecord = {
        id: 'cliente-1',
        nombre: 'Juan',
        direccion: 'Calle 123',
        version_vector: { device2: 1 },
        field_versions: {
          nombre: { value: 'Juan', timestamp: 1000, device_id: 'device1' },
          direccion: {
            value: 'Calle 123',
            timestamp: 1100,
            device_id: 'device2'
          }
        }
      };

      const result = resolver.resolveConflict(local, remote, 'cliente');

      expect(result.strategy).toBe('merged');
      expect(result.resolved.nombre).toBe('Juan');
      expect(result.resolved.telefono).toBe('123456789');
      expect(result.resolved.direccion).toBe('Calle 123');
    });
  });

  describe('incrementVersion', () => {
    it('debería incrementar el contador para un dispositivo', () => {
      const versionVector = { device1: 5, device2: 3 };
      const result = resolver.incrementVersion(versionVector, 'device1');

      expect(result).toEqual({ device1: 6, device2: 3 });
    });

    it('debería crear entrada para nuevo dispositivo', () => {
      const versionVector = { device1: 5 };
      const result = resolver.incrementVersion(versionVector, 'device2');

      expect(result).toEqual({ device1: 5, device2: 1 });
    });
  });

  describe('createFieldVersion', () => {
    it('debería crear versión de campo con timestamp', () => {
      const result = resolver.createFieldVersion('test value', 'device1', 1000);

      expect(result).toEqual({
        value: 'test value',
        timestamp: 1000,
        device_id: 'device1'
      });
    });

    it('debería usar timestamp actual por defecto', () => {
      const before = Date.now();
      const result = resolver.createFieldVersion('test', 'device1');
      const after = Date.now();

      expect(result.value).toBe('test');
      expect(result.device_id).toBe('device1');
      expect(result.timestamp).toBeGreaterThanOrEqual(before);
      expect(result.timestamp).toBeLessThanOrEqual(after);
    });
  });

  describe('areConcurrent', () => {
    it('debería detectar registros concurrentes', () => {
      const record1: CRDTRecord = {
        id: '1',
        version_vector: { device1: 2, device2: 1 }
      };

      const record2: CRDTRecord = {
        id: '2',
        version_vector: { device1: 1, device2: 2 }
      };

      const result = resolver.areConcurrent(record1, record2);
      expect(result).toBe(true);
    });

    it('debería detectar cuando un registro domina', () => {
      const record1: CRDTRecord = {
        id: '1',
        version_vector: { device1: 2, device2: 2 }
      };

      const record2: CRDTRecord = {
        id: '2',
        version_vector: { device1: 1, device2: 1 }
      };

      const result = resolver.areConcurrent(record1, record2);
      expect(result).toBe(false);
    });
  });
});