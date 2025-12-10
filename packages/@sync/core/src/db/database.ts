/**
 * IndexedDB Database con Dexie.js
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

import Dexie, { type Table } from 'dexie';

// ============================================================================
// INTERFACES - Modelos de Datos Principales
// ============================================================================

export interface Tenant {
  id: string;
  nombre: string;
  usuarios_contratados: number;
  usuarios_activos: number;
  activo: boolean;
  created_at: number;
  updated_at: number;
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}

export interface User {
  id: string;
  tenant_id: string;
  email: string;
  nombre: string;
  rol: 'admin' | 'cobrador' | 'supervisor';
  activo: boolean;
  created_at: number;
  updated_at: number;
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}

export interface Ruta {
  id: string;
  tenant_id: string;
  nombre: string;
  descripcion: string | null;
  activa: boolean;
  created_at: number;
  updated_at: number;
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}

export interface ProductoCredito {
  id: string;
  tenant_id: string;
  nombre: string;
  interes_porcentaje: number;
  plazo_minimo: number;
  plazo_maximo: number;
  monto_minimo: number;
  monto_maximo: number;
  frecuencia_pago: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  activo: boolean;
  created_at: number;
  updated_at: number;
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  created_by: string;
  nombre: string;
  created_at: number;
  updated_at: number;
  numero_documento: string;
  telefono: string;
  direccion: string;
  ruta_id: string;
  tipo_documento: string;
  telefono_2: string | null;
  barrio: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  nombre_fiador: string | null;
  telefono_fiador: string | null;
  creditos_activos: number;
  saldo_total: number;
  dias_atraso_max: number;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  score: number | null;
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  checksum: string;
}

export interface Credito {
  id: string;
  tenant_id: string;
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
  fecha_desembolso: number;
  fecha_primera_cuota: number;
  fecha_ultima_cuota: number;
  estado: 'activo' | 'pagado' | 'vencido' | 'cancelado';
  created_at: number;
  created_by: string;
  saldo_pendiente: number;
  cuotas_pagadas: number;
  dias_atraso: number;
  updated_at: number;
  excluir_domingos: boolean;
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  checksum: string;
}

export interface Cuota {
  id: string;
  credito_id: string;
  tenant_id: string;
  numero: number;
  valor: number;
  fecha_programada: number;
  fecha_pago: number | null;
  monto_pagado: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  created_at: number;
  updated_at: number;
  synced: boolean;
  checksum: string;
}

export interface Pago {
  id: string;
  tenant_id: string;
  credito_id: string;
  cliente_id: string;
  cobrador_id: string;
  monto: number;
  fecha: number;
  latitud: number;
  longitud: number;
  observaciones: string | null;
  created_at: number;
  created_by: string;
  device_id: string;
  app_version: string;
  connection_type: string;
  battery_level: number | null;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt: number | null;
  sync_error: string | null;
  checksum: string;
  comprobante_foto_url: string | null;
}

// ============================================================================
// INTERFACES - Sync y Auditoría
// ============================================================================

export interface SyncQueueItem {
  id?: number;
  timestamp: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  synced: boolean;
  priority: number;
  attempts: number;
  last_attempt: number | null;
  error: string | null;
}

export interface AuditLogEntry {
  id?: number;
  timestamp: number;
  sequence: number;
  tenant_id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  data: any;
  metadata: {
    ip_address: string | null;
    user_agent: string;
    app_version: string;
    latitude: number | null;
    longitude: number | null;
    connection_type: string;
    battery_level: number | null;
  };
  previous_hash: string;
  hash: string;
}

export interface ChangeLogEntry {
  id?: number;
  timestamp: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  changes: any;
  synced: boolean;
}

export interface ChecksumEntry {
  record_key: string;
  checksum: string;
  timestamp: number;
}

export interface AppStateEntry {
  key: string;
  value: any;
  updated_at: number;
}

// ============================================================================
// INTERFACES - Soporte CRDT
// ============================================================================

export interface FieldVersion {
  value: any;
  timestamp: number;
  device_id: string;
}

// ============================================================================
// CLASE DE BASE DE DATOS
// ============================================================================

export class MicrocreditosDB extends Dexie {
  // Tablas
  tenants!: Table<Tenant>;
  users!: Table<User>;
  rutas!: Table<Ruta>;
  productos_credito!: Table<ProductoCredito>;
  clientes!: Table<Cliente>;
  creditos!: Table<Credito>;
  cuotas!: Table<Cuota>;
  pagos!: Table<Pago>;
  sync_queue!: Table<SyncQueueItem>;
  audit_log!: Table<AuditLogEntry>;
  change_log!: Table<ChangeLogEntry>;
  checksums!: Table<ChecksumEntry>;
  app_state!: Table<AppStateEntry>;

  constructor() {
    super('microcreditos_db');

    // Versión 1: Esquema inicial
    this.version(1).stores({
      // Tablas principales con índices optimizados
      tenants: 'id, nombre, activo',
      
      users: 'id, tenant_id, email, [tenant_id+activo]',
      
      rutas: 'id, tenant_id, nombre, activa, [tenant_id+activa]',
      
      productos_credito: 'id, tenant_id, activo, [tenant_id+activo]',
      
      clientes: `
        id,
        tenant_id,
        ruta_id,
        numero_documento,
        estado,
        [tenant_id+ruta_id],
        [tenant_id+estado],
        [tenant_id+numero_documento]
      `,
      
      creditos: `
        id,
        tenant_id,
        cliente_id,
        cobrador_id,
        ruta_id,
        estado,
        [tenant_id+estado],
        [cliente_id+estado],
        [cobrador_id+estado],
        [tenant_id+ruta_id+estado]
      `,
      
      cuotas: `
        id,
        credito_id,
        tenant_id,
        numero,
        estado,
        fecha_programada,
        [credito_id+numero],
        [credito_id+estado],
        [tenant_id+estado+fecha_programada]
      `,
      
      pagos: `
        id,
        tenant_id,
        credito_id,
        cliente_id,
        cobrador_id,
        fecha,
        synced,
        [tenant_id+fecha],
        [credito_id+fecha],
        [cobrador_id+fecha],
        [synced+fecha]
      `,
      
      // Tablas de sync y auditoría
      sync_queue: `
        ++id,
        timestamp,
        table_name,
        record_id,
        operation,
        synced,
        priority,
        [synced+priority+timestamp]
      `,
      
      audit_log: `
        ++id,
        timestamp,
        sequence,
        event_type,
        aggregate_type,
        aggregate_id,
        user_id,
        [aggregate_type+aggregate_id+timestamp],
        [user_id+timestamp]
      `,
      
      change_log: `
        ++id,
        timestamp,
        table_name,
        record_id,
        synced,
        [synced+timestamp],
        [table_name+record_id]
      `,
      
      checksums: 'record_key, checksum, timestamp',
      
      app_state: 'key, value, updated_at'
    });
  }

  /**
   * Inicializar la base de datos
   * Verifica el soporte de IndexedDB y abre la base de datos
   */
  async initialize(): Promise<void> {
    try {
      // Verificar si IndexedDB está soportado
      if (!('indexedDB' in window)) {
        throw new Error('IndexedDB no está soportado en este navegador');
      }

      // Abrir la base de datos (Dexie maneja esto automáticamente)
      await this.open();

      console.log('✅ IndexedDB inicializado exitosamente');
    } catch (error) {
      console.error('❌ Falló la inicialización de IndexedDB:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de la base de datos
   */
  async getStats() {
    const stats = {
      tenants: await this.tenants.count(),
      users: await this.users.count(),
      rutas: await this.rutas.count(),
      productos_credito: await this.productos_credito.count(),
      clientes: await this.clientes.count(),
      creditos: await this.creditos.count(),
      cuotas: await this.cuotas.count(),
      pagos: await this.pagos.count(),
      sync_queue: await this.sync_queue.count(),
      audit_log: await this.audit_log.count(),
      change_log: await this.change_log.count(),
      checksums: await this.checksums.count(),
      app_state: await this.app_state.count(),
    };

    return stats;
  }

  /**
   * Limpiar todos los datos (para testing o reset)
   */
  async clearAll(): Promise<void> {
    await this.transaction('rw', [
      this.tenants,
      this.users,
      this.rutas,
      this.productos_credito,
      this.clientes,
      this.creditos,
      this.cuotas,
      this.pagos,
      this.sync_queue,
      this.audit_log,
      this.change_log,
      this.checksums,
      this.app_state,
    ], async () => {
      await this.tenants.clear();
      await this.users.clear();
      await this.rutas.clear();
      await this.productos_credito.clear();
      await this.clientes.clear();
      await this.creditos.clear();
      await this.cuotas.clear();
      await this.pagos.clear();
      await this.sync_queue.clear();
      await this.audit_log.clear();
      await this.change_log.clear();
      await this.checksums.clear();
      await this.app_state.clear();
    });

    console.log('✅ Todos los datos limpiados de IndexedDB');
  }
}

/**
 * Crear una instancia de base de datos
 * Esta función permite crear múltiples instancias para diferentes aplicaciones
 */
export function createDatabase(name?: string): MicrocreditosDB {
  if (name) {
    // Crear una clase personalizada con nombre específico
    class CustomDB extends MicrocreditosDB {
      constructor() {
        super();
        this.name = name;
      }
    }
    return new CustomDB();
  }
  
  return new MicrocreditosDB();
}