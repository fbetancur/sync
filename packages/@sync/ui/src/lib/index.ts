/**
 * @sync/ui - Shared UI components for Sync Platform
 *
 * This package provides reusable UI components, stores, and actions
 * that can be shared across all applications in the Sync Platform.
 */

// Svelte Components
export { default as ErrorBoundary } from './components/ErrorBoundary.svelte';
export { default as PinEntry } from './components/PinEntry.svelte';
export { default as Modal } from './components/Modal.svelte';
export { default as Button } from './components/Button.svelte';
export { default as Input } from './components/Input.svelte';
export { default as SearchInput } from './components/SearchInput.svelte';
export { default as StatCard } from './components/StatCard.svelte';

// Svelte Stores
export { authStore } from './stores/auth.js';
export { syncStore } from './stores/sync.js';

// Svelte Actions and Hooks
export { useBackgroundSync } from './hooks/useBackgroundSync.js';
export { useEncryption } from './hooks/useEncryption.js';

// Re-export types for convenience
export type { AuthState, SyncState } from './stores/auth.js';
