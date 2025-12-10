# Design Document

# PWA Offline-First para Gestión de Microcréditos

## Overview

Esta PWA offline-first está diseñada para permitir a cobradores de microcréditos trabajar
completamente sin conexión, con sincronización inteligente cuando hay conectividad. La arquitectura
se basa en tres pilares fundamentales:

1. **Offline-First Real**: La PWA es la fuente de verdad, con toda la lógica de negocio en el
   cliente
2. **Confiabilidad Máxima**: Almacenamiento redundante en 3 capas y resolución automática de
   conflictos
3. **Performance Optimizada**: Diseñada para dispositivos modernos (2022+) con tecnologías probadas

**Stack Tecnológico**:

- **Frontend**: Svelte 4 + TypeScript + Vite 5
- **Base de Datos Local**: Dexie.js (IndexedDB wrapper)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **PWA**: Vite PWA Plugin + Workbox
- **UI**: Tailwind CSS + DaisyUI

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DISPOSITIVO MÓVIL                         │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │              SVELTE PWA                             │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ UI Layer (Svelte Components)                 │  │    │
│  │  │  - Pages (routes)                            │  │    │
│  │  │  - Components (reusable)                     │  │    │
│  │  │  - Stores (state management)                 │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Business Logic Layer                         │  │    │
│  │  │  - Cálculos de saldos e intereses            │  │    │
│  │  │  - Generación de cuotas                      │  │    │
│  │  │  - Validaciones de negocio                   │  │    │
│  │  │  - Resolución de conflictos (CRDT)           │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                                                      │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Data Layer                                   │  │    │
│  │  │  - Dexie.js (IndexedDB)                      │  │    │
│  │  │  - Sync Manager                              │  │    │
│  │  │  - Conflict Resolver                         │  │    │
│  │  │  - Audit Logger                              │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           SERVICE WORKER                            │    │
│  │  - Cache Storage (assets)                          │    │
│  │  - Background Sync                                 │    │
│  │  - Push Notifications                              │    │
│  └────────────────────────────────────────────────────┘    │
│                                                               │
│  ┌────────────────────────────────────────────────────┐    │
│  │           STORAGE (3 Layers)                        │    │
│  │  1. IndexedDB (principal)                          │    │
│  │  2. LocalStorage (backup crítico)                  │    │
│  │  3. Cache API (backup terciario)                   │    │
│  └────────────────────────────────────────────────────┘    │
└───────────────────────┬───────────────────────────────────────┘
                        │ HTTPS / REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    VERCEL (CDN)                              │
│  - Static Assets                                             │
│  - Service Worker                                            │
└───────────────────────┬─────────────────────────────────────┘
                        │ Supabase REST API
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    SUPABASE                                  │
│  - PostgreSQL (solo almacenamiento)                         │
│  - Auth (JWT tokens)                                         │
│  - Storage (archivos)                                        │
│  - Realtime (opcional)                                       │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

**Escritura (Registro de Pago)**:

```
Usuario → Validación UI → Cálculos Locales →
→ IndexedDB (Capa 1) → LocalStorage (Capa 2) → Cache API (Capa 3) →
→ Audit Log → Sync Queue → Confirmación Usuario →
→ [Background] Sincronización con Supabase
```

**Lectura (Consulta de Cliente)**:

```
Usuario → Consulta IndexedDB →
→ (Si falla) LocalStorage →
→ (Si falla) Cache API →
→ Mostrar Datos →
→ [Background] Verificar actualizaciones en Supabase
```

## Components and Interfaces

### Core Modules

#### 1. Database Module (Dexie.js)

**Responsabilidad**: Gestionar toda la interacción con IndexedDB

**Interfaz**:

