/**
 * CRDT Conflict Resolver Module
 *
 * This module implements Conflict-free Replicated Data Type (CRDT) resolution
 * using version vectors and field-level merge algorithms.
 *
 * Key features:
 * - Version vector comparison for causal ordering
 * - Field-level merge for concurrent edits
 * - Deterministic tie-breaking
 * - Append-only handling for pagos
 * - Editable record handling for clientes and creditos
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.7
 */

// ============================================================================
// TYPES
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
// CONFLICT RESOLVER CLASS
// ============================================================================

export class ConflictResolver {
  /**
   * Main conflict resolution entry point
   * Determines the appropriate strategy based on record type
   */
  resolveConflict(
    local: CRDTRecord,
    remote: CRDTRecord,
    type: string
  ): ConflictResolution {
    // For pagos (append-only): never have conflicts
    if (type === 'pago') {
      return {
        resolved: local,
        strategy: 'append_only',
        conflicts_detected: [],
        metadata: {}
      };
    }

    // For editable records: use CRDT with version vectors
    return this.resolveCRDT(local, remote);
  }

  /**
   * CRDT resolution using version vectors
   * Implements causal ordering and field-level merge
   */
  private resolveCRDT(
    local: CRDTRecord,
    remote: CRDTRecord
  ): ConflictResolution {
    const localVector = local.version_vector || {};
    const remoteVector = remote.version_vector || {};

    // Compare version vectors
    const localDominates = this.dominatesVector(localVector, remoteVector);
    const remoteDominates = this.dominatesVector(remoteVector, localVector);

    // Case 1: Local dominates (local is strictly newer)
    if (localDominates && !remoteDominates) {
      return {
        resolved: local,
        strategy: 'local_wins',
        conflicts_detected: [],
        metadata: {
          local_version: localVector,
          remote_version: remoteVector
        }
      };
    }

    // Case 2: Remote dominates (remote is strictly newer)
    if (remoteDominates && !localDominates) {
      return {
        resolved: remote,
        strategy: 'remote_wins',
        conflicts_detected: [],
        metadata: {
          local_version: localVector,
          remote_version: remoteVector
        }
      };
    }

    // Case 3: Concurrent edits - need field-level merge
    return this.mergeFields(local, remote);
  }

  /**
   * Field-level merge for concurrent edits
   * Uses Last-Write-Wins (LWW) with deterministic tie-breaking
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

    // Get all fields that have versions
    const allFields = new Set([
      ...Object.keys(localFieldVersions),
      ...Object.keys(remoteFieldVersions)
    ]);

    // Merge each field
    for (const field of allFields) {
      const localField = localFieldVersions[field];
      const remoteField = remoteFieldVersions[field];

      if (!remoteField) {
        // Only local has this field - keep local
        resolved[field] = localField?.value;
      } else if (!localField) {
        // Only remote has this field - use remote
        resolved[field] = remoteField.value;
        mergedFields.push(field);
      } else {
        // Both have the field - resolve conflict
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

    // Update field_versions with merged result
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

    // Merge version vectors
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
        merged_fields: mergedFields
      }
    };
  }

  /**
   * Resolve conflict for a single field using Last-Write-Wins
   * with deterministic tie-breaking by device_id
   */
  private resolveFieldConflict(
    local: FieldVersion,
    remote: FieldVersion
  ): FieldVersion {
    // Compare timestamps
    if (local.timestamp > remote.timestamp) {
      return local;
    } else if (remote.timestamp > local.timestamp) {
      return remote;
    }

    // Timestamps are equal - use device_id as tie-breaker
    // Lexicographically larger device_id wins (deterministic)
    return local.device_id > remote.device_id ? local : remote;
  }

  /**
   * Check if version vector v1 dominates v2
   * v1 dominates v2 if v1[i] >= v2[i] for all i, and v1[j] > v2[j] for some j
   */
  private dominatesVector(v1: VersionVector, v2: VersionVector): boolean {
    let hasGreater = false;

    // Check all devices in v2
    for (const deviceId in v2) {
      const v1Count = v1[deviceId] || 0;
      const v2Count = v2[deviceId];

      if (v1Count < v2Count) {
        // v1 is behind v2 for this device
        return false;
      }

      if (v1Count > v2Count) {
        hasGreater = true;
      }
    }

    // Check if v1 has any devices not in v2
    for (const deviceId in v1) {
      if (!(deviceId in v2) && v1[deviceId] > 0) {
        hasGreater = true;
      }
    }

    return hasGreater;
  }

  /**
   * Merge two version vectors by taking the maximum for each device
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
   * Increment version vector for a device
   */
  incrementVersion(
    versionVector: VersionVector,
    deviceId: string
  ): VersionVector {
    return {
      ...versionVector,
      [deviceId]: (versionVector[deviceId] || 0) + 1
    };
  }

  /**
   * Create field version for a field update
   */
  createFieldVersion(
    value: any,
    deviceId: string,
    timestamp: number = Date.now()
  ): FieldVersion {
    return {
      value,
      timestamp,
      device_id: deviceId
    };
  }

  /**
   * Update a record with new field values and version information
   */
  updateRecord(
    record: CRDTRecord,
    updates: Record<string, any>,
    deviceId: string
  ): CRDTRecord {
    const timestamp = Date.now();
    const updatedRecord = { ...record };

    // Initialize field_versions if not present
    if (!updatedRecord.field_versions) {
      updatedRecord.field_versions = {};
    }

    // Update each field
    for (const [field, value] of Object.entries(updates)) {
      updatedRecord[field] = value;
      updatedRecord.field_versions[field] = this.createFieldVersion(
        value,
        deviceId,
        timestamp
      );
    }

    // Increment version vector
    updatedRecord.version_vector = this.incrementVersion(
      updatedRecord.version_vector || {},
      deviceId
    );

    // Update timestamp
    updatedRecord.updated_at = timestamp;

    return updatedRecord;
  }

  /**
   * Check if two records are concurrent (neither dominates)
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
// SINGLETON INSTANCE
// ============================================================================

export const conflictResolver = new ConflictResolver();
