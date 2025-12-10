# Error Logging and Monitoring

Sistema de logging de errores y monitoreo de performance con integración de Sentry.

## Características

- ✅ Integración con Sentry para error tracking
- ✅ Logging local en IndexedDB
- ✅ Filtrado automático de datos sensibles
- ✅ Monitoreo de performance
- ✅ Error boundaries para Svelte
- ✅ Breadcrumbs para contexto de errores

## Configuración

### 1. Variables de Entorno

Agrega tu DSN de Sentry en `.env.local`:

```bash
VITE_SENTRY_DSN=https://your-sentry-dsn@sentry.io/project-id
VITE_APP_VERSION=1.0.0
```

### 2. Inicialización

El error logger se inicializa automáticamente en `main.ts`:

```typescript
import { errorLogger } from './lib/monitoring/error-logger';

errorLogger.initialize({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: import.meta.env.VITE_APP_VERSION,
  tracesSampleRate: 0.1,
  enableLocalLogs: true
});
```

## Uso

### Logging de Errores

```typescript
import { errorLogger } from '$lib/monitoring/error-logger';

// Error simple
await errorLogger.logError('Algo salió mal');

// Error con objeto Error
try {
  // código que puede fallar
} catch (error) {
  await errorLogger.logError(error as Error, {
    user_id: userId,
    action: 'register_pago'
  });
}

// Error con nivel personalizado
await errorLogger.logError('Advertencia', { context: 'data' }, 'warning');
```

### Monitoreo de Performance

```typescript
// Medir performance de una función
const result = await errorLogger.measurePerformance(
  'register_pago',
  async () => {
    // tu código aquí
    return await registerPago(data);
  },
  { component: 'PagoForm' }
);

// Log manual de métrica
errorLogger.logPerformance({
  name: 'page_load',
  value: 1500,
  timestamp: Date.now(),
  tags: { page: 'dashboard' }
});
```

### Contexto de Usuario

```typescript
// Establecer usuario actual
errorLogger.setUser({
  id: user.id,
  email: user.email,
  username: user.nombre,
  tenant_id: user.tenant_id
});

// Limpiar usuario al cerrar sesión
errorLogger.clearUser();
```

### Breadcrumbs

```typescript
// Agregar breadcrumb para contexto
errorLogger.addBreadcrumb('Usuario hizo clic en botón', 'ui.click', 'info', {
  button_id: 'submit_pago'
});
```

### Error Boundary Component

Envuelve tus componentes con ErrorBoundary:

```svelte
<script>
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte';
</script>

<ErrorBoundary fallback="Error al cargar el formulario" showDetails={true}>
  <PagoForm />
</ErrorBoundary>
```

## Filtrado de Datos Sensibles

El sistema filtra automáticamente:

- Contraseñas, tokens, API keys
- Números de documento
- Números de teléfono
- Cualquier campo con nombres sensibles

Ejemplo:

```typescript
await errorLogger.logError('Error', {
  user_id: 'user-123',
  password: 'secret123', // Se filtra automáticamente
  telefono: '3001234567', // Se filtra automáticamente
  nombre: 'Juan Pérez' // No se filtra
});

// En Sentry verás:
// {
//   user_id: 'user-123',
//   password: '[FILTERED]',
//   telefono: '[FILTERED]',
//   nombre: 'Juan Pérez'
// }
```

## Logs Locales

Los errores también se guardan localmente en IndexedDB:

```typescript
// Obtener últimos 50 errores
const logs = await errorLogger.getLocalLogs(50);

// Limpiar logs locales
await errorLogger.clearLocalLogs();
```

## Modo Local-Only

Si no configuras `VITE_SENTRY_DSN`, el sistema funciona en modo local-only:

- Los errores se guardan en IndexedDB
- No se envía nada a Sentry
- Útil para desarrollo y testing

## Integración con Audit Log

Los errores críticos (nivel 'error') también se registran automáticamente en el audit log para
trazabilidad completa.

## Testing

```bash
# Ejecutar tests
npm test -- src/lib/monitoring/error-logger.test.ts
```

## Requisitos Validados

- ✅ 20.1: Integración con Sentry
- ✅ 20.2: Métricas de performance
- ✅ 20.3: Logging local
- ✅ 20.4: Contexto completo en errores
- ✅ 20.5: Filtrado de datos sensibles
- ✅ 20.6: Prevención de fugas de información
