<script lang="ts">
  import './app.css';
  import { onMount } from 'svelte';
  import TestConnection from './routes/test-connection.svelte';
  import Login from './routes/login.svelte';

  let currentRoute = '/';

  onMount(() => {
    // Simple router
    const updateRoute = () => {
      currentRoute = window.location.pathname;
    };

    updateRoute();
    window.addEventListener('popstate', updateRoute);

    return () => {
      window.removeEventListener('popstate', updateRoute);
    };
  });

  function navigate(path: string) {
    window.history.pushState({}, '', path);
    currentRoute = path;
  }
</script>

{#if currentRoute === '/test-connection'}
  <TestConnection />
{:else if currentRoute === '/login'}
  <Login />
{:else}
  <main class="min-h-screen bg-base-100">
    <div class="container mx-auto p-4">
      <h1 class="text-4xl font-bold text-center mb-8">
        PWA Microcréditos - Offline First
      </h1>

      <div class="alert alert-success mb-4">
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
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          ></path>
        </svg>
        <div>
          <h3 class="font-bold">Fase 1 Completada ✅</h3>
          <div class="text-sm">
            Project Setup & Supabase Backend configurados
          </div>
        </div>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">🚀 Estado del Proyecto</h2>
            <ul class="list-disc list-inside space-y-1">
              <li>✅ Svelte + Vite + TypeScript</li>
              <li>✅ Tailwind CSS + DaisyUI</li>
              <li>✅ Supabase configurado</li>
              <li>✅ Schema de base de datos</li>
              <li>✅ Servicio de autenticación</li>
            </ul>
          </div>
        </div>

        <div class="card bg-base-200 shadow-xl">
          <div class="card-body">
            <h2 class="card-title">🔧 Herramientas</h2>
            <div class="space-y-2">
              <button
                on:click={() => navigate('/test-connection')}
                class="btn btn-primary btn-block"
              >
                Probar Conexión Supabase
              </button>
              <button
                on:click={() => navigate('/login')}
                class="btn btn-secondary btn-block"
              >
                🔐 Login
              </button>
              <a
                href="/supabase/README.md"
                target="_blank"
                class="btn btn-outline btn-block"
              >
                Ver Documentación
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="mt-8 text-center text-sm opacity-70">
        <p>Siguiente: Fase 2 - Core Data Layer (IndexedDB)</p>
      </div>
    </div>
  </main>
{/if}
