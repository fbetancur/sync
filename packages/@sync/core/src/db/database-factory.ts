/**
 * Database Factory
 * 
 * Factory that creates the appropriate database instance based on configuration.
 * Maintains compatibility with existing MicrocreditosDB while enabling
 * universal functionality for new applications.
 */

import type { DatabaseConfig, SchemaGenerationOptions } from '@sync/types';
import { MicrocreditosDB } from './database';
import { UniversalDatabase } from './universal-database';

/**
 * Database factory options
 */
export interface DatabaseFactoryOptions {
  /** Use legacy MicrocreditosDB (for backward compatibility) */
  useLegacy?: boolean;
  /** Schema configuration (for universal database) */
  schema?: DatabaseConfig;
  /** Schema generation options */
  schemaOptions?: SchemaGenerationOptions;
  /** Database name override */
  databaseName?: string;
}

/**
 * Database factory class
 */
export class DatabaseFactory {
  /**
   * Create database instance based on configuration
   */
  static create(options: DatabaseFactoryOptions = {}): MicrocreditosDB | UniversalDatabase {
    // Use legacy database if explicitly requested or no schema provided
    if (options.useLegacy || !options.schema) {
      console.log('🔄 Creating legacy MicrocreditosDB instance');
      return new MicrocreditosDB();
    }

    // Create universal database with schema
    console.log(`🚀 Creating UniversalDatabase instance: ${options.schema.name}`);
    return new UniversalDatabase(options.schema, options.schemaOptions);
  }

  /**
   * Create universal database (force universal mode)
   */
  static createUniversal(
    schema: DatabaseConfig, 
    options: SchemaGenerationOptions = {}
  ): UniversalDatabase {
    return new UniversalDatabase(schema, options);
  }

  /**
   * Create legacy database (force legacy mode)
   */
  static createLegacy(): MicrocreditosDB {
    return new MicrocreditosDB();
  }

  /**
   * Auto-detect database type based on app configuration
   */
  static createFromAppConfig(appConfig: {
    appName?: string;
    database?: DatabaseConfig;
    legacy?: boolean;
  }): MicrocreditosDB | UniversalDatabase {
    // Force legacy for CrediSync to maintain compatibility
    if (appConfig.appName === 'CrediSync' || appConfig.legacy) {
      return this.createLegacy();
    }

    // Use universal for new apps with schema
    if (appConfig.database) {
      return this.createUniversal(appConfig.database);
    }

    // Default to legacy for safety
    return this.createLegacy();
  }

  /**
   * Check if database instance is universal
   */
  static isUniversal(db: any): db is UniversalDatabase {
    return db instanceof UniversalDatabase;
  }

  /**
   * Check if database instance is legacy
   */
  static isLegacy(db: any): db is MicrocreditosDB {
    return db instanceof MicrocreditosDB;
  }

  /**
   * Get database type string
   */
  static getDatabaseType(db: any): 'universal' | 'legacy' | 'unknown' {
    if (this.isUniversal(db)) return 'universal';
    if (this.isLegacy(db)) return 'legacy';
    return 'unknown';
  }

  /**
   * Create database with automatic migration support
   */
  static createWithMigration(options: DatabaseFactoryOptions & {
    /** Attempt to migrate from legacy to universal */
    migrate?: boolean;
    /** Migration callback */
    onMigration?: (from: MicrocreditosDB, to: UniversalDatabase) => Promise<void>;
  }) {
    const db = this.create(options);

    // TODO: Implement migration logic if needed
    if (options.migrate && this.isLegacy(db) && options.schema) {
      console.log('🔄 Migration from legacy to universal not yet implemented');
      // Future: Implement data migration
    }

    return db;
  }
}

/**
 * Convenience function for creating databases
 */
export function createUniversalDatabase(options: DatabaseFactoryOptions = {}) {
  return DatabaseFactory.create(options);
}

/**
 * Type guard for universal database
 */
export function isUniversalDatabase(db: any): db is UniversalDatabase {
  return DatabaseFactory.isUniversal(db);
}

/**
 * Type guard for legacy database
 */
export function isLegacyDatabase(db: any): db is MicrocreditosDB {
  return DatabaseFactory.isLegacy(db);
}