/**
 * Servicio de productos adaptado para @sync/core
 * Basado en tools/examples/src/lib/sync/productos.js
 */

import { crediSyncApp } from '$lib/app-config.js';

/**
 * Obtener todos los productos usando @sync/core
 */
export async function getProductos() {
	try {
		console.log('📦 [PRODUCTOS] Obteniendo productos...');
		
		// TODO: Usar @sync/core cuando esté completamente integrado
		// const productos = await crediSyncApp.services.productos.getAll();
		
		// Por ahora, retornar lista vacía hasta implementar productos reales
		const productos = [];
		
		console.log(`✅ [PRODUCTOS] ${productos.length} productos obtenidos`);
		return productos;
		
	} catch (error) {
		console.error('❌ [PRODUCTOS] Error obteniendo productos:', error);
		return []; // Fallback a lista vacía
	}
}

/**
 * Obtener productos activos
 */
export async function getProductosActivos() {
	try {
		const productos = await getProductos();
		return productos.filter(p => p.activo === true);
	} catch (error) {
		console.error('❌ [PRODUCTOS] Error obteniendo productos activos:', error);
		return [];
	}
}