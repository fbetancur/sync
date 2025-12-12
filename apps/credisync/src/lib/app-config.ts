import { createSyncApp } from '@sync/core';

// Usar el esquema del motor universal (definido en @sync/core/src/schema/example-schemas.ts)
// Esto evita problemas de imports circulares y de tipos
const crediSyncSchema = {
  name: 'credisync_db', // ¡CAMBIO IMPORTANTE! Ahora usa credisync_db en lugar de microcreditos_db
  multiTenant: true,
  tables: {
    tenants: {
      fields: ['nombre', 'usuarios_contratados', 'usuarios_activos', 'activo'],
      indexes: ['nombre', 'activo'],
      required: ['nombre', 'usuarios_contratados', 'usuarios_activos'],
      fieldTypes: {
        nombre: 'string',
        usuarios_contratados: 'number',
        usuarios_activos: 'number',
        activo: 'boolean'
      }
    },
    users: {
      fields: ['email', 'nombre', 'rol', 'activo'],
      indexes: ['email', '[tenant_id+activo]'],
      required: ['email', 'nombre', 'rol'],
      unique: ['email'],
      fieldTypes: {
        email: 'email',
        nombre: 'string',
        rol: 'string',
        activo: 'boolean'
      }
    },
    rutas: {
      fields: ['nombre', 'descripcion', 'activa'],
      indexes: ['nombre', 'activa', '[tenant_id+activa]'],
      required: ['nombre'],
      fieldTypes: {
        nombre: 'string',
        descripcion: 'text',
        activa: 'boolean'
      }
    },
    productos_credito: {
      fields: [
        'nombre', 'interes_porcentaje', 'plazo_minimo', 'plazo_maximo',
        'monto_minimo', 'monto_maximo', 'frecuencia_pago', 'activo'
      ],
      indexes: ['activo', '[tenant_id+activo]'],
      required: ['nombre', 'interes_porcentaje', 'plazo_minimo', 'plazo_maximo'],
      fieldTypes: {
        nombre: 'string',
        interes_porcentaje: 'number',
        plazo_minimo: 'number',
        plazo_maximo: 'number',
        monto_minimo: 'number',
        monto_maximo: 'number',
        frecuencia_pago: 'string',
        activo: 'boolean'
      }
    },
    clientes: {
      fields: [
        'nombre', 'numero_documento', 'telefono', 'direccion', 'ruta_id',
        'tipo_documento', 'telefono_2', 'barrio', 'referencia',
        'latitud', 'longitud', 'nombre_fiador', 'telefono_fiador',
        'creditos_activos', 'saldo_total', 'dias_atraso_max', 'estado', 'score',
        'observaciones'
      ],
      indexes: [
        'ruta_id', 'numero_documento', 'estado',
        '[tenant_id+ruta_id]', '[tenant_id+estado]', '[tenant_id+numero_documento]'
      ],
      relationships: {
        ruta_id: 'rutas.id'
      },
      required: ['nombre', 'numero_documento', 'telefono', 'direccion'],
      unique: ['numero_documento'],
      fieldTypes: {
        nombre: 'string',
        numero_documento: 'string',
        telefono: 'phone',
        direccion: 'text',
        ruta_id: 'string',
        tipo_documento: 'string',
        telefono_2: 'phone',
        barrio: 'string',
        referencia: 'text',
        latitud: 'number',
        longitud: 'number',
        nombre_fiador: 'string',
        telefono_fiador: 'phone',
        creditos_activos: 'number',
        saldo_total: 'number',
        dias_atraso_max: 'number',
        estado: 'string',
        score: 'number',
        observaciones: 'text'
      }
    },
    creditos: {
      fields: [
        'cliente_id', 'producto_id', 'cobrador_id', 'ruta_id',
        'monto_original', 'interes_porcentaje', 'total_a_pagar',
        'numero_cuotas', 'valor_cuota', 'frecuencia',
        'fecha_desembolso', 'fecha_primera_cuota', 'fecha_ultima_cuota',
        'estado', 'saldo_pendiente', 'cuotas_pagadas', 'dias_atraso',
        'excluir_domingos'
      ],
      indexes: [
        'cliente_id', 'cobrador_id', 'ruta_id', 'estado',
        '[tenant_id+estado]', '[cliente_id+estado]',
        '[cobrador_id+estado]', '[tenant_id+ruta_id+estado]'
      ],
      relationships: {
        cliente_id: 'clientes.id',
        producto_id: 'productos_credito.id',
        cobrador_id: 'users.id',
        ruta_id: 'rutas.id'
      },
      required: ['cliente_id', 'producto_id', 'monto_original', 'numero_cuotas'],
      fieldTypes: {
        cliente_id: 'string',
        producto_id: 'string',
        cobrador_id: 'string',
        ruta_id: 'string',
        monto_original: 'number',
        interes_porcentaje: 'number',
        total_a_pagar: 'number',
        numero_cuotas: 'number',
        valor_cuota: 'number',
        frecuencia: 'string',
        fecha_desembolso: 'number',
        fecha_primera_cuota: 'number',
        fecha_ultima_cuota: 'number',
        estado: 'string',
        saldo_pendiente: 'number',
        cuotas_pagadas: 'number',
        dias_atraso: 'number',
        excluir_domingos: 'boolean'
      }
    },
    cuotas: {
      fields: [
        'credito_id', 'numero', 'valor', 'fecha_programada',
        'fecha_pago', 'monto_pagado', 'estado'
      ],
      indexes: [
        'credito_id', 'numero', 'estado', 'fecha_programada',
        '[credito_id+numero]', '[credito_id+estado]',
        '[tenant_id+estado+fecha_programada]'
      ],
      relationships: {
        credito_id: 'creditos.id'
      },
      required: ['credito_id', 'numero', 'valor', 'fecha_programada'],
      fieldTypes: {
        credito_id: 'string',
        numero: 'number',
        valor: 'number',
        fecha_programada: 'number',
        fecha_pago: 'number',
        monto_pagado: 'number',
        estado: 'string'
      }
    },
    pagos: {
      fields: [
        'credito_id', 'cliente_id', 'cobrador_id', 'monto', 'fecha',
        'latitud', 'longitud', 'observaciones', 'device_id',
        'app_version', 'connection_type', 'battery_level',
        'sync_attempts', 'last_sync_attempt', 'sync_error',
        'comprobante_foto_url'
      ],
      indexes: [
        'credito_id', 'cliente_id', 'cobrador_id', 'fecha',
        '[tenant_id+fecha]', '[credito_id+fecha]',
        '[cobrador_id+fecha]', '[synced+fecha]'
      ],
      relationships: {
        credito_id: 'creditos.id',
        cliente_id: 'clientes.id',
        cobrador_id: 'users.id'
      },
      required: ['credito_id', 'cliente_id', 'cobrador_id', 'monto', 'fecha'],
      fieldTypes: {
        credito_id: 'string',
        cliente_id: 'string',
        cobrador_id: 'string',
        monto: 'number',
        fecha: 'number',
        latitud: 'number',
        longitud: 'number',
        observaciones: 'text',
        device_id: 'string',
        app_version: 'string',
        connection_type: 'string',
        battery_level: 'number',
        sync_attempts: 'number',
        last_sync_attempt: 'number',
        sync_error: 'text',
        comprobante_foto_url: 'url'
      }
    }
  }
} as const;

