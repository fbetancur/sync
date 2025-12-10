/**
 * Script para verificar la estructura de almacenamiento de CrediSync
 * Verifica IndexedDB, localStorage y cache según la Universal Infrastructure
 */

import { crediSyncApp } from '../app-config.js';

/**
 * Verificar estructura completa de almacenamiento
 */
export async function verifyStorageStructure() {
	console.log('🔍 [STORAGE-VERIFY] Iniciando verificación de estructura de almacenamiento...');
	
	try {
		// Asegurar que la app esté inicializada
		if (!crediSyncApp.isStarted) {
			console.log('🔄 [STORAGE-VERIFY] Inicializando CrediSync...');
			await crediSyncApp.start();
		}
		
		const results = {
			indexedDB: await verifyIndexedDB(),
			localStorage: await verifyLocalStorage(),
			cache: await verifyCache(),
			structure: await verifyDatabaseStructure()
		};
		
		console.log('✅ [STORAGE-VERIFY] Verificación completada:', results);
		return results;
		
	} catch (error) {
		console.error('❌ [STORAGE-VERIFY] Error en verificación:', error);
		throw error;
	}
}

/**
 * Verificar IndexedDB (capa principal)
 */
async function verifyIndexedDB() {
	console.log('🔍 [INDEXEDDB] Verificando IndexedDB...');
	
	try {
		// Verificar que la base de datos existe
		const dbName = crediSyncApp.services.db.name;
		console.log('📊 [INDEXEDDB] Nombre de BD:', dbName);
		
		// Verificar tablas
		const tables = crediSyncApp.services.db.tables;
		console.log('📋 [INDEXEDDB] Tablas disponibles:', tables.map(t => t.name));
		
		// Verificar estructura de clientes
		const clientesCount = await crediSyncApp.services.db.clientes.count();
		console.log('👥 [INDEXEDDB] Total clientes:', clientesCount);
		
		// Obtener algunos clientes para verificar estructura
		const sampleClientes = await crediSyncApp.services.db.clientes.limit(3).toArray();
		console.log('📝 [INDEXEDDB] Muestra de clientes:', sampleClientes.map(c => ({
			id: c.id,
			nombre: c.nombre,
			tenant_id: c.tenant_id,
			created_at: c.created_at,
			synced: c.synced,
			checksum: c.checksum ? 'presente' : 'ausente'
		})));
		
		return {
			available: true,
			dbName,
			tables: tables.map(t => t.name),
			clientesCount,
			sampleStructure: sampleClientes.length > 0 ? Object.keys(sampleClientes[0]) : []
		};
		
	} catch (error) {
		console.error('❌ [INDEXEDDB] Error:', error);
		return {
			available: false,
			error: error.message
		};
	}
}

/**
 * Verificar localStorage (capa de backup)
 */
async function verifyLocalStorage() {
	console.log('🔍 [LOCALSTORAGE] Verificando localStorage...');
	
	try {
		const keys = [];
		const syncKeys = [];
		
		// Buscar claves relacionadas con sync
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			keys.push(key);
			
			if (key && (key.includes('sync') || key.includes('credisync') || key.includes('cliente'))) {
				syncKeys.push(key);
			}
		}
		
		console.log('🗂️ [LOCALSTORAGE] Total claves:', keys.length);
		console.log('🔄 [LOCALSTORAGE] Claves relacionadas con sync:', syncKeys);
		
		// Verificar si hay datos de clientes en localStorage
		const clienteKeys = syncKeys.filter(key => key.includes('cliente'));
		console.log('👥 [LOCALSTORAGE] Claves de clientes:', clienteKeys);
		
		return {
			available: true,
			totalKeys: keys.length,
			syncKeys,
			clienteKeys,
			sampleData: clienteKeys.slice(0, 3).map(key => ({
				key,
				size: localStorage.getItem(key)?.length || 0
			}))
		};
		
	} catch (error) {
		console.error('❌ [LOCALSTORAGE] Error:', error);
		return {
			available: false,
			error: error.message
		};
	}
}

