/**
 * Context Service - Captura de contexto completo para operaciones
 * Parte de @sync/core - Reutilizable en todas las apps
 */

export interface LocationResult {
  location: {
    latitude: number;
    longitude: number;
    accuracy: number;
    altitude?: number;
    altitudeAccuracy?: number;
    heading?: number;
    speed?: number;
    timestamp: number;
  } | null;
  error: string | null;
  timestamp: number;
  source?: 'gps' | 'ip' | 'cache' | 'none';
}

export interface DeviceInfo {
  deviceId: string;
  userAgent: string;
  platform: string;
  language: string;
  onLine: boolean;
  screen: {
    width: number;
    height: number;
    colorDepth: number;
    orientation: string;
  };
  hardware: {
    hardwareConcurrency: number | null;
    deviceMemory: number | null;
    maxTouchPoints: number;
  };
  connection: {
    type: string;
    downlink: number | null;
    rtt: number | null;
    saveData: boolean;
    supported: boolean;
  };
  battery: {
    level: number | null;
    charging: boolean | null;
    supported: boolean;
  };
  timezone: {
    timezone: string;
    timezoneOffset: number;
  };
  deviceType: 'mobile' | 'tablet' | 'desktop';
  capabilities: {
    geolocation: boolean;
    camera: boolean;
    microphone: boolean;
    notifications: boolean;
    serviceWorker: boolean;
    indexedDB: boolean;
    localStorage: boolean;
    touchScreen: boolean;
    vibration: boolean;
  };
  timestamp: number;
}

export interface OperationContext {
  location: LocationResult;
  device: DeviceInfo;
  user: any | null; // Será tipado cuando se integre con AuthService
  timestamp: number;
}

export interface LocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

/**
 * Servicio centralizado para captura de contexto completo
 * Incluye ubicación, información del dispositivo y usuario actual
 */
export class ContextService {
  private locationCache: LocationResult | null = null;
  private locationCacheTimestamp: number | null = null;
  private deviceInfoCache: DeviceInfo | null = null;
  private readonly LOCATION_CACHE_DURATION = 60000; // 1 minuto

  constructor(private authService?: any) {}

  /**
   * Capturar contexto completo para una operación
   */
  async captureFullContext(): Promise<OperationContext> {
    console.log('📋 [CONTEXT] Capturando contexto completo...');

    const [location, device, user] = await Promise.all([
      this.captureLocationWithFallback(),
      this.getDeviceInfo(),
      this.getCurrentUser()
    ]);

    const context: OperationContext = {
      location,
      device,
      user,
      timestamp: Date.now()
    };

    console.log('✅ [CONTEXT] Contexto completo capturado:', {
      location: location.location ? 'captured' : 'unavailable',
      device: 'captured',
      user: user ? 'authenticated' : 'anonymous'
    });

    return context;
  }

  /**
   * Capturar ubicación GPS con fallbacks
   */
  async captureLocationWithFallback(): Promise<LocationResult> {
    // Verificar cache
    const cached = this.getCachedLocation();
    if (cached) {
      return cached;
    }

    console.log('📍 [CONTEXT] Iniciando captura de ubicación...');

    // Intentar GPS primero
    const gpsResult = await this.captureLocationWithRetry(2, 1500);
    if (gpsResult.location) {
      this.setCachedLocation(gpsResult);
      return { ...gpsResult, source: 'gps' };
    }

    console.log('📍 [CONTEXT] GPS falló, intentando fallback por IP...');

    // Fallback a ubicación por IP
    const ipResult = await this.getApproximateLocation();
    if (ipResult.location) {
      this.setCachedLocation(ipResult);
      return { ...ipResult, source: 'ip' };
    }

    // Si todo falla
    console.error('❌ [CONTEXT] Todas las opciones de ubicación fallaron');
    return {
      location: null,
      error: 'No se pudo obtener ubicación por GPS ni IP',
      timestamp: Date.now(),
      source: 'none'
    };
  }

  /**
   * Capturar ubicación GPS con reintentos
   */
  private async captureLocationWithRetry(maxRetries = 3, retryDelay = 2000): Promise<LocationResult> {
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`📍 [CONTEXT] Intento GPS ${attempt}/${maxRetries}...`);

      const result = await this.captureLocation({
        timeout: 5000 + (attempt * 2000),
        enableHighAccuracy: attempt === 1 // Solo alta precisión en el primer intento
      });

      if (result.location) {
        console.log(`✅ [CONTEXT] GPS exitoso en intento ${attempt}`);
        return result;
      }

