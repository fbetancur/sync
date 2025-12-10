/**
 * Configuración de países para CrediSync
 * Sistema inteligente de detección y validación telefónica
 */

// ============================================================================
// CONFIGURACIÓN DE PAÍSES
// ============================================================================

export const countries = {
	MX: {
		name: 'México',
		flag: '🇲🇽',
		code: 'MX',
		phone: {
			digits: 10,
			code: '+52',
			whatsapp: '+52',
			example: '5512345678',
			format: '(55) 1234-5678'
		},
		currency: 'MXN',
		currencySymbol: '$',
		default: true // País por defecto
	},
	CO: {
		name: 'Colombia',
		flag: '🇨🇴',
		code: 'CO',
		phone: {
			digits: 10,
			code: '+57',
			whatsapp: '+57',
			example: '3001234567',
			format: '(300) 123-4567'
		},
		currency: 'COP',
		currencySymbol: '$'
	},
	PE: {
		name: 'Perú',
		flag: '🇵🇪',
		code: 'PE',
		phone: {
			digits: 9,
			code: '+51',
			whatsapp: '+51',
			example: '987654321',
			format: '987-654-321'
		},
		currency: 'PEN',
		currencySymbol: 'S/'
	},
	AR: {
		name: 'Argentina',
		flag: '🇦🇷',
		code: 'AR',
		phone: {
			digits: [10, 11],
			code: '+54',
			whatsapp: '+549',
			example: '1123456789',
			format: '(11) 2345-6789'
		},
		currency: 'ARS',
		currencySymbol: '$'
	},
	BR: {
		name: 'Brasil',
		flag: '🇧🇷',
		code: 'BR',
		phone: {
			digits: 11,
			code: '+55',
			whatsapp: '+55',
			example: '11987654321',
			format: '(11) 98765-4321'
		},
		currency: 'BRL',
		currencySymbol: 'R$'
	}
};

// ============================================================================
// DETECCIÓN AUTOMÁTICA DE PAÍS
// ============================================================================

/**
 * Detectar país automáticamente con fallbacks
 */
export async function detectCountry() {
	console.log('🌍 [COUNTRY] Iniciando detección automática de país...');
	
	// 1. Verificar preferencia guardada del usuario
	const savedCountry = localStorage.getItem('credisync_country');
	if (savedCountry && countries[savedCountry]) {
		console.log('🌍 [COUNTRY] País guardado encontrado:', savedCountry);
		return {
			country: savedCountry,
			method: 'saved',
			confidence: 'high'
		};
	}
	
	// 2. Intentar detección por GPS (rápido, sin bloquear)
	try {
		console.log('📍 [COUNTRY] Intentando detección por GPS...');
		const gpsResult = await detectCountryByGPS();
		if (gpsResult.country) {
			console.log('✅ [COUNTRY] País detectado por GPS:', gpsResult.country);
			return gpsResult;
		}
	} catch (error) {
		console.log('⚠️ [COUNTRY] GPS no disponible:', error.message);
	}
	
	// 3. Intentar detección por IP (fallback rápido)
	try {
		console.log('🌐 [COUNTRY] Intentando detección por IP...');
		const ipResult = await detectCountryByIP();
		if (ipResult.country) {
			console.log('✅ [COUNTRY] País detectado por IP:', ipResult.country);
			return ipResult;
		}
	} catch (error) {
		console.log('⚠️ [COUNTRY] IP geolocation falló:', error.message);
	}
	
	// 4. Fallback a México (país por defecto)
	console.log('🇲🇽 [COUNTRY] Usando México como país por defecto');
	return {
		country: 'MX',
		method: 'default',
		confidence: 'low'
	};
}

/**
 * Detectar país por coordenadas GPS
 */
async function detectCountryByGPS() {
	// Importar función de ubicación existente
	const { captureLocation } = await import('./location.js');
	
	const locationResult = await captureLocation({ 
		timeout: 3000,
		enableHighAccuracy: false // Más rápido
	});
	
	if (!locationResult.location) {
		throw new Error('No se pudo obtener ubicación GPS');
	}
	
	const { latitude, longitude } = locationResult.location;
	
	// Mapeo aproximado de coordenadas a países (para los países soportados)
	const countryBounds = {
		MX: { latMin: 14.5, latMax: 32.7, lonMin: -118.4, lonMax: -86.7 },
		CO: { latMin: -4.2, latMax: 12.5, lonMin: -81.7, lonMax: -66.9 },
		PE: { latMin: -18.3, latMax: -0.04, lonMin: -81.3, lonMax: -68.7 },
		AR: { latMin: -55.1, latMax: -21.8, lonMin: -73.6, lonMax: -53.6 },
		BR: { latMin: -33.7, latMax: 5.3, lonMin: -73.9, lonMax: -28.8 }
	};
	
	for (const [countryCode, bounds] of Object.entries(countryBounds)) {
		if (latitude >= bounds.latMin && latitude <= bounds.latMax &&
			longitude >= bounds.lonMin && longitude <= bounds.lonMax) {
			return {
				country: countryCode,
				method: 'gps',
				confidence: 'high',
				coordinates: { latitude, longitude }
			};
		}
	}
	
	throw new Error('País no identificado por coordenadas GPS');
}

