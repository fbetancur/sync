/**
 * Módulo de Resolución de Conflictos CRDT
 * 
 * Este módulo implementa la resolución de Conflict-free Replicated Data Type (CRDT)
 * usando vectores de versión y algoritmos de merge a nivel de campo.
 * 
 * Características clave:
 * - Comparación de vectores de versión para ordenamiento causal
 * - Merge a nivel de campo para ediciones concurrentes
 * - Desempate determinístico
 * - Manejo de append-only para pagos
 * - Manejo de registros editables para clientes y créditos
 * 
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7
 */

// ============================================================================
// TIPOS
// ============================================================================

export interface VersionVector {
  [deviceId: string]: number;
}

export interface FieldVersion {
  value: any;
  timestamp: number;
  device_id: string;
}

export interface CRDTRecord {
  id: string;
  version_vector?: VersionVector;
  field_versions?: Record<string, FieldVersion>;
  [key: string]: any;
}

export type ConflictStrategy = 
  | 'local_wins' 
  | 'remote_wins' 
  | 'merged' 
  | 'last_write_wins'
  | 'append_only';

export interface ConflictResolution {
  resolved: CRDTRecord;
  strategy: ConflictStrategy;
  conflicts_detected: string[];
  metadata: {
    local_version?: VersionVector;
    remote_version?: VersionVector;
    merged_fields?: string[];
  };
}

// ============================================================================
// CLASE RESOLVEDOR DE CONFLICTOS
// ============================================================================

export class ConflictResolver {
  /**
   * Punto de entrada principal para resolución de conflictos
   * Determina la estrategia apropiada basada en el tipo de registro
   */
  resolveConflict(
    local: CRDTRecord,
    remote: CRDTRecord,
    type: string
  ): ConflictResolution {
    // Para pagos (append-only): nunca tienen conflictos
    if (type === 'pago') {
      return {
        resolved: local,
        strategy: 'append_only',
        conflicts_detected: [],
        metadata: {},
      };
    }

    // Para registros editables: usar CRDT con vectores de versión
    return this.resolveCRDT(local, remote);
  }

  /**
   * Resolución CRDT usando vectores de versión
   * Implementa ordenamiento causal y merge a nivel de campo
   */
  private resolveCRDT(
    local: CRDTRecord,
    remote: CRDTRecord
  ): ConflictResolution {
    const localVector = local.version_vector || {};
    const remoteVector = remote.version_vector || {};

    // Comparar vectores de versión
    const localDominates = this.dominatesVector(localVector, remoteVector);
    const remoteDominates = this.dominatesVector(remoteVector, localVector);

    // Caso 1: Local domina (local es estrictamente más nuevo)
    if (localDominates && !remoteDominates) {
      return {
        resolved: local,
        strategy: 'local_wins',
        conflicts_detected: [],
        metadata: {
          local_version: localVector,
          remote_version: remoteVector,
        },
      };
    }

    // Caso 2: Remoto domina (remoto es estrictamente más nuevo)
    if (remoteDominates && !localDominates) {
      return {
        resolved: remote,
        strategy: 'remote_wins',
        conflicts_detected: [],
        metadata: {
          local_version: localVector,
          remote_version: remoteVector,
        },
      };
    }

    // Caso 3: Ediciones concurrentes - necesita merge a nivel de campo
    return this.mergeFields(local, remote);
  }

  /**
   * Merge a nivel de campo para ediciones concurrentes
   * Usa Last-Write-Wins (LWW) con desempate determinístico
   */
  private mergeFields(
    local: CRDTRecord,
    remote: CRDTRecord
  ): ConflictResolution {
    const resolved: CRDTRecord = { ...local };
    const conflicts: string[] = [];
    const mergedFields: string[] = [];

    const localFieldVersions = local.field_versions || {};
    const remoteFieldVersions = remote.field_versions || {};

    // Obtener todos los campos que tienen versiones
    const allFields = new Set([
      ...Object.keys(localFieldVersions),
      ...Object.keys(remoteFieldVersions),
    ]);

    // Hacer merge de cada campo
    for (const field of allFields) {
      const localField = localFieldVersions[field];
      const remoteField = remoteFieldVersions[field];

      if (!remoteField) {
        // Solo local tiene este campo - mantener local
        resolved[field] = localField?.value;
      } else if (!localField) {
        // Solo remoto tiene este campo - usar remoto
        resolved[field] = remoteField.value;
        mergedFields.push(field);
      } else {
        // Ambos tienen el campo - resolver conflicto
        const winner = this.resolveFieldConflict(localField, remoteField);
        resolved[field] = winner.value;

        if (winner !== localField) {
          mergedFields.push(field);
        }

        if (localField.timestamp === remoteField.timestamp) {
          conflicts.push(field);
        }
      }
    }

    // Actualizar field_versions con el resultado del merge
    resolved.field_versions = {};
    for (const field of allFields) {
      const localField = localFieldVersions[field];
      const remoteField = remoteFieldVersions[field];

      if (localField && remoteField) {
        resolved.field_versions[field] = this.resolveFieldConflict(
          localField,
          remoteField
        );
      } else {
        resolved.field_versions[field] = localField || remoteField;
      }
    }

    // Hacer merge de vectores de versión
    resolved.version_vector = this.mergeVersionVectors(
      local.version_vector || {},
      remote.version_vector || {}
    );

    return {
      resolved,
      strategy: 'merged',
      conflicts_detected: conflicts,
      metadata: {
        local_version: local.version_vector,
        remote_version: remote.version_vector,
        merged_fields: mergedFields,
      },
    };
  }

