/**
 * Universal Schema Engine
 * 
 * Generates dynamic Dexie database schemas from JSON configuration.
 * Automatically adds technical fields for offline-first functionality.
 */

import type { 
  DatabaseConfig, 
  TableConfig, 
  DexieSchema, 
  SchemaValidationResult,
  SchemaGenerationOptions,
  TechnicalFields
} from '@sync/types';

import type { 
  SchemaEngine as ISchemaEngine,
  SchemaGenerationContext,
  TableMetadata
} from './types';

import { SchemaValidator } from './schema-validator';

/**
 * Default technical fields added to all tables
 */
const DEFAULT_TECHNICAL_FIELDS = [
  'id',
  'created_at', 
  'updated_at',
  'created_by',
  'version_vector',
  'field_versions', 
  'synced',
  'checksum'
];

/**
 * Default system tables for sync and audit
 */
const DEFAULT_SYSTEM_TABLES = {
  sync_queue: `
    ++id,
    timestamp,
    table_name,
    record_id,
    operation,
    synced,
    priority,
    [synced+priority+timestamp]
  `,
  audit_log: `
    ++id,
    timestamp,
    sequence,
    event_type,
    aggregate_type,
    aggregate_id,
    user_id,
    [aggregate_type+aggregate_id+timestamp],
    [user_id+timestamp]
  `,
  change_log: `
    ++id,
    timestamp,
    table_name,
    record_id,
    synced,
    [synced+timestamp],
    [table_name+record_id]
  `,
  checksums: 'record_key, checksum, timestamp',
  app_state: 'key, value, updated_at'
};

/**
 * Universal Schema Engine implementation
 */
export class SchemaEngine implements ISchemaEngine {
  private validator: SchemaValidator;

  constructor() {
    this.validator = new SchemaValidator();
  }

