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

export * from './database';
export * from './types';