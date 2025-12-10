/**
 * Tests for IndexedDB Database
 * 
 * Comprehensive tests to verify database functionality
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MicrocreditosDB } from './index';

describe('MicrocreditosDB', () => {
  let db: MicrocreditosDB;

  beforeEach(async () => {
    db = new MicrocreditosDB();
    await db.open();
  });

  afterEach(async () => {
    await db.clearAll();
    await db.close();
    await db.delete();
  });

  describe('Database Initialization', () => {
    it('should open database successfully', async () => {
      expect(db.isOpen()).toBe(true);
      expect(db.name).toBe('microcreditos_db');
    });

    it('should have all required tables', () => {
      const expectedTables = [
        'tenants',
        'users',
        'rutas',
        'productos_credito',
        'clientes',
        'creditos',
        'cuotas',
        'pagos',
        'sync_queue',
        'audit_log',
        'change_log',
        'checksums',
        'app_state'
      ];

      const actualTables = db.tables.map(t => t.name);
      
      expectedTables.forEach(tableName => {
        expect(actualTables).toContain(tableName);
      });
    });

    it('should have correct version', () => {
      expect(db.verno).toBe(1);
    });
  });

  describe('Table Operations', () => {
    it('should insert and retrieve a tenant', async () => {
      const tenant = {
        id: 'tenant-1',
        nombre: 'Test Tenant',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: { 'device-1': 1 },
        synced: false,
        checksum: 'test-checksum'
      };

      await db.tenants.add(tenant);
      const retrieved = await db.tenants.get('tenant-1');

      expect(retrieved).toEqual(tenant);
    });

    it('should insert and retrieve a cliente', async () => {
      const cliente = {
        id: 'cliente-1',
        tenant_id: 'tenant-1',
        created_by: 'user-1',
        nombre: 'Juan Pérez',
        created_at: Date.now(),
        updated_at: Date.now(),
        numero_documento: '12345678',
        telefono: '3001234567',
        direccion: 'Calle 123',
        ruta_id: 'ruta-1',
        tipo_documento: 'CC',
        telefono_2: null,
        barrio: 'Centro',
        referencia: null,
        latitud: 4.6097,
        longitud: -74.0817,
        nombre_fiador: null,
        telefono_fiador: null,
        creditos_activos: 0,
        saldo_total: 0,
        dias_atraso_max: 0,
        estado: 'activo' as const,
        score: null,
        version_vector: { 'device-1': 1 },
        field_versions: {},
        synced: false,
        checksum: 'test-checksum'
      };

      await db.clientes.add(cliente);
      const retrieved = await db.clientes.get('cliente-1');

      expect(retrieved).toEqual(cliente);
    });

    it('should insert and retrieve a pago', async () => {
      const pago = {
        id: 'pago-1',
        tenant_id: 'tenant-1',
        credito_id: 'credito-1',
        cliente_id: 'cliente-1',
        cobrador_id: 'user-1',
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
        checksum: 'test-checksum',
        comprobante_foto_url: null
      };

      await db.pagos.add(pago);
      const retrieved = await db.pagos.get('pago-1');

      expect(retrieved).toEqual(pago);
    });
  });

  describe('Index Queries', () => {
    beforeEach(async () => {
      // Insert test data
      await db.clientes.bulkAdd([
        {
          id: 'cliente-1',
          tenant_id: 'tenant-1',
          created_by: 'user-1',
          nombre: 'Cliente 1',
          created_at: Date.now(),
          updated_at: Date.now(),
          numero_documento: '11111111',
          telefono: '3001111111',
          direccion: 'Calle 1',
          ruta_id: 'ruta-1',
          tipo_documento: 'CC',
          telefono_2: null,
          barrio: null,
          referencia: null,
          latitud: null,
          longitud: null,
          nombre_fiador: null,
          telefono_fiador: null,
          creditos_activos: 1,
          saldo_total: 100000,
          dias_atraso_max: 5,
          estado: 'activo' as const,
          score: null,
          version_vector: {},
          field_versions: {},
          synced: false,
          checksum: ''
        },
        {
          id: 'cliente-2',
          tenant_id: 'tenant-1',
          created_by: 'user-1',
          nombre: 'Cliente 2',
          created_at: Date.now(),
          updated_at: Date.now(),
          numero_documento: '22222222',
          telefono: '3002222222',
          direccion: 'Calle 2',
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
          estado: 'inactivo' as const,
          score: null,
          version_vector: {},
          field_versions: {},
          synced: false,
          checksum: ''
        }
      ]);
    });

    it('should query by tenant_id', async () => {
      const clientes = await db.clientes
        .where('tenant_id')
        .equals('tenant-1')
        .toArray();

      expect(clientes).toHaveLength(2);
    });

    it('should query by compound index [tenant_id+estado]', async () => {
      const clientesActivos = await db.clientes
        .where('[tenant_id+estado]')
        .equals(['tenant-1', 'activo'])
        .toArray();

      expect(clientesActivos).toHaveLength(1);
      expect(clientesActivos[0].nombre).toBe('Cliente 1');
    });

    it('should query by estado', async () => {
      const clientesActivos = await db.clientes
        .where('estado')
        .equals('activo')
        .toArray();

      expect(clientesActivos).toHaveLength(1);
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      // Add some test data
      await db.tenants.add({
        id: 'tenant-1',
        nombre: 'Test',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: ''
      });

      const stats = await db.getStats();

      expect(stats.tenants).toBe(1);
      expect(stats.clientes).toBe(0);
      expect(stats.pagos).toBe(0);
    });
  });

  describe('Clear All', () => {
    it('should clear all data from all tables', async () => {
      // Add data to multiple tables
      await db.tenants.add({
        id: 'tenant-1',
        nombre: 'Test',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: ''
      });

      await db.clientes.add({
        id: 'cliente-1',
        tenant_id: 'tenant-1',
        created_by: 'user-1',
        nombre: 'Test Cliente',
        created_at: Date.now(),
        updated_at: Date.now(),
        numero_documento: '12345678',
        telefono: '3001234567',
        direccion: 'Test',
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
        estado: 'activo' as const,
        score: null,
        version_vector: {},
        field_versions: {},
        synced: false,
        checksum: ''
      });

      // Clear all
      await db.clearAll();

      // Verify all tables are empty
      const stats = await db.getStats();
      expect(stats.tenants).toBe(0);
      expect(stats.clientes).toBe(0);
    });
  });
});
