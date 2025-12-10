<script lang="ts">
  import { onMount } from 'svelte';
  import { isAuthenticated, user, sidebarOpen, pageTitle, notifications, isOnline, hasUnsyncedData } from '../stores';
  import TopBar from './TopBar.svelte';
  import Sidebar from './Sidebar.svelte';
  import NotificationToast from './NotificationToast.svelte';

  export let children: any;

  onMount(() => {
    console.log('✅ Layout mounted - usando arquitectura @sync/core');
  });
</script>

{#if $isAuthenticated}
  <div class="drawer lg:drawer-open">
    <input id="drawer-toggle" type="checkbox" class="drawer-toggle" bind:checked={$sidebarOpen} />
    
    <!-- Page content -->
    <div class="drawer-content flex flex-col">
      <!-- Top bar -->
      <TopBar />
      
      <!-- Main content -->
      <main class="flex-1 p-4 bg-base-200 min-h-screen">
        <div class="max-w-7xl mx-auto">
          <!-- Page header -->
          <div class="mb-6">
            <div class="flex items-center justify-between">
              <h1 class="text-3xl font-bold text-base-content">{$pageTitle}</h1>
              
              <!-- Status indicators -->
              <div class="flex items-center gap-2">
                <!-- Online/Offline indicator -->
                <div class="badge {$isOnline ? 'badge-success' : 'badge-error'} gap-2">
                  {#if $isOnline}
                    <div class="w-2 h-2 bg-success rounded-full"></div>
                    En línea
                  {:else}
                    <div class="w-2 h-2 bg-error rounded-full"></div>
                    Sin conexión
                  {/if}
                </div>
                
                <!-- Unsynced data indicator -->
                {#if $hasUnsyncedData}
                  <div class="badge badge-warning gap-2">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    Datos pendientes
                  </div>
                {/if}
              </div>
            </div>
          </div>
          
          <!-- Page content -->
          <div class="bg-base-100 rounded-lg shadow-sm p-6">
            <svelte:component this={children} />
          </div>
        </div>
      </main>
    </div>
    
    <!-- Sidebar -->
    <div class="drawer-side">
      <label for="drawer-toggle" class="drawer-overlay"></label>
      <Sidebar />
    </div>
  </div>
  
  <!-- Notifications -->
  <div class="toast toast-top toast-end z-50">
    {#each $notifications as notification (notification.id)}
      <NotificationToast {notification} />
    {/each}
  </div>
{:else}
  <!-- Not authenticated - show login or loading -->
  <div class="min-h-screen flex items-center justify-center bg-base-200">
    <div class="text-center">
      <div class="loading loading-spinner loading-lg mb-4"></div>
      <p class="text-base-content/70">Cargando CrediSync...</p>
    </div>
  </div>
{/if}