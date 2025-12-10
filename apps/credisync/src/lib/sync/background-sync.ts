/**
 * Background Sync Manager
 *
 * Integrates with Service Worker Background Sync API to enable
 * automatic synchronization even when the app is closed.
 *
 * Requirements: 5.9
 */

export interface BackgroundSyncOptions {
  tag?: string;
  onSuccess?: () => void;
  onFailure?: (error: Error) => void;
}

export class BackgroundSyncManager {
  private static readonly DEFAULT_TAG = 'credisync-sync';
  private static readonly FALLBACK_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private fallbackIntervalId: number | null = null;

  /**
   * Check if Background Sync API is supported
   */
  isSupported(): boolean {
    return (
      'serviceWorker' in navigator &&
      'sync' in ServiceWorkerRegistration.prototype
    );
  }

  /**
   * Register a background sync event
   * Requirements: 5.9
   */
  async registerSync(options: BackgroundSyncOptions = {}): Promise<boolean> {
    const tag = options.tag || BackgroundSyncManager.DEFAULT_TAG;

    // Check if Background Sync is supported
    if (!this.isSupported()) {
      console.warn('Background Sync not supported, using fallback');
      this.setupFallback(options);
      return false;
    }

    try {
      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Register sync event
      await registration.sync.register(tag);

      console.log(`✅ Background sync registered: ${tag}`);
      return true;
    } catch (error) {
      console.error('Failed to register background sync:', error);

      // Fallback to periodic sync
      this.setupFallback(options);
      return false;
    }
  }

  /**
   * Setup fallback for browsers without Background Sync
   * Uses periodic polling as fallback
   */
  private setupFallback(options: BackgroundSyncOptions): void {
    // Clear existing interval
    if (this.fallbackIntervalId !== null) {
      clearInterval(this.fallbackIntervalId);
    }

    // Setup periodic sync
    this.fallbackIntervalId = window.setInterval(async () => {
      try {
        // Import SyncManager dynamically to avoid circular dependencies
        const { SyncManager } = await import('./sync-manager');
        const syncManager = new SyncManager();

        // Only sync if online
        if (syncManager.isOnline()) {
          const result = await syncManager.sync();

          if (result.success) {
            options.onSuccess?.();
          } else {
            options.onFailure?.(new Error(result.errors.join(', ')));
          }
        }
      } catch (error) {
        console.error('Fallback sync failed:', error);
        options.onFailure?.(error as Error);
      }
    }, BackgroundSyncManager.FALLBACK_INTERVAL);

    console.log('⏰ Fallback periodic sync enabled (every 5 minutes)');
  }

  /**
   * Stop fallback periodic sync
   */
  stopFallback(): void {
    if (this.fallbackIntervalId !== null) {
      clearInterval(this.fallbackIntervalId);
      this.fallbackIntervalId = null;
      console.log('⏹️ Fallback periodic sync stopped');
    }
  }

  /**
   * Get list of pending sync tags
   */
  async getPendingTags(): Promise<string[]> {
    if (!this.isSupported()) {
      return [];
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      return await registration.sync.getTags();
    } catch (error) {
      console.error('Failed to get pending sync tags:', error);
      return [];
    }
  }

  /**
   * Show notification after successful sync
   */
  async showSyncNotification(title: string, body: string): Promise<void> {
    // Check if notifications are supported
    if (typeof Notification === 'undefined') {
      console.warn('Notifications not supported');
      return;
    }

    // Request permission if not granted
    if (Notification.permission === 'default') {
      await Notification.requestPermission();
    }

    // Show notification if permission granted
    if (Notification.permission === 'granted') {
      try {
        const registration = await navigator.serviceWorker.ready;
        await registration.showNotification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
          tag: 'sync-notification',
          requireInteraction: false,
          silent: false
        });
      } catch (error) {
        console.error('Failed to show notification:', error);
      }
    }
  }

  /**
   * Request notification permission
   */
  async requestNotificationPermission(): Promise<NotificationPermission> {
    if (typeof Notification === 'undefined') {
      return 'denied';
    }

    if (Notification.permission === 'default') {
      return await Notification.requestPermission();
    }

    return Notification.permission;
  }
}
