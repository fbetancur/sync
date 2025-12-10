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
  created_by: string;
  nombre: string;
  numero_documento: string;
  tipo_documento: 'CC' | 'CE' | 'TI' | 'NIT' | 'PASAPORTE';
  telefono: string;
  telefono_2: string | null;
  direccion: string;
  barrio: string | null;
  referencia: string | null;
  ruta_id: string;
  latitud: number | null;
  longitud: number | null;
  nombre_fiador: string | null;
  telefono_fiador: string | null;
  creditos_activos: number;
  saldo_total: number;
  dias_atraso_max: number;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  score: number | null;
}

export interface Credito extends SyncableEntity {
  cliente_id: string;
  producto_id: string;
  cobrador_id: string;
  ruta_id: string;
  monto_original: number;
  interes_porcentaje: number;
  total_a_pagar: number;
  numero_cuotas: number;
  valor_cuota: number;
  frecuencia: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  fecha_desembolso: string;
  fecha_primera_cuota: string;
  fecha_ultima_cuota: string;
  estado: 'activo' | 'pagado' | 'vencido' | 'cancelado';
  saldo_pendiente: number;
  cuotas_pagadas: number;
  dias_atraso: number;
  excluir_domingos: boolean;
  created_by: string;
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
