<script lang="ts">
  import { onMount } from 'svelte';
  import { crediSyncApp, getAppStatus } from '../lib/app-config';
  import { appStatus, isOnline, hasUnsyncedData, app } from '../lib/stores';

  let stats = {
    clientesTotal: 0,
    creditosActivos: 0,
    pagosHoy: 0,
    saldoPendiente: 0
  };

  onMount(async () => {
    console.log('📊 Dashboard mounted - usando @sync/core');
    
    // Usar @sync/core para obtener estadísticas
    try {
      const status = await getAppStatus();
      console.log('App status:', status);
      
      // TODO: Implementar queries usando crediSyncApp.services.db
      // const clientes = await crediSyncApp.services.db.clientes.count();
      // stats.clientesTotal = clientes;
      
    } catch (error) {
      console.error('Error loading dashboard stats:', error);
      app.addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudieron cargar las estadísticas',
        autoClose: true
      });
    }
  });
</script>

<div class="space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-base-content">Dashboard</h1>
      <p class="text-base-content/70">Resumen de actividades de cobranza</p>
    </div>
    
    <!-- Status indicator -->
    <div class="flex items-center gap-2">
      <div class="badge {$isOnline ? 'badge-success' : 'badge-error'}">
        {$isOnline ? '🟢 En línea' : '🔴 Sin conexión'}
      </div>
      {#if $hasUnsyncedData}
        <div class="badge badge-warning">⏳ Datos pendientes</div>
      {/if}
    </div>
  </div>

  <!-- Stats Cards -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-primary">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <div class="stat-title">Clientes</div>
      <div class="stat-value text-primary">{stats.clientesTotal}</div>
      <div class="stat-desc">Total registrados</div>
    </div>

    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-secondary">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
      <div class="stat-title">Créditos Activos</div>
      <div class="stat-value text-secondary">{stats.creditosActivos}</div>
      <div class="stat-desc">En proceso de pago</div>
    </div>

    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-accent">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div class="stat-title">Pagos Hoy</div>
      <div class="stat-value text-accent">{stats.pagosHoy}</div>
      <div class="stat-desc">Registrados hoy</div>
    </div>

    <div class="stat bg-base-100 shadow rounded-lg">
      <div class="stat-figure text-warning">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      </div>
      <div class="stat-title">Saldo Pendiente</div>
      <div class="stat-value text-warning">${stats.saldoPendiente.toLocaleString()}</div>
      <div class="stat-desc">Por cobrar</div>
    </div>
  </div>

  <!-- Quick Actions -->
  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title">🚀 Acciones Rápidas</h2>
        <div class="space-y-2">
          <button class="btn btn-primary btn-block gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            Registrar Pago
          </button>
          <button class="btn btn-outline btn-block gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Nuevo Cliente
          </button>
          <button class="btn btn-outline btn-block gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Ver Reportes
          </button>
        </div>
      </div>
    </div>

    <div class="card bg-base-100 shadow">
      <div class="card-body">
        <h2 class="card-title">📊 Estado del Sistema</h2>
        <div class="space-y-3">
          <div class="flex justify-between items-center">
            <span>Conexión</span>
            <div class="badge {$isOnline ? 'badge-success' : 'badge-error'}">
              {$isOnline ? 'Conectado' : 'Desconectado'}
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span>Sincronización</span>
            <div class="badge {$appStatus.isSyncing ? 'badge-warning' : 'badge-success'}">
              {$appStatus.isSyncing ? 'Sincronizando...' : 'Al día'}
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span>Datos pendientes</span>
            <div class="badge badge-info">
              {$appStatus.queueSize || 0}
            </div>
          </div>
          <div class="flex justify-between items-center">
            <span>Última sincronización</span>
            <span class="text-sm opacity-70">
              {$appStatus.lastSync ? new Date($appStatus.lastSync).toLocaleTimeString() : 'Nunca'}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Recent Activity (placeholder) -->
  <div class="card bg-base-100 shadow">
    <div class="card-body">
      <h2 class="card-title">📋 Actividad Reciente</h2>
      <div class="text-center py-8 opacity-70">
        <p>No hay actividad reciente</p>
        <p class="text-sm">Los pagos y transacciones aparecerán aquí</p>
      </div>
    </div>
  </div>
</div>