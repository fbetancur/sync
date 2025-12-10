/**
 * Encryption Integration Tests
 *
 * Tests integration between encryption service and other components.
 * Requirements: 17.4, 17.5
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { encryptionService } from './encryption.service';
import { authService } from '../services/auth.service';

// Mock Supabase
vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signOut: vi.fn().mockResolvedValue({ error: null }),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      getUser: vi.fn().mockResolvedValue({ data: { user: null } })
    }
  }
}));

describe('Encryption Integration', () => {
  const testPin = 'test-pin-123';

  beforeEach(async () => {
    await encryptionService.initializeWithPin(testPin);
  });

  afterEach(() => {
    encryptionService.clearEncryptionKey();
  });

  describe('Auth Service Integration', () => {
    it('should clear encryption key when signing out', async () => {
      // Verify encryption is initialized
      expect(encryptionService.isInitialized()).toBe(true);

      // Sign out
      await authService.signOut();

      // Verify encryption key is cleared
      expect(encryptionService.isInitialized()).toBe(false);
    });

    it('should maintain encryption during session', async () => {
      const testData = 'sensitive-data';

      // Encrypt data
      const encrypted = await encryptionService.encrypt(testData);

      // Verify we can still decrypt (session active)
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(testData);

      // Verify encryption is still initialized
      expect(encryptionService.isInitialized()).toBe(true);
    });
  });

  describe('Database Integration Simulation', () => {
    it('should encrypt and decrypt cliente data for database storage', async () => {
      const clienteData = {
        id: 'cliente-123',
        tenant_id: 'tenant-456',
        nombre: 'Juan Pérez',
        numero_documento: '12345678',
        telefono: '+57300123456',
        direccion: 'Calle 123 #45-67',
        email: 'juan@example.com',
        created_at: Date.now(),
        updated_at: Date.now()
      };

      // Simulate saving to database (encrypt sensitive fields)
      const encryptedForStorage =
        await encryptionService.encryptSensitiveFields(clienteData);

      // Verify sensitive fields are encrypted
      expect(
        encryptionService.constructor.isEncrypted(
          encryptedForStorage.numero_documento
        )
      ).toBe(true);
      expect(
        encryptionService.constructor.isEncrypted(encryptedForStorage.telefono)
      ).toBe(true);
      expect(
        encryptionService.constructor.isEncrypted(encryptedForStorage.direccion)
      ).toBe(true);

      // Verify non-sensitive fields are not encrypted
      expect(encryptedForStorage.nombre).toBe(clienteData.nombre);
      expect(encryptedForStorage.email).toBe(clienteData.email);
      expect(encryptedForStorage.id).toBe(clienteData.id);

      // Simulate reading from database (decrypt sensitive fields)
      const decryptedFromStorage =
        await encryptionService.decryptSensitiveFields(encryptedForStorage);

      // Verify data is restored correctly
      expect(decryptedFromStorage).toEqual(clienteData);
    });

    it('should handle partial encryption failures gracefully', async () => {
      const clienteData = {
        id: 'cliente-123',
        numero_documento: 'valid-document',
        telefono: 123 as any, // Invalid type - should cause encryption to fail
        direccion: 'valid-address'
      };

      // Should not throw error, but handle gracefully
      const result =
        await encryptionService.encryptSensitiveFields(clienteData);

      // Valid fields should be encrypted
      expect(
        encryptionService.constructor.isEncrypted(result.numero_documento)
      ).toBe(true);
      expect(encryptionService.constructor.isEncrypted(result.direccion)).toBe(
        true
      );

      // Invalid field should remain unchanged
      expect(result.telefono).toBe(123);

      // Non-sensitive field should remain unchanged
      expect(result.id).toBe('cliente-123');
    });
  });

  describe('Memory Management', () => {
    it('should not leak sensitive data in memory after clearing', async () => {
      const sensitiveData = 'very-sensitive-information';

      // Encrypt data
      const encrypted = await encryptionService.encrypt(sensitiveData);

      // Clear encryption key
      encryptionService.clearEncryptionKey();

      // Should not be able to decrypt anymore
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow(
        'Encryption service not initialized'
      );

      // Should not be able to encrypt anymore
      await expect(encryptionService.encrypt(sensitiveData)).rejects.toThrow(
        'Encryption service not initialized'
      );
    });

    it('should require re-initialization after clearing', async () => {
      // Clear encryption
      encryptionService.clearEncryptionKey();

      // Should not be initialized
      expect(encryptionService.isInitialized()).toBe(false);

      // Re-initialize
      await encryptionService.initializeWithPin('new-pin');

      // Should be initialized again
      expect(encryptionService.isInitialized()).toBe(true);

      // Should be able to encrypt/decrypt again
      const data = 'test-data';
      const encrypted = await encryptionService.encrypt(data);
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });
  });

  describe('Cross-Session Security', () => {
    it('should not decrypt data encrypted with different PIN', async () => {
      const data = 'secret-data';

      // Encrypt with first PIN
      const encrypted = await encryptionService.encrypt(data);

      // Clear and reinitialize with different PIN
      encryptionService.clearEncryptionKey();
      await encryptionService.initializeWithPin('different-pin');

      // Should not be able to decrypt
      await expect(encryptionService.decrypt(encrypted)).rejects.toThrow();
    });

    it('should maintain data integrity across sessions with same PIN', async () => {
      const data = 'persistent-data';

      // Encrypt with PIN
      const encrypted = await encryptionService.encrypt(data);

      // Simulate session end
      encryptionService.clearEncryptionKey();

      // Simulate new session with same PIN
      await encryptionService.initializeWithPin(testPin);

      // Should be able to decrypt
      const decrypted = await encryptionService.decrypt(encrypted);
      expect(decrypted).toBe(data);
    });
  });

  describe('Performance Considerations', () => {
    it('should handle multiple encryptions efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Encrypt 10 pieces of data concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(encryptionService.encrypt(`data-${i}`));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();

      // Should complete in reasonable time (less than 5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);

      // All should be encrypted
      expect(results).toHaveLength(10);
      results.forEach(result => {
        expect(result).toHaveProperty('data');
        expect(result).toHaveProperty('iv');
        expect(result).toHaveProperty('salt');
      });
    });

    it('should handle large objects efficiently', async () => {
      const largeObject = {
        id: 'large-object',
        numero_documento: 'A'.repeat(1000),
        telefono: 'B'.repeat(1000),
        direccion: 'C'.repeat(1000),
        normal_field: 'D'.repeat(1000)
      };

      const startTime = Date.now();
      const encrypted =
        await encryptionService.encryptSensitiveFields(largeObject);
      const decrypted =
        await encryptionService.decryptSensitiveFields(encrypted);
      const endTime = Date.now();

      // Should complete in reasonable time
      expect(endTime - startTime).toBeLessThan(2000);

      // Data should be preserved
      expect(decrypted).toEqual(largeObject);
    });
  });
});
