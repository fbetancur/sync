/**
 * Schema Engine Types
 * 
 * Types and interfaces specific to the Universal Schema Engine
 * that generates dynamic database schemas from JSON configuration.
 */

import type { 
  DatabaseConfig, 
  TableConfig, 
  DexieSchema, 
  SchemaValidationResult,
  SchemaGenerationOptions,
  TechnicalFields,
  UniversalRecord
} from '@sync/types';

// Re-export core types for convenience
export type {
  DatabaseConfig,
  TableConfig,
  DexieSchema,
  SchemaValidationResult,
  SchemaGenerationOptions,
  TechnicalFields,
  UniversalRecord
};

/**
 * Schema Engine interface - main API for schema generation
 */
export interface SchemaEngine {
  /**
   * Generate Dexie schema from configuration
   */
  generateSchema(config: DatabaseConfig, options?: SchemaGenerationOptions): DexieSchema;
  
  /**
   * Validate schema configuration
   */
  validateConfig(config: DatabaseConfig): SchemaValidationResult;
  
  /**
   * Add technical fields to table configuration
   */
  addTechnicalFields(tableConfig: TableConfig, multiTenant: boolean): TableConfig;
  
  /**
   * Generate optimized indexes for a table
   */
  generateIndexes(tableConfig: TableConfig, tableName: string): string[];
  
  /**
   * Create table definition string for Dexie
   */
  createTableDefinition(tableName: string, tableConfig: TableConfig): string;
}

/**
 * Schema generation context - internal state during generation
 */
export interface SchemaGenerationContext {
  /** Original configuration */
  config: DatabaseConfig;
  /** Generation options */
  options: SchemaGenerationOptions;
  /** Generated table definitions */
  tableDefinitions: Record<string, string>;
  /** Validation errors encountered */
  errors: string[];
  /** Validation warnings encountered */
  warnings: string[];
}

/**
 * Table metadata for generated tables
 */
export interface TableMetadata {
  /** Table name */
  name: string;
  /** Original configuration */
  config: TableConfig;
  /** Generated field list including technical fields */
  allFields: string[];
  /** Generated indexes */
  indexes: string[];
  /** Relationships */
  relationships: Record<string, string>;
}

/**
 * Schema registry for managing multiple schemas
 */
export interface SchemaRegistry {
  /** Register a schema configuration */
  register(appName: string, config: DatabaseConfig): void;
  
  /** Get registered schema */
  get(appName: string): DatabaseConfig | undefined;
  
  /** List all registered schemas */
  list(): string[];
  
  /** Validate all registered schemas */
  validateAll(): Record<string, SchemaValidationResult>;
}

/**
 * Universal database factory options
 */
export interface UniversalDatabaseOptions {
  /** Schema configuration */
  schema: DatabaseConfig;
  /** Generation options */
  options?: SchemaGenerationOptions;
  /** Database name override */
  databaseName?: string;
}

/**
 * Field definition with metadata
 */
export interface FieldDefinition {
  /** Field name */
  name: string;
  /** Field type */
  type: string;
  /** Whether field is required */
  required: boolean;
  /** Whether field is unique */
  unique: boolean;
  /** Whether field is indexed */
  indexed: boolean;
  /** Whether field is a technical field */
  technical: boolean;
  /** Relationship target if applicable */
  relationshipTarget?: string;
}

/**
 * Generated schema metadata
 */
export interface GeneratedSchemaMetadata {
  /** App name */
  appName: string;
  /** Schema version */
  version: number;
  /** Generation timestamp */
  generatedAt: number;
  /** Table metadata */
  tables: Record<string, TableMetadata>;
  /** Total field count */
  totalFields: number;
  /** Total index count */
  totalIndexes: number;
  /** Technical fields included */
  technicalFields: string[];
}