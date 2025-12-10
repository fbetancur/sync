/**
 * Tests para la Capa de Base de Datos
 *
 * Validates: Requirements 2.1, 2.7
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SyncDB, MicrocreditosDB, createDatabase } from './database';

describe('SyncDB (Universal Database)', () => {
  let db: SyncDB;

  beforeEach(async () => {
    db = new SyncDB('sync');
    await db.initialize();
    await db.clearAll();
  });

  afterEach(async () => {
    await db.clearAll();
    await db.close();
  });

  describe('initialize', () => {
    it('debería inicializar la base de datos exitosamente', async () => {
      const newDb = new SyncDB('sync');
      await expect(newDb.initialize()).resolves.not.toThrow();
      await newDb.close();
    });

    it('debería abrir todas las tablas requeridas', async () => {
      // Tablas universales
      expect(db.tenants).toBeDefined();
      expect(db.users).toBeDefined();
      expect(db.sync_queue).toBeDefined();
      expect(db.audit_log).toBeDefined();
      expect(db.change_log).toBeDefined();
      expect(db.checksums).toBeDefined();
      expect(db.app_state).toBeDefined();
      
      // Tablas de CrediSync con prefijo
      expect(db.credisync_rutas).toBeDefined();
      expect(db.credisync_productos_credito).toBeDefined();
      expect(db.credisync_clientes).toBeDefined();
      expect(db.credisync_creditos).toBeDefined();
      expect(db.credisync_cuotas).toBeDefined();
      expect(db.credisync_pagos).toBeDefined();
    });
  });

  describe('getStats', () => {
    it('debería retornar estadísticas de base de datos vacía', async () => {
      const stats = await db.getStats();

      expect(stats).toEqual({
        // Tablas universales
        tenants: 0,
        users: 0,
        sync_queue: 0,
        audit_log: 0,
        change_log: 0,
        checksums: 0,
        app_state: 0,
        
        // Tablas de CrediSync
        credisync_rutas: 0,
        credisync_productos_credito: 0,
        credisync_clientes: 0,
        credisync_creditos: 0,
        credisync_cuotas: 0,
        credisync_pagos: 0
      });
    });

    it('debería contar registros correctamente', async () => {
      // Agregar algunos registros de prueba
      await db.tenants.add({
        id: 'tenant-1',
        nombre: 'Test Tenant',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum'
      });

      await db.app_state.add({
        key: 'test-key',
        value: 'test-value',
        updated_at: Date.now()
      });

      const stats = await db.getStats();

      expect(stats.tenants).toBe(1);
      expect(stats.app_state).toBe(1);
      expect(stats.users).toBe(0);
    });
  });

  describe('clearAll', () => {
    it('debería limpiar todos los datos', async () => {
      // Agregar algunos datos
      await db.tenants.add({
        id: 'tenant-1',
        nombre: 'Test Tenant',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum'
      });

      await db.app_state.add({
        key: 'test-key',
        value: 'test-value',
        updated_at: Date.now()
      });

      // Verificar que los datos existen
      let stats = await db.getStats();
      expect(stats.tenants).toBe(1);
      expect(stats.app_state).toBe(1);

      // Limpiar todos los datos
      await db.clearAll();

      // Verificar que todos los datos fueron eliminados
      stats = await db.getStats();
      expect(stats.tenants).toBe(0);
      expect(stats.app_state).toBe(0);
    });
  });

  describe('operaciones básicas de tabla', () => {
    it('debería permitir agregar y recuperar un tenant', async () => {
      const tenant = {
        id: 'tenant-1',
        nombre: 'Test Tenant',
        usuarios_contratados: 10,
        usuarios_activos: 5,
        activo: true,
        created_at: Date.now(),
        updated_at: Date.now(),
        version_vector: {},
        synced: false,
        checksum: 'test-checksum'
      };

      await db.tenants.add(tenant);
      const retrieved = await db.tenants.get('tenant-1');

      expect(retrieved).toEqual(tenant);
    });

    it('debería permitir agregar y recuperar estado de aplicación', async () => {
      const state = {
        key: 'current-user',
        value: { id: 'user-1', name: 'Test User' },
        updated_at: Date.now()
      };

      await db.app_state.add(state);
      const retrieved = await db.app_state.get('current-user');

      expect(retrieved).toEqual(state);
    });

    it('debería permitir agregar elementos a la cola de sync', async () => {
      const queueItem = {
        timestamp: Date.now(),
        table_name: 'pagos',
        record_id: 'pago-1',
        operation: 'INSERT' as const,
        data: { monto: 50000 },
        synced: false,
        priority: 1,
        attempts: 0,
        last_attempt: null,
        error: null
      };

      const id = await db.sync_queue.add(queueItem);
      const retrieved = await db.sync_queue.get(id);

      expect(retrieved).toMatchObject(queueItem);
      expect(retrieved?.id).toBeDefined();
    });
  });
});

describe('createDatabase', () => {
  it('debería crear una instancia de base de datos universal por defecto', () => {
    const db = createDatabase();
    expect(db).toBeInstanceOf(SyncDB);
    expect(db.name).toBe('sync');
  });

  it('debería crear una instancia de base de datos con nombre personalizado', () => {
    const db = createDatabase('custom_sync');
    expect(db).toBeInstanceOf(SyncDB);
    expect(db.name).toBe('custom_sync');
  });

  it('debería mantener compatibilidad con MicrocreditosDB', () => {
    const db = createDatabase();
    expect(db).toBeInstanceOf(MicrocreditosDB); // Alias para compatibilidad
  });
});
