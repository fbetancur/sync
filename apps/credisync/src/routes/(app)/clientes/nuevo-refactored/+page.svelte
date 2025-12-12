<!--
  Página de creación de clientes usando EntityForm genérico
  Ejemplo de uso de @sync/ui con @sync/core
-->

<script lang="ts">
  // Mock de navegación para desarrollo
  function goto(path: string) {
    console.log('🧪 [MOCK] Navegando a:', path);
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  }
  
  // Mock temporal para desarrollo
  async function createClienteWithAutoCountry(data: any) {
    console.log('🧪 [MOCK] Creando cliente con datos:', data);
    // Simular creación exitosa
    await new Promise(resolve => setTimeout(resolve, 1000));
    return { id: crypto.randomUUID(), ...data };
  }

  // Estado del formulario
  let loading = false;
  let error = '';

  // Configuración de campos del formulario
  const clienteFields = [
    {
      name: 'nombre',
      type: 'text' as const,
      label: 'Nombre Completo',
      required: true,
      placeholder: 'Ej: Juan Pérez García',
      validation: (value: string) => {
        if (value && value.length < 2) {
          return 'El nombre debe tener al menos 2 caracteres';
        }
        if (value && value.length > 100) {
          return 'El nombre no puede exceder 100 caracteres';
        }
        return null;
      }
    },
    {
      name: 'numero_documento',
      type: 'text' as const,
      label: 'Número de Documento',
      required: true,
      placeholder: 'Ej: 12345678',
      validation: (value: string) => {
        if (value && value.length < 5) {
          return 'El documento debe tener al menos 5 caracteres';
        }
        if (value && value.length > 20) {
          return 'El documento no puede exceder 20 caracteres';
        }
        return null;
      }
    },
    {
      name: 'telefono',
      type: 'tel' as const,
      label: 'Teléfono',
      required: true,
      placeholder: 'Ej: 5512345678',
      validation: (value: string) => {
        if (value && !/^[\d\s\-\+\(\)]+$/.test(value)) {
          return 'El teléfono solo puede contener números y símbolos válidos';
        }
        if (value && value.replace(/\D/g, '').length < 7) {
          return 'El teléfono debe tener al menos 7 dígitos';
        }
        return null;
      }
    },
    {
      name: 'direccion',
      type: 'textarea' as const,
      label: 'Dirección',
      required: true,
      placeholder: 'Ej: Calle 123, Colonia Centro, Ciudad',
      validation: (value: string) => {
        if (value && value.length < 5) {
          return 'La dirección debe tener al menos 5 caracteres';
        }
        if (value && value.length > 200) {
          return 'La dirección no puede exceder 200 caracteres';
        }
        return null;
      }
    },
    {
      name: 'email',
      type: 'email' as const,
      label: 'Email (Opcional)',
      required: false,
      placeholder: 'Ej: cliente@email.com'
    },
    {
      name: 'fecha_nacimiento',
      type: 'date' as const,
      label: 'Fecha de Nacimiento (Opcional)',
      required: false
    }
  ];

  // Manejar envío del formulario
  async function handleSubmit(event: SubmitEvent) {
    event.preventDefault();
    
    try {
      loading = true;
      error = '';

      // Recopilar datos del formulario
      const formData = new FormData(event.target as HTMLFormElement);
      const clienteData = Object.fromEntries(formData.entries());

      console.log('📝 [NUEVO CLIENTE] Datos del formulario:', clienteData);

      // Crear cliente usando el servicio refactorizado
      const nuevoCliente = await createClienteWithAutoCountry(clienteData);

      console.log('✅ [NUEVO CLIENTE] Cliente creado exitosamente:', nuevoCliente);

      // Redirigir a la lista de clientes
      goto('/clientes');

    } catch (err: any) {
      console.error('❌ [NUEVO CLIENTE] Error creando cliente:', err);
      error = err.message || 'Error inesperado creando cliente';
    } finally {
      loading = false;
    }
  }

  // Manejar cancelación
  function handleCancel() {
    goto('/clientes');
  }
</script>

<svelte:head>
  <title>Nuevo Cliente - CrediSync</title>
</svelte:head>

