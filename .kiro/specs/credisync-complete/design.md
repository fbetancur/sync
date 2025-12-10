# Design Document - CrediSync Complete Rebuild

**Fecha:** Diciembre 10, 2024  
**Alcance:** Aplicación completa de gestión de microcréditos  
**Framework:** SvelteKit (migración desde Svelte+Vite)  
**Basado en:** App de referencia `tools/examples/src/` (reutilización directa)

## Overview

CrediSync será reconstruida completamente desde cero usando SvelteKit, reutilizando directamente la interfaz y experiencia de usuario de la app de referencia ubicada en `tools/examples/src/`, pero implementada 100% sobre la arquitectura empresarial Sync Platform (@sync/core, @sync/types, @sync/ui).

La aplicación cubrirá el flujo completo de usuario: Autenticación → Dashboard/Ruta → Gestión de Clientes → Gestión de Créditos → Registro de Pagos → Sincronización Inteligente, con funcionalidad offline-first y pruebas exhaustivas en cada componente.

## Architecture

### Framework Migration: Svelte+Vite → SvelteKit (Migración Inteligente)

**Decisión:** Migración incremental preservando configuraciones valiosas existentes.

**Configuraciones a PRESERVAR:**
- ✅ **Supabase:** URL y API Key ya funcionando (`https://hmnlriywocnpiktflehr.supabase.co`)
- ✅ **Vercel:** Deployment configurado con build commands optimizados
- ✅ **Variables de entorno:** `.env.local` con credenciales funcionando
- ✅ **TailwindCSS + DaisyUI:** Configuración y temas ya definidos
- ✅ **Monorepo scripts:** pnpm workspaces y scripts ya funcionando
- ✅ **CI/CD:** Pipelines de GitHub Actions ya configurados

**Migraciones MÍNIMAS necesarias:**
- **package.json:** Actualizar dependencias a SvelteKit
- **svelte.config.js:** Configurar adapter-static para PWA
- **vite.config.ts:** Adaptar para SvelteKit + mantener PWA
- **Código fuente:** Migrar src/ a estructura SvelteKit

**Beneficios de migración inteligente:**
- ✅ Reutilización directa de componentes de referencia
- ✅ No romper infraestructura existente (Supabase, Vercel)
- ✅ Migración más segura y rápida
- ✅ Mantener toda la configuración probada

### Application Structure

```
apps/credisync/
├── src/
│   ├── routes/
│   │   ├── +layout.svelte                    ← Layout principal con bottom nav
│   │   ├── +page.svelte                      ← Redirect a /ruta si autenticado
│   │   ├── login/
│   │   │   └── +page.svelte                  ← Login (copiado de referencia)
│   │   └── (app)/                            ← Rutas protegidas
│   │       ├── +layout.svelte                ← Layout de app (copiado de referencia)
│   │       ├── ruta/
│   │       │   └── +page.svelte              ← Dashboard principal (copiado de referencia)
│   │       ├── clientes/
│   │       │   ├── +page.svelte              ← Lista clientes (copiado de referencia)
│   │       │   ├── nuevo/
│   │       │   │   └── +page.svelte          ← Crear cliente
│   │       │   └── [id]/
│   │       │       └── +page.svelte          ← Detalle cliente
│   │       ├── balance/
│   │       │   └── +page.svelte              ← Balance y reportes
│   │       └── configuracion/
│   │           └── +page.svelte              ← Configuración
│   ├── lib/
│   │   ├── components/                       ← Componentes (copiados de referencia)
│   │   │   ├── ClienteCardCompacta.svelte
│   │   │   ├── ModalCobroInteligente.svelte
│   │   │   ├── ModalOtorgarCredito.svelte
│   │   │   └── NotificationToast.svelte
│   │   ├── stores/                           ← Stores (adaptados a @sync/core)
│   │   │   ├── auth.js                       ← Wrapper de @sync/core auth
│   │   │   ├── sync.js                       ← Wrapper de @sync/core sync
│   │   │   └── notifications.js              ← Notificaciones locales
│   │   ├── utils/                            ← Utilidades (adaptadas a @sync/core)
│   │   │   ├── creditos.js                   ← Cálculos financieros
│   │   │   ├── cobros.js                     ← Lógica de cobros
│   │   │   └── validaciones.js               ← Validaciones
│   │   └── app-config.ts                     ← ✅ Configuración @sync/core
│   ├── app.html                              ← HTML template
│   └── app.css                               ← Estilos globales (copiados de referencia)
├── static/                                   ← Assets estáticos
├── package.json                              ← Configuración SvelteKit
├── svelte.config.js                          ← Configuración SvelteKit
├── vite.config.ts                            ← Configuración Vite + PWA
└── tsconfig.json                             ← TypeScript config
```

