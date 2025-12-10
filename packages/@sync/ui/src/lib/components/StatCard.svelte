<script lang="ts">
  export let title = '';
  export let value: string | number = '';
  export let subtitle = '';
  export let color: 'blue' | 'green' | 'red' | 'yellow' | 'purple' | 'gray' = 'blue';
  export let icon = '';
  export let trend: 'up' | 'down' | 'neutral' | undefined = undefined;
  export let trendValue = '';
  export let loading = false;
  export let clickable = false;
  
  const colorClasses = {
    blue: {
      bg: 'bg-blue-50',
      text: 'text-blue-900',
      subtitle: 'text-blue-700',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-50',
      text: 'text-green-900',
      subtitle: 'text-green-700',
      border: 'border-green-200'
    },
    red: {
      bg: 'bg-red-50',
      text: 'text-red-900',
      subtitle: 'text-red-700',
      border: 'border-red-200'
    },
    yellow: {
      bg: 'bg-yellow-50',
      text: 'text-yellow-900',
      subtitle: 'text-yellow-700',
      border: 'border-yellow-200'
    },
    purple: {
      bg: 'bg-purple-50',
      text: 'text-purple-900',
      subtitle: 'text-purple-700',
      border: 'border-purple-200'
    },
    gray: {
      bg: 'bg-gray-50',
      text: 'text-gray-900',
      subtitle: 'text-gray-700',
      border: 'border-gray-200'
    }
  };
  
  const trendClasses = {
    up: 'text-green-600',
    down: 'text-red-600',
    neutral: 'text-gray-600'
  };
  
  $: cardClasses = [
    'stat-card',
    colorClasses[color].bg,
    colorClasses[color].border,
    clickable ? 'cursor-pointer hover:shadow-md' : ''
  ].filter(Boolean).join(' ');
</script>

<div 
  class={cardClasses}
  on:click
  on:keydown
  role={clickable ? 'button' : undefined}
  tabindex={clickable ? 0 : undefined}
>
  {#if loading}
    <div class="loading-container">
      <div class="loading-spinner"></div>
      <div class="loading-text">Cargando...</div>
    </div>
  {:else}
    <!-- Header con título e icono -->
    <div class="stat-header">
      <h3 class="stat-title {colorClasses[color].subtitle}">
        {#if icon}
          <span class="stat-icon">{icon}</span>
        {/if}
        {title}
      </h3>
      
      {#if trend && trendValue}
        <div class="trend {trendClasses[trend]}">
          {#if trend === 'up'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 17l9.2-9.2M17 17V7H7" />
            </svg>
          {:else if trend === 'down'}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 7l-9.2 9.2M7 7v10h10" />
            </svg>
          {:else}
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 12H4" />
            </svg>
          {/if}
          <span class="trend-value">{trendValue}</span>
        </div>
      {/if}
    </div>
    
    <!-- Valor principal -->
    <div class="stat-value {colorClasses[color].text}">
      {value}
    </div>
    
    <!-- Subtítulo -->
    {#if subtitle}
      <div class="stat-subtitle {colorClasses[color].subtitle}">
        {subtitle}
      </div>
    {/if}
    
    <!-- Slot para contenido adicional -->
    {#if $$slots.default}
      <div class="stat-content">
        <slot />
      </div>
    {/if}
  {/if}
</div>

<style>
  .stat-card {
    padding: 1rem;
    border-radius: 0.75rem;
    border: 1px solid;
    transition: all 0.2s ease;
    position: relative;
    overflow: hidden;
  }
  
  .stat-card:hover {
    transform: translateY(-1px);
  }
  
  .stat-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    margin-bottom: 0.5rem;
  }
  
  .stat-title {
    font-size: 0.875rem;
    font-weight: 600;
    margin: 0;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .stat-icon {
    font-size: 1rem;
  }
  
  .trend {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    font-weight: 600;
  }
  
  .trend-value {
    white-space: nowrap;
  }
  
  .stat-value {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    margin-bottom: 0.25rem;
    word-break: break-all;
  }
  
  .stat-subtitle {
    font-size: 0.75rem;
    font-weight: 500;
    line-height: 1.4;
  }
  
  .stat-content {
    margin-top: 0.75rem;
  }
  
  .loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0;
  }
  
  .loading-spinner {
    width: 1.5rem;
    height: 1.5rem;
    border: 2px solid #e5e7eb;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 0.5rem;
  }
  
  .loading-text {
    font-size: 0.875rem;
    color: #6b7280;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Responsive */
  @media (max-width: 640px) {
    .stat-card {
      padding: 0.75rem;
    }
    
    .stat-value {
      font-size: 1.5rem;
    }
    
    .stat-header {
      flex-direction: column;
      gap: 0.25rem;
    }
    
    .trend {
      align-self: flex-start;
    }
  }
</style>