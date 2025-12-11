/**
 * Schema-related types for Universal Schema Engine
 * 
 * Re-exports schema types from database.ts for better organization
 */

export type {
  DatabaseConfig,
  TableConfig,
  FieldType,
  IndexConfig,
  DexieSchema,
  TechnicalFields,
  FieldVersion,
  UniversalRecord,
  SchemaValidationResult,
  SchemaValidationError,
  SchemaValidationWarning,
  SchemaGenerationOptions
} from './database';

/**
 * App configuration that includes schema definition
 */
export interface AppSchemaConfig {
  /** Application name */
  appName: string;
  /** Application version */
  version: string;
  /** Database schema configuration */
  database: DatabaseConfig;
}

/**
 * Schema loader interface for loading configurations from files
 */
export interface SchemaLoader {
  /** Load schema from JSON file */
  loadFromFile(filePath: string): Promise<AppSchemaConfig>;
  
  /** Load schema from JSON string */
  loadFromJson(json: string): AppSchemaConfig;
  
  /** Validate loaded schema */
  validate(config: AppSchemaConfig): SchemaValidationResult;
}

/**
 * Schema migration interface for handling schema changes
 */
export interface SchemaMigration {
  /** Migration version */
  version: number;
  
  /** Migration description */
  description: string;
  
  /** Migration function */
  migrate: (oldSchema: DatabaseConfig, newSchema: DatabaseConfig) => Promise<void>;
  
  /** Rollback function */
  rollback?: (oldSchema: DatabaseConfig, newSchema: DatabaseConfig) => Promise<void>;
}