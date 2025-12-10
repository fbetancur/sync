/**
 * Hook useEncryption
 * 
 * Hook de Svelte para gestionar el estado y operaciones de encriptación.
 * Requirements: 17.4, 17.5
 */

import { writable, derived } from 'svelte/store';

/**
 * Crear hook de encriptación con servicio inyectado
 */
export function createEncryptionHook(encryptionService) {
  if (!encryptionService) {
    throw new Error('encryptionService es requerido para createEncryptionHook');
  }

  // Crear stores reactivos
  const encryptionState = writable({
    isInitialized: false,
    isLoading: false,
    error: null
  });

  const { subscribe, set, update } = encryptionState;

  /**
   * Inicializar encriptación con PIN del usuario
   */
  async function initializeWithPin(pin) {
    update(state => ({ ...state, isLoading: true, error: null }));

    try {
      await encryptionService.initializeWithPin(pin);
      set({
        isInitialized: true,
        isLoading: false,
        error: null
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Falló la inicialización de encriptación';
      set({
        isInitialized: false,
        isLoading: false,
        error: errorMessage
      });
      throw error;
    }
  }

  /**
   * Limpiar clave de encriptación de la memoria
   * Requirements: 17.5
   */
  function clearEncryption() {
    encryptionService.clearEncryptionKey();
    set({
      isInitialized: false,
      isLoading: false,
      error: null
    });
  }

  /**
   * Encriptar datos sensibles
   */
  async function encrypt(data) {
    if (!encryptionService.isInitialized()) {
      throw new Error('Servicio de encriptación no inicializado');
    }
    return await encryptionService.encrypt(data);
  }

  /**
   * Desencriptar datos sensibles
   */
  async function decrypt(encryptedData) {
    if (!encryptionService.isInitialized()) {
      throw new Error('Servicio de encriptación no inicializado');
    }
    return await encryptionService.decrypt(encryptedData);
  }

  /**
   * Encriptar campos sensibles en un objeto
   */
  async function encryptSensitiveFields(obj) {
    if (!encryptionService.isInitialized()) {
      throw new Error('Servicio de encriptación no inicializado');
    }
    return await encryptionService.encryptSensitiveFields(obj);
  }

  /**
   * Desencriptar campos sensibles en un objeto
   */
  async function decryptSensitiveFields(obj) {
    if (!encryptionService.isInitialized()) {
      throw new Error('Servicio de encriptación no inicializado');
    }
    return await encryptionService.decryptSensitiveFields(obj);
  }

  /**
   * Verificar si la encriptación está inicializada
   */
  function isInitialized() {
    return encryptionService.isInitialized();
  }

  return {
    // Suscripción al store
    subscribe,
    
    // Acciones
    initializeWithPin,
    clearEncryption,
    encrypt,
    decrypt,
    encryptSensitiveFields,
    decryptSensitiveFields,
    isInitialized,
    
    // Stores derivados
    isReady: derived(encryptionState, $state => $state.isInitialized && !$state.isLoading),
    error: derived(encryptionState, $state => $state.error),
    isLoading: derived(encryptionState, $state => $state.isLoading)
  };
}

/**
 * Hook de encriptación básico (requiere inyección de servicio)
 * Para usar este hook, primero debe crear una instancia con createEncryptionHook()
 */
export function useEncryption(encryptionService) {
  if (!encryptionService) {
    console.warn('useEncryption: encryptionService no proporcionado. Use createEncryptionHook() en su lugar.');
    return null;
  }
  
  return createEncryptionHook(encryptionService);
}