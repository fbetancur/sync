/**
 * Utilidades para captura de ubicación GPS
 * Parte de la Universal Infrastructure - Captura de contexto completo
 */

// ============================================================================
// CAPTURA DE UBICACIÓN GPS
// ============================================================================

/**
 * Capturar ubicación GPS del dispositivo
 * Implementa timeouts y fallbacks para uso en campo
 */
export async function captureLocation(options = {}) {
	const defaultOptions = {
		enableHighAccuracy: true,
		timeout: 10000, // 10 segundos
		maximumAge: 60000, // 1 minuto de cache
		...options
	};

	try {
		console.log('📍 [LOCATION] Iniciando captura de GPS...');

		// Verificar si geolocation está disponible
		if (!navigator.geolocation) {
			console.warn('⚠️ [LOCATION] Geolocation no disponible en este navegador');
			return {
				location: null,
				error: 'Geolocation no disponible',
				timestamp: Date.now()
			};
		}

		// Verificar permisos
		if (navigator.permissions) {
			try {
				const permission = await navigator.permissions.query({ name: 'geolocation' });
				console.log('📍 [LOCATION] Estado de permisos:', permission.state);
				
				if (permission.state === 'denied') {
					return {
						location: null,
						error: 'Permisos de ubicación denegados',
						timestamp: Date.now()
					};
				}
			} catch (permissionError) {
				console.warn('⚠️ [LOCATION] No se pudo verificar permisos:', permissionError);
			}
		}

		// Capturar ubicación con Promise
		const position = await new Promise((resolve, reject) => {
			const timeoutId = setTimeout(() => {
				reject(new Error('Timeout capturando ubicación'));
			}, defaultOptions.timeout);

			navigator.geolocation.getCurrentPosition(
				(position) => {
					clearTimeout(timeoutId);
					resolve(position);
				},
				(error) => {
					clearTimeout(timeoutId);
					reject(error);
				},
				{
					enableHighAccuracy: defaultOptions.enableHighAccuracy,
					timeout: defaultOptions.timeout,
					maximumAge: defaultOptions.maximumAge
				}
			);
		});

		const location = {
			latitude: position.coords.latitude,
			longitude: position.coords.longitude,
			accuracy: position.coords.accuracy,
			altitude: position.coords.altitude,
			altitudeAccuracy: position.coords.altitudeAccuracy,
			heading: position.coords.heading,
			speed: position.coords.speed,
			timestamp: position.timestamp
		};

		console.log('✅ [LOCATION] GPS capturado exitosamente:', {
			lat: location.latitude.toFixed(6),
			lng: location.longitude.toFixed(6),
			accuracy: location.accuracy
		});

		return {
			location,
			error: null,
			timestamp: Date.now()
		};

	} catch (error) {
		console.warn('⚠️ [LOCATION] Error capturando GPS:', error.message);

		// Mapear errores específicos
		let errorMessage = 'Error desconocido capturando ubicación';
		
		if (error.code) {
			switch (error.code) {
				case 1: // PERMISSION_DENIED
					errorMessage = 'Permisos de ubicación denegados';
					break;
				case 2: // POSITION_UNAVAILABLE
					errorMessage = 'Ubicación no disponible';
					break;
				case 3: // TIMEOUT
					errorMessage = 'Timeout capturando ubicación';
					break;
				default:
					errorMessage = error.message || 'Error capturando ubicación';
			}
		} else if (error.message) {
			errorMessage = error.message;
		}

		return {
			location: null,
			error: errorMessage,
			timestamp: Date.now()
		};
	}
}

/**
 * Capturar ubicación con reintentos
 */
export async function captureLocationWithRetry(maxRetries = 3, retryDelay = 2000) {
	let lastError = null;

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		console.log(`📍 [LOCATION] Intento ${attempt}/${maxRetries}...`);

		const result = await captureLocation({
			timeout: 5000 + (attempt * 2000) // Incrementar timeout en cada intento
		});

		if (result.location) {
			console.log(`✅ [LOCATION] Éxito en intento ${attempt}`);
			return result;
		}

		lastError = result.error;
		console.warn(`⚠️ [LOCATION] Intento ${attempt} falló:`, result.error);

		// Esperar antes del siguiente intento (excepto en el último)
		if (attempt < maxRetries) {
			await new Promise(resolve => setTimeout(resolve, retryDelay));
		}
	}

	console.error(`❌ [LOCATION] Todos los intentos fallaron. Último error:`, lastError);
	return {
		location: null,
		error: lastError || 'Error después de múltiples intentos',
		timestamp: Date.now()
	};
}

/**
 * Obtener ubicación aproximada usando IP (fallback)
 */