```typescript
// src/lib/db/index.ts
import Dexie, { type Table } from 'dexie';

export interface Tenant {
  id: string;
  nombre: string;
  usuarios_contratados: number;
  usuarios_activos: number;
  activo: boolean;
  created_at: number;
  updated_at: number;
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}

export interface Cliente {
  id: string;
  tenant_id: string;
  created_by: string;
  nombre: string;
  created_at: number;
  updated_at: number;
  numero_documento: string;
  telefono: string;
  direccion: string;
  ruta_id: string;
  tipo_documento: string;
  telefono_2: string | null;
  barrio: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  nombre_fiador: string | null;
  telefono_fiador: string | null;
  creditos_activos: number;
  saldo_total: number;
  dias_atraso_max: number;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  score: number | null;
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  checksum: string;
}

export interface Credito {
  id: string;
  tenant_id: string;
  cliente_id: string;
  producto_id: string;
  cobrador_id: string;
  ruta_id: string;
  monto_original: number;
  interes_porcentaje: number;
  total_a_pagar: number;
  numero_cuotas: number;
  valor_cuota: number;
  frecuencia: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  fecha_desembolso: number;
  fecha_primera_cuota: number;
  fecha_ultima_cuota: number;
  estado: 'activo' | 'pagado' | 'vencido' | 'cancelado';
  created_at: number;
  created_by: string;
  saldo_pendiente: number;
  cuotas_pagadas: number;
  dias_atraso: number;
  updated_at: number;
  excluir_domingos: boolean;
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  checksum: string;
}

export interface Pago {
  id: string;
  tenant_id: string;
  credito_id: string;
  cliente_id: string;
  cobrador_id: string;
  monto: number;
  fecha: number;
  latitud: number;
  longitud: number;
  observaciones: string | null;
  created_at: number;
  created_by: string;
  device_id: string;
  app_version: string;
  connection_type: string;
  battery_level: number | null;
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt: number | null;
  sync_error: string | null;
  checksum: string;
  comprobante_foto_url: string | null;
}

export interface SyncQueueItem {
  id?: number;
  timestamp: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  synced: boolean;
  priority: number;
  attempts: number;
  last_attempt: number | null;
  error: string | null;
}

export interface AuditLogEntry {
  id?: number;
  timestamp: number;
  sequence: number;
  tenant_id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  data: any;
  metadata: {
    ip_address: string | null;
    user_agent: string;
    app_version: string;
    latitude: number | null;
    longitud: number | null;
    connection_type: string;
    battery_level: number | null;
  };
  previous_hash: string;
  hash: string;
}

export interface FieldVersion {
  value: any;
  timestamp: number;
  device_id: string;
}

export class MicrocreditosDB extends Dexie {
  tenants!: Table<Tenant>;
  clientes!: Table<Cliente>;
  creditos!: Table<Credito>;
  cuotas!: Table<Cuota>;
  pagos!: Table<Pago>;
  productos_credito!: Table<ProductoCredito>;
  rutas!: Table<Ruta>;
  users!: Table<User>;
  sync_queue!: Table<SyncQueueItem>;
  audit_log!: Table<AuditLogEntry>;
  change_log!: Table<ChangeLogEntry>;
  checksums!: Table<ChecksumEntry>;
  app_state!: Table<AppStateEntry>;

  constructor() {
    super('microcreditos_db');

    this.version(1).stores({
      tenants: 'id, nombre, activo',
      users: 'id, tenant_id, email, [tenant_id+activo]',
      rutas: 'id, tenant_id, nombre, activa, [tenant_id+activa]',
      clientes:
        'id, tenant_id, ruta_id, numero_documento, estado, [tenant_id+ruta_id], [tenant_id+estado]',
      productos_credito: 'id, tenant_id, activo, [tenant_id+activo]',
      creditos:
        'id, tenant_id, cliente_id, cobrador_id, ruta_id, estado, [tenant_id+estado], [cliente_id+estado], [cobrador_id+estado]',
      cuotas:
        'id, credito_id, tenant_id, numero, estado, fecha_programada, [credito_id+numero], [credito_id+estado]',
      pagos:
        'id, tenant_id, credito_id, cliente_id, cobrador_id, fecha, synced, [tenant_id+fecha], [credito_id+fecha], [cobrador_id+fecha], [synced+fecha]',
      sync_queue:
        '++id, timestamp, table_name, record_id, operation, synced, priority, [synced+priority+timestamp]',
      audit_log:
        '++id, timestamp, event_type, aggregate_type, aggregate_id, user_id, [aggregate_type+aggregate_id+timestamp], [user_id+timestamp]',
      change_log:
        '++id, timestamp, table_name, record_id, synced, [synced+timestamp], [table_name+record_id]',
      checksums: 'record_key, checksum, timestamp',
      app_state: 'key, value, updated_at'
    });
  }
}

export const db = new MicrocreditosDB();
```