/**
 * Detectar país por IP geolocation
 */
async function detectCountryByIP() {
	const response = await fetch('https://ipapi.co/json/', { 
		signal: AbortSignal.timeout(2000) // Timeout de 2 segundos
	});
	
	if (!response.ok) {
		throw new Error(`HTTP ${response.status}`);
	}
	
	const data = await response.json();
	
	if (!data.country_code) {
		throw new Error('No se pudo determinar país por IP');
	}
	
	// Mapear códigos ISO a nuestros códigos
	const isoToCountry = {
		MX: 'MX',
		CO: 'CO', 
		PE: 'PE',
		AR: 'AR',
		BR: 'BR'
	};
	
	const detectedCountry = isoToCountry[data.country_code];
	
	if (!detectedCountry) {
		throw new Error(`País ${data.country_code} no soportado`);
	}
	
	return {
		country: detectedCountry,
		method: 'ip',
		confidence: 'medium',
		ipInfo: {
			country: data.country_name,
			city: data.city,
			region: data.region
		}
	};
}

// ============================================================================
// VALIDACIÓN TELEFÓNICA
// ============================================================================

/**
 * Validar teléfono según el país
 */
export function validatePhone(phone, countryCode) {
	if (!phone || !countryCode || !countries[countryCode]) {
		return {
			valid: false,
			error: 'Datos inválidos'
		};
	}
	
	const config = countries[countryCode].phone;
	const digits = phone.replace(/\D/g, ''); // Solo dígitos
	
	// Verificar longitud
	if (Array.isArray(config.digits)) {
		if (!config.digits.includes(digits.length)) {
			return {
				valid: false,
				error: `Debe tener ${config.digits.join(' o ')} dígitos`
			};
		}
	} else {
		if (digits.length !== config.digits) {
			return {
				valid: false,
				error: `Debe tener ${config.digits} dígitos`
			};
		}
	}
	
	return {
		valid: true,
		formatted: digits,
		international: config.code + digits
	};
}

/**
 * Formatear teléfono para mostrar
 */
export function formatPhone(phone, countryCode) {
	const validation = validatePhone(phone, countryCode);
	if (!validation.valid) {
		return phone;
	}
	
	const config = countries[countryCode].phone;
	const digits = validation.formatted;
	
	// Aplicar formato específico del país
	switch (countryCode) {
		case 'MX':
		case 'CO':
			// (55) 1234-5678
			if (digits.length === 10) {
				return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
			}
			break;
		case 'PE':
			// 987-654-321
			if (digits.length === 9) {
				return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
			}
			break;
		case 'AR':
			// (11) 2345-6789
			if (digits.length >= 10) {
				const areaCode = digits.slice(0, digits.length === 10 ? 2 : 3);
				const number = digits.slice(areaCode.length);
				return `(${areaCode}) ${number.slice(0, 4)}-${number.slice(4)}`;
			}
			break;
		case 'BR':
			// (11) 98765-4321
			if (digits.length === 11) {
				return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
			}
			break;
	}
	
	return digits;
}

// ============================================================================
// WHATSAPP Y COMUNICACIÓN
// ============================================================================

/**
 * Generar URL de WhatsApp
 */
export function generateWhatsAppURL(phone, countryCode, message = '') {
	const validation = validatePhone(phone, countryCode);
	if (!validation.valid) {
		throw new Error('Teléfono inválido para WhatsApp');
	}
	
	const config = countries[countryCode].phone;
	const whatsappNumber = config.whatsapp + validation.formatted;
	
	const url = `https://wa.me/${whatsappNumber}`;
	if (message) {
		return `${url}?text=${encodeURIComponent(message)}`;
	}
	
	return url;
}

/**
 * Generar URL de llamada telefónica
 */
export function generateCallURL(phone, countryCode) {
	const validation = validatePhone(phone, countryCode);
	if (!validation.valid) {
		throw new Error('Teléfono inválido para llamada');
	}
	
	return `tel:${validation.international}`;
}

// ============================================================================
// UTILIDADES
// ============================================================================

/**
 * Obtener configuración de país
 */
export function getCountryConfig(countryCode) {
	return countries[countryCode] || countries.MX;
}

/**
 * Obtener lista de países para selector
 */
export function getCountriesList() {
	return Object.entries(countries).map(([code, config]) => ({
		code,
		name: config.name,
		flag: config.flag,
		displayName: `${config.flag} ${config.name}`
	}));
}

/**
 * Guardar preferencia de país
 */
export function saveCountryPreference(countryCode) {
	if (countries[countryCode]) {
		localStorage.setItem('credisync_country', countryCode);
		console.log('💾 [COUNTRY] Preferencia guardada:', countryCode);
	}
}

/**
 * Obtener país por defecto
 */
export function getDefaultCountry() {
	return 'MX';
}