export async function getApproximateLocation() {
	try {
		console.log('🌐 [LOCATION] Intentando ubicación aproximada por IP...');

		// Usar un servicio público para obtener ubicación aproximada
		const response = await fetch('https://ipapi.co/json/', {
			timeout: 5000
		});

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}`);
		}

		const data = await response.json();

		if (data.latitude && data.longitude) {
			const location = {
				latitude: parseFloat(data.latitude),
				longitude: parseFloat(data.longitude),
				accuracy: 10000, // Muy baja precisión (10km)
				city: data.city,
				region: data.region,
				country: data.country_name,
				source: 'ip'
			};

			console.log('✅ [LOCATION] Ubicación aproximada obtenida:', {
				lat: location.latitude.toFixed(6),
				lng: location.longitude.toFixed(6),
				city: location.city
			});

			return {
				location,
				error: null,
				timestamp: Date.now()
			};
		} else {
			throw new Error('Datos de ubicación inválidos');
		}

	} catch (error) {
		console.warn('⚠️ [LOCATION] Error obteniendo ubicación aproximada:', error.message);
		return {
			location: null,
			error: `Error ubicación aproximada: ${error.message}`,
			timestamp: Date.now()
		};
	}
}

/**
 * Capturar ubicación con fallback a IP
 */
export async function captureLocationWithFallback() {
	console.log('📍 [LOCATION] Iniciando captura con fallback...');

	// Intentar GPS primero
	const gpsResult = await captureLocationWithRetry(2, 1500);
	
	if (gpsResult.location) {
		return {
			...gpsResult,
			source: 'gps'
		};
	}

	console.log('📍 [LOCATION] GPS falló, intentando fallback por IP...');

	// Fallback a ubicación por IP
	const ipResult = await getApproximateLocation();
	
	if (ipResult.location) {
		return {
			...ipResult,
			source: 'ip'
		};
	}

	// Si todo falla
	console.error('❌ [LOCATION] Todas las opciones de ubicación fallaron');
	return {
		location: null,
		error: 'No se pudo obtener ubicación por GPS ni IP',
		timestamp: Date.now(),
		source: 'none'
	};
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN Y FORMATO
// ============================================================================

/**
 * Validar coordenadas GPS
 */
export function validateCoordinates(latitude, longitude) {
	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		return {
			valid: false,
			error: 'Las coordenadas deben ser números'
		};
	}

	if (latitude < -90 || latitude > 90) {
		return {
			valid: false,
			error: 'Latitud debe estar entre -90 y 90'
		};
	}

	if (longitude < -180 || longitude > 180) {
		return {
			valid: false,
			error: 'Longitud debe estar entre -180 y 180'
		};
	}

	return {
		valid: true,
		error: null
	};
}

/**
 * Formatear coordenadas para mostrar
 */
export function formatCoordinates(latitude, longitude, precision = 6) {
	if (typeof latitude !== 'number' || typeof longitude !== 'number') {
		return 'Coordenadas no disponibles';
	}

	return `${latitude.toFixed(precision)}, ${longitude.toFixed(precision)}`;
}

/**
 * Calcular distancia entre dos puntos (fórmula de Haversine)
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
	const R = 6371; // Radio de la Tierra en km
	const dLat = (lat2 - lat1) * Math.PI / 180;
	const dLon = (lon2 - lon1) * Math.PI / 180;
	
	const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
		Math.sin(dLon / 2) * Math.sin(dLon / 2);
	
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
	const distance = R * c; // Distancia en km
	
	return distance;
}

/**
 * Obtener precisión de ubicación en texto
 */
export function getAccuracyDescription(accuracy) {
	if (!accuracy || typeof accuracy !== 'number') {
		return 'Precisión desconocida';
	}

	if (accuracy <= 5) {
		return 'Muy precisa (≤5m)';
	} else if (accuracy <= 20) {
		return 'Precisa (≤20m)';
	} else if (accuracy <= 100) {
		return 'Moderada (≤100m)';
	} else if (accuracy <= 1000) {
		return 'Baja (≤1km)';
	} else {
		return 'Muy baja (>1km)';
	}
}

// ============================================================================
// CACHE DE UBICACIÓN
// ============================================================================

let locationCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 60000; // 1 minuto

/**
 * Obtener ubicación desde cache si es reciente
 */
export function getCachedLocation() {
	if (!locationCache || !cacheTimestamp) {
		return null;
	}

	const now = Date.now();
	if (now - cacheTimestamp > CACHE_DURATION) {
		// Cache expirado
		locationCache = null;
		cacheTimestamp = null;
		return null;
	}

	console.log('📍 [LOCATION] Usando ubicación desde cache');
	return {
		location: locationCache,
		error: null,
		timestamp: cacheTimestamp,
		source: 'cache'
	};
}

/**
 * Guardar ubicación en cache
 */
export function setCachedLocation(location) {
	if (location && location.latitude && location.longitude) {
		locationCache = location;
		cacheTimestamp = Date.now();
		console.log('📍 [LOCATION] Ubicación guardada en cache');
	}
}

/**
 * Limpiar cache de ubicación
 */
export function clearLocationCache() {
	locationCache = null;
	cacheTimestamp = null;
	console.log('📍 [LOCATION] Cache de ubicación limpiado');
}