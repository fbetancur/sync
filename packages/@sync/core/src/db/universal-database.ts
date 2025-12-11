/**
 * Universal Database
 * 
 * Dynamic Dexie database that generates its schema from JSON configuration.
 * Maintains compatibility with existing MicrocreditosDB while providing
 * universal functionality for any application.
 */

import Dexie, { type Table } from 'dexie';
import type { 
  DatabaseConfig, 
  UniversalRecord,
  SchemaGenerationOptions,
  TechnicalFields
} from '@sync/types';

import type { UniversalDatabaseOptions } from '../schema/types';
import { SchemaEngine } from '../schema/schema-engine';

/**
 * Universal Database class that creates schema dynamically
 */
export class UniversalDatabase extends Dexie {
  private config: DatabaseConfig;
  private schemaEngine: SchemaEngine;
  private tableMetadata: Record<string, any> = {};
  
  // Dynamic table properties will be added at runtime
  [key: string]: any;

  constructor(config: DatabaseConfig, options: SchemaGenerationOptions = {}) {
    // Use configured database name
    super(config.name);
    
    this.config = config;
    this.schemaEngine = new SchemaEngine();
    
    // Generate and apply schema
    this.initializeSchema(options);
  }

  /**
   * Initialize database schema from configuration
   */
  private initializeSchema(options: SchemaGenerationOptions): void {
    try {
      // Generate Dexie schema from configuration
      const dexieSchema = this.schemaEngine.generateSchema(this.config, options);
      
      // Get table metadata for runtime access
      this.tableMetadata = this.schemaEngine.getTableMetadata(this.config, options);
      
      // Apply schema to Dexie
      this.version(dexieSchema.version).stores(dexieSchema.stores);
      
      // Create dynamic table properties
      this.createDynamicTables();
      
      console.log(`✅ Universal Database initialized: ${this.config.name}`);
      console.log(`📊 Tables created: ${Object.keys(this.config.tables).length}`);
      
    } catch (error) {
      console.error(`❌ Failed to initialize Universal Database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Create dynamic table properties for TypeScript access
   */
  private createDynamicTables(): void {
    // Create properties for user-defined tables
    for (const tableName of Object.keys(this.config.tables)) {
      Object.defineProperty(this, tableName, {
        get: () => this.table(tableName),
        enumerable: true,
        configurable: true
      });
    }

    // Create properties for system tables
    const systemTables = ['sync_queue', 'audit_log', 'change_log', 'checksums', 'app_state'];
    for (const tableName of systemTables) {
      Object.defineProperty(this, tableName, {
        get: () => this.table(tableName),
        enumerable: true,
        configurable: true
      });
    }
  }

  /**
   * Get table with proper typing
   */
  getTable<T extends UniversalRecord = UniversalRecord>(tableName: string): Table<T> {
    return this.table(tableName) as Table<T>;
  }

  /**
   * Get all user-defined table names
   */
  getUserTables(): string[] {
    return Object.keys(this.config.tables);
  }

  /**
   * Get all system table names
   */
  getSystemTables(): string[] {
    return ['sync_queue', 'audit_log', 'change_log', 'checksums', 'app_state'];
  }

  /**
   * Get all table names
   */
  getAllTables(): string[] {
    return [...this.getUserTables(), ...this.getSystemTables()];
  }

  /**
   * Get table metadata
   */
  getTableMetadata(tableName: string) {
    return this.tableMetadata[tableName];
  }

  /**
   * Get database configuration
   */
  getConfig(): DatabaseConfig {
    return { ...this.config };
  }

  /**
   * Check if table exists
   */
  hasTable(tableName: string): boolean {
    return tableName in this.config.tables || this.getSystemTables().includes(tableName);
  }

  /**
   * Get table field names including technical fields
   */
  getTableFields(tableName: string): string[] {
    const metadata = this.tableMetadata[tableName];
    return metadata ? metadata.allFields : [];
  }

  /**
   * Get table relationships
   */
  getTableRelationships(tableName: string): Record<string, string> {
    const metadata = this.tableMetadata[tableName];
    return metadata ? metadata.relationships : {};
  }

  /**
   * Create a record with automatic technical fields
   */
  async createRecord<T extends UniversalRecord>(
    tableName: string, 
    data: Partial<T>, 
    context: {
      userId?: string;
      deviceId?: string;
    } = {}
  ): Promise<T> {
    const now = Date.now();
    const deviceId = context.deviceId || 'unknown';
    
    // Prepare technical fields
    const technicalFields: Partial<TechnicalFields> = {
      id: crypto.randomUUID(),
      created_at: now,
      updated_at: now,
      created_by: context.userId || 'system',
      version_vector: { [deviceId]: 1 },
      field_versions: {},
      synced: false,
      checksum: '' // Will be calculated by other services
    };

    // Add tenant_id if multi-tenant
    if (this.config.multiTenant && !data.tenant_id) {
      technicalFields.tenant_id = 'default'; // Should be provided by app
    }

    // Create field versions for user data
    for (const [field, value] of Object.entries(data)) {
      if (value !== undefined && !field.startsWith('_')) {
        technicalFields.field_versions![field] = {
          value,
          timestamp: now,
          device_id: deviceId
        };
      }
    }

    // Combine user data with technical fields
    const record = {
      ...technicalFields,
      ...data
    } as T;

    // Insert into database
    const table = this.getTable<T>(tableName);
    await table.add(record);

    return record;
  }

  /**
   * Update a record with CRDT field versioning
   */
  async updateRecord<T extends UniversalRecord>(
    tableName: string,
    id: string,
    updates: Partial<T>,
    context: {
      userId?: string;
      deviceId?: string;
    } = {}
  ): Promise<T | null> {
    const table = this.getTable<T>(tableName);
    const existing = await table.get(id);
    
    if (!existing) {
      return null;
    }

    const now = Date.now();
    const deviceId = context.deviceId || 'unknown';

    // Update version vector
    const newVersionVector = { ...existing.version_vector };
    newVersionVector[deviceId] = (newVersionVector[deviceId] || 0) + 1;

    // Update field versions for changed fields
    const newFieldVersions = { ...existing.field_versions };
    for (const [field, value] of Object.entries(updates)) {
      if (value !== undefined && !field.startsWith('_')) {
        newFieldVersions[field] = {
          value,
          timestamp: now,
          device_id: deviceId
        };
      }
    }

    // Prepare update data
    const updateData = {
      ...updates,
      updated_at: now,
      version_vector: newVersionVector,
      field_versions: newFieldVersions,
      synced: false
    };

    // Update in database
    await table.update(id, updateData);

    // Return updated record
    return await table.get(id) || null;
  }

  /**
   * Delete a record (soft delete by default)
   */
  async deleteRecord(
    tableName: string,
    id: string,
    options: {
      soft?: boolean;
      userId?: string;
      deviceId?: string;
    } = {}
  ): Promise<boolean> {
    const table = this.getTable(tableName);
    
    if (options.soft !== false) {
      // Soft delete - mark as deleted
      const result = await this.updateRecord(tableName, id, {
        deleted_at: Date.now(),
        deleted_by: options.userId || 'system',
        synced: false
      } as any, {
        userId: options.userId,
        deviceId: options.deviceId
      });
      return result !== null;
    } else {
      // Hard delete
      await table.delete(id);
      return true;
    }
  }

  /**
   * Query records with automatic tenant filtering
   */
  queryRecords<T extends UniversalRecord>(
    tableName: string,
    options: {
      tenantId?: string;
      includeDeleted?: boolean;
      limit?: number;
      offset?: number;
      orderBy?: string;
      where?: Record<string, any>;
    } = {}
  ) {
    let query = this.getTable<T>(tableName).toCollection();

    // Apply tenant filtering if multi-tenant
    if (this.config.multiTenant && options.tenantId) {
      query = query.filter(record => record.tenant_id === options.tenantId);
    }

    // Filter out deleted records unless requested
    if (!options.includeDeleted) {
      query = query.filter(record => !(record as any).deleted_at);
    }

    // Apply custom where conditions
    if (options.where) {
      for (const [field, value] of Object.entries(options.where)) {
        query = query.filter(record => (record as any)[field] === value);
      }
    }

    // Apply ordering
    if (options.orderBy) {
      // Note: Dexie ordering is limited, this is a basic implementation
      query = query.sortBy(options.orderBy);
    }

    // Apply pagination
    if (options.offset) {
      query = query.offset(options.offset);
    }
    if (options.limit) {
      query = query.limit(options.limit);
    }

    return query;
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const stats: Record<string, number> = {};
    
    for (const tableName of this.getAllTables()) {
      try {
        const count = await this.table(tableName).count();
        stats[tableName] = count;
      } catch (error) {
        stats[tableName] = 0;
      }
    }

    return {
      tables: stats,
      totalRecords: Object.values(stats).reduce((sum, count) => sum + count, 0),
      userTables: this.getUserTables().length,
      systemTables: this.getSystemTables().length
    };
  }

  /**
   * Initialize the database (open and verify)
   */
  async initialize(): Promise<void> {
    try {
      // Verify IndexedDB support
      if (!('indexedDB' in window)) {
        throw new Error('IndexedDB is not supported in this browser');
      }

      // Open the database
      await this.open();

      console.log(`✅ Universal Database opened: ${this.name}`);
      
      // Log statistics
      const stats = await this.getStats();
      console.log(`📊 Database stats:`, stats);

    } catch (error) {
      console.error(`❌ Failed to initialize Universal Database: ${error.message}`);
      throw error;
    }
  }

  /**
   * Clear all data (for testing or reset)
   */
  async clearAll(): Promise<void> {
    const tables = this.getAllTables();
    
    await this.transaction('rw', tables.map(name => this.table(name)), async () => {
      for (const tableName of tables) {
        await this.table(tableName).clear();
      }
    });

    console.log('✅ All data cleared from Universal Database');
  }

  /**
   * Export database configuration and metadata
   */
  exportMetadata() {
    return {
      config: this.getConfig(),
      metadata: this.tableMetadata,
      stats: this.getStats(),
      exportedAt: new Date().toISOString()
    };
  }
}

/**
 * Factory function to create Universal Database instances
 */
export function createUniversalDatabase(
  config: DatabaseConfig, 
  options: SchemaGenerationOptions = {}
): UniversalDatabase {
  return new UniversalDatabase(config, options);
}

/**
 * Factory function with full options
 */
export function createUniversalDatabaseWithOptions(
  options: UniversalDatabaseOptions
): UniversalDatabase {
  return new UniversalDatabase(options.schema, options.options);
}