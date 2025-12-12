/**
 * @sync/core - Core offline-first infrastructure
 *
 * This package provides the foundational infrastructure for building
 * offline-first applications in the Sync Platform.
 */

// Core types and interfaces (solo tipos TypeScript, no runtime exports)
export type * from './types';

// Schema engine types and utilities
export type * from './schema/types';
export * from './schema';

// Database layer
export { createDatabase, MicrocreditosDB } from './db/database';
export { UniversalDatabase, createUniversalDatabaseWithOptions } from './db/universal-database';
export { DatabaseFactory, createUniversalDatabase, isUniversalDatabase, isLegacyDatabase } from './db/database-factory';
// Alias para compatibilidad
export { MicrocreditosDB as SyncDB } from './db';

// Sync system
export { SyncManager, ConflictResolver, ChangeTracker } from './sync';

// Storage management
export { StorageManager } from './storage';

// Audit system
export { AuditLogger } from './audit';

// Security services
export { EncryptionService } from './security';

// Authentication services
export { AuthService } from './auth';
export type { AuthConfig, AuthResult, SignInCredentials, SignUpCredentials } from './auth';

// Validation schemas
export * from './validation';

// Business logic utilities
export * from './business';

// Utility functions
export { ChecksumService } from './utils';

// Context services
export { ContextService } from './context/context-service';
export type { 
  LocationResult, 
  DeviceInfo, 
  OperationContext, 
  LocationOptions 
} from './context/context-service';

// Validation services
export { PhoneService } from './validation/phone-service';
export type { 
  CountryConfig, 
  PhoneValidationResult, 
  CountryDetectionResult 
} from './validation/phone-service';

// Entity services
export { EntityService } from './entities/entity-service';
export type { 
  ValidationResult, 
  EntityBase, 
  CreateEntityOptions, 
  UpdateEntityOptions, 
  EntityServiceConfig 
} from './entities/entity-service';

// Main factory function
export {
  createSyncApp,
  createDefaultConfig,
  createDevConfig,
  createProdConfig
} from './app';
export type { SyncAppConfig, SyncApp, SyncAppServices, AppStatus } from './app';