// Definir el tipo de configuración localmente para evitar problemas de import
interface SyncAppConfig {
  appName: string;
  version?: string;
  supabase?: {
    url: string;
    anonKey: string;
  };
  supabaseUrl?: string;
  supabaseKey?: string;
  encryptionEnabled?: boolean;
  auditEnabled?: boolean;
  syncInterval?: number;
  databaseName?: string;
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
  databaseSchema?: any; // Usar any por ahora para evitar problemas de tipos
  offline?: {
    enabled: boolean;
    syncInterval: number;
    maxRetries: number;
    retryDelay: number;
  };
  sync?: {
    pauseOnActivity: boolean;
    activityTimeout: number;
    forceOnReconnect: boolean;
    maxSyncInterval: number;
  };
  security?: {
    encryption: boolean;
    auditLog: boolean;
    sessionTimeout: number;
  };
}


// Configuración de CrediSync usando @sync/core
const crediSyncConfig: SyncAppConfig = {
  appName: 'CrediSync',
  
  // NUEVO: Configuración de esquema de base de datos (usando motor universal)
  databaseSchema: crediSyncSchema,
  
  // Configuración de Supabase (preservando credenciales existentes)
  supabase: {
    url: (import.meta as any).env?.VITE_SUPABASE_URL || 'https://hmnlriywocnpiktflehr.supabase.co',
    anonKey: (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDE4MzIsImV4cCI6MjA4MDg3NzgzMn0.P4ZZdWAPgby89Rc8yYAZB9f2bwRrRuLEsS_6peobkf4'
  },
  
  
  // Configuración offline-first
  offline: {
    enabled: true,
    syncInterval: 30000, // 30 segundos
    maxRetries: 3,
    retryDelay: 1000
  },
  
  // Configuración de sincronización inteligente
  sync: {
    pauseOnActivity: true,
    activityTimeout: 50000, // 50 segundos de inactividad
    forceOnReconnect: true,
    maxSyncInterval: 300000 // 5 minutos máximo
  },
  
  // Configuración de seguridad
  security: {
    encryption: true,
    auditLog: true,
    sessionTimeout: 24 * 60 * 60 * 1000 // 24 horas
  }
};

// Crear instancia de la aplicación CrediSync
export const crediSyncApp = createSyncApp(crediSyncConfig);

// Exponer globalmente para debugging y testing
if (typeof window !== 'undefined') {
  window.crediSyncApp = crediSyncApp;
}

// Función de inicialización
export async function initializeCrediSync(): Promise<void> {
  try {
    console.log('🚀 Inicializando CrediSync con @sync/core...');
    
    // Inicializar la aplicación
    await crediSyncApp.start();
    
    // Configurar detección de actividad para sync inteligente
    setupActivityDetection();
    
    console.log('✅ CrediSync inicializado correctamente');
  } catch (error) {
    console.error('❌ Error inicializando CrediSync:', error);
    throw error;
  }
}

// Configurar detección de actividad del usuario
function setupActivityDetection(): void {
  const activityEvents = [
    'scroll', 'mousemove', 'mousedown', 'touchstart', 
    'touchmove', 'keydown', 'click', 'input'
  ];
  
  let activityTimer: number | null = null;
  let isUserActive = false;
  
  function onActivity() {
    isUserActive = true;
    
    // Reiniciar timer
    if (activityTimer) {
      clearTimeout(activityTimer);
    }
    
    // Marcar como inactivo después del timeout
    activityTimer = setTimeout(() => {
      isUserActive = false;
      // Trigger sync cuando el usuario esté inactivo
      if (navigator.onLine) {
        crediSyncApp.services.sync.sync({ force: false });
      }
    }, crediSyncConfig.sync?.activityTimeout || 50000);
  }
  
  // Agregar listeners de actividad
  activityEvents.forEach(event => {
    document.addEventListener(event, onActivity, { passive: true });
  });
  
  // Sync forzado al recuperar conexión
  window.addEventListener('online', () => {
    if (!isUserActive) {
      crediSyncApp.services.sync.sync({ force: true });
    }
  });
  
  // Sync inicial después de un delay
  setTimeout(() => {
    if (navigator.onLine && !isUserActive) {
      crediSyncApp.services.sync.sync({ force: false });
    }
  }, 5000);
}

// Obtener estado de la aplicación
export async function getAppStatus() {
  return {
    isInitialized: crediSyncApp.isStarted,
    isOnline: navigator.onLine,
    syncStatus: crediSyncApp.services.sync.isCurrentlySyncing(),
    queueSize: await crediSyncApp.services.sync.getQueueSize()
  };
}