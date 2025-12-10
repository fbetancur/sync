/**
 * Core types and interfaces for @sync/core
 */

// Re-export common types that will be used across the platform
export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: number;
  updated_at: number;
  synced: boolean;
  checksum: string;
}

export interface SyncableEntity extends BaseEntity {
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
}

export interface FieldVersion {
  version: number;
  timestamp: number;
  node_id: string;
}

// Placeholder - will be populated as we extract modules
export type CoreTypes = {
  // Database types will be added here
  // Sync types will be added here
  // Storage types will be added here
};