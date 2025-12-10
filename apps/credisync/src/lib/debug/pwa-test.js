/**
 * Herramientas de debug para PWA y Service Worker
 */

// Función para verificar el estado del PWA
window.testPWA = {
	
	// Verificar si el Service Worker está registrado
	async checkServiceWorker() {
		console.log('🔧 === TESTING SERVICE WORKER ===');
		
		if ('serviceWorker' in navigator) {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				
				console.log('📊 Service Worker Status:', {
					registered: !!registration,
					active: !!registration?.active,
					waiting: !!registration?.waiting,
					installing: !!registration?.installing,
					scope: registration?.scope,
					updateViaCache: registration?.updateViaCache
				});
				
				if (registration?.active) {
					console.log('✅ Service Worker activo:', registration.active.scriptURL);
				}
				
				return registration;
			} catch (error) {
				console.error('❌ Error verificando Service Worker:', error);
				return null;
			}
		} else {
			console.warn('⚠️ Service Worker no soportado en este navegador');
			return null;
		}
	},
	
	// Verificar si la app es instalable como PWA
	async checkInstallability() {
		console.log('📱 === TESTING PWA INSTALLABILITY ===');
		
		// Verificar manifest
		const manifestLink = document.querySelector('link[rel="manifest"]');
		console.log('📄 Manifest link:', manifestLink?.href);
		
		if (manifestLink) {
			try {
				const response = await fetch(manifestLink.href);
				const manifest = await response.json();
				console.log('📋 Manifest content:', manifest);
			} catch (error) {
				console.error('❌ Error cargando manifest:', error);
			}
		}
		
		// Verificar criterios de instalación
		const criteria = {
			https: location.protocol === 'https:' || location.hostname === 'localhost',
			manifest: !!manifestLink,
			serviceWorker: 'serviceWorker' in navigator,
			icons: true // Asumimos que están presentes si hay manifest
		};
		
		console.log('✅ Criterios de instalación PWA:', criteria);
		
		const installable = Object.values(criteria).every(Boolean);
		console.log(installable ? '🎉 PWA es instalable' : '❌ PWA NO es instalable');
		
		return { criteria, installable };
	},
	
	// Verificar cache del Service Worker
	async checkCaches() {
		console.log('💾 === TESTING SERVICE WORKER CACHES ===');
		
		if ('caches' in window) {
			try {
				const cacheNames = await caches.keys();
				console.log('📦 Caches disponibles:', cacheNames);
				
				for (const cacheName of cacheNames) {
					const cache = await caches.open(cacheName);
					const keys = await cache.keys();
					console.log(`📁 Cache "${cacheName}":`, keys.length, 'entradas');
					
					// Mostrar algunas URLs de ejemplo
					const sampleUrls = keys.slice(0, 5).map(req => req.url);
					if (sampleUrls.length > 0) {
						console.log('  📄 Ejemplos:', sampleUrls);
					}
				}
				
				return cacheNames;
			} catch (error) {
				console.error('❌ Error verificando caches:', error);
				return [];
			}
		} else {
			console.warn('⚠️ Cache API no soportada');
			return [];
		}
	},
	
	// Verificar funcionalidad offline
	async testOfflineCapability() {
		console.log('🌐 === TESTING OFFLINE CAPABILITY ===');
		
		const registration = await this.checkServiceWorker();
		if (!registration?.active) {
			console.warn('⚠️ No hay Service Worker activo para funcionalidad offline');
			return false;
		}
		
		// Verificar caches disponibles
		try {
			const cacheNames = await caches.keys();
			console.log('📦 Caches disponibles para offline:', cacheNames);
			
			// Buscar cache de Workbox
			const workboxCache = cacheNames.find(name => name.includes('workbox-precache'));
			if (workboxCache) {
				const cache = await caches.open(workboxCache);
				const cachedRequests = await cache.keys();
				console.log(`💾 Cache ${workboxCache}:`, cachedRequests.length, 'recursos');
				
				// Verificar si la página principal está cacheada
				const rootCached = cachedRequests.some(req => 
					req.url.endsWith('/') || req.url.includes('index.html')
				);
				console.log('🏠 Página principal cacheada:', rootCached);
				
				return cachedRequests.length > 0;
			} else {
				console.warn('⚠️ No se encontró cache de Workbox');
				return false;
			}
		} catch (error) {
			console.error('❌ Error testando capacidad offline:', error);
			return false;
		}
	},
	
	// Forzar actualización del Service Worker
	async forceUpdate() {
		console.log('🔄 === FORCING SERVICE WORKER UPDATE ===');
		
		if ('serviceWorker' in navigator) {
			try {
				const registration = await navigator.serviceWorker.getRegistration();
				if (registration) {
					await registration.update();
					console.log('✅ Service Worker actualizado');
					
					// Recargar página si hay una nueva versión esperando
					if (registration.waiting) {
						registration.waiting.postMessage({ type: 'SKIP_WAITING' });
						window.location.reload();
					}
				}
			} catch (error) {
				console.error('❌ Error actualizando Service Worker:', error);
			}
		}
	},
	
	// Test completo del PWA
	async runCompleteTest() {
		console.log('🚀 === COMPLETE PWA TEST ===');
		
		const results = {
			serviceWorker: await this.checkServiceWorker(),
			installability: await this.checkInstallability(),
			caches: await this.checkCaches(),
			offline: await this.testOfflineCapability()
		};
		
		console.log('📊 === RESUMEN COMPLETO ===');
		console.log('Service Worker:', results.serviceWorker ? '✅ OK' : '❌ FAIL');
		console.log('Instalabilidad:', results.installability.installable ? '✅ OK' : '❌ FAIL');
		console.log('Caches:', results.caches.length > 0 ? `✅ ${results.caches.length} caches` : '❌ Sin caches');
		console.log('Offline:', results.offline ? '✅ OK' : '❌ FAIL');
		
		return results;
	}
};

// Auto-ejecutar test básico al cargar
if (typeof window !== 'undefined') {
	console.log('🔧 PWA Debug Tools cargadas. Usa window.testPWA.runCompleteTest() para test completo');
	
	// Auto-verificar Service Worker después de un delay
	setTimeout(async () => {
		const swStatus = await window.testPWA.checkServiceWorker();
		if (swStatus) {
			console.log('✅ Service Worker verificado automáticamente');
		} else {
			console.warn('⚠️ Service Worker no detectado - usa window.testPWA.runCompleteTest() para diagnóstico');
		}
	}, 2000);
}