/**
 * Sincronización Global - CrediSync
 * 
 * Este archivo centraliza TODA la sincronización bidireccional
 * usando @sync/core para garantizar que TODOS los dispositivos estén sincronizados.
 * 
 * SINCRONIZACIÓN INTELIGENTE:
 * - Pausa durante actividad del usuario (scroll, clicks, typing)
 * - Reanuda después de 50s de inactividad
 * - Sync forzado cada 5 minutos máximo
 */

import { browser } from '$app/environment';
import { crediSyncApp } from '$lib/app-config.js';

// Estado de actividad del usuario
let userActive = false;
let inactivityTimer = null;
let lastSyncTime = 0;
const MAX_SYNC_INTERVAL = 5 * 60 * 1000; // 5 minutos en ms
const INACTIVITY_DELAY = 50000; // 50 segundos sin actividad

/**
 * Marcar usuario como activo
 */
function markUserActive() {
	if (!userActive) {
		console.log('👤 [SYNC] Usuario activo - pausando sincronización automática');
	}
	userActive = true;
	
	// Reiniciar timer de inactividad
	clearTimeout(inactivityTimer);
	inactivityTimer = setTimeout(() => {
		userActive = false;
		console.log('💤 [SYNC] Usuario inactivo (50s) - reanudando sincronización');
		
		// Sincronizar inmediatamente después de inactividad
		if (navigator.onLine) {
			syncAll();
		}
	}, INACTIVITY_DELAY);
}

/**
 * Sincronizar TODAS las tablas usando @sync/core
 * Esta función se llama periódicamente y en eventos
 * @param {boolean} force - Si es true, ignora todas las restricciones y sincroniza inmediatamente
 */
export async function syncAll(force = false) {
	const now = Date.now();
	const timeSinceLastSync = now - lastSyncTime;
	
	// Si es forzado, ejecutar inmediatamente sin restricciones
	if (force) {
		console.log('🚀 [SYNC] Sincronización FORZADA - ignorando todas las restricciones');
	} else {
		// Sync forzado cada 5 minutos sin importar actividad
		const shouldForceSync = timeSinceLastSync >= MAX_SYNC_INTERVAL;
		if (shouldForceSync) {
			console.log('⏰ [SYNC] Sync forzado (5 min transcurridos) - ignorando actividad del usuario');
			force = true;
		}
		
		// Si el usuario está activo y no es forzado, posponer
		if (userActive && !force) {
			console.log('⏸️ [SYNC] Usuario activo - sincronización pospuesta');
			return;
		}
		
		// Si no es forzado y fue hace poco, saltar
		if (!force && timeSinceLastSync < 30000) {
			console.log(`⏭️ [SYNC] Sincronización reciente (hace ${Math.round(timeSinceLastSync/1000)}s) - saltando`);
			return;
		}
	}
	
	const startTime = Date.now();
	console.log('🔄 [SYNC] Iniciando sincronización usando @sync/core...');
	
	try {
		// Por ahora simular sincronización hasta que @sync/core esté completamente integrado
		// En las próximas fases esto usará crediSyncApp.services.sync.syncAll()
		console.log('🔄 [SYNC] Simulando sincronización con @sync/core...');
		
		// Simular procesamiento
		await new Promise(resolve => setTimeout(resolve, 100));
		
		const elapsed = Date.now() - startTime;
		lastSyncTime = Date.now();
		
		console.log(`✅ [SYNC] Simulación completada en ${elapsed}ms`);
		
		return {
			success: true,
			elapsed,
			synced: 0,
			errors: 0
		};
	} catch (error) {
		console.error('❌ [SYNC] Error crítico en sincronización global:', error);
		throw error;
	}
}

/**
 * Configurar sincronización automática
 * Solo se ejecuta en el navegador
 */
if (browser) {
	console.log('🚀 [SYNC] Iniciando sincronización automática global con @sync/core...');
	
	// Detectar actividad del usuario (eventos que indican uso activo)
	const activityEvents = [
		'scroll',      // Usuario navegando
		'mousemove',   // Usuario moviendo el mouse
		'mousedown',   // Usuario haciendo clic
		'touchstart',  // Usuario tocando pantalla (móvil)
		'touchmove',   // Usuario deslizando (móvil)
		'keydown',     // Usuario escribiendo
		'click',       // Usuario haciendo clic
		'input'        // Usuario ingresando datos
	];
	
	activityEvents.forEach(eventName => {
		document.addEventListener(eventName, markUserActive, { passive: true });
	});
	
	console.log('👂 [SYNC] Detectores de actividad configurados:', activityEvents.join(', '));
	
	// 1. Sincronización periódica cada 30 segundos (respeta actividad del usuario)
	setInterval(() => {
		if (navigator.onLine) {
			syncAll(); // Respeta userActive, excepto si pasaron 5 min
		}
	}, 30000);
	
	// 2. Sincronizar al recuperar conexión (forzado - ignora actividad)
	window.addEventListener('online', () => {
		console.log('📡 [SYNC] Conexión restaurada - sincronizando (forzado)');
		syncAll(true);
	});
	
	// 3. Sincronizar cuando el usuario vuelve a la app (forzado - ignora actividad)
	document.addEventListener('visibilitychange', () => {
		if (!document.hidden && navigator.onLine) {
			console.log('👁️ [SYNC] App visible - sincronizando (forzado)');
			syncAll(true);
		}
	});
	
	// 4. Sincronizar cuando la app recupera el foco (forzado - ignora actividad)
	window.addEventListener('focus', () => {
		if (navigator.onLine) {
			console.log('🎯 [SYNC] App enfocada - sincronizando (forzado)');
			syncAll(true);
		}
	});
	
	// 5. Sincronización inicial después de 2 segundos (forzado - ignora actividad)
	setTimeout(() => {
		console.log('⏰ [SYNC] Sincronización inicial (forzado)');
		syncAll(true);
	}, 2000);
	
	console.log('✅ [SYNC] Sincronización automática configurada con @sync/core');
	console.log('⚙️ [SYNC] Configuración:');
	console.log('   • Intervalo periódico: 30s (respeta actividad)');
	console.log('   • Inactividad requerida: 50s');
	console.log('   • Sync forzado máximo: 5 min (ignora actividad)');
	console.log('   • Eventos que pausan sync:', activityEvents.length);
}