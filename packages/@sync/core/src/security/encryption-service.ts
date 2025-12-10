/**
 * Servicio de Encriptación
 * 
 * Proporciona encriptación a nivel de campo para datos sensibles usando Web Crypto API.
 * Usa encriptación AES-256-GCM con derivación de clave PBKDF2.
 * 
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

export interface EncryptedData {
  data: string; // Datos encriptados codificados en Base64
  iv: string;   // Vector de inicialización codificado en Base64
  salt: string; // Salt codificado en Base64 (para derivación de clave)
}

export interface EncryptionOptions {
  iterations?: number; // Iteraciones PBKDF2 (por defecto: 100,000)
}

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: CryptoKey | null = null;
  private userPin: string | null = null;

  // Patrones de campos sensibles para encriptar
  private static readonly SENSITIVE_FIELDS = [
    'numero_documento',
    'telefono',
    'telefono_2',
    'telefono_fiador',
    'direccion',
    'barrio',
    'referencia',
    'nombre_fiador'
  ];

  private constructor() {}

  /**
   * Obtener instancia singleton
   */
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Inicializar encriptación con PIN del usuario
   * Requirements: 17.3, 17.4
   */
  async initializeWithPin(pin: string, options: EncryptionOptions = {}): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('El PIN debe tener al menos 4 caracteres');
    }

    this.userPin = pin;
    
    // Generar un salt aleatorio para derivación de clave
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Derivar clave de encriptación desde PIN usando PBKDF2
    const iterations = options.iterations || 100000; // Requirement 17.3
    this.encryptionKey = await this.deriveKeyFromPin(pin, salt, iterations);
    
    console.log('🔐 Servicio de encriptación inicializado');
  }

  /**
   * Derivar clave de encriptación desde PIN usando PBKDF2
   * Requirements: 17.3
   */
  private async deriveKeyFromPin(
    pin: string, 
    salt: Uint8Array, 
    iterations: number
  ): Promise<CryptoKey> {
    // Importar PIN como material de clave
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derivar clave AES-256-GCM
    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: iterations,
        hash: 'SHA-256'
      },
      keyMaterial,
      {
        name: 'AES-GCM',
        length: 256
      },
      false, // No extraíble por seguridad
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encriptar datos sensibles
   * Requirements: 17.1, 17.2
   */
  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error('Servicio de encriptación no inicializado. Llama initializeWithPin() primero.');
    }

    if (!data || typeof data !== 'string') {
      throw new Error('Los datos deben ser un string no vacío');
    }

    // Generar IV aleatorio para cada encriptación
    const iv = crypto.getRandomValues(new Uint8Array(12)); // IV de 96-bit para GCM
    
    // Generar salt para esta encriptación
    const salt = crypto.getRandomValues(new Uint8Array(16));
    
    // Re-derivar clave con nuevo salt para esta encriptación
    const encryptionKey = await this.deriveKeyFromPin(this.userPin!, salt, 100000);

    // Encriptar los datos
    const encodedData = new TextEncoder().encode(data);
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      encryptionKey,
      encodedData
    );

    return {
      data: this.arrayBufferToBase64(encryptedBuffer),
      iv: this.arrayBufferToBase64(iv),
      salt: this.arrayBufferToBase64(salt)
    };
  }

  /**
   * Desencriptar datos sensibles
   * Requirements: 17.1, 17.2
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.userPin) {
      throw new Error('Servicio de encriptación no inicializado. Llama initializeWithPin() primero.');
    }

    if (!encryptedData || !encryptedData.data || !encryptedData.iv || !encryptedData.salt) {
      throw new Error('Formato de datos encriptados inválido');
    }

    try {
      // Convertir base64 de vuelta a ArrayBuffer
      const data = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);

      // Re-derivar clave con el salt original
      const decryptionKey = await this.deriveKeyFromPin(
        this.userPin, 
        new Uint8Array(salt), 
        100000
      );

      // Desencriptar los datos
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: 'AES-GCM',
          iv: new Uint8Array(iv)
        },
        decryptionKey,
        new Uint8Array(data)
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      throw new Error(`Desencriptación falló: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Encriptar campos sensibles en un objeto
   * Requirements: 17.2
   */
  async encryptSensitiveFields(obj: Record<string, any>): Promise<Record<string, any>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of EncryptionService.SENSITIVE_FIELDS) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = await this.encrypt(result[field]);
        } catch (error) {
          console.error(`Falló encriptar campo ${field}:`, error);
          // No fallar toda la operación, solo registrar el error
        }
      }
    }

    return result;
  }

  /**
   * Desencriptar campos sensibles en un objeto
   * Requirements: 17.2
   */
  async decryptSensitiveFields(obj: Record<string, any>): Promise<Record<string, any>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of EncryptionService.SENSITIVE_FIELDS) {
      if (result[field] && typeof result[field] === 'object' && result[field].data) {
        try {
          result[field] = await this.decrypt(result[field] as EncryptedData);
        } catch (error) {
          console.error(`Falló desencriptar campo ${field}:`, error);
          // Retornar datos encriptados tal como están si la desencriptación falla
        }
      }
    }

    return result;
  }

  /**
   * Verificar si un campo debe ser encriptado
   * Requirements: 17.2
   */
  static isSensitiveField(fieldName: string): boolean {
    return EncryptionService.SENSITIVE_FIELDS.includes(fieldName);
  }

  /**
   * Verificar si los datos están encriptados
   */
  static isEncrypted(data: any): boolean {
    return !!(
      data &&
      typeof data === 'object' &&
      typeof data.data === 'string' &&
      typeof data.iv === 'string' &&
      typeof data.salt === 'string'
    );
  }

  /**
   * Limpiar clave de encriptación de la memoria
   * Requirements: 17.5
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
    this.userPin = null;
    console.log('🧹 Clave de encriptación limpiada de la memoria');
  }

  /**
   * Verificar si la encriptación está inicializada
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null && this.userPin !== null;
  }

  /**
   * Obtener lista de campos sensibles
   */
  static getSensitiveFields(): string[] {
    return [...EncryptionService.SENSITIVE_FIELDS];
  }

  // Métodos de utilidad para conversión base64
  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
  }
}

// ============================================================================
// FUNCIÓN FACTORY
// ============================================================================

/**
 * Crear una instancia del servicio de encriptación
 */
export function createEncryptionService(): EncryptionService {
  return EncryptionService.getInstance();
}