/**
 * @sync/types - Shared TypeScript types
 * 
 * This package provides all TypeScript type definitions used across
 * the Sync Platform monorepo.
 */

// Re-export all type categories
export * from './database';
export * from './api';
export * from './business';
export * from './ui';

// Common base types
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