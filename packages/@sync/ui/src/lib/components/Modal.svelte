<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { fade, scale } from 'svelte/transition';
  
  const dispatch = createEventDispatcher();
  
  export let open = false;
  export let title = '';
  export let size: 'sm' | 'md' | 'lg' | 'xl' = 'md';
  export let closable = true;
  export let closeOnBackdrop = true;
  
  let dialogElement: HTMLDialogElement;
  
  $: if (dialogElement) {
    if (open) {
      dialogElement.showModal();
    } else {
      dialogElement.close();
    }
  }
  
  function handleClose() {
    if (closable) {
      open = false;
      dispatch('close');
    }
  }
  
  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === dialogElement) {
      handleClose();
    }
  }
  
  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && closable) {
      handleClose();
    }
  }
  
  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl'
  };
</script>

{#if open}
  <dialog
    bind:this={dialogElement}
    class="modal"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
  >
    <div 
      class="modal-content {sizeClasses[size]}"
      transition:scale={{ duration: 200, start: 0.95 }}
    >
      <!-- Header -->
      {#if title || closable}
        <div class="modal-header">
          {#if title}
            <h2 class="modal-title">{title}</h2>
          {/if}
          {#if closable}
            <button
              type="button"
              class="modal-close"
              on:click={handleClose}
              aria-label="Cerrar modal"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}
      
      <!-- Body -->
      <div class="modal-body">
        <slot />
      </div>
      
      <!-- Actions -->
      {#if $$slots.actions}
        <div class="modal-actions">
          <slot name="actions" />
        </div>
      {/if}
    </div>
  </dialog>
{/if}

<style>
  .modal {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    border: none;
    padding: 1rem;
    z-index: 50;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .modal-content {
    background: white;
    border-radius: 0.75rem;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    width: 100%;
    max-height: 90vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }
  
  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 0 1.5rem;
    border-bottom: 1px solid #e5e7eb;
    padding-bottom: 1rem;
    margin-bottom: 1rem;
  }
  
  .modal-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
  }
  
  .modal-close {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: none;
    background: transparent;
    color: #6b7280;
    border-radius: 0.375rem;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .modal-close:hover {
    background: #f3f4f6;
    color: #374151;
  }
  
  .modal-body {
    padding: 0 1.5rem;
    flex: 1;
    overflow-y: auto;
  }
  
  .modal-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    padding: 1rem 1.5rem 1.5rem 1.5rem;
    border-top: 1px solid #e5e7eb;
    margin-top: 1rem;
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .modal {
      padding: 0.5rem;
    }
    
    .modal-content {
      max-height: 95vh;
    }
    
    .modal-header,
    .modal-body,
    .modal-actions {
      padding-left: 1rem;
      padding-right: 1rem;
    }
    
    .modal-actions {
      flex-direction: column;
    }
  }
</style>