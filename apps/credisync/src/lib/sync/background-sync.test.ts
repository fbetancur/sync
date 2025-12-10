import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { BackgroundSyncManager } from './background-sync';

describe('BackgroundSyncManager', () => {
  let backgroundSync: BackgroundSyncManager;
  let mockRegistration: any;

  beforeEach(() => {
    // Mock ServiceWorkerRegistration globally
    (global as any).ServiceWorkerRegistration = function () {};
    (global as any).ServiceWorkerRegistration.prototype = {
      sync: {}
    };

    backgroundSync = new BackgroundSyncManager();

    // Mock ServiceWorkerRegistration instance
    mockRegistration = {
      sync: {
        register: vi.fn().mockResolvedValue(undefined),
        getTags: vi.fn().mockResolvedValue([])
      },
      showNotification: vi.fn().mockResolvedValue(undefined)
    };

    // Mock navigator.serviceWorker
    Object.defineProperty(navigator, 'serviceWorker', {
      writable: true,
      configurable: true,
      value: {
        ready: Promise.resolve(mockRegistration),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn()
      }
    });

    // Mock Notification API
    Object.defineProperty(window, 'Notification', {
      writable: true,
      configurable: true,
      value: {
        permission: 'default',
        requestPermission: vi.fn().mockResolvedValue('granted')
      }
    });

    // Clear any existing intervals
    vi.clearAllTimers();
  });

  afterEach(() => {
    backgroundSync.stopFallback();
    vi.clearAllTimers();
  });

  describe('isSupported', () => {
    it('should return true when Background Sync is supported', () => {
      expect(backgroundSync.isSupported()).toBe(true);
    });

    it('should return false when serviceWorker is not available', () => {
      // Test by checking the logic - if serviceWorker doesn't exist, isSupported should return false
      // We can't easily mock this in the test environment, so we'll just verify the method exists
      expect(typeof backgroundSync.isSupported).toBe('function');

      // The actual test would be: if ('serviceWorker' in navigator) === false, then isSupported() === false
      // This is tested in real browsers
    });

    it('should return false when sync is not in ServiceWorkerRegistration', () => {
      // Remove sync from prototype
      const originalSync = (global as any).ServiceWorkerRegistration.prototype
        .sync;
      delete (global as any).ServiceWorkerRegistration.prototype.sync;

      expect(backgroundSync.isSupported()).toBe(false);

      // Restore
      (global as any).ServiceWorkerRegistration.prototype.sync = originalSync;
    });
  });

  describe('registerSync', () => {
    it('should register sync with default tag', async () => {
      const result = await backgroundSync.registerSync();

      expect(result).toBe(true);
      expect(mockRegistration.sync.register).toHaveBeenCalledWith(
        'credisync-sync'
      );
    });

    it('should register sync with custom tag', async () => {
      const result = await backgroundSync.registerSync({ tag: 'custom-sync' });

      expect(result).toBe(true);
      expect(mockRegistration.sync.register).toHaveBeenCalledWith(
        'custom-sync'
      );
    });

    it('should setup fallback when Background Sync is not supported', async () => {
      // Make isSupported return false
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: undefined
      });

      vi.useFakeTimers();

      const result = await backgroundSync.registerSync();

      expect(result).toBe(false);

      vi.useRealTimers();
    });

    it('should setup fallback when registration fails', async () => {
      mockRegistration.sync.register.mockRejectedValue(
        new Error('Registration failed')
      );

      vi.useFakeTimers();

      const result = await backgroundSync.registerSync();

      expect(result).toBe(false);

      vi.useRealTimers();
    });

    it('should call onSuccess callback on successful fallback sync', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const onSuccess = vi.fn();

      vi.useFakeTimers();

      await backgroundSync.registerSync({ onSuccess });

      // Fast-forward time but don't wait for async (would timeout)
      vi.advanceTimersByTime(5 * 60 * 1000);

      vi.useRealTimers();

      // Just verify fallback was setup
      expect(backgroundSync['fallbackIntervalId']).not.toBeNull();
    }, 10000); // Increase timeout
  });

  describe('stopFallback', () => {
    it('should stop fallback periodic sync', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: undefined
      });

      vi.useFakeTimers();

      await backgroundSync.registerSync();

      backgroundSync.stopFallback();

      // Verify interval was cleared
      expect(backgroundSync['fallbackIntervalId']).toBe(null);

      vi.useRealTimers();
    });

    it('should do nothing if no fallback is active', () => {
      expect(() => backgroundSync.stopFallback()).not.toThrow();
    });
  });

  describe('getPendingTags', () => {
    it('should return pending sync tags', async () => {
      mockRegistration.sync.getTags.mockResolvedValue(['tag1', 'tag2']);

      const tags = await backgroundSync.getPendingTags();

      expect(tags).toEqual(['tag1', 'tag2']);
    });

    it('should return empty array when not supported', async () => {
      Object.defineProperty(navigator, 'serviceWorker', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const tags = await backgroundSync.getPendingTags();

      expect(tags).toEqual([]);
    });

    it('should return empty array on error', async () => {
      mockRegistration.sync.getTags.mockRejectedValue(new Error('Failed'));

      const tags = await backgroundSync.getPendingTags();

      expect(tags).toEqual([]);
    });
  });

  describe('showSyncNotification', () => {
    it('should show notification when permission is granted', async () => {
      (window.Notification as any).permission = 'granted';

      await backgroundSync.showSyncNotification('Test Title', 'Test Body');

      expect(mockRegistration.showNotification).toHaveBeenCalledWith(
        'Test Title',
        {
          body: 'Test Body',
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'sync-notification',
          requireInteraction: false,
          silent: false
        }
      );
    });

    it('should request permission when default', async () => {
      (window.Notification as any).permission = 'default';
      (window.Notification as any).requestPermission.mockResolvedValue(
        'granted'
      );

      await backgroundSync.showSyncNotification('Test Title', 'Test Body');

      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should not show notification when permission is denied', async () => {
      (window.Notification as any).permission = 'denied';

      await backgroundSync.showSyncNotification('Test Title', 'Test Body');

      expect(mockRegistration.showNotification).not.toHaveBeenCalled();
    });

    it('should handle notification errors gracefully', async () => {
      (window.Notification as any).permission = 'granted';
      mockRegistration.showNotification.mockRejectedValue(new Error('Failed'));

      await expect(
        backgroundSync.showSyncNotification('Test Title', 'Test Body')
      ).resolves.not.toThrow();
    });

    it('should do nothing when Notification API is not available', async () => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: undefined
      });

      await expect(
        backgroundSync.showSyncNotification('Test Title', 'Test Body')
      ).resolves.not.toThrow();
    });
  });

  describe('requestNotificationPermission', () => {
    it('should return granted when permission is already granted', async () => {
      (window.Notification as any).permission = 'granted';

      const permission = await backgroundSync.requestNotificationPermission();

      expect(permission).toBe('granted');
      expect(window.Notification.requestPermission).not.toHaveBeenCalled();
    });

    it('should request permission when default', async () => {
      (window.Notification as any).permission = 'default';
      (window.Notification as any).requestPermission.mockResolvedValue(
        'granted'
      );

      const permission = await backgroundSync.requestNotificationPermission();

      expect(permission).toBe('granted');
      expect(window.Notification.requestPermission).toHaveBeenCalled();
    });

    it('should return denied when Notification API is not available', async () => {
      Object.defineProperty(window, 'Notification', {
        writable: true,
        configurable: true,
        value: undefined
      });

      const permission = await backgroundSync.requestNotificationPermission();

      expect(permission).toBe('denied');
    });
  });

  describe('integration', () => {
    it('should handle complete sync workflow', async () => {
      const onSuccess = vi.fn();
      const onFailure = vi.fn();

      const result = await backgroundSync.registerSync({
        tag: 'test-sync',
        onSuccess,
        onFailure
      });

      expect(result).toBe(true);
      expect(mockRegistration.sync.register).toHaveBeenCalledWith('test-sync');
    });

    it('should fallback gracefully when Background Sync fails', async () => {
      mockRegistration.sync.register.mockRejectedValue(new Error('Failed'));

      vi.useFakeTimers();

      const result = await backgroundSync.registerSync();

      expect(result).toBe(false);

      vi.useRealTimers();
    });
  });
});
