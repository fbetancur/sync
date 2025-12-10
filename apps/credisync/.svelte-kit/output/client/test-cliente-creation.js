/**
 * Script de prueba para verificar la creación de clientes y almacenamiento
 * Ejecutar desde la consola del navegador en http://localhost:5173
 */

// Función para probar la creación de un cliente
async function testClienteCreation() {
	console.log('🧪 [TEST] Iniciando prueba de creación de cliente...');
	
	try {
		// Datos de prueba
		const clienteData = {
			nombre: 'Cliente de Prueba',
			tipo_documento: 'CURP',
			numero_documento: 'TEPR850101HDFRNN09',
			telefono: '3223114250',
			telefono_2: '',
			direccion: 'Calle de Prueba #123',
			barrio: 'Centro',
			referencia: 'Casa azul',
			nombre_fiador: '',
			telefono_fiador: '',
			pais: 'MX'
		};
		
		console.log('📝 [TEST] Datos del cliente:', clienteData);
		
		// Importar el servicio
		const { createCliente } = await import('./src/lib/services/clientes.js');
		
		// Crear cliente
		const resultado = await createCliente(clienteData);
		
		console.log('✅ [TEST] Cliente creado exitosamente:', resultado);
		
		// Verificar almacenamiento
		await testStorageVerification();
		
		return resultado;
		
	} catch (error) {
		console.error('❌ [TEST] Error en prueba:', error);
		throw error;
	}
}

// Función para verificar el almacenamiento
async function testStorageVerification() {
	console.log('🔍 [TEST] Verificando almacenamiento...');
	
	try {
		// Verificar si las funciones de verificación están disponibles
		if (window.verifyStorage) {
			const results = await window.verifyStorage.runComplete();
			console.log('📊 [TEST] Resultados de verificación:', results);
			return results;
		} else {
			console.log('⚠️ [TEST] Funciones de verificación no disponibles, verificando manualmente...');
			
			// Verificación manual básica
			const { crediSyncApp } = await import('./src/lib/app-config.js');
			
			if (!crediSyncApp.isStarted) {
				await crediSyncApp.start();
			}
			
			// Contar clientes en IndexedDB
			const clientesCount = await crediSyncApp.services.db.clientes.count();
			console.log('👥 [TEST] Clientes en IndexedDB:', clientesCount);
			
			// Verificar localStorage
			let localStorageKeys = 0;
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key && key.includes('cliente')) {
					localStorageKeys++;
				}
			}
			console.log('💾 [TEST] Claves de clientes en localStorage:', localStorageKeys);
			
			return {
				indexedDB: clientesCount,
				localStorage: localStorageKeys
			};
		}
		
	} catch (error) {
		console.error('❌ [TEST] Error verificando almacenamiento:', error);
		throw error;
	}
}

// Función para limpiar datos de prueba
async function cleanTestData() {
	console.log('🧹 [TEST] Limpiando datos de prueba...');
	
	try {
		const { limpiarDatos } = await import('./src/lib/services/clientes.js');
		await limpiarDatos();
		console.log('✅ [TEST] Datos limpiados');
	} catch (error) {
		console.error('❌ [TEST] Error limpiando datos:', error);
		throw error;
	}
}

// Función para obtener estadísticas
async function getStats() {
	console.log('📊 [TEST] Obteniendo estadísticas...');
	
	try {
		const { getClientesStats } = await import('./src/lib/services/clientes.js');
		const stats = await getClientesStats();
		console.log('📈 [TEST] Estadísticas:', stats);
		return stats;
	} catch (error) {
		console.error('❌ [TEST] Error obteniendo estadísticas:', error);
		throw error;
	}
}

// Exponer funciones globalmente
window.testCrediSync = {
	createCliente: testClienteCreation,
	verifyStorage: testStorageVerification,
	cleanData: cleanTestData,
	getStats: getStats
};

console.log('🔧 [TEST] Funciones de prueba disponibles en window.testCrediSync');
console.log('📋 [TEST] Funciones disponibles:');
console.log('  - window.testCrediSync.createCliente() - Crear cliente de prueba');
console.log('  - window.testCrediSync.verifyStorage() - Verificar almacenamiento');
console.log('  - window.testCrediSync.cleanData() - Limpiar datos');
console.log('  - window.testCrediSync.getStats() - Obtener estadísticas');