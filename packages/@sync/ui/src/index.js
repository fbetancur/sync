/**
 * Componentes UI Compartidos
 *
 * Este paquete proporciona componentes Svelte reutilizables, stores y acciones
 * para aplicaciones de la Plataforma Sync.
 *
 * Requirements: 4.2, 4.4, 4.6
 */

// Componentes Svelte
export { default as PinEntry } from './components/PinEntry.svelte';
export { default as ErrorBoundary } from './components/ErrorBoundary.svelte';

// Hooks de utilidad
export * from './hooks/useEncryption.js';
export * from './hooks/useBackgroundSync.js';

// Stores reactivos
export * from './stores/sync.js';
export * from './stores/auth.js';