/**
 * Verificar Cache API (capa de respaldo)
 */
async function verifyCache() {
	console.log('🔍 [CACHE] Verificando Cache API...');
	
	try {
		if (!('caches' in window)) {
			return {
				available: false,
				error: 'Cache API no disponible'
			};
		}
		
		const cacheNames = await caches.keys();
		console.log('📦 [CACHE] Caches disponibles:', cacheNames);
		
		// Buscar caches relacionados con sync
		const syncCaches = cacheNames.filter(name => 
			name.includes('sync') || name.includes('credisync') || name.includes('data')
		);
		
		console.log('🔄 [CACHE] Caches de sync:', syncCaches);
		
		// Verificar contenido de los caches de sync
		const cacheContents = {};
		for (const cacheName of syncCaches) {
			try {
				const cache = await caches.open(cacheName);
				const requests = await cache.keys();
				cacheContents[cacheName] = requests.map(req => req.url);
			} catch (err) {
				console.warn('⚠️ [CACHE] Error accediendo cache:', cacheName, err);
			}
		}
		
		console.log('📋 [CACHE] Contenido de caches:', cacheContents);
		
		return {
			available: true,
			cacheNames,
			syncCaches,
			contents: cacheContents
		};
		
	} catch (error) {
		console.error('❌ [CACHE] Error:', error);
		return {
			available: false,
			error: error.message
		};
	}
}

/**
 * Verificar estructura de la base de datos
 */
async function verifyDatabaseStructure() {
	console.log('🔍 [DB-STRUCTURE] Verificando estructura de base de datos...');
	
	try {
		// Verificar esquema de clientes
		const clienteSchema = crediSyncApp.services.db.clientes.schema;
		console.log('📋 [DB-STRUCTURE] Schema de clientes:', clienteSchema);
		
		// Verificar índices
		const indexes = clienteSchema.indexes || [];
		console.log('🔍 [DB-STRUCTURE] Índices de clientes:', indexes);
		
		// Verificar si la estructura sigue el patrón sync/app/tabla
		const dbStructure = {
			name: crediSyncApp.services.db.name,
			version: crediSyncApp.services.db.verno,
			tables: crediSyncApp.services.db.tables.map(table => ({
				name: table.name,
				schema: table.schema,
				indexes: table.schema.indexes || []
			}))
		};
		
		console.log('🏗️ [DB-STRUCTURE] Estructura completa:', dbStructure);
		
		// Verificar patrón de nombres (debería ser sync/credisync/tabla)
		const expectedPattern = /^sync[_-]credisync[_-]/;
		const followsPattern = expectedPattern.test(dbStructure.name);
		
		console.log('📏 [DB-STRUCTURE] Sigue patrón sync/credisync:', followsPattern);
		console.log('📏 [DB-STRUCTURE] Nombre actual:', dbStructure.name);
		console.log('📏 [DB-STRUCTURE] Patrón esperado: sync_credisync_* o sync-credisync-*');
		
		return {
			available: true,
			structure: dbStructure,
			followsPattern,
			expectedPattern: 'sync_credisync_* o sync-credisync-*',
			actualName: dbStructure.name
		};
		
	} catch (error) {
		console.error('❌ [DB-STRUCTURE] Error:', error);
		return {
			available: false,
			error: error.message
		};
	}
}

/**
 * Verificar sincronización entre capas
 */
