<script lang="ts">
  import { currentPage, app } from '../stores';

  interface MenuItem {
    id: string;
    label: string;
    icon: string;
    path: string;
    badge?: number;
  }

  const menuItems: MenuItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊', path: '/' },
    { id: 'clientes', label: 'Clientes', icon: '👥', path: '/clientes' },
    { id: 'creditos', label: 'Créditos', icon: '💰', path: '/creditos' },
    { id: 'pagos', label: 'Pagos', icon: '💳', path: '/pagos' },
    { id: 'rutas', label: 'Rutas', icon: '🗺️', path: '/rutas' },
    { id: 'reportes', label: 'Reportes', icon: '📈', path: '/reportes' }
  ];

  function handleNavigation(item: MenuItem) {
    // Por ahora solo actualizar el estado, el router se implementará después
    app.setCurrentPage(item.id, item.label);
    app.closeSidebar();
    
    // TODO: Implementar navegación real cuando tengamos el router
    console.log(`Navegando a: ${item.path}`);
  }
</script>

<aside class="min-h-full w-64 bg-base-200 text-base-content">
  <!-- Logo/Header -->
  <div class="p-4 border-b border-base-300">
    <div class="flex items-center gap-3">
      <div class="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
        <span class="text-primary-content font-bold text-lg">💳</span>
      </div>
      <div>
        <h2 class="font-bold text-lg">CrediSync</h2>
        <p class="text-xs opacity-70">Gestión de Microcréditos</p>
      </div>
    </div>
  </div>

  <!-- Navigation Menu -->
  <nav class="p-4">
    <ul class="menu menu-lg w-full">
      {#each menuItems as item}
        <li>
          <button
            class="flex items-center gap-3 p-3 rounded-lg transition-colors"
            class:active={$currentPage === item.id}
            on:click={() => handleNavigation(item)}
          >
            <span class="text-xl">{item.icon}</span>
            <span class="flex-1 text-left">{item.label}</span>
            {#if item.badge}
              <span class="badge badge-primary badge-sm">{item.badge}</span>
            {/if}
          </button>
        </li>
      {/each}
    </ul>
  </nav>

  <!-- Quick Actions -->
  <div class="p-4 border-t border-base-300 mt-auto">
    <div class="space-y-2">
      <button 
        class="btn btn-primary btn-sm w-full gap-2"
        on:click={() => console.log('Registrar Pago - TODO: implementar')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
        Registrar Pago
      </button>
      
      <button 
        class="btn btn-outline btn-sm w-full gap-2"
        on:click={() => console.log('Nuevo Cliente - TODO: implementar')}
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        Nuevo Cliente
      </button>
    </div>
  </div>
</aside>