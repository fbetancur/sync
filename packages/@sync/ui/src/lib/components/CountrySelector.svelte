<!--
  CountrySelector - Componente genérico para selección de país
  Parte de @sync/ui - Reutilizable en todas las apps
-->
<script>
  import { PhoneService } from '@sync/core';
  import { onMount } from 'svelte';

  // Props
  export let selectedCountry = 'MX';
  export let disabled = false;
  export let autoDetect = true;
  export let showFlag = true;
  export let showName = true;
  export let size = 'md'; // 'sm', 'md', 'lg'

  // State
  let countries = [];
  let isDetecting = false;
  let detectionMethod = null;

  const phoneService = PhoneService.getInstance();

  // Reactive statements
  $: selectedConfig = phoneService.getCountryConfig(selectedCountry);
  $: sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-2',
    lg: 'text-lg px-4 py-3'
  }[size];

  onMount(async () => {
    // Cargar lista de países
    countries = phoneService.getCountriesList();

    // Auto-detectar país si está habilitado
    if (autoDetect) {
      await detectCountry();
    }
  });

  async function detectCountry() {
    try {
      isDetecting = true;
      console.log('🌍 [COUNTRY-SELECTOR] Detectando país automáticamente...');

      const result = await phoneService.detectCountry();
      
      if (result.country && result.country !== selectedCountry) {
        selectedCountry = result.country;
        detectionMethod = result.method;
        
        console.log(`✅ [COUNTRY-SELECTOR] País detectado: ${result.country} (${result.method})`);
        
        // Guardar preferencia
        phoneService.saveCountryPreference(result.country);
      }
    } catch (error) {
      console.warn('⚠️ [COUNTRY-SELECTOR] Error detectando país:', error);
    } finally {
      isDetecting = false;
    }
  }

  function handleCountryChange(event) {
    const newCountry = event.target.value;
    selectedCountry = newCountry;
    
    // Guardar preferencia
    phoneService.saveCountryPreference(newCountry);
    
    console.log(`🌍 [COUNTRY-SELECTOR] País seleccionado: ${newCountry}`);
  }
</script>

<div class="country-selector">
  <label class="block text-sm font-medium text-gray-700 mb-1">
    País
    {#if isDetecting}
      <span class="text-xs text-blue-600 ml-1">(detectando...)</span>
    {:else if detectionMethod}
      <span class="text-xs text-green-600 ml-1">(detectado por {detectionMethod})</span>
    {/if}
  </label>
  
  <select
    bind:value={selectedCountry}
    on:change={handleCountryChange}
    {disabled}
    class="
      w-full border border-gray-300 rounded-lg shadow-sm
      focus:ring-2 focus:ring-blue-500 focus:border-blue-500
      disabled:bg-gray-100 disabled:cursor-not-allowed
      {sizeClasses}
    "
  >
    {#each countries as country (country.code)}
      <option value={country.code}>
        {#if showFlag}{country.flag}{/if}
        {#if showName}{country.name}{/if}
        {#if !showName && !showFlag}{country.code}{/if}
      </option>
    {/each}
  </select>

  {#if selectedConfig}
    <div class="mt-1 text-xs text-gray-500">
      Código: {selectedConfig.phone.code} | 
      Ejemplo: {selectedConfig.phone.example}
    </div>
  {/if}
</div>

<style>
  .country-selector select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
  }
</style>