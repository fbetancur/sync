<script lang="ts">
  import './app.css';
  import { onMount } from 'svelte';
  import { isAuthenticated, authLoading } from './lib/stores';
  import Layout from './lib/components/Layout.svelte';
  import TestConnection from './routes/test-connection.svelte';
  import Login from './routes/login.svelte';
  import Dashboard from './routes/Dashboard.svelte';

  let currentRoute = '/';

  onMount(() => {
    console.log('🚀 CrediSync App iniciado - usando arquitectura @sync/core');
    
    // Simple router (temporal hasta implementar router completo)
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

  // Determinar qué componente mostrar
  $: currentComponent = (() => {
    if ($authLoading) return null; // Loading
    if (!$isAuthenticated) return Login;
    
    switch (currentRoute) {
      case '/test-connection':
        return TestConnection;
      case '/login':
        return Login;
      default:
        return Dashboard;
    }
  })();
</script>

{#if $authLoading}
  <!-- Loading state -->
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="text-center">
      <div class="loading loading-spinner loading-lg mb-4"></div>
      <p class="text-base-content/70">Inicializando CrediSync...</p>
    </div>
  </div>
{:else if !$isAuthenticated}
  <!-- Not authenticated - show login -->
  <svelte:component this={currentComponent} />
{:else}
  <!-- Authenticated - show app with layout -->
  <Layout>
    <svelte:component this={currentComponent} />
  </Layout>
{/if}
