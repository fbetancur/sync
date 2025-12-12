/**
 * Phone Service - Validación y formateo de teléfonos internacionales
 * Parte de @sync/core - Reutilizable en todas las apps
 */

export interface CountryConfig {
  name: string;
  flag: string;
  code: string;
  phone: {
    digits: number | number[];
    code: string;
    whatsapp: string;
    example: string;
    format: string;
  };
  currency: string;
  currencySymbol: string;
  default?: boolean;
}

export interface PhoneValidationResult {
  valid: boolean;
  error?: string;
  formatted?: string;
  international?: string;
}

export interface CountryDetectionResult {
  country: string;
  method: 'gps' | 'ip' | 'saved' | 'manual' | 'default' | 'error';
  confidence: 'high' | 'medium' | 'low';
  coordinates?: { latitude: number; longitude: number };
  ipInfo?: {
    country: string;
    city: string;
    region: string;
  };
}

/**
 * Configuración de países soportados
 */
const COUNTRIES: Record<string, CountryConfig> = {
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
    default: true
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

/**
 * Servicio de validación y formateo de teléfonos
 */
export class PhoneService {
  private static instance: PhoneService | null = null;

  static getInstance(): PhoneService {
    if (!this.instance) {
      this.instance = new PhoneService();
    }
    return this.instance;
  }

  /**
   * Validar teléfono según el país
   */
  validatePhone(phone: string, countryCode: string): PhoneValidationResult {
    if (!phone || !countryCode || !COUNTRIES[countryCode]) {
      return {
        valid: false,
        error: 'Datos inválidos'
      };
    }

    const config = COUNTRIES[countryCode].phone;
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
  formatPhone(phone: string, countryCode: string): string {
    const validation = this.validatePhone(phone, countryCode);
    if (!validation.valid) {
      return phone;
    }

    const config = COUNTRIES[countryCode].phone;
    const digits = validation.formatted!;

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

  /**
   * Generar URL de WhatsApp
   */
  generateWhatsAppURL(phone: string, countryCode: string, message = ''): string {
    const validation = this.validatePhone(phone, countryCode);
    if (!validation.valid) {
      throw new Error('Teléfono inválido para WhatsApp');
    }

    const config = COUNTRIES[countryCode].phone;
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
  generateCallURL(phone: string, countryCode: string): string {
    const validation = this.validatePhone(phone, countryCode);
    if (!validation.valid) {
      throw new Error('Teléfono inválido para llamada');
    }

    return `tel:${validation.international}`;
  }

  /**
   * Obtener configuración de país
   */
  getCountryConfig(countryCode: string): CountryConfig {
    return COUNTRIES[countryCode] || COUNTRIES.MX;
  }

  /**
   * Obtener lista de países para selector
   */
  getCountriesList(): Array<{
    code: string;
    name: string;
    flag: string;
    displayName: string;
  }> {
    return Object.entries(COUNTRIES).map(([code, config]) => ({
      code,
      name: config.name,
      flag: config.flag,
      displayName: `${config.flag} ${config.name}`
    }));
  }

  /**
   * Detectar país automáticamente
   */
  async detectCountry(): Promise<CountryDetectionResult> {
    console.log('🌍 [PHONE] Iniciando detección automática de país...');

    // 1. Verificar preferencia guardada
    const savedCountry = localStorage.getItem('sync_country');
    if (savedCountry && COUNTRIES[savedCountry]) {
      console.log('🌍 [PHONE] País guardado encontrado:', savedCountry);
      return {
        country: savedCountry,
        method: 'saved',
        confidence: 'high'
      };
    }

    // 2. Intentar detección por GPS
    try {
      console.log('📍 [PHONE] Intentando detección por GPS...');
      const gpsResult = await this.detectCountryByGPS();
      if (gpsResult.country) {
        console.log('✅ [PHONE] País detectado por GPS:', gpsResult.country);
        return gpsResult;
      }
    } catch (error: any) {
      console.log('⚠️ [PHONE] GPS no disponible:', error.message);
    }

    // 3. Intentar detección por IP
    try {
      console.log('🌐 [PHONE] Intentando detección por IP...');
      const ipResult = await this.detectCountryByIP();
      if (ipResult.country) {
        console.log('✅ [PHONE] País detectado por IP:', ipResult.country);
        return ipResult;
      }
    } catch (error: any) {
      console.log('⚠️ [PHONE] IP geolocation falló:', error.message);
    }

    // 4. Fallback a México
    console.log('🇲🇽 [PHONE] Usando México como país por defecto');
    return {
      country: 'MX',
      method: 'default',
      confidence: 'low'
    };
  }

  /**
   * Detectar país por coordenadas GPS
   */
  private async detectCountryByGPS(): Promise<CountryDetectionResult> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation no disponible');
    }

    const position = await new Promise<GeolocationPosition>((resolve, reject) => {
      const timeoutId = setTimeout(() => reject(new Error('Timeout GPS')), 3000);

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          clearTimeout(timeoutId);
          resolve(pos);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        {
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 300000 // 5 minutos
        }
      );
    });

    const { latitude, longitude } = position.coords;

    // Mapeo aproximado de coordenadas a países
    const countryBounds: Record<string, { latMin: number; latMax: number; lonMin: number; lonMax: number }> = {
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
   * Detectar país por IP
   */
  private async detectCountryByIP(): Promise<CountryDetectionResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    try {
      const response = await fetch('https://ipapi.co/json/', {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.country_code) {
        throw new Error('No se pudo determinar país por IP');
      }

      // Mapear códigos ISO a nuestros códigos
      const isoToCountry: Record<string, string> = {
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
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Guardar preferencia de país
   */
  saveCountryPreference(countryCode: string): void {
    if (COUNTRIES[countryCode]) {
      localStorage.setItem('sync_country', countryCode);
      console.log('💾 [PHONE] Preferencia de país guardada:', countryCode);
    }
  }

  /**
   * Obtener país por defecto
   */
  getDefaultCountry(): string {
    return 'MX';
  }
}