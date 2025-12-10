/**
 * Tipos adicionales para operaciones de IndexedDB
 * 
 * Este módulo proporciona tipos de utilidad e interfaces para operaciones de base de datos
 */

// ============================================================================
// TIPOS DE CONSULTA
// ============================================================================

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
}

export interface FilterOptions {
  tenant_id?: string;
  estado?: string;
  synced?: boolean;
  fecha_desde?: number;
  fecha_hasta?: number;
}

// ============================================================================
// TIPOS DE TRANSACCIÓN
// ============================================================================

export type TransactionMode = 'readonly' | 'readwrite';

export interface TransactionOptions {
  mode: TransactionMode;
  tables: string[];
}

// ============================================================================
// TIPOS DE SYNC
// ============================================================================

export interface SyncStatus {
  pending: number;
  synced: number;
  failed: number;
  lastSync: number | null;
}

export interface SyncPriority {
  pagos: 1;
  creditos: 2;
  clientes: 3;
  cuotas: 4;
  otros: 5;
}

// ============================================================================
// TIPOS CRDT
// ============================================================================

export interface VersionVector {
  [deviceId: string]: number;
}

export interface MergeResult<T> {
  merged: T;
  conflicts: string[];
  strategy: 'local_wins' | 'remote_wins' | 'merged' | 'last_write_wins';
}

// ============================================================================
// TIPOS DE VALIDACIÓN
// ============================================================================

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

// ============================================================================
// TIPOS DE CHECKSUM
// ============================================================================

export interface ChecksumResult {
  valid: boolean;
  expected: string;
  actual: string;
  corrupted: boolean;
}

// ============================================================================
// TIPOS DE AUDITORÍA
// ============================================================================

export type EventType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SYNC'
  | 'ERROR';

export type AggregateType =
  | 'tenant'
  | 'user'
  | 'cliente'
  | 'credito'
  | 'cuota'
  | 'pago'
  | 'ruta'
  | 'producto';

// ============================================================================
// TIPOS DE ALMACENAMIENTO
// ============================================================================

export interface StorageInfo {
  usage: number;
  quota: number;
  percentage: number;
  available: number;
}

export interface StorageEstimate {
  indexedDB: number;
  localStorage: number;
  cacheAPI: number;
  total: number;
}