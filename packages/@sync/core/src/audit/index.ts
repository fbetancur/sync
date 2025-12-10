/**
 * Sistema de Auditoría
 *
 * Implementa un log de auditoría inmutable con cadena de hash tipo blockchain.
 * Cada operación crítica se registra como un evento con contexto completo.
 * Los eventos están enlazados vía cadena de hash SHA-256 para asegurar inmutabilidad.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

export * from './audit-logger';
