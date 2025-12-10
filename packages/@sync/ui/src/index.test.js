/**
 * Tests para @sync/ui hooks y stores
 *
 * Verifica que los hooks y stores funcionen correctamente
 */

import { describe, it, expect } from 'vitest';

describe('@sync/ui hooks', () => {
  it('debería exportar hooks de utilidad', async () => {
    const {
      createEncryptionHook,
      useEncryption,
      createBackgroundSyncHook,
      useBackgroundSync
    } = await import('./hooks/useEncryption.js');

    // Verificar que los hooks están disponibles
    expect(createEncryptionHook).toBeDefined();
    expect(useEncryption).toBeDefined();
    expect(typeof createEncryptionHook).toBe('function');
    expect(typeof useEncryption).toBe('function');
  });

  it('debería crear hook de encriptación con servicio', async () => {
    const { createEncryptionHook } = await import('./hooks/useEncryption.js');

    const mockEncryptionService = {
      initializeWithPin: async () => {},
      clearEncryptionKey: () => {},
      isInitialized: () => false,
      encrypt: async () => ({ data: 'encrypted', iv: 'iv', salt: 'salt' }),
      decrypt: async () => 'decrypted',
      encryptSensitiveFields: async obj => obj,
      decryptSensitiveFields: async obj => obj
    };

    const hook = createEncryptionHook(mockEncryptionService);

    expect(hook).toBeDefined();
    expect(hook.subscribe).toBeDefined();
    expect(hook.initializeWithPin).toBeDefined();
    expect(hook.clearEncryption).toBeDefined();
  });
});

describe('@sync/ui stores', () => {
  it('debería exportar stores reactivos', async () => {
    const { syncStore, authStore, createSyncStore, createAuthStore } =
      await import('./stores/sync.js');

    // Verificar que los stores están disponibles
    expect(syncStore).toBeDefined();
    expect(createSyncStore).toBeDefined();
    expect(typeof createSyncStore).toBe('function');
  });

  it('debería crear store de sincronización con manager', async () => {
    const { createSyncStore } = await import('./stores/sync.js');

    const mockSyncManager = {
      sync: async () => ({
        success: true,
        uploaded: 0,
        downloaded: 0,
        errors: []
      }),
      getQueueSize: async () => 0
    };

    const store = createSyncStore(mockSyncManager);

    expect(store).toBeDefined();
    expect(store.subscribe).toBeDefined();
    expect(store.startSync).toBeDefined();
    expect(store.updateQueueSize).toBeDefined();
  });
});
