/**
 * Tests for Validator
 * 
 * Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Validator } from './validator';
import { clienteSchema, creditoSchema, pagoSchema } from './schemas';

describe('Validator', () => {
  let validator: Validator;

  beforeEach(() => {
    validator = new Validator();
  });

  describe('UI-level validation', () => {
    it('should validate valid cliente data', () => {
      const validCliente = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        created_by: '123e4567-e89b-12d3-a456-426614174002',
        nombre: 'Juan Pérez',
        tipo_documento: 'CC',
        numero_documento: '1234567890',
        telefono: '+573001234567',
        direccion: 'Calle 123 #45-67',
        ruta_id: '123e4567-e89b-12d3-a456-426614174003',
        creditos_activos: 0,
        saldo_total: 0,
        dias_atraso_max: 0,
        estado: 'activo',
        created_at: Date.now(),
        updated_at: Date.now(),
      };

      const result = validator.validateUI(clienteSchema, validCliente);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.nombre).toBe('Juan Pérez');
      }
    });

    it('should reject invalid cliente data', () => {
      const invalidCliente = {
        id: 'invalid-uuid',
        nombre: '', // Empty name
        telefono: '123', // Invalid phone
      };

      const result = validator.validateUI(clienteSchema, invalidCliente);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.errors.issues.length).toBeGreaterThan(0);
      }
    });

    it('should validate valid credito data', () => {
      const validCredito = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        cliente_id: '123e4567-e89b-12d3-a456-426614174002',
        producto_id: '123e4567-e89b-12d3-a456-426614174003',
        cobrador_id: '123e4567-e89b-12d3-a456-426614174004',
        ruta_id: '123e4567-e89b-12d3-a456-426614174005',
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 1100000,
        numero_cuotas: 30,
        valor_cuota: 36667,
        frecuencia: 'diario',
        fecha_desembolso: Date.now(),
        fecha_primera_cuota: Date.now() + 86400000,
        fecha_ultima_cuota: Date.now() + 86400000 * 30,
        estado: 'activo',
        saldo_pendiente: 1100000,
        cuotas_pagadas: 0,
        dias_atraso: 0,
        excluir_domingos: false,
        created_at: Date.now(),
        created_by: '123e4567-e89b-12d3-a456-426614174004',
        updated_at: Date.now(),
      };

      const result = validator.validateUI(creditoSchema, validCredito);

      expect(result.success).toBe(true);
    });

    it('should reject credito with invalid business rules', () => {
      const invalidCredito = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        cliente_id: '123e4567-e89b-12d3-a456-426614174002',
        producto_id: '123e4567-e89b-12d3-a456-426614174003',
        cobrador_id: '123e4567-e89b-12d3-a456-426614174004',
        ruta_id: '123e4567-e89b-12d3-a456-426614174005',
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 900000, // Less than monto_original!
        numero_cuotas: 30,
        valor_cuota: 30000,
        frecuencia: 'diario',
        fecha_desembolso: Date.now(),
        fecha_primera_cuota: Date.now() + 86400000,
        fecha_ultima_cuota: Date.now() + 86400000 * 30,
        estado: 'activo',
        saldo_pendiente: 900000,
        cuotas_pagadas: 0,
        dias_atraso: 0,
        excluir_domingos: false,
        created_at: Date.now(),
        created_by: '123e4567-e89b-12d3-a456-426614174004',
        updated_at: Date.now(),
      };

      const result = validator.validateUI(creditoSchema, invalidCredito);

      expect(result.success).toBe(false);
    });
  });

  describe('Business logic validation', () => {
    it('should validate cliente business logic', async () => {
      const cliente = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nombre: 'Juan Pérez',
        latitud: 4.6097,
        longitud: -74.0817,
        estado: 'activo',
      };

      const result = await validator.validateBusinessLogic('cliente', cliente);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect incomplete GPS coordinates', async () => {
      const cliente = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        nombre: 'Juan Pérez',
        latitud: 4.6097,
        // Missing longitud
      };

      const result = await validator.validateBusinessLogic('cliente', cliente);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'INCOMPLETE_GPS')).toBe(true);
    });

    it('should validate credito calculations', async () => {
      const credito = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 1100000,
        numero_cuotas: 30,
        valor_cuota: 36667,
        saldo_pendiente: 1100000,
      };

      const result = await validator.validateBusinessLogic('credito', credito);

      expect(result.valid).toBe(true);
    });

    it('should detect calculation mismatches', async () => {
      const credito = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 1200000, // Wrong! Should be 1100000
        numero_cuotas: 30,
        valor_cuota: 40000,
        saldo_pendiente: 1200000,
      };

      const result = await validator.validateBusinessLogic('credito', credito);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'CALCULATION_MISMATCH')).toBe(true);
    });

    it('should validate pago business logic', async () => {
      const pago = {
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        checksum: 'abc123',
      };

      const result = await validator.validateBusinessLogic('pago', pago);

      expect(result.valid).toBe(true);
    });

    it('should reject pago with future date', async () => {
      const pago = {
        monto: 50000,
        fecha: Date.now() + 86400000, // Tomorrow
        latitud: 4.6097,
        longitud: -74.0817,
        checksum: 'abc123',
      };

      const result = await validator.validateBusinessLogic('pago', pago);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'FUTURE_DATE')).toBe(true);
    });

    it('should reject pago without checksum', async () => {
      const pago = {
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        // Missing checksum
      };

      const result = await validator.validateBusinessLogic('pago', pago);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_CHECKSUM')).toBe(true);
    });
  });

  describe('Post-save validation', () => {
    it('should validate referential integrity', async () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const relatedData = {
        tenant: { id: '123e4567-e89b-12d3-a456-426614174001' },
      };

      const result = await validator.validatePostSave('cliente', data, relatedData);

      expect(result.valid).toBe(true);
    });

    it('should detect missing tenant reference', async () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
      };

      const relatedData = {}; // No tenant

      const result = await validator.validatePostSave('cliente', data, relatedData);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'REFERENTIAL_INTEGRITY')).toBe(true);
    });

    it('should warn about missing checksum', async () => {
      const data = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        // Missing checksum
      };

      const result = await validator.validatePostSave('pago', data);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Pre-sync validation', () => {
    it('should validate complete pago before sync', async () => {
      const pago = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        tenant_id: '123e4567-e89b-12d3-a456-426614174001',
        credito_id: '123e4567-e89b-12d3-a456-426614174002',
        cliente_id: '123e4567-e89b-12d3-a456-426614174003',
        cobrador_id: '123e4567-e89b-12d3-a456-426614174004',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        created_at: Date.now(),
        created_by: '123e4567-e89b-12d3-a456-426614174004',
        device_id: 'device-123',
        app_version: '1.0.0',
        connection_type: 'wifi',
        checksum: 'abc123def456',
      };

      const result = await validator.validatePreSync('pago', pago);

      expect(result.valid).toBe(true);
    });

    it('should reject pago without checksum for sync', async () => {
      const pago = {
        id: '123e4567-e89b-12d3-a456-426614174000',
        monto: 50000,
        // Missing checksum
      };

      const result = await validator.validatePreSync('pago', pago);

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.code === 'MISSING_CHECKSUM')).toBe(true);
    });
  });

  describe('Background validation', () => {
    it('should validate array of records', async () => {
      const records = [
        { id: '1', checksum: 'abc', _cliente_exists: true },
        { id: '2', checksum: 'def', _cliente_exists: true },
      ];

      const result = await validator.validateBackground(records);

      expect(result.valid).toBe(true);
    });

    it('should warn about orphaned records', async () => {
      const records = [
        { id: '1', cliente_id: 'client-1', _cliente_exists: false },
      ];

      const result = await validator.validateBackground(records);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });
});
