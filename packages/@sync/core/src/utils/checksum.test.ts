/**
 * Tests para Verificación de Checksums e Integridad
 * 
 * Property 4: Integridad de Checksum
 * Validates: Requirements 2.6, 7.6
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { ChecksumService } from './checksum';

describe('ChecksumService', () => {
  let checksumService: ChecksumService;

  beforeEach(() => {
    checksumService = new ChecksumService();
  });

  describe('calculateChecksum', () => {
    it('debería calcular checksum SHA-256 para datos simples', async () => {
      const data = { id: '123', name: 'test' };
      const checksum = await checksumService.calculateChecksum(data);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA-256 produce 64 caracteres hex
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('debería producir el mismo checksum para los mismos datos', async () => {
      const data = { id: '123', name: 'test', value: 100 };
      
      const checksum1 = await checksumService.calculateChecksum(data);
      const checksum2 = await checksumService.calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('debería producir checksums diferentes para datos diferentes', async () => {
      const data1 = { id: '123', name: 'test' };
      const data2 = { id: '456', name: 'test' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('debería producir el mismo checksum independientemente del orden de las claves', async () => {
      const data1 = { id: '123', name: 'test', value: 100 };
      const data2 = { value: 100, name: 'test', id: '123' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });

    it('debería ignorar el campo checksum en el cálculo', async () => {
      const data1 = { id: '123', name: 'test' };
      const data2 = { id: '123', name: 'test', checksum: 'old_checksum' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculatePagoChecksum', () => {
    it('debería calcular checksum para registro de pago', async () => {
      const pago = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: 'Pago completo',
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const checksum = await checksumService.calculatePagoChecksum(pago);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64);
    });

    it('debería producir el mismo checksum para el mismo pago', async () => {
      const pago = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: null,
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const checksum1 = await checksumService.calculatePagoChecksum(pago);
      const checksum2 = await checksumService.calculatePagoChecksum(pago);

      expect(checksum1).toBe(checksum2);
    });

    it('debería ignorar campos mutables en el checksum de pago', async () => {
      const pago1 = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: null,
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const pago2 = {
        ...pago1,
        synced: true, // Campo mutable
        sync_attempts: 5, // Campo mutable
      };

      const checksum1 = await checksumService.calculatePagoChecksum(pago1);
      const checksum2 = await checksumService.calculatePagoChecksum(pago2);

      // Los checksums deberían ser iguales porque los campos mutables se ignoran
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculateCreditoChecksum', () => {
    it('debería calcular checksum para registro de crédito', async () => {
      const credito = {
        id: 'credito-1',
        tenant_id: 'tenant-1',
        cliente_id: 'cliente-1',
        producto_id: 'producto-1',
        cobrador_id: 'cobrador-1',
        ruta_id: 'ruta-1',
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 1100000,
        numero_cuotas: 30,
        valor_cuota: 36667,
        frecuencia: 'diario',
        fecha_desembolso: Date.now(),
        fecha_primera_cuota: Date.now(),
        fecha_ultima_cuota: Date.now() + 30 * 24 * 60 * 60 * 1000,
        estado: 'activo',
        created_at: Date.now(),
        created_by: 'user-1',
        saldo_pendiente: 1100000,
        cuotas_pagadas: 0,
        dias_atraso: 0,
        updated_at: Date.now(),
        excluir_domingos: true,
        version_vector: {},
        field_versions: {},
        synced: false,
      };

      const checksum = await checksumService.calculateCreditoChecksum(credito);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64);
    });

    it('debería ignorar campos mutables en el checksum de crédito', async () => {
      const credito1 = {
        id: 'credito-1',
        tenant_id: 'tenant-1',
        cliente_id: 'cliente-1',
        producto_id: 'producto-1',
        cobrador_id: 'cobrador-1',
        ruta_id: 'ruta-1',
        monto_original: 1000000,
        interes_porcentaje: 10,
        total_a_pagar: 1100000,
        numero_cuotas: 30,
        valor_cuota: 36667,
        frecuencia: 'diario',
        fecha_desembolso: Date.now(),
        fecha_primera_cuota: Date.now(),
        fecha_ultima_cuota: Date.now() + 30 * 24 * 60 * 60 * 1000,
        estado: 'activo',
        created_at: Date.now(),
        created_by: 'user-1',
        saldo_pendiente: 1100000,
        cuotas_pagadas: 0,
        dias_atraso: 0,
        updated_at: Date.now(),
        excluir_domingos: true,
        version_vector: {},
        field_versions: {},
        synced: false,
      };

      const credito2 = {
        ...credito1,
        saldo_pendiente: 500000, // Campo mutable
        cuotas_pagadas: 15, // Campo mutable
        dias_atraso: 5, // Campo mutable
        estado: 'vencido' as const, // Campo mutable
      };

      const checksum1 = await checksumService.calculateCreditoChecksum(credito1);
      const checksum2 = await checksumService.calculateCreditoChecksum(credito2);

      // Los checksums deberían ser iguales porque los campos mutables se ignoran
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('verifyPagoChecksum', () => {
    it('debería verificar checksum válido de pago', async () => {
      const pagoSinChecksum = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: null,
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const checksum = await checksumService.calculatePagoChecksum(pagoSinChecksum);
      const pago = { ...pagoSinChecksum, checksum };

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(true);
      expect(result.corrupted).toBe(false);
      expect(result.expected).toBe(checksum);
      expect(result.actual).toBe(checksum);
    });

    it('debería detectar checksum corrupto de pago', async () => {
      const pagoSinChecksum = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: null,
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const pago = { ...pagoSinChecksum, checksum: 'checksum_invalido' };

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(false);
      expect(result.corrupted).toBe(true);
      expect(result.expected).toBe('checksum_invalido');
      expect(result.actual).not.toBe('checksum_invalido');
    });

    it('debería detectar manipulación de datos en pago', async () => {
      const pagoSinChecksum = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'cobrador-1',
        monto: 50000,
        fecha: Date.now(),
        latitud: 4.6097,
        longitud: -74.0817,
        observaciones: null,
        created_at: Date.now(),
        created_by: 'user-1',
        device_id: 'device-1',
        app_version: '1.0.0',
        connection_type: 'wifi',
        battery_level: 80,
        synced: false,
        sync_attempts: 0,
        last_sync_attempt: null,
        sync_error: null,
        comprobante_foto_url: null,
      };

      const checksum = await checksumService.calculatePagoChecksum(pagoSinChecksum);
      const pago = { ...pagoSinChecksum, checksum };

      // Manipular los datos
      pago.monto = 100000; // Cambió de 50000

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(false);
      expect(result.corrupted).toBe(true);
    });
  });

  describe('storeChecksum y getStoredChecksum', () => {
    it('debería requerir base de datos para almacenar checksum', async () => {
      const recordType = 'pago';
      const recordId = 'pago-1';
      const checksum = 'abc123def456';

      await expect(checksumService.storeChecksum(recordType, recordId, checksum))
        .rejects.toThrow('Base de datos requerida para almacenar checksum');
    });

    it('debería requerir base de datos para recuperar checksum', async () => {
      await expect(checksumService.getStoredChecksum('pago', 'pago-1'))
        .rejects.toThrow('Base de datos requerida para recuperar checksum');
    });
  });

  describe('performIntegrityCheck', () => {
    it('debería requerir base de datos para verificación de integridad', async () => {
      await expect(checksumService.performIntegrityCheck())
        .rejects.toThrow('Base de datos requerida para verificación de integridad');
    });
  });
});