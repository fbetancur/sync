/**
 * Universal Schema Engine
 * 
 * This module provides the Universal Schema Engine that generates
 * dynamic database schemas from JSON configuration files.
 */

// Export all types
export type * from './types';

// Export implementations
export { SchemaEngine } from './schema-engine';
export { SchemaValidator } from './schema-validator';
export { SchemaRegistry, globalSchemaRegistry } from './schema-registry';
export { SchemaLoader } from './schema-loader';
export { SchemaUtils } from './schema-utils';

// Export example schemas
export * from './example-schemas';