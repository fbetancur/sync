/**
 * Verificación del Service Worker registrado por VitePWA
 * Solo verifica, no registra manualmente para evitar conflictos
 */

let swRegistration = null;

export async function registerServiceWorker() {
	if ('serviceWorker' in navigator) {
		try {
			if (import.meta.env.DEV) {
				// En desarrollo, usar service worker manual
				console.log('🔄 Registrando Service Worker manual para desarrollo...');
				
				swRegistration = await navigator.serviceWorker.register('/sw-dev.js', {
					scope: '/'
				});
				
				console.log('✅ Service Worker de desarrollo registrado:', swRegistration.scope);
				
				// Esperar a que esté activo
				if (swRegistration.installing) {
					await new Promise(resolve => {
						swRegistration.installing.addEventListener('statechange', () => {
							if (swRegistration.installing.state === 'activated') {
								resolve();
							}
						});
					});
				}
				
				console.log('📄 Script URL:', swRegistration.active?.scriptURL);
				console.log('✅ App lista para funcionar offline');
				
			} else {
				// En producción, verificar VitePWA
				console.log('🔄 Verificando Service Worker registrado por VitePWA...');
				
				let attempts = 0;
				const maxAttempts = 10;
				
				while (attempts < maxAttempts) {
					swRegistration = await navigator.serviceWorker.getRegistration();
					
					if (swRegistration && swRegistration.active) {
						console.log('✅ Service Worker registrado por VitePWA:', swRegistration.scope);
						console.log('📄 Script URL:', swRegistration.active.scriptURL);
						console.log('✅ App lista para funcionar offline');
						break;
					}
					
					await new Promise(resolve => setTimeout(resolve, 500));
					attempts++;
				}
				
				if (!swRegistration) {
					console.warn('⚠️ Service Worker no registrado por VitePWA');
					return null;
				}
			}
			
			// Escuchar actualizaciones
			swRegistration.addEventListener('updatefound', () => {
				console.log('🔄 Nueva versión del Service Worker disponible');
				const newWorker = swRegistration.installing;
				
				newWorker?.addEventListener('statechange', () => {
					if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
						console.log('✅ Nueva versión instalada, recarga para activar');
					}
				});
			});
			
			return swRegistration;
			
		} catch (error) {
			console.error('❌ Error registrando Service Worker:', error);
			return null;
		}
	} else {
		console.warn('⚠️ Service Worker no soportado en este navegador');
		return null;
	}
}

export async function checkServiceWorkerStatus() {
	if (!swRegistration) {
		swRegistration = await navigator.serviceWorker.getRegistration();
	}
	
	if (swRegistration) {
		return {
			registered: true,
			active: !!swRegistration.active,
			waiting: !!swRegistration.waiting,
			installing: !!swRegistration.installing,
			scope: swRegistration.scope,
			scriptURL: swRegistration.active?.scriptURL
		};
	}
	
	return {
		registered: false,
		active: false,
		waiting: false,
		installing: false,
		scope: null,
		scriptURL: null
	};
}

export async function updateServiceWorker() {
	if (swRegistration) {
		try {
			await swRegistration.update();
			console.log('🔄 Service Worker actualizado');
		} catch (error) {
			console.error('❌ Error actualizando Service Worker:', error);
		}
	}
}

// Integración con @sync/core para background sync
export async function setupBackgroundSync() {
	if (swRegistration && 'sync' in window.ServiceWorkerRegistration.prototype) {
		try {
			// Registrar background sync para @sync/core
			await swRegistration.sync.register('sync-data');
			console.log('✅ Background sync registrado para @sync/core');
		} catch (error) {
			console.warn('⚠️ Background sync no disponible:', error);
		}
	}
}

// Auto-registrar al importar
if (typeof window !== 'undefined') {
	registerServiceWorker().then(registration => {
		if (registration) {
			setupBackgroundSync();
		}
	});
}