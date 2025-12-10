<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let value = '';
  export let placeholder = 'Buscar...';
  export let disabled = false;
  export let debounceMs = 300;
  export let clearable = true;
  export let loading = false;
  
  let inputElement: HTMLInputElement;
  let debounceTimer: NodeJS.Timeout;
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    value = target.value;
    
    // Dispatch inmediato para reactividad
    dispatch('input', { value, event });
    
    // Dispatch con debounce para búsquedas
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      dispatch('search', { value, event });
    }, debounceMs);
  }
  
  function handleClear() {
    value = '';
    inputElement.focus();
    dispatch('input', { value: '', event: null });
    dispatch('search', { value: '', event: null });
    dispatch('clear');
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && clearable) {
      handleClear();
    }
    dispatch('keydown', event);
  }
  
  export function focus() {
    inputElement?.focus();
  }
  
  export function clear() {
    handleClear();
  }
  
  $: showClearButton = clearable && value.length > 0 && !disabled;
  $: showLoadingSpinner = loading;
</script>

<div class="search-input-container">
  <div class="relative">
    <!-- Icono de búsqueda -->
    <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      {#if showLoadingSpinner}
        <svg class="animate-spin w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      {:else}
        <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      {/if}
    </div>
    
    <!-- Input -->
    <input
      bind:this={inputElement}
      type="text"
      {value}
      {placeholder}
      {disabled}
      class="search-input"
      class:has-clear={showClearButton}
      on:input={handleInput}
      on:keydown={handleKeydown}
      on:focus
      on:blur
      {...$$restProps}
    />
    
    <!-- Botón de limpiar -->
    {#if showClearButton}
      <button
        type="button"
        class="clear-button"
        on:click={handleClear}
        aria-label="Limpiar búsqueda"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    {/if}
  </div>
</div>

<style>
  .search-input-container {
    width: 100%;
  }
  
  .search-input {
    block w-full pl-10 pr-4 py-2.5 text-base;
    border: 1px solid #d1d5db;
    border-radius: 0.75rem;
    background: white;
    color: #111827;
    placeholder-color: #9ca3af;
    transition: all 0.2s ease;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .search-input.has-clear {
    padding-right: 2.5rem;
  }
  
  .search-input:disabled {
    background-color: #f9fafb;
    color: #6b7280;
    cursor: not-allowed;
  }
  
  .clear-button {
    position: absolute;
    inset-y: 0;
    right: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.5rem;
    background: transparent;
    border: none;
    color: #6b7280;
    cursor: pointer;
    border-radius: 0 0.75rem 0.75rem 0;
    transition: all 0.2s ease;
  }
  
  .clear-button:hover {
    color: #374151;
    background-color: #f3f4f6;
  }
  
  .clear-button:focus {
    outline: none;
    color: #374151;
    background-color: #f3f4f6;
  }
  
  /* Mejoras para mobile */
  @media (max-width: 640px) {
    .search-input {
      font-size: 16px; /* Evita zoom en iOS */
    }
  }
</style>