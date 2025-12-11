/**
 * Capa de Base de Datos IndexedDB con Dexie.js
 *
 * Este módulo implementa la base de datos local para la PWA usando el wrapper Dexie.js para IndexedDB.
 * Proporciona almacenamiento offline-first con soporte para:
 * - Multi-tenancy
 * - Resolución de conflictos CRDT con vectores de versión
 * - Gestión de cola de sincronización
 * - Registro de auditoría
 * - Verificación de checksum
 *
 * Requirements: 2.1, 2.7
 */

// Export specific items to avoid conflicts
export { MicrocreditosDB, createDatabase } from './database';
export { UniversalDatabase, createUniversalDatabaseWithOptions } from './universal-database';
export { DatabaseFactory, createUniversalDatabase, isUniversalDatabase, isLegacyDatabase } from './database-factory';
export type * from './types';
