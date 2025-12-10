# @sync/ui

Componentes UI compartidos para aplicaciones de la Plataforma Sync.

## Descripción

Este paquete proporciona componentes Svelte reutilizables, stores y hooks que son comunes en todas las aplicaciones de la Plataforma Sync.

## Componentes

### PinEntry
Componente para entrada segura de PIN para inicializar encriptación.

```svelte
<script>
  import { PinEntry } from '@sync/ui';
  import { encryptionService } from '@sync/core';
</script>

<PinEntry 
  {encryptionService}
  title="Ingrese su PIN"
  on:success={(event) => console.log('PIN configurado')}
  on:cancel={() => console.log('Cancelado')}
/>
```

### ErrorBoundary
Componente para capturar y manejar errores en componentes hijos.

```svelte
<script>
  import { ErrorBoundary } from '@sync/ui';
  import { errorLogger } from '@sync/core';
</script>

<ErrorBoundary {errorLogger} showDetails={true}>
  <MiComponente />
</ErrorBoundary>
```

## Hooks

### useEncryption
Hook para gestionar el estado de encriptación.

```javascript
import { createEncryptionHook } from '@sync/ui';
import { encryptionService } from '@sync/core';

const encryption = createEncryptionHook(encryptionService);
```

### useBackgroundSync
Hook para integración de sincronización en segundo plano.

```javascript
import { createBackgroundSyncHook } from '@sync/ui';
import { backgroundSyncManager, syncManager } from '@sync/core';

const backgroundSync = createBackgroundSyncHook(backgroundSyncManager, syncManager);
```

## Stores

### Sync Store
Gestión del estado de sincronización.

```javascript
import { createSyncStore } from '@sync/ui';
import { syncManager } from '@sync/core';

const syncStore = createSyncStore(syncManager);
```

### Auth Store
Gestión del estado de autenticación.

```javascript
import { createAuthStore } from '@sync/ui';
import { authService, encryptionService } from '@sync/core';

const authStore = createAuthStore(authService, encryptionService);
```

## Instalación

```bash
pnpm add @sync/ui @sync/core
```

## Uso

```javascript
// Componentes
import { PinEntry, ErrorBoundary } from '@sync/ui';

// Hooks
import { createEncryptionHook, createBackgroundSyncHook } from '@sync/ui';

// Stores
import { createSyncStore, createAuthStore } from '@sync/ui';
```

## Desarrollo

```bash
# Ejecutar tests
pnpm test

# Ejecutar tests en modo watch
pnpm test:ui

# Linting
pnpm lint

# Formatear código
pnpm format
```

## Características

- ✅ Componentes Svelte reutilizables
- ✅ Inyección de dependencias para máxima flexibilidad
- ✅ Hooks para funcionalidad común
- ✅ Stores reactivos para estado global
- ✅ Tests unitarios
- ✅ Documentación completa