/**
 * Schema Loader
 * 
 * Loads database schema configurations from JSON files or strings.
 * Provides validation and error handling for schema loading.
 */

import type { 
  AppSchemaConfig, 
  DatabaseConfig,
  SchemaValidationResult 
} from '@sync/types';

import type { SchemaLoader as ISchemaLoader } from '@sync/types';
import { SchemaValidator } from './schema-validator';

/**
 * Schema loader implementation
 */
export class SchemaLoader implements ISchemaLoader {
  private validator: SchemaValidator;

  constructor() {
    this.validator = new SchemaValidator();
  }

  /**
   * Load schema from JSON file
   * Note: In browser environment, this would need to be adapted to use fetch or import
   */
  async loadFromFile(filePath: string): Promise<AppSchemaConfig> {
    try {
      // In a Node.js environment, we would use fs.readFile
      // In browser, this would be handled differently (fetch, import, etc.)
      throw new Error('File loading not implemented for browser environment. Use loadFromJson instead.');
    } catch (error) {
      throw new Error(`Failed to load schema from file '${filePath}': ${error.message}`);
    }
  }

  /**
   * Load schema from JSON string
   */
  loadFromJson(json: string): AppSchemaConfig {
    try {
      const config = JSON.parse(json) as AppSchemaConfig;
      
      // Validate the structure
      this.validateAppConfigStructure(config);
      
      return config;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error(`Invalid JSON format: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Load schema from object
   */
  loadFromObject(obj: any): AppSchemaConfig {
    try {
      // Validate the structure
      this.validateAppConfigStructure(obj);
      
      return obj as AppSchemaConfig;
    } catch (error) {
      throw new Error(`Invalid schema object: ${error.message}`);
    }
  }

  /**
   * Validate loaded schema
   */
  validate(config: AppSchemaConfig): SchemaValidationResult {
    // First validate the app config structure
    try {
      this.validateAppConfigStructure(config);
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: 'root',
          message: error.message,
          code: 'INVALID_APP_CONFIG'
        }],
        warnings: []
      };
    }

    // Then validate the database schema
    return this.validator.validateConfig(config.database);
  }

  /**
   * Load and validate schema from JSON
   */
  loadAndValidate(json: string): { config: AppSchemaConfig; validation: SchemaValidationResult } {
    const config = this.loadFromJson(json);
    const validation = this.validate(config);
    
    return { config, validation };
  }

  /**
   * Create a minimal schema template
   */
  createTemplate(appName: string, multiTenant: boolean = true): AppSchemaConfig {
    return {
      appName,
      version: '1.0.0',
      database: {
        name: `${appName.toLowerCase()}_db`,
        multiTenant,
        tables: {
          // Example table
          example_table: {
            fields: ['name', 'description', 'active'],
            indexes: ['name', 'active'],
            required: ['name'],
            fieldTypes: {
              name: 'string',
              description: 'text',
              active: 'boolean'
            }
          }
        }
      }
    };
  }

  /**
   * Validate app config structure
   */
  private validateAppConfigStructure(config: any): void {
    if (!config || typeof config !== 'object') {
      throw new Error('Configuration must be an object');
    }

    if (!config.appName || typeof config.appName !== 'string') {
      throw new Error('appName is required and must be a string');
    }

    if (!config.version || typeof config.version !== 'string') {
      throw new Error('version is required and must be a string');
    }

    if (!config.database || typeof config.database !== 'object') {
      throw new Error('database configuration is required and must be an object');
    }

    // Validate database config structure
    const db = config.database;
    
    if (!db.name || typeof db.name !== 'string') {
      throw new Error('database.name is required and must be a string');
    }

    if (typeof db.multiTenant !== 'boolean') {
      throw new Error('database.multiTenant is required and must be a boolean');
    }

    if (!db.tables || typeof db.tables !== 'object') {
      throw new Error('database.tables is required and must be an object');
    }
  }

  /**
   * Convert legacy schema format to new format
   */
  convertLegacySchema(legacyConfig: any): AppSchemaConfig {
    // This would handle conversion from old schema formats
    // For now, just validate and return as-is
    this.validateAppConfigStructure(legacyConfig);
    return legacyConfig as AppSchemaConfig;
  }

  /**
   * Merge multiple schema configurations
   */
  mergeSchemas(baseConfig: AppSchemaConfig, ...overrides: Partial<AppSchemaConfig>[]): AppSchemaConfig {
    let merged = { ...baseConfig };

    for (const override of overrides) {
      if (override.appName) merged.appName = override.appName;
      if (override.version) merged.version = override.version;
      
      if (override.database) {
        merged.database = {
          ...merged.database,
          ...override.database,
          tables: {
            ...merged.database.tables,
            ...(override.database.tables || {})
          }
        };
      }
    }

    return merged;
  }

  /**
   * Extract schema from existing database
   */
  extractFromDatabase(databaseName: string, tables: Record<string, any>): AppSchemaConfig {
    // This would analyze an existing database and extract its schema
    // For now, create a basic template
    const config = this.createTemplate(databaseName);
    
    // TODO: Implement actual extraction logic
    // This would inspect table structures and generate configuration
    
    return config;
  }
}