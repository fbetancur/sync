/**
 * Utilidades para información del dispositivo
 * Parte de la Universal Infrastructure - Captura de contexto completo
 */

// ============================================================================
// INFORMACIÓN DEL DISPOSITIVO
// ============================================================================

let deviceId = null;
let deviceInfo = null;

/**
 * Generar o recuperar ID único del dispositivo
 */
export function getDeviceId() {
	if (deviceId) {
		return deviceId;
	}

	// Intentar recuperar de localStorage
	const storedId = localStorage.getItem('credisync_device_id');
	if (storedId) {
		deviceId = storedId;
		return deviceId;
	}

	// Generar nuevo ID único
	deviceId = generateUniqueDeviceId();
	
	// Guardar en localStorage
	try {
		localStorage.setItem('credisync_device_id', deviceId);
	} catch (error) {
		console.warn('⚠️ [DEVICE] No se pudo guardar device ID en localStorage:', error);
	}

	console.log('📱 [DEVICE] Nuevo device ID generado:', deviceId);
	return deviceId;
}

/**
 * Generar ID único del dispositivo basado en características del navegador
 */
function generateUniqueDeviceId() {
	// Combinar varias características del navegador para crear un ID único
	const components = [
		navigator.userAgent,
		navigator.language,
		screen.width,
		screen.height,
		screen.colorDepth,
		new Date().getTimezoneOffset(),
		navigator.hardwareConcurrency || 'unknown',
		navigator.deviceMemory || 'unknown'
	];

	// Crear hash simple de las características
	const combined = components.join('|');
	let hash = 0;
	
	for (let i = 0; i < combined.length; i++) {
		const char = combined.charCodeAt(i);
		hash = ((hash << 5) - hash) + char;
		hash = hash & hash; // Convertir a 32-bit integer
	}

	// Combinar con timestamp para garantizar unicidad
	const timestamp = Date.now().toString(36);
	const hashStr = Math.abs(hash).toString(36);
	
	return `device_${hashStr}_${timestamp}`;
}

/**
 * Obtener información completa del dispositivo
 */
export async function getDeviceInfo() {
	if (deviceInfo) {
		return deviceInfo;
	}

	try {
		console.log('📱 [DEVICE] Capturando información del dispositivo...');

		// Información básica del navegador
		const basicInfo = {
			deviceId: getDeviceId(),
			userAgent: navigator.userAgent,
			language: navigator.language,
			languages: navigator.languages || [navigator.language],
			platform: navigator.platform,
			cookieEnabled: navigator.cookieEnabled,
			onLine: navigator.onLine,
			timestamp: Date.now()
		};

		// Información de pantalla
		const screenInfo = {
			width: screen.width,
			height: screen.height,
			availWidth: screen.availWidth,
			availHeight: screen.availHeight,
			colorDepth: screen.colorDepth,
			pixelDepth: screen.pixelDepth,
			orientation: screen.orientation?.type || 'unknown'
		};

		// Información de hardware (si está disponible)
		const hardwareInfo = {
			hardwareConcurrency: navigator.hardwareConcurrency || null,
			deviceMemory: navigator.deviceMemory || null,
			maxTouchPoints: navigator.maxTouchPoints || 0
		};

		// Información de conexión
		const connectionInfo = await getConnectionInfo();

		// Información de batería
		const batteryInfo = await getBatteryInfo();

		// Información de timezone
		const timezoneInfo = {
			timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
			timezoneOffset: new Date().getTimezoneOffset()
		};

		// Detectar tipo de dispositivo
		const deviceType = detectDeviceType();

		deviceInfo = {
			...basicInfo,
			screen: screenInfo,
			hardware: hardwareInfo,
			connection: connectionInfo,
			battery: batteryInfo,
			timezone: timezoneInfo,
			deviceType,
			capabilities: await getDeviceCapabilities()
		};

		console.log('✅ [DEVICE] Información del dispositivo capturada:', {
			deviceId: deviceInfo.deviceId,
			deviceType: deviceInfo.deviceType,
			platform: deviceInfo.platform,
			connection: deviceInfo.connection.type,
			battery: deviceInfo.battery.level ? `${Math.round(deviceInfo.battery.level * 100)}%` : 'unknown'
		});

		return deviceInfo;

	} catch (error) {
		console.error('❌ [DEVICE] Error capturando información del dispositivo:', error);
		
		// Retornar información mínima en caso de error
		return {
			deviceId: getDeviceId(),
			userAgent: navigator.userAgent,
			platform: navigator.platform,
			onLine: navigator.onLine,
			timestamp: Date.now(),
			error: error.message
		};
	}
}

