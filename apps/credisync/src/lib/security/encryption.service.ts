/**
 * EncryptionService
 *
 * Provides field-level encryption for sensitive data using Web Crypto API.
 * Uses AES-256-GCM encryption with PBKDF2 key derivation.
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

export interface EncryptedData {
  data: string; // Base64 encoded encrypted data
  iv: string; // Base64 encoded initialization vector
  salt: string; // Base64 encoded salt (for key derivation)
}

export interface EncryptionOptions {
  iterations?: number; // PBKDF2 iterations (default: 100,000)
}

export class EncryptionService {
  private static instance: EncryptionService;
  private encryptionKey: CryptoKey | null = null;
  private userPin: string | null = null;

  // Sensitive field patterns to encrypt
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
   * Get singleton instance
   */
  static getInstance(): EncryptionService {
    if (!EncryptionService.instance) {
      EncryptionService.instance = new EncryptionService();
    }
    return EncryptionService.instance;
  }

  /**
   * Initialize encryption with user PIN
   * Requirements: 17.3, 17.4
   */
  async initializeWithPin(
    pin: string,
    options: EncryptionOptions = {}
  ): Promise<void> {
    if (!pin || pin.length < 4) {
      throw new Error('PIN must be at least 4 characters long');
    }

    this.userPin = pin;

    // Generate a random salt for key derivation
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Derive encryption key from PIN using PBKDF2
    const iterations = options.iterations || 100000; // Requirement 17.3
    this.encryptionKey = await this.deriveKeyFromPin(pin, salt, iterations);

    console.log('🔐 Encryption service initialized');
  }

  /**
   * Derive encryption key from PIN using PBKDF2
   * Requirements: 17.3
   */
  private async deriveKeyFromPin(
    pin: string,
    salt: Uint8Array,
    iterations: number
  ): Promise<CryptoKey> {
    // Import PIN as key material
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(pin),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive AES-256-GCM key
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
      false, // Not extractable for security
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt sensitive data
   * Requirements: 17.1, 17.2
   */
  async encrypt(data: string): Promise<EncryptedData> {
    if (!this.encryptionKey) {
      throw new Error(
        'Encryption service not initialized. Call initializeWithPin() first.'
      );
    }

    if (!data || typeof data !== 'string') {
      throw new Error('Data must be a non-empty string');
    }

    // Generate random IV for each encryption
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM

    // Generate salt for this encryption
    const salt = crypto.getRandomValues(new Uint8Array(16));

    // Re-derive key with new salt for this encryption
    const encryptionKey = await this.deriveKeyFromPin(
      this.userPin!,
      salt,
      100000
    );

    // Encrypt the data
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
   * Decrypt sensitive data
   * Requirements: 17.1, 17.2
   */
  async decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!this.userPin) {
      throw new Error(
        'Encryption service not initialized. Call initializeWithPin() first.'
      );
    }

    if (
      !encryptedData ||
      !encryptedData.data ||
      !encryptedData.iv ||
      !encryptedData.salt
    ) {
      throw new Error('Invalid encrypted data format');
    }

    try {
      // Convert base64 back to ArrayBuffer
      const data = this.base64ToArrayBuffer(encryptedData.data);
      const iv = this.base64ToArrayBuffer(encryptedData.iv);
      const salt = this.base64ToArrayBuffer(encryptedData.salt);

      // Re-derive key with the original salt
      const decryptionKey = await this.deriveKeyFromPin(
        this.userPin,
        new Uint8Array(salt),
        100000
      );

      // Decrypt the data
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
      throw new Error(
        `Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Encrypt sensitive fields in an object
   * Requirements: 17.2
   */
  async encryptSensitiveFields(
    obj: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of EncryptionService.SENSITIVE_FIELDS) {
      if (result[field] && typeof result[field] === 'string') {
        try {
          result[field] = await this.encrypt(result[field]);
        } catch (error) {
          console.error(`Failed to encrypt field ${field}:`, error);
          // Don't fail the entire operation, just log the error
        }
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   * Requirements: 17.2
   */
  async decryptSensitiveFields(
    obj: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!obj || typeof obj !== 'object') {
      return obj;
    }

    const result = { ...obj };

    for (const field of EncryptionService.SENSITIVE_FIELDS) {
      if (
        result[field] &&
        typeof result[field] === 'object' &&
        result[field].data
      ) {
        try {
          result[field] = await this.decrypt(result[field] as EncryptedData);
        } catch (error) {
          console.error(`Failed to decrypt field ${field}:`, error);
          // Return encrypted data as-is if decryption fails
        }
      }
    }

    return result;
  }

  /**
   * Check if a field should be encrypted
   * Requirements: 17.2
   */
  static isSensitiveField(fieldName: string): boolean {
    return EncryptionService.SENSITIVE_FIELDS.includes(fieldName);
  }

  /**
   * Check if data is encrypted
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
   * Clear encryption key from memory
   * Requirements: 17.5
   */
  clearEncryptionKey(): void {
    this.encryptionKey = null;
    this.userPin = null;
    console.log('🧹 Encryption key cleared from memory');
  }

  /**
   * Check if encryption is initialized
   */
  isInitialized(): boolean {
    return this.encryptionKey !== null && this.userPin !== null;
  }

  /**
   * Get list of sensitive fields
   */
  static getSensitiveFields(): string[] {
    return [...EncryptionService.SENSITIVE_FIELDS];
  }

  // Utility methods for base64 conversion
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

// Export singleton instance
export const encryptionService = EncryptionService.getInstance();
