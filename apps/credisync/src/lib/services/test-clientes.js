/**
 * Test básico para verificar que el servicio de clientes funciona con @sync/core
 */

import { createCliente, getClientes, getClienteById, limpiarDatos } from './clientes.js';

/**
 * Test básico del servicio de clientes
 */
export async function testClientesService() {
	console.log('🧪 [TEST] Iniciando test del servicio de clientes...');
	
	try {
		// 1. Limpiar datos existentes
		console.log('🧹 [TEST] Limpiando datos existentes...');
		await limpiarDatos();
		
		// 2. Verificar que no hay clientes
		const clientesIniciales = await getClientes();
		console.log(`📊 [TEST] Clientes iniciales: ${clientesIniciales.length}`);
		
		// 3. Crear un cliente de prueba
		console.log('👤 [TEST] Creando cliente de prueba...');
		const clienteData = {
			nombre: 'Juan Pérez Test',
			numero_documento: '12345678',
			telefono: '3001234567',
			direccion: 'Calle 123 #45-67',
			tipo_documento: 'CC',
			barrio: 'Centro'
		};
		
		const clienteCreado = await createCliente(clienteData);
		console.log('✅ [TEST] Cliente creado:', {
			id: clienteCreado.id,
			nombre: clienteCreado.nombre,
			metadata: clienteCreado._metadata
		});
		
		// 4. Verificar que el cliente se guardó
		const clientesPorId = await getClienteById(clienteCreado.id);
		console.log('✅ [TEST] Cliente obtenido por ID:', clientesPorId ? 'Encontrado' : 'No encontrado');
		
		// 5. Obtener todos los clientes
		const todosLosClientes = await getClientes();
		console.log(`📊 [TEST] Total de clientes después de crear: ${todosLosClientes.length}`);
		
		// 6. Verificar integridad
		if (todosLosClientes.length === 1 && todosLosClientes[0].id === clienteCreado.id) {
			console.log('✅ [TEST] Test completado exitosamente');
			return {
				success: true,
				message: 'Servicio de clientes funcionando correctamente con @sync/core',
				clienteCreado: clienteCreado.id,
				totalClientes: todosLosClientes.length
			};
		} else {
			throw new Error('Los datos no coinciden después de la creación');
		}
		
	} catch (error) {
		console.error('❌ [TEST] Error en test:', error);
		return {
			success: false,
			message: `Error en test: ${error.message}`,
			error: error.message
		};
	}
}

/**
 * Test de validación con datos inválidos
 */
export async function testValidacion() {
	console.log('🧪 [TEST] Iniciando test de validación...');
	
	try {
		// Intentar crear cliente con datos inválidos
		const datosInvalidos = {
			nombre: 'A', // Muy corto
			numero_documento: '123', // Muy corto
			telefono: '123', // Muy corto
			direccion: 'Corta' // Muy corta
		};
		
		await createCliente(datosInvalidos);
		
		// Si llegamos aquí, la validación falló
		return {
			success: false,
			message: 'La validación no funcionó - debería haber rechazado datos inválidos'
		};
		
	} catch (error) {
		// Si hay error, la validación funcionó correctamente
		console.log('✅ [TEST] Validación funcionando - rechazó datos inválidos:', error.message);
		return {
			success: true,
			message: 'Validación funcionando correctamente',
			errorMessage: error.message
		};
	}
}

/**
 * Ejecutar todos los tests
 */
export async function runAllTests() {
	console.log('🚀 [TEST] Ejecutando todos los tests del servicio de clientes...');
	
	const results = {
		timestamp: new Date().toISOString(),
		tests: []
	};
	
	// Test 1: Funcionalidad básica
	const testBasico = await testClientesService();
	results.tests.push({
		name: 'Funcionalidad Básica',
		...testBasico
	});
	
	// Test 2: Validación
	const testValidacionResult = await testValidacion();
	results.tests.push({
		name: 'Validación de Datos',
		...testValidacionResult
	});
	
	// Resumen
	const passed = results.tests.filter(t => t.success).length;
	const total = results.tests.length;
	
	results.summary = {
		passed,
		total,
		success: passed === total,
		message: `${passed}/${total} tests pasaron`
	};
	
	console.log('📊 [TEST] Resumen de tests:', results.summary);
	
	return results;
}