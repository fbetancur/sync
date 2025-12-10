/**
 * Store de Autenticación
 *
 * Store reactivo para el estado de autenticación global
 */

import { writable, derived } from 'svelte/store';

// Estado de autenticación
const authState = writable({
  isAuthenticated: false,
  user: null,
  isLoading: false,
  error: null,
  encryptionReady: false
});

/**
 * Crear store de autenticación con servicios inyectados
 */
export function createAuthStore(authService, encryptionService) {
  const { subscribe, update, set } = authState;

  return {
    subscribe,

    /**
     * Iniciar sesión
     */
    async login(credentials) {
      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        let user = null;

        if (authService && authService.login) {
          user = await authService.login(credentials);
        }

        update(state => ({
          ...state,
          isAuthenticated: true,
          user,
          isLoading: false,
          error: null
        }));

        return user;
      } catch (error) {
        update(state => ({
          ...state,
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: error.message
        }));
        throw error;
      }
    },

    /**
     * Cerrar sesión
     */
    async logout() {
      update(state => ({ ...state, isLoading: true }));

      try {
        if (authService && authService.logout) {
          await authService.logout();
        }

        // Limpiar encriptación si está disponible
        if (encryptionService && encryptionService.clearEncryptionKey) {
          encryptionService.clearEncryptionKey();
        }

        set({
          isAuthenticated: false,
          user: null,
          isLoading: false,
          error: null,
          encryptionReady: false
        });
      } catch (error) {
        update(state => ({
          ...state,
          isLoading: false,
          error: error.message
        }));
        throw error;
      }
    },

    /**
     * Inicializar encriptación con PIN
     */
    async initializeEncryption(pin) {
      if (!encryptionService) {
        throw new Error('Servicio de encriptación no disponible');
      }

      update(state => ({ ...state, isLoading: true, error: null }));

      try {
        await encryptionService.initializeWithPin(pin);

        update(state => ({
          ...state,
          encryptionReady: true,
          isLoading: false,
          error: null
        }));
      } catch (error) {
        update(state => ({
          ...state,
          encryptionReady: false,
          isLoading: false,
          error: error.message
        }));
        throw error;
      }
    },

    /**
     * Verificar si el usuario está autenticado
     */
    checkAuth() {
      // Implementar lógica de verificación según el servicio de auth
      if (authService && authService.getCurrentUser) {
        const user = authService.getCurrentUser();
        update(state => ({
          ...state,
          isAuthenticated: !!user,
          user
        }));
      }
    },

    /**
     * Limpiar error
     */
    clearError() {
      update(state => ({ ...state, error: null }));
    }
  };
}

// Store básico sin inyección de dependencias
export const authStore = authState;

// Stores derivados
export const isAuthenticated = derived(
  authState,
  $state => $state.isAuthenticated
);
export const currentUser = derived(authState, $state => $state.user);
export const authError = derived(authState, $state => $state.error);
export const isAuthLoading = derived(authState, $state => $state.isLoading);
export const isEncryptionReady = derived(
  authState,
  $state => $state.encryptionReady
);