      lastError = result.error;
      console.warn(`⚠️ [CONTEXT] Intento GPS ${attempt} falló:`, result.error);

      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }

    return {
      location: null,
      error: lastError || 'Error después de múltiples intentos GPS',
      timestamp: Date.now()
    };
  }

  /**
   * Capturar ubicación GPS básica
   */
  private async captureLocation(options: LocationOptions = {}): Promise<LocationResult> {
    const defaultOptions: LocationOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 60000,
      ...options
    };

    try {
      if (!navigator.geolocation) {
        return {
          location: null,
          error: 'Geolocation no disponible',
          timestamp: Date.now()
        };
      }

      // Verificar permisos si es posible
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'geolocation' });
          if (permission.state === 'denied') {
            return {
              location: null,
              error: 'Permisos de ubicación denegados',
              timestamp: Date.now()
            };
          }
        } catch (permissionError) {
          console.warn('⚠️ [CONTEXT] No se pudo verificar permisos:', permissionError);
        }
      }

      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          reject(new Error('Timeout capturando ubicación'));
        }, defaultOptions.timeout!);

        navigator.geolocation.getCurrentPosition(
          (position) => {
            clearTimeout(timeoutId);
            resolve(position);
          },
          (error) => {
            clearTimeout(timeoutId);
            reject(error);
          },
          defaultOptions
        );
      });

      const location = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude || undefined,
        altitudeAccuracy: position.coords.altitudeAccuracy || undefined,
        heading: position.coords.heading || undefined,
        speed: position.coords.speed || undefined,
        timestamp: position.timestamp
      };

      return {
        location,
        error: null,
        timestamp: Date.now()
      };

    } catch (error: any) {
      let errorMessage = 'Error desconocido capturando ubicación';
      
      if (error.code) {
        switch (error.code) {
          case 1: errorMessage = 'Permisos de ubicación denegados'; break;
          case 2: errorMessage = 'Ubicación no disponible'; break;
          case 3: errorMessage = 'Timeout capturando ubicación'; break;
          default: errorMessage = error.message || 'Error capturando ubicación';
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
   * Obtener ubicación aproximada por IP
   */
  private async getApproximateLocation(): Promise<LocationResult> {
    try {
      console.log('🌐 [CONTEXT] Intentando ubicación aproximada por IP...');

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.latitude && data.longitude) {
        const location = {
          latitude: parseFloat(data.latitude),
          longitude: parseFloat(data.longitude),
          accuracy: 10000, // Muy baja precisión (10km)
          timestamp: Date.now()
        };

        console.log('✅ [CONTEXT] Ubicación aproximada obtenida:', {
          lat: location.latitude.toFixed(6),
          lng: location.longitude.toFixed(6),
          city: data.city
        });

        return {
          location,
          error: null,
          timestamp: Date.now()
        };
      } else {
        throw new Error('Datos de ubicación inválidos');
      }

    } catch (error: any) {
      console.warn('⚠️ [CONTEXT] Error obteniendo ubicación aproximada:', error.message);
      return {
        location: null,
        error: `Error ubicación aproximada: ${error.message}`,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Obtener información completa del dispositivo
   */
  async getDeviceInfo(): Promise<DeviceInfo> {
    if (this.deviceInfoCache) {
      return this.deviceInfoCache;
    }

    try {
      console.log('📱 [CONTEXT] Capturando información del dispositivo...');

      const deviceId = this.getDeviceId();

      // Información básica
      const basicInfo = {
        deviceId,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        timestamp: Date.now()
      };

      // Información de pantalla
      const screenInfo = {
        width: screen.width,
        height: screen.height,
        colorDepth: screen.colorDepth,
        orientation: (screen.orientation?.type || 'unknown')
      };

      // Información de hardware
      const hardwareInfo = {
        hardwareConcurrency: navigator.hardwareConcurrency || null,
        deviceMemory: (navigator as any).deviceMemory || null,
        maxTouchPoints: navigator.maxTouchPoints || 0
      };

      // Información de conexión
      const connectionInfo = await this.getConnectionInfo();

      // Información de batería
      const batteryInfo = await this.getBatteryInfo();

      // Información de timezone
      const timezoneInfo = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset()
      };

      // Detectar tipo de dispositivo
      const deviceType = this.detectDeviceType();

      // Capacidades del dispositivo
      const capabilities = await this.getDeviceCapabilities();

      this.deviceInfoCache = {
        ...basicInfo,
        screen: screenInfo,
        hardware: hardwareInfo,
        connection: connectionInfo,
        battery: batteryInfo,
        timezone: timezoneInfo,
        deviceType,
        capabilities
      };

      console.log('✅ [CONTEXT] Información del dispositivo capturada:', {
        deviceId: this.deviceInfoCache.deviceId,
        deviceType: this.deviceInfoCache.deviceType,
        platform: this.deviceInfoCache.platform,
        connection: this.deviceInfoCache.connection.type
      });

      return this.deviceInfoCache;

    } catch (error: any) {
      console.error('❌ [CONTEXT] Error capturando información del dispositivo:', error);
      
      // Retornar información mínima
      return {
        deviceId: this.getDeviceId(),
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          orientation: 'unknown'
        },
        hardware: {
          hardwareConcurrency: null,
          deviceMemory: null,
          maxTouchPoints: 0
        },
        connection: {
          type: navigator.onLine ? 'online' : 'offline',
          downlink: null,
          rtt: null,
          saveData: false,
          supported: false
        },
        battery: {
          level: null,
          charging: null,
          supported: false
        },
        timezone: {
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          timezoneOffset: new Date().getTimezoneOffset()
        },
        deviceType: this.detectDeviceType(),
        capabilities: {
          geolocation: 'geolocation' in navigator,
          camera: false,
          microphone: false,
          notifications: 'Notification' in window,
          serviceWorker: 'serviceWorker' in navigator,
          indexedDB: 'indexedDB' in window,
          localStorage: true,
          touchScreen: 'ontouchstart' in window,
          vibration: 'vibrate' in navigator
        },
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generar o recuperar ID único del dispositivo
   */
  private getDeviceId(): string {
    const storedId = localStorage.getItem('sync_device_id');
    if (storedId) {
      return storedId;
    }

    // Generar nuevo ID único
    const components = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown'
    ];

    const combined = components.join('|');
    let hash = 0;
    
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }

    const timestamp = Date.now().toString(36);
    const hashStr = Math.abs(hash).toString(36);
    const deviceId = `device_${hashStr}_${timestamp}`;

    try {
      localStorage.setItem('sync_device_id', deviceId);
    } catch (error) {
      console.warn('⚠️ [CONTEXT] No se pudo guardar device ID:', error);
    }

    return deviceId;
  }

  /**
   * Obtener información de conexión
   */
  private async getConnectionInfo() {
    try {
      const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
      
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
      return {
        type: navigator.onLine ? 'online' : 'offline',
        downlink: null,
        rtt: null,
        saveData: false,
        supported: false
      };
    }
  }

  /**
   * Obtener información de batería
   */
  private async getBatteryInfo() {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return {
          level: battery.level,
          charging: battery.charging,
          supported: true
        };
      } else {
        return {
          level: null,
          charging: null,
          supported: false
        };
      }
    } catch (error) {
      return {
        level: null,
        charging: null,
        supported: false
      };
    }
  }

  /**
   * Detectar tipo de dispositivo
   */
  private detectDeviceType(): 'mobile' | 'tablet' | 'desktop' {
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
  private async getDeviceCapabilities() {
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
      touchScreen: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      vibration: 'vibrate' in navigator
    };

    // Verificar dispositivos de media si están disponibles
    if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function') {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        capabilities.camera = devices.some(device => device.kind === 'videoinput');
        capabilities.microphone = devices.some(device => device.kind === 'audioinput');
      } catch (error) {
        console.warn('⚠️ [CONTEXT] Error verificando dispositivos de media:', error);
      }
    }

    return capabilities;
  }

  /**
   * Obtener usuario actual (si hay AuthService configurado)
   */
  private async getCurrentUser() {
    if (this.authService && typeof this.authService.getCurrentUser === 'function') {
      try {
        return await this.authService.getCurrentUser();
      } catch (error) {
        console.warn('⚠️ [CONTEXT] Error obteniendo usuario actual:', error);
        return null;
      }
    }
    return null;
  }

  /**
   * Cache de ubicación
   */
  private getCachedLocation(): LocationResult | null {
    if (!this.locationCache || !this.locationCacheTimestamp) {
      return null;
    }

    const now = Date.now();
    if (now - this.locationCacheTimestamp > this.LOCATION_CACHE_DURATION) {
      this.locationCache = null;
      this.locationCacheTimestamp = null;
      return null;
    }

    console.log('📍 [CONTEXT] Usando ubicación desde cache');
    return { ...this.locationCache, source: 'cache' };
  }

  private setCachedLocation(location: LocationResult): void {
    if (location.location) {
      this.locationCache = location;
      this.locationCacheTimestamp = Date.now();
      console.log('📍 [CONTEXT] Ubicación guardada en cache');
    }
  }

  /**
   * Limpiar caches
   */
  clearCaches(): void {
    this.locationCache = null;
    this.locationCacheTimestamp = null;
    this.deviceInfoCache = null;
    console.log('🧹 [CONTEXT] Caches limpiados');
  }
}