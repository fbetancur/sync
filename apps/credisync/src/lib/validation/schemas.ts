/**
 * Validation Schemas Module
 * 
 * This module implements Zod schemas for all entities to provide:
 * - UI-level validation (real-time)
 * - Business logic validation (pre-save)
 * - Post-save integrity checks
 * - Pre-sync validation
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6
 */

import { z } from 'zod';

// ============================================================================
// COMMON SCHEMAS
// ============================================================================

export const uuidSchema = z.string().uuid();
export const timestampSchema = z.number().int().positive();
export const emailSchema = z.string().email();
export const phoneSchema = z.string().regex(/^\+?[0-9]{7,15}$/, 'Número de teléfono inválido');
export const documentoSchema = z.string().min(5).max(20);

// ============================================================================
// TENANT SCHEMA
// ============================================================================

export const tenantSchema = z.object({
  id: uuidSchema,
  nombre: z.string().min(1).max(100),
  usuarios_contratados: z.number().int().positive(),
  usuarios_activos: z.number().int().nonnegative(),
  activo: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  version_vector: z.record(z.number().int().nonnegative()).optional(),
  synced: z.boolean().optional(),
  checksum: z.string().optional(),
}).refine(
  (data) => data.usuarios_activos <= data.usuarios_contratados,
  {
    message: 'Usuarios activos no puede exceder usuarios contratados',
    path: ['usuarios_activos'],
  }
);

export type TenantValidation = z.infer<typeof tenantSchema>;

// ============================================================================
// USER SCHEMA
// ============================================================================

export const userSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  email: emailSchema,
  nombre: z.string().min(1).max(100),
  rol: z.enum(['admin', 'cobrador', 'supervisor']),
  activo: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type UserValidation = z.infer<typeof userSchema>;

// ============================================================================
// RUTA SCHEMA
// ============================================================================

export const rutaSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  nombre: z.string().min(1).max(100),
  descripcion: z.string().max(500).optional(),
  activa: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type RutaValidation = z.infer<typeof rutaSchema>;

// ============================================================================
// PRODUCTO CREDITO SCHEMA
// ============================================================================

export const productoCreditoSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  nombre: z.string().min(1).max(100),
  interes_porcentaje: z.number().min(0).max(100),
  plazo_minimo: z.number().int().positive(),
  plazo_maximo: z.number().int().positive(),
  monto_minimo: z.number().positive(),
  monto_maximo: z.number().positive(),
  frecuencia_pago: z.enum(['diario', 'semanal', 'quincenal', 'mensual']),
  activo: z.boolean(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
}).refine(
  (data) => data.plazo_maximo >= data.plazo_minimo,
  {
    message: 'Plazo máximo debe ser mayor o igual al plazo mínimo',
    path: ['plazo_maximo'],
  }
).refine(
  (data) => data.monto_maximo >= data.monto_minimo,
  {
    message: 'Monto máximo debe ser mayor o igual al monto mínimo',
    path: ['monto_maximo'],
  }
);

export type ProductoCreditoValidation = z.infer<typeof productoCreditoSchema>;

// ============================================================================
// CLIENTE SCHEMA
// ============================================================================

export const clienteSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  created_by: uuidSchema,
  nombre: z.string().min(1).max(100),
  tipo_documento: z.enum(['CC', 'CE', 'TI', 'NIT', 'PASAPORTE']),
  numero_documento: documentoSchema,
  telefono: phoneSchema,
  telefono_2: phoneSchema.optional().nullable(),
  direccion: z.string().min(1).max(200),
  barrio: z.string().max(100).optional().nullable(),
  referencia: z.string().max(200).optional().nullable(),
  ruta_id: uuidSchema,
  latitud: z.number().min(-90).max(90).optional().nullable(),
  longitud: z.number().min(-180).max(180).optional().nullable(),
  nombre_fiador: z.string().max(100).optional().nullable(),
  telefono_fiador: phoneSchema.optional().nullable(),
  creditos_activos: z.number().int().nonnegative(),
  saldo_total: z.number().nonnegative(),
  dias_atraso_max: z.number().int().nonnegative(),
  estado: z.enum(['activo', 'inactivo', 'bloqueado']),
  score: z.number().int().min(0).max(1000).optional().nullable(),
  created_at: timestampSchema,
  updated_at: timestampSchema,
  version_vector: z.record(z.number().int().nonnegative()).optional(),
  field_versions: z.record(z.any()).optional(),
  synced: z.boolean().optional(),
  checksum: z.string().optional(),
});

export type ClienteValidation = z.infer<typeof clienteSchema>;

// ============================================================================
// CREDITO SCHEMA
// ============================================================================

