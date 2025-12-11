/**
 * Schema Validator
 * 
 * Validates database configuration schemas to ensure they are correct
 * before generating Dexie schemas.
 */

import type { 
  DatabaseConfig, 
  TableConfig, 
  SchemaValidationResult, 
  SchemaValidationError, 
  SchemaValidationWarning,
  FieldType 
} from '@sync/types';

/**
 * Schema validator class
 */
export class SchemaValidator {
  /**
   * Validate a complete database configuration
   */
  validateConfig(config: DatabaseConfig): SchemaValidationResult {
    const errors: SchemaValidationError[] = [];
    const warnings: SchemaValidationWarning[] = [];

    // Validate root configuration
    this.validateRootConfig(config, errors, warnings);

    // Validate each table
    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      this.validateTable(tableName, tableConfig, config, errors, warnings);
    }

    // Validate relationships
    this.validateRelationships(config, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Validate root configuration properties
   */
  private validateRootConfig(
    config: DatabaseConfig, 
    errors: SchemaValidationError[], 
    warnings: SchemaValidationWarning[]
  ): void {
    // Validate database name
    if (!config.name || typeof config.name !== 'string') {
      errors.push({
        path: 'name',
        message: 'Database name is required and must be a string',
        code: 'INVALID_DB_NAME'
      });
    } else if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(config.name)) {
      errors.push({
        path: 'name',
        message: 'Database name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_DB_NAME_FORMAT'
      });
    }

    // Validate multiTenant
    if (typeof config.multiTenant !== 'boolean') {
      errors.push({
        path: 'multiTenant',
        message: 'multiTenant must be a boolean',
        code: 'INVALID_MULTI_TENANT'
      });
    }

    // Validate tables object
    if (!config.tables || typeof config.tables !== 'object') {
      errors.push({
        path: 'tables',
        message: 'Tables configuration is required and must be an object',
        code: 'INVALID_TABLES'
      });
    } else if (Object.keys(config.tables).length === 0) {
      warnings.push({
        path: 'tables',
        message: 'No tables defined in configuration',
        code: 'NO_TABLES'
      });
    }
  }

  /**
   * Validate individual table configuration
   */
  private validateTable(
    tableName: string,
    tableConfig: TableConfig,
    dbConfig: DatabaseConfig,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    const basePath = `tables.${tableName}`;

    // Validate table name
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(tableName)) {
      errors.push({
        path: basePath,
        message: 'Table name must start with a letter and contain only letters, numbers, and underscores',
        code: 'INVALID_TABLE_NAME'
      });
    }

    // Check for reserved table names
    const reservedNames = ['sync_queue', 'audit_log', 'change_log', 'checksums', 'app_state'];
    if (reservedNames.includes(tableName)) {
      errors.push({
        path: basePath,
        message: `Table name '${tableName}' is reserved for system use`,
        code: 'RESERVED_TABLE_NAME'
      });
    }

    // Validate fields
    this.validateFields(tableName, tableConfig, basePath, errors, warnings);

    // Validate indexes
    this.validateIndexes(tableName, tableConfig, basePath, errors, warnings);

    // Validate field types
    this.validateFieldTypes(tableName, tableConfig, basePath, errors, warnings);

    // Validate required fields
    this.validateRequiredFields(tableName, tableConfig, basePath, errors, warnings);