/**
 * Obtener información de conexión de red
 */
async function getConnectionInfo() {
	try {
		const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
		
		if (connection) {
			return {
				type: connection.effectiveType || connection.type || 'unknown',
				downlink: connection.downlink || null,
				rtt: connection.rtt || null,
				saveData: connection.saveData || false,
				supported: true
			};
		} else {
			return {
				type: navigator.onLine ? 'online' : 'offline',
				downlink: null,
				rtt: null,
				saveData: false,
				supported: false
			};
		}
	} catch (error) {
		console.warn('⚠️ [DEVICE] Error obteniendo información de conexión:', error);
		return {
			type: navigator.onLine ? 'online' : 'offline',
			downlink: null,
			rtt: null,
			saveData: false,
			supported: false,
			error: error.message
		};
	}
}

/**
 * Obtener información de batería
 */
async function getBatteryInfo() {
	try {
		if ('getBattery' in navigator) {
			const battery = await navigator.getBattery();
			return {
				level: battery.level,
				charging: battery.charging,
				chargingTime: battery.chargingTime,
				dischargingTime: battery.dischargingTime,
				supported: true
			};
		} else {
			return {
				level: null,
				charging: null,
				chargingTime: null,
				dischargingTime: null,
				supported: false
			};
		}
	} catch (error) {
		console.warn('⚠️ [DEVICE] Error obteniendo información de batería:', error);
		return {
			level: null,
			charging: null,
			chargingTime: null,
			dischargingTime: null,
			supported: false,
			error: error.message
		};
	}
}

/**
 * Detectar tipo de dispositivo
 */
function detectDeviceType() {
	const userAgent = navigator.userAgent.toLowerCase();
	
	if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(userAgent)) {
		return 'mobile';
	} else if (/tablet|ipad/i.test(userAgent)) {
		return 'tablet';
	} else {
		return 'desktop';
	}
}

/**
 * Obtener capacidades del dispositivo
 */
async function getDeviceCapabilities() {
	const capabilities = {
		geolocation: 'geolocation' in navigator,
		camera: false,
		microphone: false,
		notifications: 'Notification' in window,
		serviceWorker: 'serviceWorker' in navigator,
		indexedDB: 'indexedDB' in window,
		localStorage: (() => {
			try {
				localStorage.setItem('test', 'test');
				localStorage.removeItem('test');
				return true;
			} catch {
				return false;
			}
		})(),
		webGL: (() => {
			try {
				const canvas = document.createElement('canvas');
				return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
			} catch {
				return false;
			}
		})(),
		touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
		vibration: 'vibrate' in navigator,
		battery: 'getBattery' in navigator,
		connection: !!(navigator.connection || navigator.mozConnection || navigator.webkitConnection)
	};

	// Verificar permisos de cámara y micrófono si están disponibles
	if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
		try {
			// Verificar si hay dispositivos de media disponibles
			const devices = await navigator.mediaDevices.enumerateDevices();
			capabilities.camera = devices.some(device => device.kind === 'videoinput');
			capabilities.microphone = devices.some(device => device.kind === 'audioinput');
		} catch (error) {
			console.warn('⚠️ [DEVICE] Error verificando dispositivos de media:', error);
		}
	}

	return capabilities;
}

// ============================================================================
// UTILIDADES DE CONTEXTO
// ============================================================================

/**
 * Obtener contexto completo para auditoría
 */
export async function getAuditContext() {
	try {
		const deviceInfo = await getDeviceInfo();
		
		return {
			device_id: deviceInfo.deviceId,
			user_agent: deviceInfo.userAgent,
			platform: deviceInfo.platform,
			screen_resolution: `${deviceInfo.screen.width}x${deviceInfo.screen.height}`,
			language: deviceInfo.language,
			timezone: deviceInfo.timezone.timezone,
			connection_type: deviceInfo.connection.type,
			battery_level: deviceInfo.battery.level,
			device_type: deviceInfo.deviceType,
			online: deviceInfo.onLine,
			timestamp: Date.now()
		};
	} catch (error) {
		console.error('❌ [DEVICE] Error obteniendo contexto de auditoría:', error);
		return {
			device_id: getDeviceId(),
			user_agent: navigator.userAgent,
			platform: navigator.platform,
			online: navigator.onLine,
			timestamp: Date.now(),
			error: error.message
		};
	}
}

/**
 * Obtener información simplificada para logs
 */
