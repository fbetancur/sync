/**
 * Tests for Checksum and Integrity Verification
 * 
 * Property 4: Checksum Integrity
 * Validates: Requirements 2.6, 7.6
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ChecksumService } from './checksum';
import { db } from '../db';
import type { Pago, Credito, Cliente } from '../db';

describe('ChecksumService', () => {
  let checksumService: ChecksumService;

  beforeEach(async () => {
    checksumService = new ChecksumService();
    await db.clearAll();
  });

  afterEach(async () => {
    await db.clearAll();
  });

  describe('calculateChecksum', () => {
    it('should calculate SHA-256 checksum for simple data', async () => {
      const data = { id: '123', name: 'test' };
      const checksum = await checksumService.calculateChecksum(data);

      expect(checksum).toBeDefined();
      expect(checksum).toHaveLength(64); // SHA-256 produces 64 hex characters
      expect(checksum).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should produce same checksum for same data', async () => {
      const data = { id: '123', name: 'test', value: 100 };
      
      const checksum1 = await checksumService.calculateChecksum(data);
      const checksum2 = await checksumService.calculateChecksum(data);

      expect(checksum1).toBe(checksum2);
    });

    it('should produce different checksums for different data', async () => {
      const data1 = { id: '123', name: 'test' };
      const data2 = { id: '456', name: 'test' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).not.toBe(checksum2);
    });

    it('should produce same checksum regardless of key order', async () => {
      const data1 = { id: '123', name: 'test', value: 100 };
      const data2 = { value: 100, name: 'test', id: '123' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });

    it('should ignore checksum field in calculation', async () => {
      const data1 = { id: '123', name: 'test' };
      const data2 = { id: '123', name: 'test', checksum: 'old_checksum' };

      const checksum1 = await checksumService.calculateChecksum(data1);
      const checksum2 = await checksumService.calculateChecksum(data2);

      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculatePagoChecksum', () => {
    it('should calculate checksum for pago record', async () => {
      const pago: Omit<Pago, 'checksum'> = {
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

    it('should produce same checksum for same pago', async () => {
      const pago: Omit<Pago, 'checksum'> = {
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

    it('should ignore mutable fields in pago checksum', async () => {
      const pago1: Omit<Pago, 'checksum'> = {
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
        synced: true, // Mutable field
        sync_attempts: 5, // Mutable field
      };

      const checksum1 = await checksumService.calculatePagoChecksum(pago1);
      const checksum2 = await checksumService.calculatePagoChecksum(pago2);

      // Checksums should be the same because mutable fields are ignored
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('calculateCreditoChecksum', () => {
    it('should calculate checksum for credito record', async () => {
      const credito: Omit<Credito, 'checksum'> = {
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

    it('should ignore mutable fields in credito checksum', async () => {
      const credito1: Omit<Credito, 'checksum'> = {
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
        saldo_pendiente: 500000, // Mutable field
        cuotas_pagadas: 15, // Mutable field
        dias_atraso: 5, // Mutable field
        estado: 'vencido' as const, // Mutable field
      };

      const checksum1 = await checksumService.calculateCreditoChecksum(credito1);
      const checksum2 = await checksumService.calculateCreditoChecksum(credito2);

      // Checksums should be the same because mutable fields are ignored
      expect(checksum1).toBe(checksum2);
    });
  });

  describe('verifyPagoChecksum', () => {
    it('should verify valid pago checksum', async () => {
      const pagoWithoutChecksum: Omit<Pago, 'checksum'> = {
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

      const checksum = await checksumService.calculatePagoChecksum(pagoWithoutChecksum);
      const pago: Pago = { ...pagoWithoutChecksum, checksum };

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(true);
      expect(result.corrupted).toBe(false);
      expect(result.expected).toBe(checksum);
      expect(result.actual).toBe(checksum);
    });

    it('should detect corrupted pago checksum', async () => {
      const pagoWithoutChecksum: Omit<Pago, 'checksum'> = {
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

      const pago: Pago = { ...pagoWithoutChecksum, checksum: 'invalid_checksum' };

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(false);
      expect(result.corrupted).toBe(true);
      expect(result.expected).toBe('invalid_checksum');
      expect(result.actual).not.toBe('invalid_checksum');
    });

    it('should detect data tampering in pago', async () => {
      const pagoWithoutChecksum: Omit<Pago, 'checksum'> = {
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

      const checksum = await checksumService.calculatePagoChecksum(pagoWithoutChecksum);
      const pago: Pago = { ...pagoWithoutChecksum, checksum };

      // Tamper with the data
      pago.monto = 100000; // Changed from 50000

      const result = await checksumService.verifyPagoChecksum(pago);

      expect(result.valid).toBe(false);
      expect(result.corrupted).toBe(true);
    });
  });

  describe('storeChecksum and getStoredChecksum', () => {
    it('should store and retrieve checksum', async () => {
      const recordType = 'pago';
      const recordId = 'pago-1';
      const checksum = 'abc123def456';

      await checksumService.storeChecksum(recordType, recordId, checksum);
      const retrieved = await checksumService.getStoredChecksum(recordType, recordId);

      expect(retrieved).toBe(checksum);
    });

    it('should return null for non-existent checksum', async () => {
      const retrieved = await checksumService.getStoredChecksum('pago', 'non-existent');

      expect(retrieved).toBeNull();
    });

    it('should update existing checksum', async () => {
      const recordType = 'pago';
      const recordId = 'pago-1';
      const checksum1 = 'abc123';
      const checksum2 = 'def456';

      await checksumService.storeChecksum(recordType, recordId, checksum1);
      await checksumService.storeChecksum(recordType, recordId, checksum2);
      
      const retrieved = await checksumService.getStoredChecksum(recordType, recordId);

      expect(retrieved).toBe(checksum2);
    });
  });

  describe('performIntegrityCheck', () => {
    it('should check integrity of empty database', async () => {
      const result = await checksumService.performIntegrityCheck();

      expect(result.total).toBe(0);
      expect(result.valid).toBe(0);
      expect(result.corrupted).toBe(0);
      expect(result.missing).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect and repair missing checksums', async () => {
      // Insert pago without checksum
      const pago: Pago = {
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
        checksum: '', // Missing checksum
        comprobante_foto_url: null,
      };

      await db.pagos.add(pago);

      const result = await checksumService.performIntegrityCheck();

      expect(result.total).toBe(1);
      expect(result.missing).toBe(1);
      expect(result.repaired).toBe(1);

      // Verify checksum was added
      const updatedPago = await db.pagos.get('pago-1');
      expect(updatedPago?.checksum).toBeDefined();
      expect(updatedPago?.checksum).not.toBe('');
    });

    it('should detect corrupted records', async () => {
      // Insert pago with invalid checksum
      const pago: Pago = {
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
        checksum: 'invalid_checksum',
        comprobante_foto_url: null,
      };

      await db.pagos.add(pago);

      const result = await checksumService.performIntegrityCheck();

      expect(result.total).toBe(1);
      expect(result.corrupted).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].recordType).toBe('pago');
      expect(result.errors[0].recordId).toBe('pago-1');
    });

    it('should verify valid records', async () => {
      // Insert pago with valid checksum
      const pagoWithoutChecksum: Omit<Pago, 'checksum'> = {
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

      const checksum = await checksumService.calculatePagoChecksum(pagoWithoutChecksum);
      const pago: Pago = { ...pagoWithoutChecksum, checksum };

      await db.pagos.add(pago);

      const result = await checksumService.performIntegrityCheck();

      expect(result.total).toBe(1);
      expect(result.valid).toBe(1);
      expect(result.corrupted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should check multiple record types', async () => {
      // Add pago
      const pagoWithoutChecksum: Omit<Pago, 'checksum'> = {
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
      const pagoChecksum = await checksumService.calculatePagoChecksum(pagoWithoutChecksum);
      await db.pagos.add({ ...pagoWithoutChecksum, checksum: pagoChecksum });

      // Add credito
      const creditoWithoutChecksum: Omit<Credito, 'checksum'> = {
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
      const creditoChecksum = await checksumService.calculateCreditoChecksum(creditoWithoutChecksum);
      await db.creditos.add({ ...creditoWithoutChecksum, checksum: creditoChecksum });

      // Add cliente
      const clienteWithoutChecksum: Omit<Cliente, 'checksum'> = {
        id: 'cliente-1',
        tenant_id: 'tenant-1',
        created_by: 'user-1',
        nombre: 'Juan Pérez',
        created_at: Date.now(),
        updated_at: Date.now(),
        numero_documento: '123456789',
        telefono: '3001234567',
        direccion: 'Calle 123',
        ruta_id: 'ruta-1',
        tipo_documento: 'CC',
        telefono_2: null,
        barrio: null,
        referencia: null,
        latitud: null,
        longitud: null,
        nombre_fiador: null,
        telefono_fiador: null,
        creditos_activos: 0,
        saldo_total: 0,
        dias_atraso_max: 0,
        estado: 'activo',
        score: null,
        version_vector: {},
        field_versions: {},
        synced: false,
      };
      const clienteChecksum = await checksumService.calculateClienteChecksum(clienteWithoutChecksum);
      await db.clientes.add({ ...clienteWithoutChecksum, checksum: clienteChecksum });

      const result = await checksumService.performIntegrityCheck();

      expect(result.total).toBe(3);
      expect(result.valid).toBe(3);
      expect(result.corrupted).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
  });
});
