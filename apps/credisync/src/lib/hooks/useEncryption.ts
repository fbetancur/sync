/**
 * useEncryption Hook
 *
 * Svelte hook for managing encryption state and operations.
 * Requirements: 17.4, 17.5
 */

import { writable, derived, type Readable } from 'svelte/store';
import { encryptionService } from '../app-config';
import type { EncryptedData } from '../security/encryption.service';

interface EncryptionState {
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
}

// Create reactive stores
const encryptionState = writable<EncryptionState>({
  isInitialized: false,
  isLoading: false,
  error: null
});

/**
 * Encryption hook for Svelte components
 */
export function useEncryption() {
  const { subscribe, set, update } = encryptionState;

  /**
   * Initialize encryption with user PIN
   */
  async function initializeWithPin(pin: string): Promise<void> {
    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      await encryptionService.initializeWithPin(pin);
      set({
        isInitialized: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : 'Failed to initialize encryption';
      set({
        isInitialized: false,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Clear encryption key from memory
   * Requirements: 17.5
   */
  function clearEncryption(): void {
    encryptionService.clearEncryptionKey();
    set({
      isInitialized: false,
      isLoading: false,
      error: null
    });
  }

  /**
   * Encrypt sensitive data
   */
  async function encrypt(data: string): Promise<EncryptedData> {
    if (!encryptionService.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    return await encryptionService.encrypt(data);
  }

  /**
   * Decrypt sensitive data
   */
  async function decrypt(encryptedData: EncryptedData): Promise<string> {
    if (!encryptionService.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    return await encryptionService.decrypt(encryptedData);
  }

  /**
   * Encrypt sensitive fields in an object
   */
  async function encryptSensitiveFields(
    obj: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!encryptionService.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    return await encryptionService.encryptSensitiveFields(obj);
  }

  /**
   * Decrypt sensitive fields in an object
   */
  async function decryptSensitiveFields(
    obj: Record<string, any>
  ): Promise<Record<string, any>> {
    if (!encryptionService.isInitialized()) {
      throw new Error('Encryption service not initialized');
    }
    return await encryptionService.decryptSensitiveFields(obj);
  }

  /**
   * Check if encryption is initialized
   */
  function isInitialized(): boolean {
    return encryptionService.isInitialized();
  }

  return {
    // Store subscription
    subscribe,

    // Actions
    initializeWithPin,
    clearEncryption,
    encrypt,
    decrypt,
    encryptSensitiveFields,
    decryptSensitiveFields,
    isInitialized,

    // Derived stores
    isReady: derived(
      encryptionState,
      $state => $state.isInitialized && !$state.isLoading
    ),
    error: derived(encryptionState, $state => $state.error),
    isLoading: derived(encryptionState, $state => $state.isLoading)
  };
}

// Export singleton hook instance
export const encryption = useEncryption();
