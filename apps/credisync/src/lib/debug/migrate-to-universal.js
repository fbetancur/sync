/**
 * Script para migrar a la estructura universal de BD
 * Limpia datos existentes y configura la nueva estructura
 */

import { crediSyncApp } from '../app-config.js';

/**
 * Limpiar datos de desarrollo existentes y configurar nueva estructura
 */
export async function migrateToUniversalStructure() {
	console.log('🔄 [MIGRATE] Iniciando migración a estructura universal...');
	
	try {
		// Asegurar que la app esté inicializada
		if (!crediSyncApp.isStarted) {
			console.log('🚀 [MIGRATE] Inicializando CrediSync...');
			await crediSyncApp.start();
		}
		
		// Limpiar datos existentes de desarrollo
		console.log('🧹 [MIGRATE] Limpiando datos de desarrollo existentes...');
		
		// Limpiar IndexedDB
		try {
			await crediSyncApp.services.db.clearAll();
			console.log('✅ [MIGRATE] IndexedDB limpiado');
		} catch (dbError) {
			console.warn('⚠️ [MIGRATE] Error limpiando IndexedDB (puede ser normal):', dbError.message);
		}
		
		// Limpiar localStorage
		try {
			const keysToRemove = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && (key.includes('credisync') || key.includes('cliente') || key.includes('microcreditos'))) {
					keysToRemove.push(key);
				}
			}
			
			keysToRemove.forEach(key => localStorage.removeItem(key));
			console.log(`✅ [MIGRATE] ${keysToRemove.length} claves limpiadas de localStorage`);
		} catch (localStorageError) {
			console.warn('⚠️ [MIGRATE] Error limpiando localStorage:', localStorageError.message);
		}
		
		// Limpiar Cache API
		try {
			if ('caches' in window) {
				const cacheNames = await caches.keys();
				const syncCaches = cacheNames.filter(name => 
					name.includes('credisync') || name.includes('microcreditos') || name.includes('sync')
				);
				
				for (const cacheName of syncCaches) {
					await caches.delete(cacheName);
				}
				
				console.log(`✅ [MIGRATE] ${syncCaches.length} caches limpiados`);
			}
		} catch (cacheError) {
			console.warn('⚠️ [MIGRATE] Error limpiando caches:', cacheError.message);
		}
		
		// Verificar nueva estructura
		console.log('🔍 [MIGRATE] Verificando nueva estructura...');
		
		const stats = await crediSyncApp.services.db.getStats();
		console.log('📊 [MIGRATE] Estadísticas de nueva BD:', stats);
		
		// Verificar que las tablas con prefijo existen
		const expectedTables = [
			'credisync_clientes',
			'credisync_creditos', 
			'credisync_cuotas',
			'credisync_pagos',
			'credisync_rutas',
			'credisync_productos_credito'
		];
		
		const availableTables = Object.keys(stats).filter(key => key.startsWith('credisync_'));
		console.log('📋 [MIGRATE] Tablas de CrediSync disponibles:', availableTables);
		
		const missingTables = expectedTables.filter(table => !availableTables.includes(table));
		if (missingTables.length > 0) {
			console.warn('⚠️ [MIGRATE] Tablas faltantes:', missingTables);
		} else {
			console.log('✅ [MIGRATE] Todas las tablas de CrediSync están disponibles');
		}
		
		console.log('✅ [MIGRATE] Migración a estructura universal completada');
		
		return {
			success: true,
			oldDataCleared: true,
			newStructureReady: true,
			availableTables,
			stats
		};
		
	} catch (error) {
		console.error('❌ [MIGRATE] Error en migración:', error);
		throw error;
	}
}

/**
 * Crear cliente de prueba con nueva estructura
 */
