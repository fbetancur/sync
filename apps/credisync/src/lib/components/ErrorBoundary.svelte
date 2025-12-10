<script lang="ts">
  /**
   * Error Boundary Component
   *
   * Catches errors in child components and displays a fallback UI.
   * Logs errors to Sentry and local storage.
   *
   * Requirements: 20.1, 20.3
   */

  import { onMount, onDestroy } from 'svelte';
  import { errorLogger } from '../monitoring/error-logger';

  export let fallback: string = 'Algo salió mal. Por favor, recarga la página.';
  export let showDetails: boolean = false;

  let error: Error | null = null;
  let errorInfo: string = '';
  let hasError: boolean = false;

  // Error handler
  function handleError(event: ErrorEvent) {
    event.preventDefault();

    error = event.error;
    errorInfo = event.error?.stack || event.message;
    hasError = true;

    // Log to error logger
    errorLogger.logError(event.error || event.message, {
      component: 'ErrorBoundary',
      errorInfo
    });
  }

  // Unhandled rejection handler
  function handleUnhandledRejection(event: PromiseRejectionEvent) {
    event.preventDefault();

    error = new Error(event.reason);
    errorInfo = event.reason?.stack || String(event.reason);
    hasError = true;

    // Log to error logger
    errorLogger.logError(error, {
      component: 'ErrorBoundary',
      type: 'unhandledRejection',
      errorInfo
    });
  }

  // Reset error state
  function resetError() {
    error = null;
    errorInfo = '';
    hasError = false;
  }

  // Reload page
  function reloadPage() {
    window.location.reload();
  }

  onMount(() => {
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);
  });

  onDestroy(() => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  });
</script>

{#if hasError}
  <div class="error-boundary">
    <div class="error-content">
      <div class="error-icon">⚠️</div>
      <h2 class="error-title">Error</h2>
      <p class="error-message">{fallback}</p>

      {#if showDetails && errorInfo}
        <details class="error-details">
          <summary>Detalles técnicos</summary>
          <pre class="error-stack">{errorInfo}</pre>
        </details>
      {/if}

      <div class="error-actions">
        <button class="btn btn-primary" on:click={reloadPage}>
          Recargar página
        </button>
        <button class="btn btn-secondary" on:click={resetError}>
          Intentar de nuevo
        </button>
      </div>
    </div>
  </div>
{:else}
  <slot />
{/if}

<style>
  .error-boundary {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 2rem;
    background-color: #f9fafb;
  }

  .error-content {
    max-width: 600px;
    width: 100%;
    background: white;
    border-radius: 8px;
    padding: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    text-align: center;
  }

  .error-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .error-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .error-message {
    color: #6b7280;
    margin-bottom: 1.5rem;
  }

  .error-details {
    text-align: left;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background-color: #f3f4f6;
    border-radius: 4px;
  }

  .error-details summary {
    cursor: pointer;
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
  }

  .error-stack {
    font-size: 0.875rem;
    color: #4b5563;
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .error-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .btn {
    padding: 0.5rem 1rem;
    border-radius: 4px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover {
    background-color: #2563eb;
  }

  .btn-secondary {
    background-color: #e5e7eb;
    color: #374151;
  }

  .btn-secondary:hover {
    background-color: #d1d5db;
  }
</style>
