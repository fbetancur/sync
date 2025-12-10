<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  
  const dispatch = createEventDispatcher();
  
  export let type: 'text' | 'number' | 'email' | 'tel' | 'password' | 'url' = 'text';
  export let value: string | number = '';
  export let label = '';
  export let placeholder = '';
  export let prefix = '';
  export let suffix = '';
  export let error = '';
  export let disabled = false;
  export let required = false;
  export let readonly = false;
  export let id = '';
  export let name = '';
  export let autocomplete = '';
  export let step: string | number | undefined = undefined;
  export let min: string | number | undefined = undefined;
  export let max: string | number | undefined = undefined;
  
  let inputElement: HTMLInputElement;
  let focused = false;
  
  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    if (type === 'number') {
      value = target.valueAsNumber || 0;
    } else {
      value = target.value;
    }
    dispatch('input', { value, event });
  }
  
  function handleFocus(event: FocusEvent) {
    focused = true;
    dispatch('focus', event);
  }
  
  function handleBlur(event: FocusEvent) {
    focused = false;
    dispatch('blur', event);
  }
  
  function handleKeydown(event: KeyboardEvent) {
    dispatch('keydown', event);
  }
  
  export function focus() {
    inputElement?.focus();
  }
  
  export function blur() {
    inputElement?.blur();
  }
  
  $: hasError = !!error;
  $: hasPrefix = !!prefix;
  $: hasSuffix = !!suffix;
  
  $: inputClasses = [
    'block w-full rounded-lg border transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed',
    'readonly:bg-gray-50 readonly:cursor-default',
    hasError 
      ? 'border-red-300 text-red-900 placeholder-red-300 focus:ring-red-500' 
      : 'border-gray-300 text-gray-900 placeholder-gray-400',
    hasPrefix ? 'pl-10' : 'pl-3',
    hasSuffix ? 'pr-10' : 'pr-3',
    'py-2.5 text-base'
  ].filter(Boolean).join(' ');
  
  $: containerClasses = [
    'relative',
    disabled ? 'opacity-50' : ''
  ].filter(Boolean).join(' ');
</script>

<div class="input-group">
  {#if label}
    <label 
      for={id || name} 
      class="block text-sm font-medium text-gray-700 mb-2"
      class:required
    >
      {label}
      {#if required}
        <span class="text-red-500 ml-1">*</span>
      {/if}
    </label>
  {/if}
  
  <div class={containerClasses}>
    {#if hasPrefix}
      <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <span class="text-gray-500 text-base">{prefix}</span>
      </div>
    {/if}
    
    <input
      bind:this={inputElement}
      {type}
      {id}
      {name}
      {placeholder}
      {disabled}
      {readonly}
      {required}
      {autocomplete}
      {step}
      {min}
      {max}
      value={type === 'number' ? (value || '') : value}
      class={inputClasses}
      on:input={handleInput}
      on:focus={handleFocus}
      on:blur={handleBlur}
      on:keydown={handleKeydown}
      {...$$restProps}
    />
    
    {#if hasSuffix}
      <div class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
        <span class="text-gray-500 text-base">{suffix}</span>
      </div>
    {/if}
  </div>
  
  {#if error}
    <p class="mt-2 text-sm text-red-600" role="alert">
      {error}
    </p>
  {/if}
</div>

<style>
  .required {
    position: relative;
  }
  
  /* Mejoras para mobile */
  @media (max-width: 640px) {
    :global(.input-group input) {
      font-size: 16px; /* Evita zoom en iOS */
    }
  }
  
  /* Estados de focus mejorados */
  input:focus {
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  /* Animación suave para errores */
  .input-group {
    transition: all 0.2s ease;
  }
</style>