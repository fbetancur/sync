<script lang="ts">
  import { user, isSyncing, hasUnsyncedData, app } from '../stores';
  import { crediSyncApp } from '../app-config';

  async function handleSync() {
    try {
      app.addNotification({
        type: 'info',
        title: 'Sincronización',
        message: 'Iniciando sincronización...',
        autoClose: true
      });
      
      // Usar @sync/core para sincronización
      await app.sync();
      
      app.addNotification({
        type: 'success',
        title: 'Sincronización completa',
        message: 'Todos los datos están actualizados',
        autoClose: true
      });
    } catch (error) {
      console.error('Sync error:', error);
      app.addNotification({
        type: 'error',
        title: 'Error de sincronización',
        message: 'No se pudo completar la sincronización',
        autoClose: false
      });
    }
  }

  async function handleLogout() {
    try {
      await app.auth.signOut();
      // Navigation será manejada por el router cuando lo implementemos
    } catch (error) {
      app.addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo cerrar sesión',
        autoClose: true
      });
    }
  }
</script>

<div class="navbar bg-base-100 shadow-sm border-b border-base-300">
  <!-- Mobile menu button -->
  <div class="navbar-start">
    <label for="drawer-toggle" class="btn btn-square btn-ghost lg:hidden">
      <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </label>
    
    <!-- Logo/Title for desktop -->
    <div class="hidden lg:flex">
      <a href="/" class="btn btn-ghost text-xl font-bold text-primary">
        💳 CrediSync
      </a>
    </div>
  </div>

  <!-- Center - Search (future) -->
  <div class="navbar-center">
    <div class="form-control">
      <input type="text" placeholder="Buscar cliente..." class="input input-bordered input-sm w-64 hidden md:flex" />
    </div>
  </div>

  <!-- Right side actions -->
  <div class="navbar-end gap-2">
    <!-- Sync button -->
    <button 
      class="btn btn-ghost btn-sm gap-2" 
      class:loading={$isSyncing}
      disabled={$isSyncing}
      on:click={handleSync}
    >
      {#if $isSyncing}
        <span class="loading loading-spinner loading-xs"></span>
        Sincronizando...
      {:else}
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Sincronizar
      {/if}
    </button>

    <!-- Pending operations indicator -->
    {#if $hasUnsyncedData}
      <div class="badge badge-warning badge-sm">
        Pendiente
      </div>
    {/if}

    <!-- User menu -->
    <div class="dropdown dropdown-end">
      <div tabindex="0" role="button" class="btn btn-ghost btn-circle avatar">
        <div class="w-8 rounded-full bg-primary text-primary-content flex items-center justify-center">
          <span class="text-sm font-bold">
            {$user?.email?.charAt(0).toUpperCase() || 'U'}
          </span>
        </div>
      </div>
      
      <ul tabindex="0" class="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52">
        <li class="menu-title">
          <span>{$user?.email}</span>
        </li>
        <li><a href="/perfil">👤 Perfil</a></li>
        <li><a href="/configuracion">⚙️ Configuración</a></li>
        <div class="divider my-1"></div>
        <li>
          <button on:click={handleLogout} class="text-error">
            🚪 Cerrar Sesión
          </button>
        </li>
      </ul>
    </div>
  </div>
</div>