#### 2. Sync Manager Module

**Responsabilidad**: Gestionar toda la sincronización bidireccional

**Interfaz**:

```typescript
// src/lib/sync/sync-manager.ts

export interface SyncOptions {
  force?: boolean;
  priority?: number;
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncProgress {
  phase: 'upload' | 'download' | 'verify';
  current: number;
  total: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  timestamp: number;
}

export class SyncManager {
  private isSync;

  ing: boolean = false;
  private lastSyncTimestamp: number = 0;

  async sync(options?: SyncOptions): Promise<SyncResult>;
  async syncUpload(options?: SyncOptions): Promise<number>;
  async syncDownload(options?: SyncOptions): Promise<number>;
  async getQueueSize(): Promise<number>;
  async getPendingOperations(): Promise<SyncQueueItem[]>;
  async cancelSync(): Promise<void>;
  isCurrentlySyncing(): boolean;
  getLastSyncTimestamp(): number;
}
```

#### 3. Conflict Resolver Module (CRDT)

**Responsabilidad**: Resolver conflictos automáticamente usando CRDT

**Algoritmo**:

```typescript
// src/lib/sync/conflict-resolver.ts

export interface ConflictResolution {
  resolved: any;
  strategy: 'local_wins' | 'remote_wins' | 'merged' | 'last_write_wins';
  conflicts_detected: string[];
}

export class ConflictResolver {
  resolveConflict(local: any, remote: any, type: string): ConflictResolution {
    // Para pagos (append-only): nunca hay conflictos
    if (type === 'pago') {
      return { resolved: local, strategy: 'local_wins', conflicts_detected: [] };
    }

    // Para registros editables: usar CRDT con version vectors
    return this.resolveCRDT(local, remote);
  }

  private resolveCRDT(local: any, remote: any): ConflictResolution {
    // Comparar version_vectors
    const localDominates = this.dominatesVector(local.version_vector, remote.version_vector);
    const remoteDominates = this.dominatesVector(remote.version_vector, local.version_vector);

    if (localDominates && !remoteDominates) {
      return { resolved: local, strategy: 'local_wins', conflicts_detected: [] };
    }

    if (remoteDominates && !localDominates) {
      return { resolved: remote, strategy: 'remote_wins', conflicts_detected: [] };
    }

    // Conflicto real: resolver campo por campo
    return this.mergeFields(local, remote);
  }

  private mergeFields(local: any, remote: any): ConflictResolution {
    const resolved: any = {};
    const conflicts: string[] = [];

    const allFields = new Set([
      ...Object.keys(local.field_versions || {}),
      ...Object.keys(remote.field_versions || {})
    ]);

    for (const field of allFields) {
      const localField = local.field_versions?.[field];
      const remoteField = remote.field_versions?.[field];

      if (!remoteField) {
        resolved[field] = localField;
      } else if (!localField) {
        resolved[field] = remoteField;
      } else {
        // Comparar timestamps
        if (localField.timestamp > remoteField.timestamp) {
          resolved[field] = localField;
        } else if (remoteField.timestamp > localField.timestamp) {
          resolved[field] = remoteField;
          conflicts.push(field);
        } else {
          // Timestamps iguales: usar device_id como desempate
          resolved[field] = localField.device_id > remoteField.device_id ? localField : remoteField;
          conflicts.push(field);
        }
      }
    }

    return {
      resolved: { ...local, field_versions: resolved },
      strategy: 'merged',
      conflicts_detected: conflicts
    };
  }

  private dominatesVector(v1: Record<string, number>, v2: Record<string, number>): boolean {
    let dominates = false;
    for (const key in v2) {
      if ((v1[key] || 0) < v2[key]) {
        return false;
      }
      if ((v1[key] || 0) > v2[key]) {
        dominates = true;
      }
    }
    return dominates;
  }
}
```

