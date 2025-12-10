/**
 * Sistema de Sincronización
 * 
 * Este módulo proporciona capacidades de sincronización offline-first incluyendo:
 * - Gestión de cola de sincronización
 * - Resolución de conflictos CRDT
 * - Seguimiento de cambios
 * - Sincronización bidireccional
 * 
 * Requirements: 5.1, 5.4, 5.5, 5.9, 6.1, 6.2, 6.3, 6.4, 6.7
 */

export * from './sync-manager';
export * from './conflict-resolver';
export * from './sync-queue';
export * from './change-tracker';