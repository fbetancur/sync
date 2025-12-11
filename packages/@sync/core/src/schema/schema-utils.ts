/**
 * Schema Utilities
 * 
 * Utility functions for working with database schemas and configurations.
 */

import type { 
  DatabaseConfig, 
  TableConfig, 
  FieldType,
  AppSchemaConfig 
} from '@sync/types';

/**
 * Schema utility functions
 */
export class SchemaUtils {
  /**
   * Get all field names from a table config including technical fields
   */
  static getAllFields(tableConfig: TableConfig, multiTenant: boolean = false): string[] {
    const technicalFields = [
      'id',
      'created_at',
      'updated_at', 
      'created_by',
      'version_vector',
      'field_versions',
      'synced',
      'checksum'
    ];

    if (multiTenant) {
      technicalFields.splice(1, 0, 'tenant_id');
    }

    return [
      ...technicalFields,
      ...tableConfig.fields.filter(field => !technicalFields.includes(field))
    ];
  }

  /**
   * Get field type with fallback to default
   */
  static getFieldType(field: string, tableConfig: TableConfig): FieldType {
    return tableConfig.fieldTypes?.[field] || 'string';
  }

  /**
   * Check if field is required
   */
  static isFieldRequired(field: string, tableConfig: TableConfig): boolean {
    return tableConfig.required?.includes(field) || false;
  }

  /**
   * Check if field is unique
   */
  static isFieldUnique(field: string, tableConfig: TableConfig): boolean {
    return tableConfig.unique?.includes(field) || false;
  }

  /**
   * Get relationship target for a field
   */
  static getRelationshipTarget(field: string, tableConfig: TableConfig): string | undefined {
    return tableConfig.relationships?.[field];
  }

  /**
   * Parse relationship target into table and field
   */
  static parseRelationshipTarget(target: string): { table: string; field: string } | null {
    const parts = target.split('.');
    if (parts.length !== 2) return null;
    
    return {
      table: parts[0],
      field: parts[1]
    };
  }

  /**
   * Get all tables that reference a given table
   */
  static getReferencingTables(targetTable: string, config: DatabaseConfig): string[] {
    const referencingTables: string[] = [];

    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      if (tableConfig.relationships) {
        for (const target of Object.values(tableConfig.relationships)) {
          const parsed = this.parseRelationshipTarget(target);
          if (parsed && parsed.table === targetTable) {
            referencingTables.push(tableName);
            break;
          }
        }
      }
    }