export function getSimpleDeviceInfo() {
	return {
		deviceId: getDeviceId(),
		platform: navigator.platform,
		userAgent: navigator.userAgent.substring(0, 100), // Truncar para logs
		language: navigator.language,
		online: navigator.onLine,
		timestamp: Date.now()
	};
}

// ============================================================================
// MONITOREO DE CAMBIOS
// ============================================================================

let connectionListeners = [];
let batteryListeners = [];

/**
 * Monitorear cambios en la conexión
 */
export function monitorConnection(callback) {
	const handleOnline = () => callback({ type: 'online', online: true, timestamp: Date.now() });
	const handleOffline = () => callback({ type: 'offline', online: false, timestamp: Date.now() });
	
	window.addEventListener('online', handleOnline);
	window.addEventListener('offline', handleOffline);
	
	connectionListeners.push({ handleOnline, handleOffline });
	
	// Retornar función para limpiar listeners
	return () => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
		connectionListeners = connectionListeners.filter(l => 
			l.handleOnline !== handleOnline && l.handleOffline !== handleOffline
		);
	};
}

/**
 * Monitorear cambios en la batería
 */
export async function monitorBattery(callback) {
	try {
		if ('getBattery' in navigator) {
			const battery = await navigator.getBattery();
			
			const handleBatteryChange = () => {
				callback({
					level: battery.level,
					charging: battery.charging,
					timestamp: Date.now()
				});
			};
			
			battery.addEventListener('levelchange', handleBatteryChange);
			battery.addEventListener('chargingchange', handleBatteryChange);
			
			batteryListeners.push(handleBatteryChange);
			
			// Retornar función para limpiar listeners
			return () => {
				battery.removeEventListener('levelchange', handleBatteryChange);
				battery.removeEventListener('chargingchange', handleBatteryChange);
				batteryListeners = batteryListeners.filter(l => l !== handleBatteryChange);
			};
		}
	} catch (error) {
		console.warn('⚠️ [DEVICE] Error configurando monitoreo de batería:', error);
	}
	
	return () => {}; // Función vacía si no se puede monitorear
}

/**
 * Limpiar todos los listeners
 */
export function cleanupDeviceMonitoring() {
	// Limpiar listeners de conexión
	connectionListeners.forEach(({ handleOnline, handleOffline }) => {
		window.removeEventListener('online', handleOnline);
		window.removeEventListener('offline', handleOffline);
	});
	connectionListeners = [];
	
	// Los listeners de batería se limpian automáticamente cuando se llama a la función de cleanup
	batteryListeners = [];
	
	console.log('🧹 [DEVICE] Monitoreo de dispositivo limpiado');
}

// ============================================================================
// UTILIDADES DE FORMATO
// ============================================================================

/**
 * Formatear información del dispositivo para mostrar
 */
export function formatDeviceInfo(deviceInfo) {
	if (!deviceInfo) {
		return 'Información no disponible';
	}

	const parts = [];
	
	if (deviceInfo.deviceType) {
		parts.push(deviceInfo.deviceType);
	}
	
	if (deviceInfo.platform) {
		parts.push(deviceInfo.platform);
	}
	
	if (deviceInfo.connection?.type) {
		parts.push(deviceInfo.connection.type);
	}
	
	if (deviceInfo.battery?.level) {
		const batteryPercent = Math.round(deviceInfo.battery.level * 100);
		parts.push(`${batteryPercent}% batería`);
	}
	
	return parts.join(' • ') || 'Dispositivo desconocido';
}

/**
 * Obtener resumen del dispositivo para UI
 */
export async function getDeviceSummary() {
	try {
		const info = await getDeviceInfo();
		
		return {
			id: info.deviceId,
			type: info.deviceType,
			platform: info.platform,
			online: info.onLine,
			connection: info.connection.type,
			battery: info.battery.level ? Math.round(info.battery.level * 100) : null,
			capabilities: {
				gps: info.capabilities.geolocation,
				camera: info.capabilities.camera,
				offline: info.capabilities.serviceWorker && info.capabilities.indexedDB
			}
		};
	} catch (error) {
		console.error('❌ [DEVICE] Error obteniendo resumen del dispositivo:', error);
		return {
			id: getDeviceId(),
			type: 'unknown',
			platform: navigator.platform,
			online: navigator.onLine,
			connection: 'unknown',
			battery: null,
			capabilities: {
				gps: 'geolocation' in navigator,
				camera: false,
				offline: 'serviceWorker' in navigator && 'indexedDB' in window
			}
		};
	}
}