export async function verifySyncBetweenLayers() {
	console.log('🔄 [SYNC-LAYERS] Verificando sincronización entre capas...');
	
	try {
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Obtener clientes de IndexedDB
		const clientesIndexedDB = await crediSyncApp.services.db.clientes.toArray();
		console.log('📊 [SYNC-LAYERS] Clientes en IndexedDB:', clientesIndexedDB.length);
		
		// Verificar si hay datos en localStorage
		const localStorageKeys = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && key.includes('cliente')) {
				localStorageKeys.push(key);
			}
		}
		
		console.log('💾 [SYNC-LAYERS] Claves de clientes en localStorage:', localStorageKeys.length);
		
		// Verificar consistencia de datos
		const inconsistencies = [];
		
		for (const cliente of clientesIndexedDB) {
			// Verificar si existe en localStorage
			const localStorageKey = `sync_credisync_clientes_${cliente.id}`;
			const localStorageData = localStorage.getItem(localStorageKey);
			
			if (!localStorageData) {
				inconsistencies.push({
					clienteId: cliente.id,
					issue: 'No existe en localStorage',
					indexedDBPresent: true,
					localStoragePresent: false
				});
			} else {
				try {
					const parsedData = JSON.parse(localStorageData);
					if (parsedData.checksum !== cliente.checksum) {
						inconsistencies.push({
							clienteId: cliente.id,
							issue: 'Checksum diferente entre capas',
							indexedDBChecksum: cliente.checksum,
							localStorageChecksum: parsedData.checksum
						});
					}
				} catch (err) {
					inconsistencies.push({
						clienteId: cliente.id,
						issue: 'Error parseando datos de localStorage',
						error: err.message
					});
				}
			}
		}
		
		console.log('⚠️ [SYNC-LAYERS] Inconsistencias encontradas:', inconsistencies.length);
		if (inconsistencies.length > 0) {
			console.log('📋 [SYNC-LAYERS] Detalles de inconsistencias:', inconsistencies);
		}
		
		return {
			indexedDBCount: clientesIndexedDB.length,
			localStorageKeysCount: localStorageKeys.length,
			inconsistencies,
			isConsistent: inconsistencies.length === 0
		};
		
	} catch (error) {
		console.error('❌ [SYNC-LAYERS] Error:', error);
		throw error;
	}
}

/**
 * Función para ejecutar desde la consola del navegador
 */
export async function runCompleteStorageVerification() {
	console.log('🚀 [STORAGE-VERIFY] Ejecutando verificación completa...');
	
	try {
		const results = {
			structure: await verifyStorageStructure(),
			syncLayers: await verifySyncBetweenLayers()
		};
		
		console.log('✅ [STORAGE-VERIFY] Verificación completa terminada');
		console.log('📊 [STORAGE-VERIFY] Resultados:', results);
		
		// Mostrar resumen
		console.log('\n📋 RESUMEN DE VERIFICACIÓN:');
		console.log('- IndexedDB:', results.structure.indexedDB.available ? '✅ Disponible' : '❌ No disponible');
		console.log('- localStorage:', results.structure.localStorage.available ? '✅ Disponible' : '❌ No disponible');
		console.log('- Cache API:', results.structure.cache.available ? '✅ Disponible' : '❌ No disponible');
		console.log('- Estructura BD:', results.structure.structure.available ? '✅ Correcta' : '❌ Incorrecta');
		console.log('- Sincronización capas:', results.syncLayers.isConsistent ? '✅ Consistente' : '❌ Inconsistente');
		
		if (results.structure.indexedDB.available) {
			console.log(`- Total clientes: ${results.structure.indexedDB.clientesCount}`);
		}
		
		if (!results.syncLayers.isConsistent) {
			console.log(`- Inconsistencias: ${results.syncLayers.inconsistencies.length}`);
		}
		
		return results;
		
	} catch (error) {
		console.error('❌ [STORAGE-VERIFY] Error en verificación completa:', error);
		throw error;
	}
}

// Exponer funciones globalmente para debugging
if (typeof window !== 'undefined') {
	window.verifyStorage = {
		runComplete: runCompleteStorageVerification,
		structure: verifyStorageStructure,
		syncLayers: verifySyncBetweenLayers
	};
	
	console.log('🔧 [STORAGE-VERIFY] Funciones de verificación disponibles en window.verifyStorage');
}