<div class="page-container">
  <div class="page-header">
    <div class="breadcrumb">
      <a href="/clientes" class="breadcrumb-link">Clientes</a>
      <span class="breadcrumb-separator">›</span>
      <span class="breadcrumb-current">Nuevo Cliente</span>
    </div>
  </div>

  <div class="page-content">
    <!-- EntityForm Mock para demostración -->
    <div class="entity-form-mock">
      <div class="form-header">
        <h2 class="form-title">Nuevo Cliente (Refactorizado)</h2>
        {#if error}
          <div class="error-banner">
            <span class="error-icon">⚠️</span>
            {error}
          </div>
        {/if}
      </div>

      <form on:submit|preventDefault={handleSubmit} class="form-content">
        <div class="form-fields">
          {#each clienteFields as field}
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
                  name={field.name}
                  placeholder={field.placeholder || ''}
                  class="field-input"
                  rows="3"
                  required={field.required}
                ></textarea>
              {:else}
                <input
                  id={field.name}
                  name={field.name}
                  type={field.type}
                  placeholder={field.placeholder || ''}
                  class="field-input"
                  required={field.required}
                />
              {/if}
            </div>
          {/each}
        </div>

        <div class="form-actions">
          <button
            type="button"
            class="btn btn-secondary"
            on:click={handleCancel}
            disabled={loading}
          >
            Cancelar
          </button>
          
          <button
            type="submit"
            class="btn btn-primary"
            disabled={loading}
          >
            {#if loading}
              <span class="loading-spinner"></span>
              Guardando...
            {:else}
              Crear Cliente
            {/if}
          </button>
        </div>
      </form>
    </div>
  </div>

  <!-- Información adicional -->
  <div class="info-panel">
    <div class="info-card demo-banner">
      <h3 class="info-title">� Demoo del Refactoring</h3>
      <p class="demo-description">
        Esta página demuestra la nueva arquitectura con <strong>@sync/core</strong> y <strong>@sync/ui</strong>.
        El formulario usa componentes genéricos reutilizables que funcionarán en HealthSync, SurveySync y futuras apps.
      </p>
      <div class="demo-features">
        <span class="feature-tag">✅ EntityService Base</span>
        <span class="feature-tag">📱 Validación Inteligente</span>
        <span class="feature-tag">🌍 Detección de País</span>
        <span class="feature-tag">📍 Captura GPS</span>
      </div>
    </div>

    <div class="info-card">
      <h3 class="info-title">📋 Funcionalidades</h3>
      <ul class="info-list">
        <li>✅ Los datos se guardan automáticamente en 3 capas de almacenamiento</li>
        <li>📍 La ubicación se captura para mejorar la seguridad</li>
        <li>🔄 Los datos se sincronizan automáticamente cuando hay conexión</li>
        <li>🔐 Toda la información está protegida con checksums de integridad</li>
        <li>📱 El país se detecta automáticamente para validar el teléfono</li>
      </ul>
    </div>

    <div class="info-card">
      <h3 class="info-title">🚀 Funcionalidades</h3>
      <ul class="info-list">
        <li><strong>Validación inteligente:</strong> Campos validados en tiempo real</li>
        <li><strong>Detección de país:</strong> Automática por GPS o IP</li>
        <li><strong>Captura de contexto:</strong> Ubicación, dispositivo y usuario</li>
        <li><strong>Almacenamiento robusto:</strong> IndexedDB + LocalStorage + Backup</li>
        <li><strong>Auditoría completa:</strong> Registro inmutable de todas las acciones</li>
      </ul>
    </div>
  </div>
</div>

<style>
  .page-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 1rem;
    display: grid;
    grid-template-columns: 1fr 300px;
    gap: 2rem;
    align-items: start;
  }

  .page-header {
    grid-column: 1 / -1;
    margin-bottom: 1rem;
  }

  .breadcrumb {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    color: #6b7280;
  }

  .breadcrumb-link {
    color: #3b82f6;
    text-decoration: none;
    font-weight: 500;
  }

  .breadcrumb-link:hover {
    text-decoration: underline;
  }

  .breadcrumb-separator {
    color: #d1d5db;
  }

  .breadcrumb-current {
    color: #374151;
    font-weight: 600;
  }

  .page-content {
    display: flex;
    flex-direction: column;
  }

  .entity-form-mock {
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

  .info-panel {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .info-card {
    background: white;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    border: 1px solid #e5e7eb;
  }

  .demo-banner {
    background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
    border: 2px solid #0ea5e9;
    position: relative;
    overflow: hidden;
  }

  .demo-banner::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, #0ea5e9, #06b6d4, #10b981, #059669);
  }

  .demo-description {
    margin: 0.5rem 0 1rem 0;
    color: #0f172a;
    line-height: 1.6;
    font-size: 0.875rem;
  }

  .demo-features {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .feature-tag {
    background: #0ea5e9;
    color: white;
    padding: 0.25rem 0.75rem;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 600;
  }

  .info-title {
    margin: 0 0 1rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: #374151;
  }

  .info-list {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .info-list li {
    padding: 0.5rem 0;
    font-size: 0.875rem;
    color: #6b7280;
    line-height: 1.5;
  }

  .info-list li:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }

  /* Responsive */
  @media (max-width: 1024px) {
    .page-container {
      grid-template-columns: 1fr;
      max-width: 600px;
    }

    .info-panel {
      order: -1;
    }

    .info-card {
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

  @media (max-width: 640px) {
    .page-container {
      padding: 0.5rem;
      gap: 1rem;
    }

    .breadcrumb {
      font-size: 0.75rem;
    }

    .info-card {
      border-radius: 8px;
    }

    .entity-form-mock {
      margin: 1rem;
      border-radius: 8px;
    }

    .form-header,
    .form-content {
      padding: 1rem;
    }
  }
</style>