### Data Flow Architecture

```mermaid
graph TB
    UI[SvelteKit UI] --> Stores[Svelte Stores]
    Stores --> AppConfig[app-config.ts]
    AppConfig --> SyncCore[@sync/core]
    SyncCore --> IndexedDB[IndexedDB Local]
    SyncCore --> Supabase[Supabase Remote]
    
    subgraph "Offline-First Flow"
        IndexedDB --> SyncQueue[Sync Queue]
        SyncQueue --> Supabase
        Supabase --> SyncQueue
    end
    
    subgraph "UI Components (from Reference)"
        ClienteCard[ClienteCardCompacta]
        CobroModal[ModalCobroInteligente]
        RutaView[Ruta Page]
    end
```

## Components and Interfaces

### 1. Authentication System

**Basado en:** `tools/examples/src/routes/login/+page.svelte`

**Componentes:**
- `src/routes/login/+page.svelte` - Página de login (copia directa adaptada)
- `src/lib/stores/auth.js` - Store de autenticación (wrapper de @sync/core)

**Integración con @sync/core:**
```typescript
// src/lib/stores/auth.js
import { crediSyncApp } from '../app-config';

export const auth = {
  async signIn(email: string, password: string) {
    return await crediSyncApp.services.auth.signIn(email, password);
  },
  async signUp(email: string, password: string) {
    return await crediSyncApp.services.auth.signUp(email, password);
  },
  async signOut() {
    return await crediSyncApp.services.auth.signOut();
  }
};
```

### 2. Dashboard/Ruta System

**Basado en:** `tools/examples/src/routes/(app)/ruta/+page.svelte`

**Funcionalidades:**
- Estadísticas del día calculadas desde @sync/core
- Lista de clientes ordenada por prioridad (mora → deuda → atraso)
- Búsqueda en tiempo real con debounce 200ms
- Modal de cobro inteligente integrado

**Integración con @sync/core:**
```typescript
// Cálculo de estadísticas usando @sync/core
const estadisticas = await crediSyncApp.services.reportes.getEstadisticasRuta();
const clientes = await crediSyncApp.services.clientes.getClientesConCreditos();
```

### 3. Client Management System

**Basado en:** `tools/examples/src/routes/(app)/clientes/+page.svelte`

**Funcionalidades:**
- Lista de clientes con estados visuales
- Crear/editar clientes offline-first
- Búsqueda con filtrado inteligente
- Sincronización automática

**Integración con @sync/core:**
```typescript
// CRUD de clientes usando @sync/core
await crediSyncApp.services.clientes.create(clienteData);
await crediSyncApp.services.clientes.update(id, changes);
const clientes = await crediSyncApp.services.clientes.getAll();
```

### 4. Credit Management System

**Funcionalidades:**
- Otorgar créditos con cálculo automático de cuotas
- Gestión de productos de crédito
- Estados de créditos y cuotas
- Cálculos financieros precisos

**Integración con @sync/core:**
```typescript
// Gestión de créditos usando @sync/core
const credito = await crediSyncApp.services.creditos.create({
  cliente_id,
  monto,
  plazo,
  tasa_interes,
  producto_id
});

// Generar cuotas automáticamente
const cuotas = await crediSyncApp.services.cuotas.generateForCredito(credito.id);
```

### 5. Payment System

**Basado en:** `tools/examples/src/lib/components/ModalCobroInteligente.svelte`

**Funcionalidades:**
- Modal de cobro inteligente con distribución automática
- Cálculo proporcional entre múltiples créditos
- Preview detallado antes de confirmar
- Actualización automática de estados

