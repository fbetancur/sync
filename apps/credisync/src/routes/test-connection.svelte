<script lang="ts">
  import { onMount } from 'svelte';
  import { supabase } from '../lib/supabase';

  let connectionStatus = 'Probando conexión...';
  let connectionClass = 'alert-info';
  let details = '';
  let errorCode = '';
  let errorHint = '';
  let authStatus = '';
  let tablesFound: string[] = [];

  function goHome() {
    window.history.pushState({}, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  function goLogin() {
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }

  onMount(async () => {
    try {
      // Test 1: Check if Supabase client is initialized
      if (!supabase) {
        throw new Error('Supabase client not initialized');
      }

      // Test 2: Check auth status
      const { data: { session } } = await supabase.auth.getSession();
      authStatus = session ? `✅ Autenticado como: ${session.user.email}` : '⚠️ No autenticado (anónimo)';

      // Test 3: Try to query tenants table (without RLS - public access)
      const { data, error } = await supabase
        .from('tenants')
        .select('id, nombre')
        .limit(1);

      if (error) {
        connectionStatus = '❌ Error de conexión';
        connectionClass = 'alert-warning';
        details = error.message;
        errorCode = error.code || 'N/A';
        errorHint = error.hint || 'N/A';

        // Check if it's an RLS error
        if (error.code === 'PGRST301' || error.message.includes('row-level security')) {
          details = 'Las políticas RLS están bloqueando el acceso. Esto es normal si no estás autenticado.';
          errorHint = 'Solución: Las tablas están creadas correctamente. Para acceder necesitas autenticarte o ajustar las políticas RLS.';
        }
      } else {
        connectionStatus = '✅ Conexión exitosa a Supabase';
        connectionClass = 'alert-success';
        details = data && data.length > 0 
          ? `Tenant encontrado: ${data[0].nombre}` 
          : '✅ Tabla existe pero está vacía';
      }

      // Test 4: Check which tables exist (using information_schema)
      try {
        const { data: tables, error: tablesError } = await supabase.rpc('get_tables');
        if (!tablesError && tables) {
          tablesFound = tables.map((t: any) => t.table_name);
        }
      } catch (rpcError) {
        // RPC function might not exist, that's ok
        console.log('RPC get_tables not available');
      }

    } catch (err: any) {
      connectionStatus = '❌ Error crítico';
      connectionClass = 'alert-error';
      details = err.message;
      
      // Check for common API key issues
      if (err.message.includes('API key') || err.message.includes('Invalid API')) {
        errorHint = 'Verifica que la API key en .env.local sea correcta. Debe ser la "anon" o "service_role" key de tu proyecto Supabase.';
      }
    }
  });
</script>

<div class="container mx-auto p-8 max-w-4xl">
  <h1 class="text-3xl font-bold mb-6">🔍 Test de Conexión Supabase</h1>

  <!-- Status Alert -->
  <div class={`alert ${connectionClass} mb-4`}>
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      class="stroke-current shrink-0 w-6 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      ></path>
    </svg>
    <div class="flex-1">
      <h3 class="font-bold">{connectionStatus}</h3>
      {#if details}
        <div class="text-sm mt-1">{details}</div>
      {/if}
      {#if errorHint}
        <div class="text-sm mt-2 opacity-80">💡 {errorHint}</div>
      {/if}
    </div>
  </div>

  <!-- Configuration Info -->
  <div class="card bg-base-200 shadow-xl mb-4">
    <div class="card-body">
      <h2 class="card-title">⚙️ Configuración</h2>
      <div class="space-y-2">
        <p>
          <strong>Supabase URL:</strong>
          <code class="ml-2 text-sm">{import.meta.env.VITE_SUPABASE_URL || '❌ No configurado'}</code>
        </p>
        <p>
          <strong>Anon Key:</strong>
          {import.meta.env.VITE_SUPABASE_ANON_KEY
            ? '✅ Configurado'
            : '❌ No configurado'}
        </p>
        <p>
          <strong>Estado de Auth:</strong>
          <span class="ml-2">{authStatus || 'Verificando...'}</span>
        </p>
      </div>
    </div>
  </div>

  <!-- Error Details (if any) -->
  {#if errorCode}
    <div class="card bg-base-200 shadow-xl mb-4">
      <div class="card-body">
        <h2 class="card-title">🐛 Detalles del Error</h2>
        <div class="space-y-2">
          <p><strong>Código:</strong> <code>{errorCode}</code></p>
          <p><strong>Mensaje:</strong> {details}</p>
          {#if errorHint && errorHint !== 'N/A'}
            <p><strong>Sugerencia:</strong> {errorHint}</p>
          {/if}
        </div>
      </div>
    </div>
  {/if}

  <!-- Checklist -->
  <div class="card bg-base-200 shadow-xl mb-4">
    <div class="card-body">
      <h2 class="card-title">✅ Checklist de Configuración</h2>
      <div class="space-y-2">
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" checked={!!import.meta.env.VITE_SUPABASE_URL} class="checkbox checkbox-sm" disabled />
            <span class="label-text">Variables de entorno configuradas</span>
          </label>
        </div>
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" checked={connectionClass !== 'alert-error'} class="checkbox checkbox-sm" disabled />
            <span class="label-text">Conexión a Supabase establecida</span>
          </label>
        </div>
        <div class="form-control">
          <label class="label cursor-pointer justify-start gap-2">
            <input type="checkbox" checked={connectionClass === 'alert-success'} class="checkbox checkbox-sm" disabled />
            <span class="label-text">Acceso a tabla tenants (sin RLS o autenticado)</span>
          </label>
        </div>
      </div>
    </div>
  </div>

  <!-- Next Steps -->
  <div class="card bg-info text-info-content shadow-xl mb-4">
    <div class="card-body">
      <h2 class="card-title">📝 Próximos Pasos</h2>
      <div class="text-sm space-y-2">
        {#if connectionClass === 'alert-error'}
          <p>1. Verifica que ejecutaste el schema SQL en Supabase SQL Editor</p>
          <p>2. Verifica que las variables de entorno en .env.local son correctas</p>
          <p>3. Recarga la página después de hacer cambios</p>
        {:else if connectionClass === 'alert-warning'}
          <p>✅ Las tablas están creadas correctamente</p>
          <p>⚠️ Las políticas RLS están activas (esto es correcto)</p>
          <p>💡 Para acceder a los datos, necesitas:</p>
          <ul class="list-disc list-inside ml-4">
            <li>Autenticarte con un usuario válido, O</li>
            <li>Ajustar las políticas RLS para permitir acceso anónimo (no recomendado)</li>
          </ul>
        {:else}
          <p>✅ ¡Todo configurado correctamente!</p>
          <p>Puedes continuar con la implementación de las siguientes fases.</p>
        {/if}
      </div>
    </div>
  </div>

  <!-- Actions -->
  <div class="flex gap-2">
    <button on:click={goHome} class="btn btn-primary">Volver al inicio</button>
    <button on:click={goLogin} class="btn btn-secondary">🔐 Login</button>
    <button class="btn btn-outline" on:click={() => window.location.reload()}>
      🔄 Recargar Test
    </button>
  </div>
</div>