## Data Models

### IndexedDB Schema

Ver sección "Components and Interfaces" para definiciones completas de tipos TypeScript.

**Relaciones**:

- `clientes.tenant_id` → `tenants.id`
- `clientes.ruta_id` → `rutas.id`
- `creditos.cliente_id` → `clientes.id`
- `creditos.producto_id` → `productos_credito.id`
- `creditos.cobrador_id` → `users.id`
- `cuotas.credito_id` → `creditos.id`
- `pagos.credito_id` → `creditos.id`
- `pagos.cliente_id` → `clientes.id`

### Supabase Schema

**Nota**: Supabase solo almacena datos, NO tiene triggers ni funciones de negocio.

```sql
-- Tablas idénticas a IndexedDB pero sin campos de sincronización
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  nombre TEXT NOT NULL,
  usuarios_contratados INTEGER NOT NULL,
  usuarios_activos INTEGER NOT NULL,
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE clientes (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  created_by UUID NOT NULL,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  numero_documento TEXT NOT NULL,
  telefono TEXT NOT NULL,
  direccion TEXT NOT NULL,
  ruta_id UUID NOT NULL,
  tipo_documento TEXT NOT NULL,
  telefono_2 TEXT,
  barrio TEXT,
  referencia TEXT,
  latitud DECIMAL(10, 8),
  longitud DECIMAL(11, 8),
  nombre_fiador TEXT,
  telefono_fiador TEXT,
  creditos_activos INTEGER NOT NULL DEFAULT 0,
  saldo_total DECIMAL(12, 2) NOT NULL DEFAULT 0,
  dias_atraso_max INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'activo',
  score INTEGER,
  UNIQUE(tenant_id, numero_documento)
);

CREATE TABLE pagos (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  credito_id UUID NOT NULL,
  cliente_id UUID NOT NULL,
  cobrador_id UUID NOT NULL,
  monto DECIMAL(12, 2) NOT NULL,
  fecha TIMESTAMPTZ NOT NULL,
  latitud DECIMAL(10, 8) NOT NULL,
  longitud DECIMAL(11, 8) NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID NOT NULL,
  device_id TEXT NOT NULL,
  app_version TEXT NOT NULL,
  comprobante_foto_url TEXT
);

-- Row Level Security
ALTER TABLE clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE pagos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see only their tenant data"
  ON clientes FOR SELECT
  USING (tenant_id = auth.jwt() ->> 'tenant_id');

CREATE POLICY "Cobradores see only their data"
  ON pagos FOR SELECT
  USING (
    tenant_id = auth.jwt() ->> 'tenant_id'
    AND (
      cobrador_id = auth.uid()
      OR auth.jwt() ->> 'role' = 'admin'
    )
  );
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a
system-essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Pago Registration Atomicity

_For any_ pago registration, all three storage layers (IndexedDB, LocalStorage, Cache API) must be
written successfully before confirming to the user, or none at all. **Validates: Requirements 3.5**

### Property 2: Sync Queue Ordering

_For any_ set of pending operations, operations with higher priority must be synchronized before
operations with lower priority, and within the same priority, operations must be synchronized in
timestamp order. **Validates: Requirements 5.2**

### Property 3: Conflict Resolution Determinism

_For any_ two conflicting versions of the same record, the conflict resolution algorithm must
produce the same result regardless of the order in which the versions are processed. **Validates:
Requirements 6.1, 6.2**

### Property 4: Checksum Integrity

_For any_ critical record (pago, credito), if the stored checksum does not match the recalculated
checksum, the system must detect the corruption and attempt recovery. **Validates: Requirements 2.6,
7.6**

### Property 5: Audit Log Immutability

_For any_ event in the audit log, the hash chain must be valid (each event's hash must match
SHA-256(event_data + previous_hash)), and no event can be modified or deleted. **Validates:
Requirements 8.3, 8.4**

### Property 6: Offline Functionality Completeness

_For any_ core operation (register pago, create cliente, update credito), the operation must
complete successfully without network connectivity. **Validates: Requirements 9.4, 9.7**

### Property 7: Saldo Calculation Consistency

_For any_ credito, the saldo_pendiente must equal (total_a_pagar - sum of all pagos for that
credito), calculated locally. **Validates: Requirements 13.1**

### Property 8: GPS Capture Requirement

_For any_ pago registration, if GPS is available, latitude and longitude must be captured; if GPS is
not available, the pago must be marked as without location but still allowed to proceed.
**Validates: Requirements 15.2, 15.4**

### Property 9: Auto-save Recovery

_For any_ incomplete form, if the application closes unexpectedly, the form state must be
recoverable from auto-save when the application reopens. **Validates: Requirements 4.2, 4.3**

### Property 10: Encryption Transparency

_For any_ sensitive field (numero_documento, telefono), the encryption and decryption must be
transparent to the user, with no impact on functionality. **Validates: Requirements 17.2, 17.4**

## Error Handling

### Error Categories

1. **Network Errors**: Handled by sync manager with exponential backoff
2. **Storage Errors**: Handled by redundant storage and automatic recovery
3. **Validation Errors**: Shown to user with clear messages
4. **Conflict Errors**: Resolved automatically by CRDT
5. **Critical Errors**: Logged to Sentry and audit log

### Recovery Strategies

**IndexedDB Corruption**:

```
1. Detect corruption on startup
2. Attempt repair
3. If repair fails, restore from LocalStorage
4. If LocalStorage fails, restore from Cache API
5. If all fail, force full sync from Supabase
6. Log incident to Sentry
```

**Sync Failures**:

```
1. Retry with exponential backoff
2. Max 10 attempts
3. After max attempts, mark for manual review
4. Notify user of pending operations
```

## Testing Strategy

### Unit Tests

- Business logic functions (cálculos, validaciones)
- CRDT conflict resolution
- Checksum calculation
- Data transformations

### Integration Tests

- IndexedDB operations
- Sync manager workflows
- Multi-layer storage writes
- Recovery procedures

### Property-Based Tests

- CRDT properties (commutativity, associativity)
- Checksum integrity
- Audit log chain validity
- Sync queue ordering

### E2E Tests

- Complete user workflows
- Offline scenarios
- Sync scenarios
- Error recovery

**Testing Framework**: Vitest + Testing Library + Playwright

## Performance Considerations

### Optimization Strategies

1. **Virtual Scrolling**: For lists > 50 items
2. **Code Splitting**: Lazy load routes
3. **Debouncing**: Search inputs (300ms)
4. **Memoization**: Expensive calculations
5. **IndexedDB Indexes**: Optimize queries
6. **Compression**: Gzip sync payloads
7. **Batch Operations**: Group DB writes

### Performance Targets

- Initial load: < 2s
- Route navigation: < 300ms
- Form interactions: < 100ms
- Pago registration: < 500ms
- Sync 100 pagos: < 30s

## Security Considerations

### Authentication

- JWT tokens from Supabase Auth
- Tokens stored only in memory
- Auto-refresh before expiration
- Logout clears all sensitive data

### Encryption

- AES-256-GCM for sensitive fields
- PBKDF2 key derivation (100k iterations)
- Keys never stored, only in memory
- Web Crypto API (native, secure)

### Data Protection

- Row Level Security in Supabase
- HTTPS only
- No sensitive data in logs
- Audit trail for all operations

## Deployment Strategy

### CI/CD Pipeline

```
1. Push to Git
2. GitHub Actions triggers
3. Run tests (unit, integration)
4. Build with Vite
5. Deploy to Vercel
6. Run E2E tests
7. Notify team
```

### Environments

- **Development**: Local + Supabase dev project
- **Staging**: Vercel preview + Supabase staging
- **Production**: Vercel production + Supabase production

### Rollback Strategy

- Vercel instant rollback
- Database migrations are forward-only
- Feature flags for gradual rollout
