/**
 * @sync/core - Core offline-first infrastructure
 * 
 * This package provides the foundational infrastructure for building
 * offline-first applications in the Sync Platform.
 */

// Core types and interfaces
export * from './types';

// Database layer
export * from './db';

// Sync system
export * from './sync';

// Storage management
export * from './storage';

// Audit system
export * from './audit';

// Security services
export * from './security';

// Validation schemas
export * from './validation';

// Business logic utilities
export * from './business';

// Utility functions
export * from './utils';

// Main factory function
export { createSyncApp } from './app';
export type { SyncAppConfig, SyncApp } from './app';