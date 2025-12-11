/**
 * Schema Registry
 * 
 * Manages multiple database schema configurations for different applications.
 * Provides centralized storage and validation of schemas.
 */

import type { 
  DatabaseConfig, 
  SchemaValidationResult,
  AppSchemaConfig
} from '@sync/types';

import type { SchemaRegistry as ISchemaRegistry } from './types';
import { SchemaValidator } from './schema-validator';

/**
 * Schema registry implementation
 */
export class SchemaRegistry implements ISchemaRegistry {
  private schemas: Map<string, DatabaseConfig> = new Map();
  private validator: SchemaValidator;

  constructor() {
    this.validator = new SchemaValidator();
  }

  /**
   * Register a schema configuration
   */
  register(appName: string, config: DatabaseConfig): void {
    // Validate the schema before registering
    const validation = this.validator.validateConfig(config);
    if (!validation.valid) {
      throw new Error(`Cannot register invalid schema for '${appName}': ${validation.errors.map(e => e.message).join(', ')}`);
    }

    this.schemas.set(appName, config);
  }

  /**
   * Register from app configuration
   */
  registerApp(appConfig: AppSchemaConfig): void {
    this.register(appConfig.appName, appConfig.database);
  }

  /**
   * Get registered schema
   */
  get(appName: string): DatabaseConfig | undefined {
    return this.schemas.get(appName);
  }

  /**
   * Check if schema is registered
   */
  has(appName: string): boolean {
    return this.schemas.has(appName);
  }

  /**
   * List all registered schemas
   */
  list(): string[] {
    return Array.from(this.schemas.keys());
  }

  /**
   * Get all registered schemas
   */
  getAll(): Record<string, DatabaseConfig> {
    const result: Record<string, DatabaseConfig> = {};
    for (const [appName, config] of this.schemas.entries()) {
      result[appName] = config;
    }
    return result;
  }

  /**
   * Validate all registered schemas
   */
  validateAll(): Record<string, SchemaValidationResult> {
    const results: Record<string, SchemaValidationResult> = {};
    
    for (const [appName, config] of this.schemas.entries()) {
      results[appName] = this.validator.validateConfig(config);
    }
    
    return results;
  }

  /**
   * Remove a registered schema
   */
  unregister(appName: string): boolean {
    return this.schemas.delete(appName);
  }

  /**
   * Clear all registered schemas
   */
  clear(): void {
    this.schemas.clear();
  }

  /**
   * Get schema statistics
   */
  getStats(): {
    totalSchemas: number;
    totalTables: number;
    totalFields: number;
    schemasByTables: Record<string, number>;
  } {
    let totalTables = 0;
    let totalFields = 0;
    const schemasByTables: Record<string, number> = {};

    for (const [appName, config] of this.schemas.entries()) {
      const tableCount = Object.keys(config.tables).length;
      totalTables += tableCount;
      schemasByTables[appName] = tableCount;

      for (const tableConfig of Object.values(config.tables)) {
        totalFields += tableConfig.fields.length;
      }
    }

    return {
      totalSchemas: this.schemas.size,
      totalTables,
      totalFields,
      schemasByTables
    };
  }

  /**
   * Find schemas by criteria
   */
  findSchemas(criteria: {
    multiTenant?: boolean;
    hasTable?: string;
    hasField?: string;
    minTables?: number;
    maxTables?: number;
  }): string[] {
    const results: string[] = [];

    for (const [appName, config] of this.schemas.entries()) {
      let matches = true;

      // Check multi-tenant
      if (criteria.multiTenant !== undefined && config.multiTenant !== criteria.multiTenant) {
        matches = false;
      }

      // Check has table
      if (criteria.hasTable && !config.tables[criteria.hasTable]) {
        matches = false;
      }

      // Check has field
      if (criteria.hasField) {
        const hasField = Object.values(config.tables).some(table => 
          table.fields.includes(criteria.hasField!)
        );
        if (!hasField) {
          matches = false;
        }
      }

      // Check table count
      const tableCount = Object.keys(config.tables).length;
      if (criteria.minTables !== undefined && tableCount < criteria.minTables) {
        matches = false;
      }
      if (criteria.maxTables !== undefined && tableCount > criteria.maxTables) {
        matches = false;
      }

      if (matches) {
        results.push(appName);
      }
    }

    return results;
  }

  /**
   * Export schemas to JSON
   */
  export(): string {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      schemas: this.getAll()
    };
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import schemas from JSON
   */
  import(json: string): void {
    try {
      const data = JSON.parse(json);
      
      if (!data.schemas || typeof data.schemas !== 'object') {
        throw new Error('Invalid import format: missing schemas object');
      }

      // Clear existing schemas
      this.clear();

      // Import each schema
      for (const [appName, config] of Object.entries(data.schemas)) {
        this.register(appName, config as DatabaseConfig);
      }
    } catch (error) {
      throw new Error(`Failed to import schemas: ${error.message}`);
    }
  }
}

/**
 * Global schema registry instance
 */
export const globalSchemaRegistry = new SchemaRegistry();