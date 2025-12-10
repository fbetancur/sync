/**
 * Sistema de Gestión de Almacenamiento Multi-Capa
 *
 * Implementa almacenamiento redundante a través de 3 capas:
 * - Capa 1: IndexedDB (primaria)
 * - Capa 2: LocalStorage (respaldo)
 * - Capa 3: Cache API (respaldo terciario)
 *
 * Asegura escrituras atómicas y recuperación automática en caso de falla.
 *
 * Requirements: 2.2, 2.3, 2.4, 2.5
 */

export * from './storage-manager';
