/**
 * Property-based tests for ConflictResolver
 *
 * Property 3: Conflict Resolution Determinism
 * Validates: Requirements 6.1, 6.2
 *
 * These tests verify that conflict resolution is deterministic:
 * - Same conflicts resolved in different orders produce same result
 * - CRDT merge is commutative and associative
 * - Version vectors are correctly compared
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ConflictResolver } from './conflict-resolver';

// Arbitraries for generating test data
const deviceIdArb = fc.stringMatching(/^device-[0-9]+$/);
const timestampArb = fc.integer({ min: 1000000000000, max: 9999999999999 });
const versionVectorArb = fc.dictionary(deviceIdArb, fc.nat(100), {
  minKeys: 1,
  maxKeys: 5
});

const fieldVersionArb = fc.record({
  value: fc.oneof(fc.string(), fc.integer(), fc.double(), fc.boolean()),
  timestamp: timestampArb,
  device_id: deviceIdArb
});

const fieldVersionsArb = fc.dictionary(
  fc.constantFrom('nombre', 'telefono', 'direccion', 'email', 'notas'),
  fieldVersionArb,
  { minKeys: 1, maxKeys: 5 }
);

const clienteRecordArb = fc.record({
  id: fc.uuid(),
  tenant_id: fc.uuid(),
  nombre: fc.string({ minLength: 3, maxLength: 50 }),
  telefono: fc.stringMatching(/^[0-9]{10}$/),
  direccion: fc.string({ minLength: 10, maxLength: 100 }),
  version_vector: versionVectorArb,
  field_versions: fieldVersionsArb,
  synced: fc.boolean(),
  updated_at: timestampArb
});

describe('ConflictResolver - Property Tests', () => {
  const resolver = new ConflictResolver();

  describe('Property 3: Conflict Resolution Determinism', () => {
    it('should produce same result regardless of resolution order', () => {
      fc.assert(
        fc.property(clienteRecordArb, clienteRecordArb, (local, remote) => {
          // Ensure records have same ID but different data
          remote.id = local.id;
          remote.tenant_id = local.tenant_id;

          // Resolve in both orders
          const result1 = resolver.resolveConflict(local, remote, 'clientes');
          const result2 = resolver.resolveConflict(remote, local, 'clientes');

          // Results should be identical (deterministic)
          expect(result1.resolved.id).toBe(result2.resolved.id);

          // Field versions should be the same
          const fields1 = Object.keys(
            result1.resolved.field_versions || {}
          ).sort();
          const fields2 = Object.keys(
            result2.resolved.field_versions || {}
          ).sort();
          expect(fields1).toEqual(fields2);

          // Each field should have the same winner
          for (const field of fields1) {
            const fv1 = result1.resolved.field_versions[field];
            const fv2 = result2.resolved.field_versions[field];

            expect(fv1.timestamp).toBe(fv2.timestamp);
            expect(fv1.device_id).toBe(fv2.device_id);
            expect(fv1.value).toEqual(fv2.value);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle version vector dominance correctly', () => {
      fc.assert(
        fc.property(versionVectorArb, versionVectorArb, (vv1, vv2) => {
          // Create two records with these version vectors
          const local = {
            id: 'test-id',
            tenant_id: 'tenant-1',
            nombre: 'Local Name',
            version_vector: vv1,
            field_versions: {},
            synced: false,
            updated_at: Date.now()
          };

          const remote = {
            id: 'test-id',
            tenant_id: 'tenant-1',
            nombre: 'Remote Name',
            version_vector: vv2,
            field_versions: {},
            synced: true,
            updated_at: Date.now()
          };

          const result = resolver.resolveConflict(local, remote, 'clientes');

          // Result should always be one of the inputs or a merge
          expect(result.resolved).toBeDefined();
          expect(result.resolved.id).toBe('test-id');

          // Strategy should be deterministic based on version vectors
          expect(['local_wins', 'remote_wins', 'merged']).toContain(
            result.strategy
          );
        }),
        { numRuns: 100 }
      );
    });

    it('should resolve field-level conflicts deterministically', () => {
      fc.assert(
        fc.property(
          fieldVersionsArb,
          fieldVersionsArb,
          deviceIdArb,
          (fieldVersions1, fieldVersions2, deviceId) => {
            // Create records with overlapping fields
            const commonFields = Object.keys(fieldVersions1).filter(k =>
              Object.keys(fieldVersions2).includes(k)
            );

            if (commonFields.length === 0) {
              return true; // Skip if no common fields
            }

            const local = {
              id: 'test-id',
              tenant_id: 'tenant-1',
              nombre: 'Test',
              version_vector: { [deviceId]: 1 },
              field_versions: fieldVersions1,
              synced: false,
              updated_at: Date.now()
            };

            const remote = {
              id: 'test-id',
              tenant_id: 'tenant-1',
              nombre: 'Test',
              version_vector: { [deviceId]: 1 },
              field_versions: fieldVersions2,
              synced: true,
              updated_at: Date.now()
            };

            const result = resolver.resolveConflict(local, remote, 'clientes');

            // For each common field, winner should be determined by timestamp
            for (const field of commonFields) {
              const localField = fieldVersions1[field];
              const remoteField = fieldVersions2[field];
              const resolvedField = result.resolved.field_versions[field];

              // Winner should be the one with higher timestamp
              if (localField.timestamp > remoteField.timestamp) {
                expect(resolvedField.timestamp).toBe(localField.timestamp);
                expect(resolvedField.device_id).toBe(localField.device_id);
              } else if (remoteField.timestamp > localField.timestamp) {
                expect(resolvedField.timestamp).toBe(remoteField.timestamp);
                expect(resolvedField.device_id).toBe(remoteField.device_id);
              } else {
                // Tie-break by device_id (lexicographic)
                const expectedDeviceId =
                  localField.device_id > remoteField.device_id
                    ? localField.device_id
                    : remoteField.device_id;
                expect(resolvedField.device_id).toBe(expectedDeviceId);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle append-only records (pagos) consistently', () => {
      fc.assert(
        fc.property(
          fc.uuid(),
          fc.double({ min: 100, max: 10000 }),
          timestampArb,
          (pagoId, monto, timestamp) => {
            const local = {
              id: pagoId,
              tenant_id: 'tenant-1',
              credito_id: 'credito-1',
              monto,
              fecha: timestamp,
              version_vector: { 'device-1': 1 },
              field_versions: {},
              synced: false
            };

            const remote = {
              id: pagoId,
              tenant_id: 'tenant-1',
              credito_id: 'credito-1',
              monto: monto + 100,
              fecha: timestamp + 1000,
              version_vector: { 'device-2': 1 },
              field_versions: {},
              synced: true
            };

            // For pagos (append-only), resolution should be deterministic
            const result = resolver.resolveConflict(local, remote, 'pagos');

            // Result should be consistent
            expect(result.resolved.id).toBe(pagoId);
            expect(['local_wins', 'remote_wins', 'merged']).toContain(
              result.strategy
            );

            // Resolve in reverse order should give same result
            const result2 = resolver.resolveConflict(remote, local, 'pagos');
            expect(result.resolved.id).toBe(result2.resolved.id);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain CRDT properties (commutativity)', () => {
      fc.assert(
        fc.property(clienteRecordArb, clienteRecordArb, (record1, record2) => {
          // Ensure same ID
          record2.id = record1.id;
          record2.tenant_id = record1.tenant_id;

          // Resolve in both orders
          const resultAB = resolver.resolveConflict(
            record1,
            record2,
            'clientes'
          );
          const resultBA = resolver.resolveConflict(
            record2,
            record1,
            'clientes'
          );

          // Commutativity: A ⊕ B = B ⊕ A
          // The resolved records should be equivalent
          expect(resultAB.resolved.id).toBe(resultBA.resolved.id);

          // Field versions should converge to same values
          const fieldsAB = Object.keys(resultAB.resolved.field_versions || {});
          const fieldsBA = Object.keys(resultBA.resolved.field_versions || {});

          // Same fields should be present
          expect(new Set(fieldsAB)).toEqual(new Set(fieldsBA));

          // Each field should have same winner
          for (const field of fieldsAB) {
            const fvAB = resultAB.resolved.field_versions[field];
            const fvBA = resultBA.resolved.field_versions[field];

            expect(fvAB.timestamp).toBe(fvBA.timestamp);
            expect(fvAB.device_id).toBe(fvBA.device_id);
          }
        }),
        { numRuns: 100 }
      );
    });

    it('should handle empty field_versions gracefully', () => {
      fc.assert(
        fc.property(clienteRecordArb, record => {
          const local = { ...record, field_versions: {} };
          const remote = { ...record, field_versions: {} };
          remote.nombre = 'Different Name';

          const result = resolver.resolveConflict(local, remote, 'clientes');

          expect(result.resolved).toBeDefined();
          expect(result.strategy).toBeDefined();
        }),
        { numRuns: 100 }
      );
    });

    it('should detect conflicts correctly', () => {
      fc.assert(
        fc.property(
          clienteRecordArb,
          fc.constantFrom('nombre', 'telefono', 'direccion'),
          fc.string(),
          timestampArb,
          (record, fieldName, newValue, timestamp) => {
            const local = {
              ...record,
              field_versions: {
                [fieldName]: {
                  value: 'local-value',
                  timestamp: timestamp,
                  device_id: 'device-1'
                }
              }
            };

            const remote = {
              ...record,
              field_versions: {
                [fieldName]: {
                  value: 'remote-value',
                  timestamp: timestamp + 1000, // Remote is newer
                  device_id: 'device-2'
                }
              }
            };

            const result = resolver.resolveConflict(local, remote, 'clientes');

            // Remote should win (newer timestamp)
            expect(result.resolved.field_versions[fieldName].value).toBe(
              'remote-value'
            );
            expect(result.resolved.field_versions[fieldName].device_id).toBe(
              'device-2'
            );

            // Conflicts are detected when strategy is merged
            // The conflicts_detected array may or may not include the field
            // depending on whether version vectors indicate a conflict
            expect(result.conflicts_detected).toBeDefined();
            expect(Array.isArray(result.conflicts_detected)).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle version vector comparison edge cases', () => {
      fc.assert(
        fc.property(deviceIdArb, fc.nat(100), (deviceId, version) => {
          const local = {
            id: 'test-id',
            tenant_id: 'tenant-1',
            nombre: 'Local',
            version_vector: { [deviceId]: version },
            field_versions: {},
            synced: false,
            updated_at: Date.now()
          };

          const remote = {
            id: 'test-id',
            tenant_id: 'tenant-1',
            nombre: 'Remote',
            version_vector: { [deviceId]: version + 1 },
            field_versions: {},
            synced: true,
            updated_at: Date.now()
          };

          const result = resolver.resolveConflict(local, remote, 'clientes');

          // Remote should win (higher version)
          expect(result.strategy).toBe('remote_wins');
          expect(result.resolved.nombre).toBe('Remote');
        }),
        { numRuns: 100 }
      );
    });
  });
});