export const creditoSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  cliente_id: uuidSchema,
  producto_id: uuidSchema,
  cobrador_id: uuidSchema,
  ruta_id: uuidSchema,
  monto_original: z.number().positive(),
  interes_porcentaje: z.number().min(0).max(100),
  total_a_pagar: z.number().positive(),
  numero_cuotas: z.number().int().positive(),
  valor_cuota: z.number().positive(),
  frecuencia: z.enum(['diario', 'semanal', 'quincenal', 'mensual']),
  fecha_desembolso: timestampSchema,
  fecha_primera_cuota: timestampSchema,
  fecha_ultima_cuota: timestampSchema,
  estado: z.enum(['activo', 'pagado', 'vencido', 'cancelado']),
  saldo_pendiente: z.number().nonnegative(),
  cuotas_pagadas: z.number().int().nonnegative(),
  dias_atraso: z.number().int().nonnegative(),
  excluir_domingos: z.boolean(),
  created_at: timestampSchema,
  created_by: uuidSchema,
  updated_at: timestampSchema,
  version_vector: z.record(z.number().int().nonnegative()).optional(),
  field_versions: z.record(z.any()).optional(),
  synced: z.boolean().optional(),
  checksum: z.string().optional(),
}).refine(
  (data) => data.total_a_pagar >= data.monto_original,
  {
    message: 'Total a pagar debe ser mayor o igual al monto original',
    path: ['total_a_pagar'],
  }
).refine(
  (data) => data.saldo_pendiente <= data.total_a_pagar,
  {
    message: 'Saldo pendiente no puede exceder el total a pagar',
    path: ['saldo_pendiente'],
  }
).refine(
  (data) => data.cuotas_pagadas <= data.numero_cuotas,
  {
    message: 'Cuotas pagadas no puede exceder el número de cuotas',
    path: ['cuotas_pagadas'],
  }
).refine(
  (data) => data.fecha_primera_cuota >= data.fecha_desembolso,
  {
    message: 'Fecha primera cuota debe ser posterior al desembolso',
    path: ['fecha_primera_cuota'],
  }
).refine(
  (data) => data.fecha_ultima_cuota >= data.fecha_primera_cuota,
  {
    message: 'Fecha última cuota debe ser posterior a la primera cuota',
    path: ['fecha_ultima_cuota'],
  }
);

export type CreditoValidation = z.infer<typeof creditoSchema>;

// ============================================================================
// CUOTA SCHEMA
// ============================================================================

export const cuotaSchema = z.object({
  id: uuidSchema,
  credito_id: uuidSchema,
  tenant_id: uuidSchema,
  numero: z.number().int().positive(),
  valor: z.number().positive(),
  fecha_programada: timestampSchema,
  fecha_pago: timestampSchema.optional().nullable(),
  monto_pagado: z.number().nonnegative().optional(),
  estado: z.enum(['pendiente', 'pagada', 'vencida']),
  created_at: timestampSchema,
  updated_at: timestampSchema,
});

export type CuotaValidation = z.infer<typeof cuotaSchema>;

// ============================================================================
// PAGO SCHEMA
// ============================================================================

export const pagoSchema = z.object({
  id: uuidSchema,
  tenant_id: uuidSchema,
  credito_id: uuidSchema,
  cliente_id: uuidSchema,
  cobrador_id: uuidSchema,
  monto: z.number().positive(),
  fecha: timestampSchema,
  latitud: z.number().min(-90).max(90),
  longitud: z.number().min(-180).max(180),
  observaciones: z.string().max(500).optional().nullable(),
  comprobante_foto_url: z.string().url().optional().nullable(),
  created_at: timestampSchema,
  created_by: uuidSchema,
  device_id: z.string().min(1),
  app_version: z.string().min(1),
  connection_type: z.string(),
  battery_level: z.number().min(0).max(100).optional().nullable(),
  synced: z.boolean().optional(),
  sync_attempts: z.number().int().nonnegative().optional(),
  last_sync_attempt: timestampSchema.optional().nullable(),
  sync_error: z.string().optional().nullable(),
  checksum: z.string(),
});

export type PagoValidation = z.infer<typeof pagoSchema>;

// ============================================================================
// PARTIAL SCHEMAS FOR FORMS (UI-level validation)
// ============================================================================

export const clienteFormSchema = clienteSchema.pick({
  nombre: true,
  tipo_documento: true,
  numero_documento: true,
  telefono: true,
  telefono_2: true,
  direccion: true,
  barrio: true,
  referencia: true,
  ruta_id: true,
  nombre_fiador: true,
  telefono_fiador: true,
}).partial({
  telefono_2: true,
  barrio: true,
  referencia: true,
  nombre_fiador: true,
  telefono_fiador: true,
});

export const creditoFormSchema = creditoSchema.pick({
  cliente_id: true,
  producto_id: true,
  monto_original: true,
  interes_porcentaje: true,
  numero_cuotas: true,
  frecuencia: true,
  fecha_desembolso: true,
  excluir_domingos: true,
});

export const pagoFormSchema = pagoSchema.pick({
  credito_id: true,
  cliente_id: true,
  monto: true,
  observaciones: true,
}).partial({
  observaciones: true,
});

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

export type ValidationResult<T> = 
  | { success: true; data: T }
  | { success: false; errors: z.ZodError };

export function validateData<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  } else {
    return { success: false, errors: result.error };
  }
}

export function getValidationErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  if (error && error.issues) {
    error.issues.forEach((err) => {
      const path = err.path.join('.');
      errors[path] = err.message;
    });
  }
  
  return errors;
}
