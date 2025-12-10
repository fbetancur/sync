/**
 * Svelte hook for Background Sync integration
 * 
 * Provides easy integration of Background Sync in Svelte components
 */

import { onMount, onDestroy } from 'svelte';
import { syncManager } from '../app-config';
import { BackgroundSyncManager } from '../sync/background-sync';

export interface UseBackgroundSyncOptions {
	autoRegister?: boolean;
	onSyncComplete?: (result: any) => void;
	onSyncError?: (error: Error) => void;
}

export function useBackgroundSync(options: UseBackgroundSyncOptions = {}) {
	const backgroundSync = new BackgroundSyncManager();
	let messageHandler: ((event: MessageEvent) => void) | null = null;

	onMount(() => {
		// Setup message listener for Service Worker messages
		messageHandler = async (event: MessageEvent) => {
			if (event.data && event.data.type === 'BACKGROUND_SYNC') {
				console.log('📨 Received background sync request from SW');

				try {
					const result = await syncManager.sync();

					if (result.success) {
						options.onSyncComplete?.(result);
					} else {
						options.onSyncError?.(new Error(result.errors.join(', ')));
					}
				} catch (error) {
					options.onSyncError?.(error as Error);
				}
			}

			// Handle PERFORM_SYNC message with response port
			if (event.data && event.data.type === 'PERFORM_SYNC') {
				console.log('📨 Performing sync for SW...');

				try {
					const result = await syncManager.sync();

					// Send response back through the message port
					if (event.ports && event.ports[0]) {
						event.ports[0].postMessage({
							success: result.success,
							uploaded: result.uploaded,
							downloaded: result.downloaded,
							error: result.success ? null : result.errors.join(', ')
						});
					}

					if (result.success) {
						options.onSyncComplete?.(result);
					} else {
						options.onSyncError?.(new Error(result.errors.join(', ')));
					}
				} catch (error) {
					// Send error response
					if (event.ports && event.ports[0]) {
						event.ports[0].postMessage({
							success: false,
							error: (error as Error).message
						});
					}

					options.onSyncError?.(error as Error);
				}
			}
		};

		navigator.serviceWorker?.addEventListener('message', messageHandler);

		// Auto-register sync if enabled
		if (options.autoRegister) {
			backgroundSync.registerSync({
				onSuccess: () => {
					console.log('✅ Background sync completed');
					options.onSyncComplete?.({ success: true });
				},
				onFailure: (error) => {
					console.error('❌ Background sync failed:', error);
					options.onSyncError?.(error);
				}
			});
		}
	});

	onDestroy(() => {
		// Cleanup message listener
		if (messageHandler) {
			navigator.serviceWorker?.removeEventListener('message', messageHandler);
		}

		// Stop fallback sync
		backgroundSync.stopFallback();
	});

	return {
		/**
		 * Manually trigger background sync registration
		 */
		registerSync: async () => {
			return await backgroundSync.registerSync({
				onSuccess: () => options.onSyncComplete?.({ success: true }),
				onFailure: (error) => options.onSyncError?.(error)
			});
		},

		/**
		 * Check if Background Sync is supported
		 */
		isSupported: () => backgroundSync.isSupported(),

		/**
		 * Request notification permission
		 */
		requestNotificationPermission: async () => {
			return await backgroundSync.requestNotificationPermission();
		},

		/**
		 * Get pending sync tags
		 */
		getPendingTags: async () => {
			return await backgroundSync.getPendingTags();
		},

		/**
		 * Show a sync notification
		 */
		showNotification: async (title: string, body: string) => {
			return await backgroundSync.showSyncNotification(title, body);
		}
	};
}
