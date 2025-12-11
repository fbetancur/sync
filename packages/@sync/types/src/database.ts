/**
 * Database-related types and interfaces
 *
 * Extracted from apps/credisync/src/types/database.ts
 */

import type { BaseEntity, SyncableEntity } from './index';

// Core database entities (from Supabase schema)
export interface Tenant {
  id: string;
  nombre: string;
  usuarios_contratados: number;
  usuarios_activos: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cobrador' | 'supervisor';
  activo: boolean;
  created_at: string;
  updated_at: string;
}

export interface Ruta {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductoCredito {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  interes_porcentaje: number;
  plazo_minimo: number;
  plazo_maximo: number;
  monto_minimo: number;
  monto_maximo: number;
  activo: boolean;
  created_at: string;
  updated_at: string;
}

// Syncable entities (support CRDT synchronization)
export interface Cliente extends SyncableEntity {
  created_by?: string;
  nombre: string;
  numero_documento: string;
  tipo_documento?: 'CC' | 'CE' | 'TI' | 'NIT' | 'PASAPORTE';
  telefono: string;
  telefono_2?: string | null;
  direccion: string;
  barrio?: string | null;
  referencia?: string | null;
  ruta_id?: string;
  latitud?: number | null;
  longitud?: number | null;
  nombre_fiador?: string | null;
  telefono_fiador?: string | null;
  creditos_activos?: number;
  saldo_total?: number;
  dias_atraso_max?: number;
  estado: 'AL_DIA' | 'MORA' | 'PROXIMO' | 'SIN_CREDITOS';
  score?: number | null;
  
  // Campos calculados para la UI (como en la app de referencia)
  resumen?: {
    creditos_activos: number;
    total_adeudado: number;
    cuotas_atrasadas: number;
    dias_atraso_max: number;
  };
  