  /**
   * Resolver conflicto para un solo campo usando Last-Write-Wins
   * con desempate determinístico por device_id
   */
  private resolveFieldConflict(
    local: FieldVersion,
    remote: FieldVersion
  ): FieldVersion {
    // Comparar timestamps
    if (local.timestamp > remote.timestamp) {
      return local;
    } else if (remote.timestamp > local.timestamp) {
      return remote;
    }

    // Los timestamps son iguales - usar device_id como desempate
    // El device_id lexicográficamente mayor gana (determinístico)
    return local.device_id > remote.device_id ? local : remote;
  }

  /**
   * Verificar si el vector de versión v1 domina v2
   * v1 domina v2 si v1[i] >= v2[i] para todo i, y v1[j] > v2[j] para algún j
   */
  private dominatesVector(v1: VersionVector, v2: VersionVector): boolean {
    let hasGreater = false;

    // Verificar todos los dispositivos en v2
    for (const deviceId in v2) {
      const v1Count = v1[deviceId] || 0;
      const v2Count = v2[deviceId];

      if (v1Count < v2Count) {
        // v1 está atrasado respecto a v2 para este dispositivo
        return false;
      }

      if (v1Count > v2Count) {
        hasGreater = true;
      }
    }

    // Verificar si v1 tiene dispositivos que no están en v2
    for (const deviceId in v1) {
      if (!(deviceId in v2) && v1[deviceId] > 0) {
        hasGreater = true;
      }
    }

    return hasGreater;
  }

  /**
   * Hacer merge de dos vectores de versión tomando el máximo para cada dispositivo
   */
  private mergeVersionVectors(
    v1: VersionVector,
    v2: VersionVector
  ): VersionVector {
    const merged: VersionVector = { ...v1 };

    for (const deviceId in v2) {
      merged[deviceId] = Math.max(merged[deviceId] || 0, v2[deviceId]);
    }

    return merged;
  }

  /**
   * Incrementar vector de versión para un dispositivo
   */
  incrementVersion(
    versionVector: VersionVector,
    deviceId: string
  ): VersionVector {
    return {
      ...versionVector,
      [deviceId]: (versionVector[deviceId] || 0) + 1,
    };
  }

  /**
   * Crear versión de campo para una actualización de campo
   */
  createFieldVersion(
    value: any,
    deviceId: string,
    timestamp: number = Date.now()
  ): FieldVersion {
    return {
      value,
      timestamp,
      device_id: deviceId,
    };
  }

  /**
   * Actualizar un registro con nuevos valores de campo e información de versión
   */
  updateRecord(
    record: CRDTRecord,
    updates: Record<string, any>,
    deviceId: string
  ): CRDTRecord {
    const timestamp = Date.now();
    const updatedRecord = { ...record };

    // Inicializar field_versions si no está presente
    if (!updatedRecord.field_versions) {
      updatedRecord.field_versions = {};
    }

    // Actualizar cada campo
    for (const [field, value] of Object.entries(updates)) {
      updatedRecord[field] = value;
      updatedRecord.field_versions[field] = this.createFieldVersion(
        value,
        deviceId,
        timestamp
      );
    }

    // Incrementar vector de versión
    updatedRecord.version_vector = this.incrementVersion(
      updatedRecord.version_vector || {},
      deviceId
    );

    // Actualizar timestamp
    updatedRecord.updated_at = timestamp;

    return updatedRecord;
  }

  /**
   * Verificar si dos registros son concurrentes (ninguno domina)
   */
  areConcurrent(record1: CRDTRecord, record2: CRDTRecord): boolean {
    const v1 = record1.version_vector || {};
    const v2 = record2.version_vector || {};

    const v1Dominates = this.dominatesVector(v1, v2);
    const v2Dominates = this.dominatesVector(v2, v1);

    return !v1Dominates && !v2Dominates;
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const conflictResolver = new ConflictResolver();