    return referencingTables;
  }

  /**
   * Get all tables referenced by a given table
   */
  static getReferencedTables(sourceTable: string, config: DatabaseConfig): string[] {
    const tableConfig = config.tables[sourceTable];
    if (!tableConfig?.relationships) return [];

    const referencedTables: string[] = [];
    for (const target of Object.values(tableConfig.relationships)) {
      const parsed = this.parseRelationshipTarget(target);
      if (parsed && !referencedTables.includes(parsed.table)) {
        referencedTables.push(parsed.table);
      }
    }

    return referencedTables;
  }

  /**
   * Build dependency graph for tables
   */
  static buildDependencyGraph(config: DatabaseConfig): Record<string, string[]> {
    const graph: Record<string, string[]> = {};

    for (const tableName of Object.keys(config.tables)) {
      graph[tableName] = this.getReferencedTables(tableName, config);
    }

    return graph;
  }

  /**
   * Get table creation order based on dependencies
   */
  static getTableCreationOrder(config: DatabaseConfig): string[] {
    const graph = this.buildDependencyGraph(config);
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];

    function visit(tableName: string) {
      if (visiting.has(tableName)) {
        throw new Error(`Circular dependency detected involving table '${tableName}'`);
      }
      if (visited.has(tableName)) return;

      visiting.add(tableName);
      
      for (const dependency of graph[tableName] || []) {
        visit(dependency);
      }
      
      visiting.delete(tableName);
      visited.add(tableName);
      order.push(tableName);
    }

    for (const tableName of Object.keys(config.tables)) {
      visit(tableName);
    }

    return order;
  }

  /**
   * Compare two schema configurations
   */
  static compareSchemas(schema1: DatabaseConfig, schema2: DatabaseConfig): {
    added: string[];
    removed: string[];
    modified: string[];
    unchanged: string[];
  } {
    const tables1 = new Set(Object.keys(schema1.tables));
    const tables2 = new Set(Object.keys(schema2.tables));

    const added = Array.from(tables2).filter(table => !tables1.has(table));
    const removed = Array.from(tables1).filter(table => !tables2.has(table));
    const common = Array.from(tables1).filter(table => tables2.has(table));
    
    const modified: string[] = [];
    const unchanged: string[] = [];

    for (const table of common) {
      const config1 = schema1.tables[table];
      const config2 = schema2.tables[table];
      
      if (JSON.stringify(config1) !== JSON.stringify(config2)) {
        modified.push(table);
      } else {
        unchanged.push(table);
      }
    }

    return { added, removed, modified, unchanged };
  }

  /**
   * Generate schema statistics
   */
  static getSchemaStats(config: DatabaseConfig): {
    tableCount: number;
    totalFields: number;
    totalIndexes: number;
    totalRelationships: number;
    averageFieldsPerTable: number;
    tablesWithRelationships: number;
    multiTenant: boolean;
  } {
    const tableCount = Object.keys(config.tables).length;
    let totalFields = 0;
    let totalIndexes = 0;
    let totalRelationships = 0;
    let tablesWithRelationships = 0;

    for (const tableConfig of Object.values(config.tables)) {
      totalFields += tableConfig.fields.length;
      totalIndexes += tableConfig.indexes?.length || 0;
      
      const relationshipCount = Object.keys(tableConfig.relationships || {}).length;
      totalRelationships += relationshipCount;
      
      if (relationshipCount > 0) {
        tablesWithRelationships++;
      }
    }

    return {
      tableCount,
      totalFields,
      totalIndexes,
      totalRelationships,
      averageFieldsPerTable: tableCount > 0 ? totalFields / tableCount : 0,
      tablesWithRelationships,
      multiTenant: config.multiTenant
    };
  }

  /**
   * Normalize schema configuration
   */
  static normalizeSchema(config: DatabaseConfig): DatabaseConfig {
    const normalized: DatabaseConfig = {
      name: config.name,
      multiTenant: config.multiTenant,
      tables: {}
    };

    for (const [tableName, tableConfig] of Object.entries(config.tables)) {
      normalized.tables[tableName] = {
        fields: [...tableConfig.fields],
        indexes: tableConfig.indexes ? [...tableConfig.indexes] : undefined,
        relationships: tableConfig.relationships ? { ...tableConfig.relationships } : undefined,
        required: tableConfig.required ? [...tableConfig.required] : undefined,
        unique: tableConfig.unique ? [...tableConfig.unique] : undefined,
        fieldTypes: tableConfig.fieldTypes ? { ...tableConfig.fieldTypes } : undefined
      };
    }

    return normalized;
  }

  /**
   * Convert schema to JSON string with formatting
   */
  static toJson(config: AppSchemaConfig, pretty: boolean = true): string {
    return JSON.stringify(config, null, pretty ? 2 : 0);
  }

  /**
   * Create a deep copy of schema configuration
   */
  static clone(config: DatabaseConfig): DatabaseConfig {
    return JSON.parse(JSON.stringify(config));
  }

  /**
   * Validate field name format
   */
  static isValidFieldName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Validate table name format
   */
  static isValidTableName(name: string): boolean {
    return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
  }

  /**
   * Generate field name suggestions
   */
  static suggestFieldNames(type: FieldType): string[] {
    const suggestions: Record<FieldType, string[]> = {
      string: ['name', 'title', 'code', 'status'],
      number: ['amount', 'quantity', 'count', 'value'],
      boolean: ['active', 'enabled', 'visible', 'completed'],
      date: ['created_date', 'updated_date', 'start_date', 'end_date'],
      email: ['email', 'contact_email', 'notification_email'],
      phone: ['phone', 'mobile', 'contact_phone'],
      url: ['website', 'url', 'link'],
      text: ['description', 'notes', 'comments', 'content'],
      json: ['metadata', 'config', 'settings', 'data']
    };

    return suggestions[type] || [];
  }
}