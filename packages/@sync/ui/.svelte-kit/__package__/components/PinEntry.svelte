<!--
  Componente de Entrada de PIN
  
  Componente para entrada segura de PIN para inicializar encriptación.
  Requirements: 17.3, 17.4
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher<{
    success: { pin: string };
    cancel: void;
  }>();

  export let title = 'Ingrese su PIN de seguridad';
  export let subtitle = 'Su PIN se usa para encriptar datos sensibles';
  export let required = true;
  export let minLength = 4;
  export let maxLength = 20;
  export let encryptionService: any = null; // Inyección de dependencia

  let pin = '';
  let confirmPin = '';
  let showConfirm = false;
  let isLoading = false;
  let error = '';
  let showPin = false;

  $: isValidPin = pin.length >= minLength && pin.length <= maxLength;
  $: pinsMatch = pin === confirmPin;
  $: canSubmit = isValidPin && (!showConfirm || pinsMatch) && !isLoading;

  async function handleSubmit() {
    if (!canSubmit) return;

    if (!showConfirm) {
      // Primera entrada - mostrar confirmación
      showConfirm = true;
      confirmPin = '';
      return;
    }

    if (!pinsMatch) {
      error = 'Los PINs no coinciden';
      return;
    }

    isLoading = true;
    error = '';

    try {
      if (encryptionService) {
        await encryptionService.initializeWithPin(pin);
      }
      dispatch('success', { pin });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Error al inicializar encriptación';
    } finally {
      isLoading = false;
    }
  }

  function handleCancel() {
    if (showConfirm) {
      // Volver a la primera entrada
      showConfirm = false;
      confirmPin = '';
      error = '';
    } else {
      dispatch('cancel');
    }
  }

  function toggleShowPin() {
    showPin = !showPin;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSubmit();
    } else if (event.key === 'Escape') {
      handleCancel();
    }
  }
</script>

<div class="pin-entry-overlay">
  <div class="pin-entry-modal">
    <div class="pin-entry-header">
      <h2 class="pin-entry-title">{title}</h2>
      <p class="pin-entry-subtitle">{subtitle}</p>
    </div>

    <form on:submit|preventDefault={handleSubmit} class="pin-entry-form">
      {#if error}
        <div class="alert alert-error">
          <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>{error}</span>
        </div>
      {/if}

      <div class="form-control">
        <label class="label" for="pin">
          <span class="label-text">
            {showConfirm ? 'Confirme su PIN' : 'PIN de seguridad'}
          </span>
          <span class="label-text-alt">
            {minLength}-{maxLength} caracteres
          </span>
        </label>
        <div class="input-group">
          <input
            id="pin"
            type={showPin ? 'text' : 'password'}
            bind:value={showConfirm ? confirmPin : pin}
            placeholder={showConfirm ? 'Confirme su PIN' : 'Ingrese su PIN'}
            class="input input-bordered flex-1"
            class:input-error={error}
            {required}
            minlength={minLength}
            maxlength={maxLength}
            disabled={isLoading}
            on:keydown={handleKeydown}
            autocomplete="off"
            autofocus
          />
          <button
            type="button"
            class="btn btn-square btn-outline"
            on:click={toggleShowPin}
            disabled={isLoading}
            title={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
          >
            {#if showPin}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
              </svg>
            {:else}
              <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
            {/if}
          </button>
        </div>
        {#if !showConfirm}
          <label class="label">
            <span class="label-text-alt">
              Longitud: {pin.length}/{maxLength}
            </span>
            <span class="label-text-alt" class:text-success={isValidPin} class:text-error={!isValidPin && pin.length > 0}>
              {isValidPin ? '✓ Válido' : pin.length > 0 ? '✗ Muy corto' : ''}
            </span>
          </label>
        {:else}
          <label class="label">
            <span class="label-text-alt">
              {pinsMatch ? '✓ Los PINs coinciden' : confirmPin.length > 0 ? '✗ Los PINs no coinciden' : ''}
            </span>
          </label>
        {/if}
      </div>

      <div class="pin-entry-actions">
        <button
          type="button"
          class="btn btn-ghost"
          on:click={handleCancel}
          disabled={isLoading}
        >
          {showConfirm ? 'Atrás' : 'Cancelar'}
        </button>
        
        <button
          type="submit"
          class="btn btn-primary"
          disabled={!canSubmit}
        >
          {#if isLoading}
            <span class="loading loading-spinner loading-sm"></span>
            Procesando...
          {:else if showConfirm}
            Confirmar
          {:else}
            Continuar
          {/if}
        </button>
      </div>
    </form>

    <div class="pin-entry-info">
      <div class="alert alert-info">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="stroke-current shrink-0 w-6 h-6">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <div class="text-sm">
          <p><strong>Seguridad:</strong></p>
          <ul class="list-disc list-inside mt-1 space-y-1">
            <li>Su PIN se usa para encriptar datos sensibles</li>
            <li>El PIN solo se almacena en memoria durante la sesión</li>
            <li>Use un PIN único y seguro</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .pin-entry-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }

  .pin-entry-modal {
    background: white;
    border-radius: 1rem;
    padding: 2rem;
    max-width: 500px;
    width: 100%;
    box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  }

  .pin-entry-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .pin-entry-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.5rem;
  }

  .pin-entry-subtitle {
    color: #6b7280;
    font-size: 0.875rem;
  }

  .pin-entry-form {
    margin-bottom: 1.5rem;
  }

  .pin-entry-actions {
    display: flex;
    gap: 1rem;
    justify-content: flex-end;
    margin-top: 1.5rem;
  }

  .pin-entry-info {
    border-top: 1px solid #e5e7eb;
    padding-top: 1.5rem;
  }

  .input-group {
    display: flex;
    gap: 0;
  }

  .input-group .input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  .input-group .btn {
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
    border-left: none;
  }

  /* Estilos base para compatibilidad */
  .alert {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 1rem;
    border-radius: 0.5rem;
    margin-bottom: 1rem;
  }

  .alert-error {
    background-color: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }

  .alert-info {
    background-color: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .form-control {
    margin-bottom: 1rem;
  }

  .label {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .label-text {
    font-weight: 500;
    color: #374151;
  }

  .label-text-alt {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .input {
    width: 100%;
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    font-size: 1rem;
  }

  .input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .input-bordered {
    border: 1px solid #d1d5db;
  }

  .input-error {
    border-color: #dc2626;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 0.5rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all 0.2s;
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .btn-primary {
    background-color: #3b82f6;
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    background-color: #2563eb;
  }

  .btn-ghost {
    background-color: transparent;
    color: #6b7280;
  }

  .btn-ghost:hover:not(:disabled) {
    background-color: #f3f4f6;
  }

  .btn-square {
    padding: 0.75rem;
    width: auto;
    aspect-ratio: 1;
  }

  .btn-outline {
    background-color: transparent;
    border: 1px solid #d1d5db;
    color: #374151;
  }

  .btn-outline:hover:not(:disabled) {
    background-color: #f9fafb;
  }

  .text-success {
    color: #059669;
  }

  .text-error {
    color: #dc2626;
  }

  .loading {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  .loading-spinner {
    border-right: 2px solid currentColor;
  }

  .loading-sm {
    width: 0.875rem;
    height: 0.875rem;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  @media (max-width: 640px) {
    .pin-entry-modal {
      padding: 1.5rem;
      margin: 1rem;
    }

    .pin-entry-actions {
      flex-direction: column-reverse;
    }
  }
</style>