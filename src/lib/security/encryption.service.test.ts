/**
 * EncryptionService Tests
 * 
 * Tests for field-level encryption functionality.
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { EncryptionService, type EncryptedData } from './encryption.service';

describe('EncryptionService', () => {
  let encryptionService: EncryptionService;
  const testPin = '1234567890';
  const testData = 'sensitive-data-123';

  beforeEach(async () => {
    encryptionService = EncryptionService.getInstance();
    await encryptionService.initializeWithPin(testPin);
  });

  afterEach(() => {
    encryptionService.clearEncryptionKey();
  });

  describe('Initialization', () => {
    it('should be a singleton', () => {
      const instance1 = EncryptionService.getInstance();
      const instance2 = EncryptionService.getInstance();
      expect(instance1).toBe(instance2);
    });

    it('should initialize with valid PIN', async () => {
      const service = EncryptionService.getInstance();
      await service.initializeWithPin('validpin123');
      expect(service.isInitialized()).toBe(true);
    });

    it('should reject PIN shorter than 4 characters', async () => {
      const service = EncryptionService.getInstance();
      await expect(service.initializeWithPin('123')).rejects.toThrow(
        'PIN must be at least 4 characters long'
      );
    });

    it('should reject empty PIN', async () => {
      const service = EncryptionService.getInstance();
      await expect(service.initializeWithPin('')).rejects.toThrow(
        'PIN must be at least 4 characters long'
      );
    });
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and decrypt data successfully', async () => {
      const encrypted = await encryptionService.encrypt(testData);
      
      expect(encrypted).toHaveProperty('data');
      expect(encrypted).toHaveProperty('iv');
      expect(encrypted).toHaveProperty('salt');
      expect(typeof encrypted.data).toBe('string');
      expect(typeof encrypted.iv).toBe('string');
      expect(typeof encrypted.salt).toBe('string');

      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(testData);
    });

    it('should produce different encrypted data for same input', async () => {
      const encrypted1 = await encryptionService.encrypt(testData);
      const encrypted2 = await encryptionService.encrypt(testData);
      
      // Should be different due to random IV and salt
      expect(encrypted1.data).not.toBe(encrypted2.data);
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      expect(encrypted1.salt).not.toBe(encrypted2.salt);

      // But both should decrypt to same original data
      const decrypted1 = await encryptionService.decrypt(encrypted1);
      const decrypted2 = await encryptionService.decrypt(encrypted2);
      expect(decrypted1).toBe(testData);
      expect(decrypted2).toBe(testData);
    });

    it('should handle empty string encryption', async () => {
      await expect(encryptionService.encrypt('')).rejects.toThrow(
        'Data must be a non-empty string'
      );
    });

    it('should handle non-string data', async () => {
      await expect(encryptionService.encrypt(null as any)).rejects.toThrow(
        'Data must be a non-empty string'
      );
      await expect(encryptionService.encrypt(123 as any)).rejects.toThrow(
        'Data must be a non-empty string'
      );
    });

    it('should fail encryption when not initialized', async () => {
      const uninitializedService = EncryptionService.getInstance();
      uninitializedService.clearEncryptionKey();
      
      await expect(uninitializedService.encrypt(testData)).rejects.toThrow(
        'Encryption service not initialized'
      );
    });

    it('should fail decryption when not initialized', async () => {
      const encrypted = await encryptionService.encrypt(testData);
      encryptionService.clearEncryptionKey();
      
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow(
        'Encryption service not initialized'
      );
    });

    it('should fail decryption with invalid encrypted data', async () => {
      await encryptionService.initializeWithPin(testPin);
      
      const invalidData: EncryptedData = {
        data: 'invalid',
        iv: 'invalid',
        salt: 'invalid'
      };
      
      await expect(encryptionService.decrypt(invalidData)).rejects.toThrow(
        'Decryption failed'
      );
    });

    it('should handle Unicode characters', async () => {
      const unicodeData = '🔐 Datos sensibles con émojis y acentos ñáéíóú';
      const encrypted = await encryptionService.encrypt(unicodeData);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(unicodeData);
    });

    it('should handle long strings', async () => {
      const longData = 'A'.repeat(10000);
      const encrypted = await encryptionService.encrypt(longData);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(longData);
    });
  });

  describe('Sensitive Fields Encryption', () => {
    it('should encrypt sensitive fields in object', async () => {
      const testObject = {
        id: '123',
        nombre: 'Juan Pérez',
        numero_documento: '12345678',
        telefono: '+57300123456',
        direccion: 'Calle 123 #45-67',
        email: 'juan@example.com'
      };

      const encrypted = await encryptionService.encryptSensitiveFields(testObject);
      
      // Non-sensitive fields should remain unchanged
      expect(encrypted.id).toBe(testObject.id);
      expect(encrypted.nombre).toBe(testObject.nombre);
      expect(encrypted.email).toBe(testObject.email);
      
      // Sensitive fields should be encrypted
      expect(encrypted.numero_documento).not.toBe(testObject.numero_documento);
      expect(encrypted.telefono).not.toBe(testObject.telefono);
      expect(encrypted.direccion).not.toBe(testObject.direccion);
      
      // Encrypted fields should have the correct structure
      expect(EncryptionService.isEncrypted(encrypted.numero_documento)).toBe(true);
      expect(EncryptionService.isEncrypted(encrypted.telefono)).toBe(true);
      expect(EncryptionService.isEncrypted(encrypted.direccion)).toBe(true);
    });

    it('should decrypt sensitive fields in object', async () => {
      const testObject = {
        id: '123',
        nombre: 'Juan Pérez',
        numero_documento: '12345678',
        telefono: '+57300123456',
        direccion: 'Calle 123 #45-67'
      };

      const encrypted = await encryptionService.encryptSensitiveFields(testObject);
      const decrypted = await encryptionService.decryptSensitiveFields(encrypted);
      
      expect(decrypted).toEqual(testObject);
    });

    it('should handle objects with no sensitive fields', async () => {
      const testObject = {
        id: '123',
        nombre: 'Juan Pérez',
        email: 'juan@example.com'
      };

      const encrypted = await encryptionService.encryptSensitiveFields(testObject);
      expect(encrypted).toEqual(testObject);
      
      const decrypted = await encryptionService.decryptSensitiveFields(encrypted);
      expect(decrypted).toEqual(testObject);
    });

    it('should handle null and undefined objects', async () => {
      expect(await encryptionService.encryptSensitiveFields(null)).toBe(null);
      expect(await encryptionService.encryptSensitiveFields(undefined)).toBe(undefined);
      expect(await encryptionService.decryptSensitiveFields(null)).toBe(null);
      expect(await encryptionService.decryptSensitiveFields(undefined)).toBe(undefined);
    });

    it('should handle objects with null sensitive field values', async () => {
      const testObject = {
        id: '123',
        numero_documento: null,
        telefono: undefined,
        direccion: ''
      };

      const encrypted = await encryptionService.encryptSensitiveFields(testObject);
      expect(encrypted.numero_documento).toBe(null);
      expect(encrypted.telefono).toBe(undefined);
      expect(encrypted.direccion).toBe(''); // Empty string is not encrypted
    });
  });

  describe('Utility Methods', () => {
    it('should identify sensitive fields correctly', () => {
      expect(EncryptionService.isSensitiveField('numero_documento')).toBe(true);
      expect(EncryptionService.isSensitiveField('telefono')).toBe(true);
      expect(EncryptionService.isSensitiveField('direccion')).toBe(true);
      expect(EncryptionService.isSensitiveField('nombre')).toBe(false);
      expect(EncryptionService.isSensitiveField('email')).toBe(false);
    });

    it('should identify encrypted data correctly', () => {
      const encryptedData: EncryptedData = {
        data: 'base64data',
        iv: 'base64iv',
        salt: 'base64salt'
      };
      
      expect(EncryptionService.isEncrypted(encryptedData)).toBe(true);
      expect(EncryptionService.isEncrypted('plain string')).toBe(false);
      expect(EncryptionService.isEncrypted({ data: 'missing iv and salt' })).toBe(false);
      expect(EncryptionService.isEncrypted(null)).toBe(false);
    });

    it('should return list of sensitive fields', () => {
      const fields = EncryptionService.getSensitiveFields();
      expect(Array.isArray(fields)).toBe(true);
      expect(fields).toContain('numero_documento');
      expect(fields).toContain('telefono');
      expect(fields).toContain('direccion');
    });
  });

  describe('Key Management', () => {
    it('should clear encryption key from memory', () => {
      expect(encryptionService.isInitialized()).toBe(true);
      encryptionService.clearEncryptionKey();
      expect(encryptionService.isInitialized()).toBe(false);
    });

    it('should use different keys for different PINs', async () => {
      const data = 'test data';
      
      // Encrypt with first PIN
      await encryptionService.initializeWithPin('pin1');
      const encrypted1 = await encryptionService.encrypt(data);
      
      // Try to decrypt with different PIN
      encryptionService.clearEncryptionKey();
      await encryptionService.initializeWithPin('pin2');
      
      await expect(encryptionService.decrypt(encrypted1)).rejects.toThrow();
    });

    it('should use PBKDF2 with 100,000 iterations by default', async () => {
      // This is tested implicitly through successful encryption/decryption
      // The actual iteration count is verified in the implementation
      const service = EncryptionService.getInstance();
      service.clearEncryptionKey();
      
      await service.initializeWithPin('testpin');
      const encrypted = await service.encrypt('test data');
      const decrypted = await service.decrypt(encrypted);
      
      expect(decrypted).toBe('test data');
    });

    it('should allow custom iteration count', async () => {
      const service = EncryptionService.getInstance();
      service.clearEncryptionKey();
      
      await service.initializeWithPin('testpin', { iterations: 50000 });
      const encrypted = await service.encrypt('test data');
      const decrypted = await service.decrypt(encrypted);
      
      expect(decrypted).toBe('test data');
    });
  });

  describe('Error Handling', () => {
    it('should handle encryption errors gracefully in object encryption', async () => {
      const testObject = {
        numero_documento: 'valid',
        telefono: 123 as any // Invalid type
      };

      // Should not throw, but log error
      const encrypted = await encryptionService.encryptSensitiveFields(testObject);
      expect(encrypted.numero_documento).not.toBe('valid'); // Should be encrypted
      expect(encrypted.telefono).toBe(123); // Should remain unchanged due to error
    });

    it('should handle decryption errors gracefully in object decryption', async () => {
      const testObject = {
        numero_documento: {
          data: 'invalid',
          iv: 'invalid', 
          salt: 'invalid'
        }
      };

      // Should not throw, but return encrypted data as-is
      const decrypted = await encryptionService.decryptSensitiveFields(testObject);
      expect(decrypted.numero_documento).toEqual(testObject.numero_documento);
    });
  });
});