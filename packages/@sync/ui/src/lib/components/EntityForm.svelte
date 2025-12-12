<!--
  EntityForm - Componente genérico para formularios de entidades
  Parte de @sync/ui - Reutilizable en todas las apps
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import CountrySelector from './CountrySelector.svelte';
  import LocationCapture from './LocationCapture.svelte';

  // Props
  export let fields: Array<{
    name: string;
    type: 'text' | 'email' | 'tel' | 'number' | 'textarea' | 'select' | 'date';
    label: string;
    required?: boolean;
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
    validation?: (value: any) => string | null;
  }> = [];
  
  export let title = 'Nuevo Registro';
  export let submitText = 'Guardar';
  export let loading = false;
  export let error = '';
  export let showCountrySelector = false;
  export let showLocationCapture = false;
  export let initialData: Record<string, any> = {};

  // Estado interno
  let formData: Record<string, any> = { ...initialData };
  let fieldErrors: Record<string, string> = {};
  let selectedCountry = 'MX';
  let locationCaptured = false;

  const dispatch = createEventDispatcher();

  // Validar campo individual
  function validateField(field: any, value: any): string | null {
    if (field.required && (!value || value.toString().trim() === '')) {
      return `${field.label} es requerido`;
    }

    if (field.validation) {
      return field.validation(value);
    }

    // Validaciones por tipo
    switch (field.type) {
      case 'email':
        if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return 'Email inválido';
        }
        break;
      case 'tel':
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return 'Teléfono inválido';
        }
        break;
      case 'number':
        if (value && isNaN(Number(value))) {
          return 'Debe ser un número válido';
        }
        break;
    }

    return null;
  }

  // Validar todos los campos
  function validateForm(): boolean {
    fieldErrors = {};
    let isValid = true;

    fields.forEach(field => {
      const error = validateField(field, formData[field.name]);
      if (error) {
        fieldErrors[field.name] = error;
        isValid = false;
      }
    });

    return isValid;
  }

  // Manejar cambio de campo
  function handleFieldChange(fieldName: string, value: any) {
    formData[fieldName] = value;
    
    // Limpiar error del campo si existe
    if (fieldErrors[fieldName]) {
      const field = fields.find(f => f.name === fieldName);
      if (field) {
        const error = validateField(field, value);
        if (!error) {
          delete fieldErrors[fieldName];
          fieldErrors = { ...fieldErrors };
        }
      }
    }
  }

  // Manejar eventos de input
  function handleInputEvent(fieldName: string, event: Event) {
    const target = event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;
    handleFieldChange(fieldName, target.value);
  }

  // Manejar envío del formulario
  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    const submitData = {
      ...formData,
      ...(showCountrySelector && { pais: selectedCountry })
    };

    dispatch('submit', submitData);
  }

  // Manejar selección de país
  function handleCountrySelect(event: CustomEvent) {
    selectedCountry = event.detail.country;
    formData.pais = selectedCountry;
  }

  // Manejar captura de ubicación
  function handleLocationCapture(event: CustomEvent) {
    locationCaptured = event.detail.success;
    if (event.detail.location) {
      formData.coordenadas = event.detail.location;
    }
  }
</script>

<div class="entity-form">
  <div class="form-header">
    <h2 class="form-title">{title}</h2>
    {#if error}
      <div class="error-banner">
        <span class="error-icon">⚠️</span>
        {error}
      </div>
    {/if}
  </div>

  <form on:submit|preventDefault={handleSubmit} class="form-content">
    <!-- Country Selector -->
    {#if showCountrySelector}
      <div class="form-section">
        <CountrySelector 
          bind:selectedCountry
          on:countrySelect={handleCountrySelect}
        />
      </div>
    {/if}

    <!-- Location Capture -->
    {#if showLocationCapture}
      <div class="form-section">
        <LocationCapture 
          on:locationCaptured={handleLocationCapture}
        />
      </div>
    {/if}

    <!-- Dynamic Fields -->
    <div class="form-fields">
      {#each fields as field}
        <div class="form-field">
          <label for={field.name} class="field-label">
            {field.label}
            {#if field.required}
              <span class="required">*</span>
            {/if}
          </label>

          {#if field.type === 'textarea'}
            <textarea
              id={field.name}
              bind:value={formData[field.name]}
              on:input={(e) => handleInputEvent(field.name, e)}
              placeholder={field.placeholder || ''}
              class="field-input"
              class:error={fieldErrors[field.name]}
              rows="3"
            ></textarea>
          
          {:else if field.type === 'select'}
            <select
              id={field.name}
              bind:value={formData[field.name]}
              on:change={(e) => handleInputEvent(field.name, e)}
              class="field-input"
              class:error={fieldErrors[field.name]}
            >
              <option value="">Seleccionar...</option>
              {#each field.options || [] as option}
                <option value={option.value}>{option.label}</option>
              {/each}
            </select>
          
          {:else}
            <input
              id={field.name}
              type={field.type}
              bind:value={formData[field.name]}
              on:input={(e) => handleInputEvent(field.name, e)}
              placeholder={field.placeholder || ''}
              class="field-input"
              class:error={fieldErrors[field.name]}
            />
          {/if}

          {#if fieldErrors[field.name]}
            <div class="field-error">
              <span class="error-icon">⚠️</span>
              {fieldErrors[field.name]}
            </div>
          {/if}
        </div>
      {/each}
    </div>

    <!-- Form Actions -->
    <div class="form-actions">
      <button
        type="button"
        class="btn btn-secondary"
        on:click={() => dispatch('cancel')}
        disabled={loading}
      >
        Cancelar
      </button>
      
      <button
        type="submit"
        class="btn btn-primary"
        disabled={loading || Object.keys(fieldErrors).length > 0}
      >
        {#if loading}
          <span class="loading-spinner"></span>
          Guardando...
        {:else}
          {submitText}
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .entity-form {
    max-width: 600px;
    margin: 0 auto;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    overflow: hidden;
  }

  .form-header {
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .form-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
  }

  .error-banner {
    margin-top: 1rem;
    padding: 0.75rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    color: #dc2626;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .form-content {
    padding: 1.5rem;
  }

  .form-section {
    margin-bottom: 1.5rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid #e5e7eb;
  }

  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
  }

  .field-label {
    font-weight: 500;
    color: #374151;
    margin-bottom: 0.5rem;
    font-size: 0.875rem;
  }

  .required {
    color: #dc2626;
    margin-left: 0.25rem;
  }

  .field-input {
    padding: 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 1rem;
    transition: all 0.2s;
    background: white;
  }

  .field-input:focus {
    outline: none;
    border-color: #667eea;
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
  }

  .field-input.error {
    border-color: #dc2626;
    box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
  }

  .field-error {
    margin-top: 0.5rem;
    color: #dc2626;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .error-icon {
    font-size: 0.75rem;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }

  .btn {
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover:not(:disabled) {
    background: #e5e7eb;
  }

  .btn-primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
  }

  .loading-spinner {
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  /* Responsive */
  @media (max-width: 640px) {
    .entity-form {
      margin: 1rem;
      border-radius: 8px;
    }

    .form-header,
    .form-content {
      padding: 1rem;
    }

    .form-actions {
      flex-direction: column-reverse;
    }

    .btn {
      width: 100%;
      justify-content: center;
    }
  }
</style>