/**
 * @sync/ui - Shared UI components for Sync Platform
 *
 * This package provides reusable UI components, stores, and actions
 * that can be shared across all applications in the Sync Platform.
 */
export { default as ErrorBoundary } from './components/ErrorBoundary.svelte';
export { default as PinEntry } from './components/PinEntry.svelte';
export { authStore } from './stores/auth.js';
export { syncStore } from './stores/sync.js';
export { useBackgroundSync } from './hooks/useBackgroundSync.js';
export { useEncryption } from './hooks/useEncryption.js';
export type { AuthState, SyncState } from './stores/auth.js';
//# sourceMappingURL=index.d.ts.map