    // Validate unique fields
    this.validateUniqueFields(tableName, tableConfig, basePath, errors, warnings);
  }

  /**
   * Validate table fields
   */
  private validateFields(
    tableName: string,
    tableConfig: TableConfig,
    basePath: string,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    if (!Array.isArray(tableConfig.fields)) {
      errors.push({
        path: `${basePath}.fields`,
        message: 'Fields must be an array',
        code: 'INVALID_FIELDS'
      });
      return;
    }

    if (tableConfig.fields.length === 0) {
      warnings.push({
        path: `${basePath}.fields`,
        message: 'Table has no fields defined',
        code: 'NO_FIELDS'
      });
      return;
    }

    // Check for duplicate fields
    const fieldSet = new Set<string>();
    for (const field of tableConfig.fields) {
      if (typeof field !== 'string') {
        errors.push({
          path: `${basePath}.fields`,
          message: 'All fields must be strings',
          code: 'INVALID_FIELD_TYPE'
        });
        continue;
      }

      if (fieldSet.has(field)) {
        errors.push({
          path: `${basePath}.fields`,
          message: `Duplicate field '${field}'`,
          code: 'DUPLICATE_FIELD'
        });
      }
      fieldSet.add(field);

      // Validate field name format
      if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(field)) {
        errors.push({
          path: `${basePath}.fields`,
          message: `Field '${field}' must start with a letter and contain only letters, numbers, and underscores`,
          code: 'INVALID_FIELD_NAME'
        });
      }

      // Check for reserved field names
      const reservedFields = [
        'id', 'tenant_id', 'created_at', 'updated_at', 'created_by',
        'version_vector', 'field_versions', 'synced', 'checksum'
      ];
      if (reservedFields.includes(field)) {
        warnings.push({
          path: `${basePath}.fields`,
          message: `Field '${field}' is a technical field that will be added automatically`,
          code: 'TECHNICAL_FIELD'
        });
      }
    }
  }

  /**
   * Validate table indexes
   */
  private validateIndexes(
    tableName: string,
    tableConfig: TableConfig,
    basePath: string,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    if (!tableConfig.indexes) return;

    if (!Array.isArray(tableConfig.indexes)) {
      errors.push({
        path: `${basePath}.indexes`,
        message: 'Indexes must be an array',
        code: 'INVALID_INDEXES'
      });
      return;
    }

    const allFields = [...tableConfig.fields, 'id', 'tenant_id', 'created_at', 'updated_at', 'synced'];

    for (const index of tableConfig.indexes) {
      if (typeof index !== 'string') {
        errors.push({
          path: `${basePath}.indexes`,
          message: 'All indexes must be strings',
          code: 'INVALID_INDEX_TYPE'
        });
        continue;
      }

      // Parse compound index format [field1+field2]
      if (index.startsWith('[') && index.endsWith(']')) {
        const compoundFields = index.slice(1, -1).split('+');
        for (const field of compoundFields) {
          if (!allFields.includes(field.trim())) {
            errors.push({
              path: `${basePath}.indexes`,
              message: `Index references unknown field '${field.trim()}'`,
              code: 'UNKNOWN_INDEX_FIELD'
            });
          }
        }
      } else {
        // Simple index
        if (!allFields.includes(index)) {
          errors.push({
            path: `${basePath}.indexes`,
            message: `Index references unknown field '${index}'`,
            code: 'UNKNOWN_INDEX_FIELD'
          });
        }
      }
    }
  }

  /**
   * Validate field types
   */
  private validateFieldTypes(
    tableName: string,
    tableConfig: TableConfig,
    basePath: string,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    if (!tableConfig.fieldTypes) return;

    const validTypes: FieldType[] = [
      'string', 'number', 'boolean', 'date', 'email', 'phone', 'url', 'text', 'json'
    ];

    for (const [field, type] of Object.entries(tableConfig.fieldTypes)) {
      if (!tableConfig.fields.includes(field)) {
        warnings.push({
          path: `${basePath}.fieldTypes`,
          message: `Field type defined for unknown field '${field}'`,
          code: 'UNKNOWN_FIELD_TYPE'
        });
      }

      if (!validTypes.includes(type as FieldType)) {
        errors.push({
          path: `${basePath}.fieldTypes`,
          message: `Invalid field type '${type}' for field '${field}'. Valid types: ${validTypes.join(', ')}`,
          code: 'INVALID_FIELD_TYPE_VALUE'
        });
      }
    }
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(
    tableName: string,
    tableConfig: TableConfig,
    basePath: string,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    if (!tableConfig.required) return;

    if (!Array.isArray(tableConfig.required)) {
      errors.push({
        path: `${basePath}.required`,
        message: 'Required fields must be an array',
        code: 'INVALID_REQUIRED'
      });
      return;
    }

    for (const field of tableConfig.required) {
      if (!tableConfig.fields.includes(field)) {
        errors.push({
          path: `${basePath}.required`,
          message: `Required field '${field}' is not defined in fields`,
          code: 'UNKNOWN_REQUIRED_FIELD'
        });
      }
    }
  }

  /**
   * Validate unique fields
   */
  private validateUniqueFields(
    tableName: string,
    tableConfig: TableConfig,
    basePath: string,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    if (!tableConfig.unique) return;

    if (!Array.isArray(tableConfig.unique)) {
      errors.push({
        path: `${basePath}.unique`,
        message: 'Unique fields must be an array',
        code: 'INVALID_UNIQUE'
      });
      return;
    }

    for (const field of tableConfig.unique) {
      if (!tableConfig.fields.includes(field)) {
        errors.push({
          path: `${basePath}.unique`,
          message: `Unique field '${field}' is not defined in fields`,
          code: 'UNKNOWN_UNIQUE_FIELD'
        });
      }
    }
  }

  /**
   * Validate relationships between tables
   */
  private validateRelationships(
    config: DatabaseConfig,
    errors: SchemaValidationError[],
    warnings: SchemaValidationWarning[]
  ): void {
    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      if (!tableConfig.relationships) continue;

      const basePath = `tables.${tableName}.relationships`;

      for (const [field, target] of Object.entries(tableConfig.relationships)) {
        // Validate field exists
        if (!tableConfig.fields.includes(field)) {
          errors.push({
            path: basePath,
            message: `Relationship field '${field}' is not defined in table fields`,
            code: 'UNKNOWN_RELATIONSHIP_FIELD'
          });
          continue;
        }

        // Parse target (table.field format)
        const [targetTable, targetField] = target.split('.');
        if (!targetField) {
          errors.push({
            path: basePath,
            message: `Invalid relationship target '${target}'. Expected format: 'table.field'`,
            code: 'INVALID_RELATIONSHIP_TARGET'
          });
          continue;
        }

        // Validate target table exists
        if (!config.tables[targetTable]) {
          errors.push({
            path: basePath,
            message: `Relationship target table '${targetTable}' does not exist`,
            code: 'UNKNOWN_RELATIONSHIP_TABLE'
          });
          continue;
        }

        // Validate target field exists (id is always available)
        const targetTableConfig = config.tables[targetTable];
        if (targetField !== 'id' && !targetTableConfig.fields.includes(targetField)) {
          errors.push({
            path: basePath,
            message: `Relationship target field '${targetField}' does not exist in table '${targetTable}'`,
            code: 'UNKNOWN_RELATIONSHIP_TARGET_FIELD'
          });
        }
      }
    }
  }
}