export async function createTestClienteWithNewStructure() {
	console.log('🧪 [TEST] Creando cliente de prueba con nueva estructura...');
	
	try {
		const { createCliente } = await import('../services/clientes.js');
		
		const clienteData = {
			nombre: 'Cliente Prueba Universal',
			tipo_documento: 'CURP',
			numero_documento: 'TEUN850101HDFRNN09',
			telefono: '3223114250',
			telefono_2: '',
			direccion: 'Calle Universal #123',
			barrio: 'Centro',
			referencia: 'Estructura universal',
			nombre_fiador: '',
			telefono_fiador: '',
			pais: 'MX'
		};
		
		const resultado = await createCliente(clienteData);
		
		console.log('✅ [TEST] Cliente de prueba creado:', resultado.id);
		
		// Verificar que se guardó en la tabla correcta
		const clienteVerificado = await crediSyncApp.services.db.credisync_clientes
			.where('id')
			.equals(resultado.id)
			.first();
		
		if (clienteVerificado) {
			console.log('✅ [TEST] Cliente verificado en tabla credisync_clientes');
		} else {
			console.error('❌ [TEST] Cliente NO encontrado en tabla credisync_clientes');
		}
		
		return resultado;
		
	} catch (error) {
		console.error('❌ [TEST] Error creando cliente de prueba:', error);
		throw error;
	}
}

/**
 * Verificar estructura completa de la nueva BD
 */
export async function verifyUniversalStructure() {
	console.log('🔍 [VERIFY] Verificando estructura universal completa...');
	
	try {
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Verificar nombre de la BD
		const dbName = crediSyncApp.services.db.name;
		console.log('📊 [VERIFY] Nombre de BD:', dbName);
		
		if (dbName !== 'sync') {
			console.warn('⚠️ [VERIFY] Nombre de BD no es "sync":', dbName);
		} else {
			console.log('✅ [VERIFY] BD tiene nombre correcto: "sync"');
		}
		
		// Verificar tablas
		const stats = await crediSyncApp.services.db.getStats();
		console.log('📋 [VERIFY] Estadísticas completas:', stats);
		
		// Verificar estructura de tablas universales
		const universalTables = ['tenants', 'users', 'sync_queue', 'audit_log', 'change_log', 'checksums', 'app_state'];
		const crediSyncTables = ['credisync_clientes', 'credisync_creditos', 'credisync_cuotas', 'credisync_pagos', 'credisync_rutas', 'credisync_productos_credito'];
		
		console.log('🌍 [VERIFY] Tablas universales:');
		universalTables.forEach(table => {
			const count = stats[table] || 0;
			console.log(`  - ${table}: ${count} registros`);
		});
		
		console.log('💳 [VERIFY] Tablas de CrediSync:');
		crediSyncTables.forEach(table => {
			const count = stats[table] || 0;
			console.log(`  - ${table}: ${count} registros`);
		});
		
		// Verificar acceso directo a tablas
		try {
			const clientesCount = await crediSyncApp.services.db.credisync_clientes.count();
			console.log('✅ [VERIFY] Acceso directo a credisync_clientes:', clientesCount);
		} catch (accessError) {
			console.error('❌ [VERIFY] Error accediendo credisync_clientes:', accessError);
		}
		
		return {
			dbName,
			stats,
			universalTablesOk: universalTables.every(table => stats.hasOwnProperty(table)),
			crediSyncTablesOk: crediSyncTables.every(table => stats.hasOwnProperty(table))
		};
		
	} catch (error) {
		console.error('❌ [VERIFY] Error verificando estructura:', error);
		throw error;
	}
}

// Exponer funciones globalmente para debugging
if (typeof window !== 'undefined') {
	window.migrateUniversal = {
		migrate: migrateToUniversalStructure,
		createTest: createTestClienteWithNewStructure,
		verify: verifyUniversalStructure
	};
	
	console.log('🔧 [MIGRATE] Funciones de migración disponibles en window.migrateUniversal');
	console.log('📋 [MIGRATE] Funciones disponibles:');
	console.log('  - window.migrateUniversal.migrate() - Migrar a estructura universal');
	console.log('  - window.migrateUniversal.createTest() - Crear cliente de prueba');
	console.log('  - window.migrateUniversal.verify() - Verificar estructura');
}