  /**
   * Generate Dexie schema from configuration
   */
  generateSchema(config: DatabaseConfig, options: SchemaGenerationOptions = {}): DexieSchema {
    // Validate configuration first
    const validation = this.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Schema validation failed: ${validation.errors.map(e => e.message).join(', ')}`);
    }

    // Create generation context
    const context: SchemaGenerationContext = {
      config,
      options: {
        includeAuditTables: true,
        includeSyncTables: true,
        indexOptimization: 'standard',
        ...options
      },
      tableDefinitions: {},
      errors: [],
      warnings: []
    };

    // Generate table definitions
    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      try {
        const definition = this.createTableDefinition(tableName, tableConfig, config.multiTenant, context.options);
        context.tableDefinitions[tableName] = definition;
      } catch (error) {
        context.errors.push(`Failed to generate table '${tableName}': ${error.message}`);
      }
    }

    // Add system tables if requested
    if (context.options.includeAuditTables || context.options.includeSyncTables) {
      Object.assign(context.tableDefinitions, DEFAULT_SYSTEM_TABLES);
    }

    // Check for generation errors
    if (context.errors.length > 0) {
      throw new Error(`Schema generation failed: ${context.errors.join(', ')}`);
    }

    return {
      version: 1,
      stores: context.tableDefinitions
    };
  }

  /**
   * Validate schema configuration
   */
  validateConfig(config: DatabaseConfig): SchemaValidationResult {
    return this.validator.validateConfig(config);
  }

  /**
   * Add technical fields to table configuration
   */
  addTechnicalFields(tableConfig: TableConfig, multiTenant: boolean): TableConfig {
    const technicalFields = [...DEFAULT_TECHNICAL_FIELDS];
    
    // Add tenant_id if multi-tenant
    if (multiTenant) {
      technicalFields.splice(1, 0, 'tenant_id'); // Insert after 'id'
    }

    // Combine with existing fields, avoiding duplicates
    const allFields = [
      ...technicalFields,
      ...tableConfig.fields.filter(field => !technicalFields.includes(field))
    ];

    return {
      ...tableConfig,
      fields: allFields
    };
  }

  /**
   * Generate optimized indexes for a table
   */
  generateIndexes(tableConfig: TableConfig, tableName: string, multiTenant: boolean = false): string[] {
    const indexes: string[] = [];
    
    // Always include primary key
    indexes.push('id');
    
    // Add tenant_id if multi-tenant
    if (multiTenant) {
      indexes.push('tenant_id');
    }

    // Add configured indexes
    if (tableConfig.indexes) {
      indexes.push(...tableConfig.indexes);
    }

    // Add automatic indexes for relationships
    if (tableConfig.relationships) {
      for (const field of Object.keys(tableConfig.relationships)) {
        if (!indexes.includes(field)) {
          indexes.push(field);
        }
        
        // Add compound index with tenant_id if multi-tenant
        if (multiTenant && !indexes.includes(`[tenant_id+${field}]`)) {
          indexes.push(`[tenant_id+${field}]`);
        }
      }
    }

    // Add indexes for required fields (they're likely to be queried)
    if (tableConfig.required) {
      for (const field of tableConfig.required) {
        if (!indexes.includes(field) && field !== 'id') {
          indexes.push(field);
        }
      }
    }

    // Add sync-related indexes
    if (!indexes.includes('synced')) {
      indexes.push('synced');
    }

    return indexes;
  }

  /**
   * Create table definition string for Dexie
   */
  createTableDefinition(tableName: string, tableConfig: TableConfig, multiTenant: boolean = false, options: SchemaGenerationOptions = {}): string {
    // Add technical fields
    const enhancedConfig = this.addTechnicalFields(tableConfig, multiTenant);
    
    // Generate indexes
    const indexes = this.generateIndexes(enhancedConfig, tableName, multiTenant);
    
    // Apply index optimization
    const optimizedIndexes = this.optimizeIndexes(indexes, options.indexOptimization || 'standard');
    
    // Create Dexie store definition
    return optimizedIndexes.join(', ');
  }

  /**
   * Optimize indexes based on optimization level
   */
  private optimizeIndexes(indexes: string[], optimization: 'basic' | 'standard' | 'aggressive'): string[] {
    switch (optimization) {
      case 'basic':
        // Only essential indexes
        return indexes.filter(index => 
          index === 'id' || 
          index === 'tenant_id' || 
          index === 'synced' ||
          !index.startsWith('[') // No compound indexes
        );
        
      case 'aggressive':
        // Add extra compound indexes for common query patterns
        const enhanced = [...indexes];
        
        // Add timestamp-based compound indexes
        if (indexes.includes('created_at') && indexes.includes('tenant_id')) {
          enhanced.push('[tenant_id+created_at]');
        }
        if (indexes.includes('updated_at') && indexes.includes('tenant_id')) {
          enhanced.push('[tenant_id+updated_at]');
        }
        
        return enhanced;
        
      case 'standard':
      default:
        // Standard optimization - return as is
        return indexes;
    }
  }

  /**
   * Get metadata for generated tables
   */
  getTableMetadata(config: DatabaseConfig, options: SchemaGenerationOptions = {}): Record<string, TableMetadata> {
    const metadata: Record<string, TableMetadata> = {};

    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      const enhancedConfig = this.addTechnicalFields(tableConfig, config.multiTenant);
      const indexes = this.generateIndexes(enhancedConfig, tableName, config.multiTenant);

      metadata[tableName] = {
        name: tableName,
        config: tableConfig,
        allFields: enhancedConfig.fields,
        indexes,
        relationships: tableConfig.relationships || {}
      };
    }

    return metadata;
  }

  /**
   * Generate schema with metadata
   */
  generateSchemaWithMetadata(config: DatabaseConfig, options: SchemaGenerationOptions = {}) {
    const schema = this.generateSchema(config, options);
    const metadata = this.getTableMetadata(config, options);
    
    return {
      schema,
      metadata,
      config,
      generatedAt: Date.now()
    };
  }
}