  // Créditos enriquecidos para la vista de ruta
  creditos?: Array<{
    id: string;
    numero: string;
    tipo: string;
    adeudado: number;
    cuotas_a_cobrar: number;
    cuotas_atrasadas: number;
    dias_atraso: number;
  }>;
}

export interface Credito extends SyncableEntity {
  cliente_id: string;
  cliente_nombre?: string; // Campo calculado para UI
  producto_id: string;
  cobrador_id?: string;
  ruta_id?: string;
  monto_solicitado: number;
  monto_aprobado: number;
  monto_original?: number; // Alias para compatibilidad
  tasa_interes: number; // Alias para interes_porcentaje
  interes_porcentaje?: number; // Mantener para compatibilidad
  total_a_pagar?: number;
  numero_cuotas: number;
  valor_cuota: number;
  frecuencia?: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  fecha_otorgamiento: number; // Timestamp
  fecha_vencimiento: number; // Timestamp
  fecha_desembolso?: string; // Mantener para compatibilidad
  fecha_primera_cuota?: string;
  fecha_ultima_cuota?: string;
  estado: 'ACTIVO' | 'PAGADO' | 'VENCIDO' | 'CANCELADO';
  saldo_pendiente: number;
  cuotas_pagadas: number;
  dias_atraso?: number;
  excluir_domingos?: boolean;
  observaciones?: string;
  created_by?: string;
}

export interface Cuota extends SyncableEntity {
  credito_id: string;
  numero: number;
  valor: number;
  fecha_programada: string;
  fecha_pago: string | null;
  monto_pagado: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
}

export interface Pago extends SyncableEntity {
  credito_id: string;
  cliente_id: string;
  cobrador_id: string;
  monto: number;
  fecha: string;
  latitud: number;
  longitud: number;
  observaciones: string | null;
  comprobante_foto_url: string | null;
  device_id: string;
  app_version: string;
  created_by: string;
}

// Database table names
export type TableName =
  | 'tenants'
  | 'users'
  | 'rutas'
  | 'productos_credito'
  | 'clientes'
  | 'creditos'
  | 'cuotas'
  | 'pagos';

// Generic database record type
export type DatabaseRecord =
  | Tenant
  | User
  | Ruta
  | ProductoCredito
  | Cliente
  | Credito
  | Cuota
  | Pago;

// ============================================================================
// UNIVERSAL SCHEMA ENGINE TYPES
// ============================================================================

/**
 * Configuration for universal database schema generation
 * Allows defining database structure through JSON configuration
 */
export interface DatabaseConfig {
  /** Database name */
  name: string;
  /** Enable multi-tenancy (adds tenant_id to all tables) */
  multiTenant: boolean;
  /** Table definitions */
  tables: Record<string, TableConfig>;
}

/**
 * Configuration for a single table
 */
export interface TableConfig {
  /** Field names (technical fields added automatically) */
  fields: string[];
  /** Index definitions for optimized queries */
  indexes?: string[];
  /** Relationships to other tables */
  relationships?: Record<string, string>;
  /** Required fields for validation */
  required?: string[];
  /** Unique fields for validation */
  unique?: string[];
  /** Field type definitions for validation */
  fieldTypes?: Record<string, FieldType>;
}

/**
 * Field type definitions for validation and UI generation
 */
export type FieldType = 
  | 'string'
  | 'number' 
  | 'boolean'
  | 'date'
  | 'email'
  | 'phone'
  | 'url'
  | 'text'
  | 'json';

/**
 * Index configuration for optimized database queries
 */
export interface IndexConfig {
  /** Field name or compound index definition */
  fields: string | string[];
  /** Whether this is a unique index */
  unique?: boolean;
  /** Whether this is a compound index */
  compound?: boolean;
}

/**
 * Generated Dexie schema definition
 */
export interface DexieSchema {
  /** Schema version */
  version: number;
  /** Store definitions for Dexie */
  stores: Record<string, string>;
}

/**
 * Technical fields automatically added to all tables
 */
export interface TechnicalFields {
  /** Unique identifier */
  id: string;
  /** Tenant identifier (if multiTenant enabled) */
  tenant_id?: string;
  /** Creation timestamp */
  created_at: number;
  /** Last update timestamp */
  updated_at: number;
  /** User who created the record */
  created_by: string;
  /** CRDT version vector for conflict resolution */
  version_vector: Record<string, number>;
  /** Field-level versions for CRDT */
  field_versions: Record<string, FieldVersion>;
  /** Sync status */
  synced: boolean;
  /** Data integrity checksum */
  checksum: string;
}

/**
 * Field version for CRDT conflict resolution
 */
export interface FieldVersion {
  /** Field value */
  value: any;
  /** Timestamp when field was last modified */
  timestamp: number;
  /** Device/node that made the change */
  device_id: string;
}

/**
 * Universal record interface that all generated entities extend
 */
export interface UniversalRecord extends TechnicalFields {
  /** Dynamic fields based on configuration */
  [key: string]: any;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  /** Whether the schema is valid */
  valid: boolean;
  /** Validation errors */
  errors: SchemaValidationError[];
  /** Validation warnings */
  warnings: SchemaValidationWarning[];
}

/**
 * Schema validation error
 */
export interface SchemaValidationError {
  /** Error path (e.g., "tables.clientes.fields") */
  path: string;
  /** Error message */
  message: string;
  /** Error code */
  code: string;
}

/**
 * Schema validation warning
 */
export interface SchemaValidationWarning {
  /** Warning path */
  path: string;
  /** Warning message */
  message: string;
  /** Warning code */
  code: string;
}

/**
 * Schema generation options
 */
export interface SchemaGenerationOptions {
  /** Whether to include audit tables */
  includeAuditTables?: boolean;
  /** Whether to include sync tables */
  includeSyncTables?: boolean;
  /** Custom technical fields to add */
  customTechnicalFields?: Record<string, FieldType>;
  /** Index optimization level */
  indexOptimization?: 'basic' | 'standard' | 'aggressive';
}
