/**
 * Servicio de créditos adaptado para @sync/core
 * Basado en tools/examples/src/lib/sync/creditos.js
 */

import { crediSyncApp } from '$lib/app-config.js';
import { calcularCuotasProgramadas } from '$lib/utils/creditos.js';

/**
 * Crear crédito usando @sync/core
 */
export async function createCredito(creditoData) {
	try {
		console.log('💳 [CREDITO] Creando crédito...');
		console.log('💳 [CREDITO] Datos:', creditoData);
		
		// TODO: Usar @sync/core cuando esté completamente integrado
		// const credito = await crediSyncApp.services.creditos.create(creditoData);
		
		// Por ahora, simular creación exitosa
		const credito = {
			id: crypto.randomUUID(),
			...creditoData,
			created_at: new Date().toISOString(),
			updated_at: new Date().toISOString(),
			saldo_pendiente: creditoData.total_a_pagar,
			cuotas_pagadas: 0,
			dias_atraso: 0
		};
		
		console.log('✅ [CREDITO] Crédito creado (simulado):', credito.id);
		
		// Simular delay de red
		await new Promise(resolve => setTimeout(resolve, 1000));
		
		return credito;
		
	} catch (error) {
		console.error('❌ [CREDITO] Error creando crédito:', error);
		throw error;
	}
}

/**
 * Obtener créditos de un cliente
 */
export async function getCreditosCliente(clienteId) {
	try {
		// TODO: Usar @sync/core cuando esté completamente integrado
		// return await crediSyncApp.services.creditos.getByCliente(clienteId);
		
		// Por ahora, retornar array vacío
		return [];
	} catch (error) {
		console.error('❌ [CREDITO] Error obteniendo créditos:', error);
		return [];
	}
}

/**
 * Obtener todos los créditos activos
 */
export async function getCreditosActivos() {
	try {
		// TODO: Usar @sync/core cuando esté completamente integrado
		// return await crediSyncApp.services.creditos.getActivos();
		
		// Por ahora, retornar array vacío
		return [];
	} catch (error) {
		console.error('❌ [CREDITO] Error obteniendo créditos activos:', error);
		return [];
	}
}