**Integración con @sync/core:**
```typescript
// Registro de pagos usando @sync/core
await crediSyncApp.services.pagos.registrarPagoMultiple({
  cliente_id,
  monto_total,
  distribucion: [
    { credito_id, monto_aplicar },
    // ...
  ]
});
```

### 6. Intelligent Sync System

**Funcionalidades:**
- Sincronización que pausa durante actividad del usuario
- Detección de eventos de actividad (scroll, touch, click, input)
- Sync automático cada 50 segundos de inactividad
- Sync forzado al restaurar conexión

**Integración con @sync/core:**
```typescript
// Control de sincronización inteligente
const syncManager = crediSyncApp.services.sync;

// Pausar durante actividad
syncManager.pauseAutoSync();

// Reanudar después de inactividad
setTimeout(() => {
  syncManager.resumeAutoSync();
}, 50000);

// Sync forzado
await syncManager.syncNow();
```

## Data Models

### Usando @sync/types exclusivamente

```typescript
import type { 
  Cliente, 
  Credito, 
  Cuota, 
  Pago, 
  ProductoCredito,
  User 
} from '@sync/types';

// Todos los modelos vienen de @sync/types
// No duplicar definiciones
```

### Campos Calculados (manejados por @sync/core)

```typescript
// Cliente con campos calculados
interface ClienteConEstado extends Cliente {
  creditos_activos: number;        // Calculado por @sync/core
  saldo_total: number;             // Calculado por @sync/core
  dias_atraso_max: number;         // Calculado por @sync/core
  estado: 'AL_DIA' | 'MORA' | 'SIN_CREDITOS'; // Calculado por @sync/core
  score: 'CONFIABLE' | 'REGULAR' | 'RIESGOSO'; // Calculado por @sync/core
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

Después de revisar todas las propiedades identificadas en el prework, he identificado las siguientes consolidaciones:
- Propiedades de autenticación (1.1, 1.2, 1.3) pueden agruparse por flujo
- Propiedades de sincronización (3.3, 7.1, 7.2, 7.3, 8.2) pueden consolidarse
- Propiedades de cálculos (4.2, 5.2, 6.2) pueden unificarse en precisión matemática
- Propiedades de UI (9.1, 9.3) pueden combinarse en consistencia visual

### Core Properties

**Property 1: Authentication Flow Consistency**
*For any* authentication attempt, the system should always use @sync/core exclusively and handle success/failure states correctly
**Validates: Requirements 1.1, 1.2, 1.3**

**Property 2: Offline-First Data Operations**
*For any* data modification (cliente, crédito, pago), the system should always work offline using @sync/core and sync when connection is available
**Validates: Requirements 3.2, 3.3, 8.1, 8.2**

**Property 3: Financial Calculation Accuracy**
*For any* financial operation (cuotas, distribución de pagos, intereses), calculations should always be mathematically correct and consistent
**Validates: Requirements 4.2, 5.2, 6.2**

**Property 4: Client Priority Ordering**
*For any* list of clients, the ordering should always prioritize MORA > highest debt > most overdue days
**Validates: Requirements 2.3**

**Property 5: Intelligent Sync Behavior**
*For any* user activity state, sync should pause during activity and resume after 50 seconds of inactivity
**Validates: Requirements 7.1, 7.2**

**Property 6: Payment Distribution Correctness**
*For any* payment amount and set of credits, the proportional distribution should always sum to the payment amount and be mathematically accurate
**Validates: Requirements 5.2, 6.2**

**Property 7: UI Visual Consistency**
*For any* page or component, the visual design should always match the reference app exactly
**Validates: Requirements 9.1, 3.1, 5.1**

**Property 8: Search and Filter Accuracy**
*For any* search query, the filtering should always match clients by name, document, or phone with proper debounce timing
**Validates: Requirements 2.4**

**Property 9: State Update Consistency**
*For any* data change (pago, crédito), all related calculated fields should update automatically and consistently
**Validates: Requirements 5.3**

**Property 10: Connection State Handling**
*For any* connection state change, the system should always provide appropriate visual feedback and handle operations correctly
**Validates: Requirements 7.3, 8.1**

## Error Handling

### Offline Error Handling
- **No connection:** All operations work offline, queue for sync
- **Sync conflicts:** Use @sync/core conflict resolution strategies
- **Data corruption:** Automatic recovery using @sync/core mechanisms

### Financial Calculation Errors
- **Rounding errors:** Use precise decimal arithmetic
- **Negative amounts:** Validate all financial inputs
- **Distribution errors:** Ensure sum equals total payment

### UI Error States
- **Loading states:** Show spinners during async operations
- **Empty states:** Friendly messages when no data
- **Error boundaries:** Graceful handling of component errors

## Testing Strategy

### Dual Testing Approach

**Unit Tests:**
- Component rendering and behavior
- Financial calculation accuracy
- Form validation and user interactions
- Error handling scenarios

**Property-Based Tests:**
Usar **Vitest + fast-check** (configurado en package.json)

**Property Test 1: Authentication Consistency**
```typescript
// **Feature: credisync-complete, Property 1: Authentication Flow Consistency**
test('authentication always uses @sync/core exclusively', () => {
  fc.assert(fc.property(
    fc.record({
      email: fc.emailAddress(),
      password: fc.string({ minLength: 6 }),
      isValid: fc.boolean()
    }),
    async ({ email, password, isValid }) => {
      // Mock @sync/core response based on validity
      const expectedResult = isValid 
        ? { user: mockUser, error: null }
        : { user: null, error: new Error('Invalid credentials') };
      
      mockSyncCore.auth.signIn.mockResolvedValue(expectedResult);
      
      const result = await auth.signIn(email, password);
      
      // Verify @sync/core was called
      expect(mockSyncCore.auth.signIn).toHaveBeenCalledWith(email, password);
      
      // Verify result consistency
      if (isValid) {
        expect(result.user).toBeTruthy();
        expect(result.error).toBeNull();
      } else {
        expect(result.user).toBeNull();
        expect(result.error).toBeTruthy();
      }
    }
  ));
});
```

**Property Test 2: Financial Calculation Accuracy**
```typescript
// **Feature: credisync-complete, Property 3: Financial Calculation Accuracy**
test('payment distribution always sums correctly', () => {
  fc.assert(fc.property(
    fc.record({
      paymentAmount: fc.float({ min: 1, max: 10000 }),
      credits: fc.array(
        fc.record({
          id: fc.uuid(),
          adeudado: fc.float({ min: 1, max: 5000 })
        }),
        { minLength: 1, maxLength: 5 }
      )
    }),
    ({ paymentAmount, credits }) => {
      const distribution = calculatePaymentDistribution(paymentAmount, credits);
      
      // Property: Distribution sum equals payment amount (within floating point precision)
      const totalDistributed = distribution.reduce((sum, d) => sum + d.monto_aplicar, 0);
      expect(Math.abs(totalDistributed - paymentAmount)).toBeLessThan(0.01);
      
      // Property: Each distribution amount is proportional
      const totalAdeudado = credits.reduce((sum, c) => sum + c.adeudado, 0);
      distribution.forEach((dist, index) => {
        const expectedProportion = credits[index].adeudado / totalAdeudado;
        const actualProportion = dist.monto_aplicar / paymentAmount;
        expect(Math.abs(actualProportion - expectedProportion)).toBeLessThan(0.01);
      });
    }
  ));
});
```

### Integration Tests
- **@sync/core integration:** Verify all service calls use @sync/core
- **Offline functionality:** Test complete workflows without connection
- **Sync behavior:** Test bidirectional synchronization with Supabase
- **Navigation flows:** Test complete user journeys

### Visual Regression Tests
- **Component screenshots:** Compare with reference app
- **Responsive layouts:** Test on multiple screen sizes
- **Interactive states:** Test hover, focus, loading states

### Manual Testing Protocol
1. **Visual comparison:** Each page identical to reference
2. **Mobile testing:** Responsive on 390x844 (reference size)
3. **Offline testing:** All functionality works without connection
4. **Sync testing:** Data syncs correctly when connection restored
5. **Performance testing:** Smooth interactions and fast loading
6. **Accessibility testing:** Screen reader and keyboard navigation