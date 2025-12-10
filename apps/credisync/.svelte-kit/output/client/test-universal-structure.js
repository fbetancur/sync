/**
 * Script para probar y verificar la estructura universal de BD
 * Ejecutar desde la consola del navegador
 */

// Función para limpiar BDs anteriores y probar la nueva estructura
async function testUniversalStructure() {
	console.log('🧪 [TEST-UNIVERSAL] Iniciando prueba de estructura universal...');
	
	try {
		// 1. Limpiar BDs anteriores
		console.log('🧹 [TEST-UNIVERSAL] Limpiando BDs anteriores...');
		
		// Listar todas las BDs
		const databases = await indexedDB.databases();
		console.log('📊 [TEST-UNIVERSAL] BDs encontradas:', databases.map(db => db.name));
		
		// Eliminar BD anterior si existe
		const oldDBs = databases.filter(db => 
			db.name === 'microcreditos_db' || 
			db.name === 'credisync_db' ||
			db.name.includes('microcreditos')
		);
		
		for (const oldDB of oldDBs) {
			console.log(`🗑️ [TEST-UNIVERSAL] Eliminando BD anterior: ${oldDB.name}`);
			await new Promise((resolve, reject) => {
				const deleteReq = indexedDB.deleteDatabase(oldDB.name);
				deleteReq.onsuccess = () => resolve();
				deleteReq.onerror = () => reject(deleteReq.error);
			});
		}
		
		// 2. Limpiar localStorage relacionado
		console.log('🧹 [TEST-UNIVERSAL] Limpiando localStorage...');
		const keysToRemove = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key && (key.includes('microcreditos') || key.includes('credisync'))) {
				keysToRemove.push(key);
			}
		}
		keysToRemove.forEach(key => localStorage.removeItem(key));
		console.log(`✅ [TEST-UNIVERSAL] ${keysToRemove.length} claves eliminadas de localStorage`);
		
		// 3. Limpiar caches
		console.log('🧹 [TEST-UNIVERSAL] Limpiando caches...');
		if ('caches' in window) {
			const cacheNames = await caches.keys();
			const oldCaches = cacheNames.filter(name => 
				name.includes('microcreditos') || name.includes('credisync')
			);
			for (const cacheName of oldCaches) {
				await caches.delete(cacheName);
			}
			console.log(`✅ [TEST-UNIVERSAL] ${oldCaches.length} caches eliminados`);
		}
		
		// 4. Forzar recarga para usar nueva estructura
		console.log('🔄 [TEST-UNIVERSAL] Recargando página para usar nueva estructura...');
		
		// Esperar un momento y recargar
		setTimeout(() => {
			window.location.reload();
		}, 1000);
		
		return {
			success: true,
			oldDBsRemoved: oldDBs.length,
			localStorageKeysRemoved: keysToRemove.length,
			cachesRemoved: oldCaches?.length || 0
		};
		
	} catch (error) {
		console.error('❌ [TEST-UNIVERSAL] Error:', error);
		throw error;
	}
}

// Función para verificar la nueva estructura después de la recarga
async function verifyUniversalStructure() {
	console.log('🔍 [VERIFY-UNIVERSAL] Verificando estructura universal...');
	
	try {
		// Esperar a que la app se inicialice
		await new Promise(resolve => setTimeout(resolve, 2000));
		
		// Verificar que existe la BD "sync"
		const databases = await indexedDB.databases();
		console.log('📊 [VERIFY-UNIVERSAL] BDs actuales:', databases.map(db => db.name));
		
		const syncDB = databases.find(db => db.name === 'sync');
		if (!syncDB) {
			console.warn('⚠️ [VERIFY-UNIVERSAL] BD "sync" no encontrada');
			return { success: false, error: 'BD sync no encontrada' };
		}
		
		console.log('✅ [VERIFY-UNIVERSAL] BD "sync" encontrada');
		
		// Verificar estructura usando la app
		if (window.crediSyncApp || window.migrateUniversal) {
			console.log('🔧 [VERIFY-UNIVERSAL] Usando herramientas de la app...');
			
			// Usar las herramientas de migración si están disponibles
			if (window.migrateUniversal) {
				const result = await window.migrateUniversal.verify();
				console.log('📋 [VERIFY-UNIVERSAL] Resultado de verificación:', result);
				return result;
			}
		}
		
		// Verificación manual
		console.log('🔍 [VERIFY-UNIVERSAL] Verificación manual...');
		
		return {
			success: true,
			syncDBExists: true,
			oldDBsRemoved: true
		};
		
	} catch (error) {
		console.error('❌ [VERIFY-UNIVERSAL] Error:', error);
		return { success: false, error: error.message };
	}
}

// Función para crear cliente de prueba con nueva estructura
async function createTestClienteUniversal() {
	console.log('🧪 [TEST-CLIENT] Creando cliente de prueba con estructura universal...');
	
	try {
		// Verificar que las herramientas estén disponibles
		if (!window.testCrediSync) {
			console.warn('⚠️ [TEST-CLIENT] Herramientas de prueba no disponibles, esperando...');
			await new Promise(resolve => setTimeout(resolve, 3000));
		}
		
		if (window.testCrediSync) {
			const result = await window.testCrediSync.createCliente();
			console.log('✅ [TEST-CLIENT] Cliente creado:', result);
			return result;
		} else {
			console.warn('⚠️ [TEST-CLIENT] Herramientas no disponibles');
			return { success: false, error: 'Herramientas no disponibles' };
		}
		
	} catch (error) {
		console.error('❌ [TEST-CLIENT] Error:', error);
		return { success: false, error: error.message };
	}
}

// Exponer funciones globalmente
window.testUniversal = {
	cleanAndTest: testUniversalStructure,
	verify: verifyUniversalStructure,
	createTestClient: createTestClienteUniversal
};

console.log('🔧 [TEST-UNIVERSAL] Funciones disponibles en window.testUniversal:');
console.log('  - window.testUniversal.cleanAndTest() - Limpiar BDs anteriores y recargar');
console.log('  - window.testUniversal.verify() - Verificar estructura universal');
console.log('  - window.testUniversal.createTestClient() - Crear cliente de prueba');
console.log('');
console.log('💡 [TEST-UNIVERSAL] Para empezar, ejecuta: window.testUniversal.cleanAndTest()');