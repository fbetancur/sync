<!--
  LocationCapture - Componente genérico para captura de ubicación
  Parte de @sync/ui - Reutilizable en todas las apps
-->

<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // Importación temporal - en producción sería desde @sync/core
  // import { ContextService } from '@sync/core';
  // import type { LocationResult } from '@sync/core';
  
  // Tipos temporales para desarrollo
  interface LocationResult {
    location: {
      latitude: number;
      longitude: number;
      accuracy: number;
      altitude?: number;
      altitudeAccuracy?: number;
      heading?: number;
      speed?: number;
      timestamp: number;
    } | null;
    error: string | null;
    timestamp: number;
    source?: 'gps' | 'ip' | 'cache' | 'none';
  }
  
  // Mock del ContextService para desarrollo
  class MockContextService {
    async captureLocationWithFallback(): Promise<LocationResult> {
      try {
        if (!navigator.geolocation) {
          return {
            location: null,
            error: 'Geolocation no disponible',
            timestamp: Date.now(),
            source: 'none'
          };
        }

        const position = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });

        return {
          location: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            altitude: position.coords.altitude || undefined,
            timestamp: position.timestamp
          },
          error: null,
          timestamp: Date.now(),
          source: 'gps'
        };
      } catch (error: any) {
        return {
          location: null,
          error: error.message || 'Error capturando ubicación',
          timestamp: Date.now(),
          source: 'none'
        };
      }
    }
  }

  // Props
  export let autoCapture = false;
  export let showDetails = true;
  export let buttonText = 'Capturar Ubicación';
  export let capturedText = 'Ubicación Capturada';

  // Estado
  let capturing = false;
  let captured = false;
  let error = '';
  let locationData: LocationResult | null = null;

  const dispatch = createEventDispatcher();
  const contextService = new MockContextService();

  // Auto-capturar si está habilitado
  if (autoCapture) {
    captureLocation();
  }

  async function captureLocation() {
    if (capturing) return;

    try {
      capturing = true;
      error = '';
      
      console.log('📍 [LOCATION] Iniciando captura desde componente UI...');
      
      const result = await contextService.captureLocationWithFallback();
      
      locationData = result;
      captured = !!result.location;
      
      if (result.location) {
        console.log('✅ [LOCATION] Ubicación capturada exitosamente');
        dispatch('locationCaptured', {
          success: true,
          location: {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            accuracy: result.location.accuracy
          },
          source: result.source,
          timestamp: result.timestamp
        });
      } else {
        error = result.error || 'No se pudo obtener la ubicación';
        console.warn('⚠️ [LOCATION] Error capturando ubicación:', error);
        dispatch('locationCaptured', {
          success: false,
          error: error
        });
      }
      
    } catch (err: any) {
      error = err.message || 'Error inesperado capturando ubicación';
      console.error('❌ [LOCATION] Error inesperado:', err);
      dispatch('locationCaptured', {
        success: false,
        error: error
      });
    } finally {
      capturing = false;
    }
  }

  function formatAccuracy(accuracy: number): string {
    if (accuracy < 100) {
      return `±${Math.round(accuracy)}m`;
    } else if (accuracy < 1000) {
      return `±${Math.round(accuracy / 100) * 100}m`;
    } else {
      return `±${Math.round(accuracy / 1000)}km`;
    }
  }

  function formatCoordinates(lat: number, lng: number): string {
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  }

  function getSourceIcon(source?: string): string {
    switch (source) {
      case 'gps': return '🛰️';
      case 'ip': return '🌐';
      case 'cache': return '💾';
      default: return '📍';
    }
  }

  function getSourceText(source?: string): string {
    switch (source) {
      case 'gps': return 'GPS';
      case 'ip': return 'IP Geolocation';
      case 'cache': return 'Cache';
      default: return 'Desconocido';
    }
  }
</script>

<div class="location-capture">
  <div class="capture-header">
    <h3 class="capture-title">
      📍 Ubicación
    </h3>
    
    {#if !captured}
      <button
        type="button"
        class="capture-btn"
        class:capturing
        on:click={captureLocation}
        disabled={capturing}
      >
        {#if capturing}
          <span class="spinner"></span>
          Capturando...
        {:else}
          {buttonText}
        {/if}
      </button>
    {:else}
      <div class="captured-indicator">
        <span class="success-icon">✅</span>
        {capturedText}
      </div>
    {/if}
  </div>

  {#if error}
    <div class="error-message">
      <span class="error-icon">⚠️</span>
      {error}
    </div>
  {/if}

  {#if captured && locationData?.location && showDetails}
    <div class="location-details">
      <div class="detail-row">
        <span class="detail-label">Coordenadas:</span>
        <span class="detail-value">
          {formatCoordinates(locationData.location.latitude, locationData.location.longitude)}
        </span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Precisión:</span>
        <span class="detail-value">
          {formatAccuracy(locationData.location.accuracy)}
        </span>
      </div>
      
      <div class="detail-row">
        <span class="detail-label">Fuente:</span>
        <span class="detail-value">
          {getSourceIcon(locationData.source)} {getSourceText(locationData.source)}
        </span>
      </div>
      
      {#if locationData.location.altitude}
        <div class="detail-row">
          <span class="detail-label">Altitud:</span>
          <span class="detail-value">
            {Math.round(locationData.location.altitude)}m
          </span>
        </div>
      {/if}
    </div>
  {/if}

  {#if captured && !showDetails}
    <div class="location-summary">
      <span class="summary-icon">{getSourceIcon(locationData?.source)}</span>
      <span class="summary-text">
        Ubicación capturada con {getSourceText(locationData?.source)}
      </span>
    </div>
  {/if}
</div>

<style>
  .location-capture {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 1rem;
    background: #f9fafb;
  }

  .capture-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.75rem;
  }

  .capture-title {
    margin: 0;
    font-size: 1rem;
    font-weight: 600;
    color: #374151;
  }

  .capture-btn {
    padding: 0.5rem 1rem;
    background: #3b82f6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .capture-btn:hover:not(:disabled) {
    background: #2563eb;
    transform: translateY(-1px);
  }

  .capture-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .capture-btn.capturing {
    background: #6b7280;
  }

  .captured-indicator {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    color: #059669;
    font-weight: 500;
    font-size: 0.875rem;
  }

  .success-icon {
    font-size: 1rem;
  }

  .spinner {
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

  .error-message {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #fef2f2;
    border: 1px solid #fecaca;
    border-radius: 6px;
    color: #dc2626;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
  }

  .error-icon {
    font-size: 1rem;
  }

  .location-details {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 0.75rem;
    font-size: 0.875rem;
  }

  .detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.25rem 0;
  }

  .detail-row:not(:last-child) {
    border-bottom: 1px solid #f3f4f6;
  }

  .detail-label {
    color: #6b7280;
    font-weight: 500;
  }

  .detail-value {
    color: #374151;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  }

  .location-summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    font-size: 0.875rem;
    color: #374151;
  }

  .summary-icon {
    font-size: 1rem;
  }

  .summary-text {
    font-weight: 500;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .capture-header {
      flex-direction: column;
      align-items: stretch;
      gap: 0.75rem;
    }

    .capture-btn {
      width: 100%;
      justify-content: center;
    }

    .captured-indicator {
      justify-content: center;
    }

    .detail-row {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.25rem;
    }
  }
</style>