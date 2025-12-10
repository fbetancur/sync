/**
 * Multi-level Validator Module
 * 
 * This module implements multi-level validation:
 * 1. UI-level validation (real-time)
 * 2. Business logic validation (pre-save)
 * 3. Post-save integrity checks
 * 4. Periodic background validation
 * 5. Pre-sync validation
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { z } from 'zod';
import {
  clienteSchema,
  creditoSchema,
  pagoSchema,
  cuotaSchema,
  type ValidationResult,
  validateData,
  getValidationErrors,
} from './schemas';

// ============================================================================
// TYPES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationContext {
  level: 'ui' | 'business' | 'post-save' | 'background' | 'pre-sync';
  timestamp: number;
  user_id?: string;
  device_id?: string;
}

export interface IntegrityCheckResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: string[];
  corrected: boolean;
}

// ============================================================================
// VALIDATOR CLASS
// ============================================================================

export class Validator {
  /**
   * Level 1: UI-level validation (real-time)
   * Fast validation for immediate user feedback
   */
  validateUI<T>(schema: z.ZodSchema<T>, data: unknown): ValidationResult<T> {
    return validateData(schema, data);
  }

  /**
   * Level 2: Business logic validation (pre-save)
   * Validates business rules before writing to IndexedDB
   */
  async validateBusinessLogic(
    entityType: string,
    data: any,
    context?: { existingData?: any }
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    switch (entityType) {
      case 'cliente':
        return this.validateClienteBusinessLogic(data, context);
      case 'credito':
        return this.validateCreditoBusinessLogic(data, context);
      case 'pago':
        return this.validatePagoBusinessLogic(data, context);
      default:
        return { valid: true, errors: [], warnings: [], corrected: false };
    }
  }

  /**
   * Level 3: Post-save integrity checks
   * Verifies referential integrity and recalculates derived fields
   */
  async validatePostSave(
    entityType: string,
    data: any,
    relatedData?: any
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    let corrected = false;

    // Verify referential integrity
    if (data.tenant_id && !relatedData?.tenant) {
      errors.push({
        field: 'tenant_id',
        message: 'Tenant no existe',
        code: 'REFERENTIAL_INTEGRITY',
      });
    }

    // Verify checksums for critical records
    if (['pago', 'credito'].includes(entityType)) {
      if (!data.checksum) {
        warnings.push('Checksum faltante - se debe calcular');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected,
    };
  }

  /**
   * Level 4: Periodic background validation
   * Runs every 5 minutes to detect inconsistencies
   */
  async validateBackground(records: any[]): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];
    let corrected = false;

    for (const record of records) {
      // Check for data corruption
      if (record.checksum) {
        // Checksum validation would go here
        // This is a placeholder - actual implementation in checksum module
      }

      // Check for orphaned records
      if (record.cliente_id && !record._cliente_exists) {
        warnings.push(`Registro ${record.id} referencia cliente inexistente`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected,
    };
  }

  /**
   * Level 5: Pre-sync validation
   * Validates data before sending to server
   */
  async validatePreSync(
    entityType: string,
    data: any
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate schema
    let schemaResult: ValidationResult<any>;
    
    switch (entityType) {
      case 'cliente':
        schemaResult = validateData(clienteSchema, data);
        break;
      case 'credito':
        schemaResult = validateData(creditoSchema, data);
        break;
      case 'pago':
        schemaResult = validateData(pagoSchema, data);
        break;
      default:
        return { valid: true, errors: [], warnings: [], corrected: false };
    }

    if (!schemaResult.success) {
      const zodErrors = getValidationErrors(schemaResult.errors);
      Object.entries(zodErrors).forEach(([field, message]) => {
        errors.push({ field, message, code: 'SCHEMA_VALIDATION' });
      });
    }

    // Verify checksum for critical records
    if (['pago', 'credito'].includes(entityType)) {
      if (!data.checksum) {
        errors.push({
          field: 'checksum',
          message: 'Checksum requerido para sincronización',
          code: 'MISSING_CHECKSUM',
        });
      }
    }

    // Verify required sync fields
    if (!data.synced !== undefined && data.synced === true) {
      warnings.push('Registro ya sincronizado');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected: false,
    };
  }

  // ============================================================================
  // PRIVATE BUSINESS LOGIC VALIDATORS
  // ============================================================================

  private async validateClienteBusinessLogic(
    data: any,
    context?: { existingData?: any }
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate documento is unique (would check database in real implementation)
    // This is a placeholder for the actual check
    
    // Validate GPS coordinates if provided
    if (data.latitud && !data.longitud) {
      errors.push({
        field: 'longitud',
        message: 'Longitud requerida cuando se proporciona latitud',
        code: 'INCOMPLETE_GPS',
      });
    }

    if (data.longitud && !data.latitud) {
      errors.push({
        field: 'latitud',
        message: 'Latitud requerida cuando se proporciona longitud',
        code: 'INCOMPLETE_GPS',
      });
    }

    // Validate estado transitions
    if (context?.existingData) {
      const oldEstado = context.existingData.estado;
      const newEstado = data.estado;

      if (oldEstado === 'bloqueado' && newEstado === 'activo') {
        warnings.push('Cambio de estado bloqueado → activo requiere aprobación');
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected: false,
    };
  }

  private async validateCreditoBusinessLogic(
    data: any,
    context?: { existingData?: any }
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate calculated fields match
    const expectedTotal = data.monto_original * (1 + data.interes_porcentaje / 100);
    const tolerance = 1; // Allow 1 peso difference due to rounding

    if (Math.abs(data.total_a_pagar - expectedTotal) > tolerance) {
      errors.push({
        field: 'total_a_pagar',
        message: `Total a pagar (${data.total_a_pagar}) no coincide con cálculo esperado (${expectedTotal})`,
        code: 'CALCULATION_MISMATCH',
      });
    }

    // Validate cuota value
    const expectedCuota = Math.round(data.total_a_pagar / data.numero_cuotas);
    if (Math.abs(data.valor_cuota - expectedCuota) > tolerance) {
      warnings.push(`Valor cuota (${data.valor_cuota}) difiere del esperado (${expectedCuota})`);
    }

    // Validate estado transitions
    if (context?.existingData) {
      const oldEstado = context.existingData.estado;
      const newEstado = data.estado;

      if (oldEstado === 'pagado' && newEstado === 'activo') {
        errors.push({
          field: 'estado',
          message: 'No se puede reactivar un crédito pagado',
          code: 'INVALID_STATE_TRANSITION',
        });
      }
    }

    // Validate saldo consistency
    if (data.saldo_pendiente < 0) {
      errors.push({
        field: 'saldo_pendiente',
        message: 'Saldo pendiente no puede ser negativo',
        code: 'INVALID_BALANCE',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected: false,
    };
  }

  private async validatePagoBusinessLogic(
    data: any,
    context?: { existingData?: any }
  ): Promise<IntegrityCheckResult> {
    const errors: ValidationError[] = [];
    const warnings: string[] = [];

    // Validate monto is positive
    if (data.monto <= 0) {
      errors.push({
        field: 'monto',
        message: 'Monto debe ser mayor a cero',
        code: 'INVALID_AMOUNT',
      });
    }

    // Validate GPS coordinates are present
    if (!data.latitud || !data.longitud) {
      warnings.push('Pago sin coordenadas GPS');
    }

    // Validate fecha is not in the future
    const now = Date.now();
    if (data.fecha > now) {
      errors.push({
        field: 'fecha',
        message: 'Fecha de pago no puede ser futura',
        code: 'FUTURE_DATE',
      });
    }

    // Validate checksum is present
    if (!data.checksum) {
      errors.push({
        field: 'checksum',
        message: 'Checksum requerido para pagos',
        code: 'MISSING_CHECKSUM',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      corrected: false,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const validator = new Validator();
