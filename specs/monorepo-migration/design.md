# Design Document

# Migración a Monorepo Sync Platform

## Overview

Esta migración transformará el repositorio actual en un monorepo escalable que servirá como
plataforma base para múltiples aplicaciones offline-first. La estrategia "Migration In-Place
Gradual" preserva toda la funcionalidad existente mientras establece las bases para crecimiento
horizontal.

**Principios de Diseño**:

1. **Zero Downtime**: La aplicación actual sigue funcionando durante toda la migración
2. **Preservación Total**: Todo el código, tests, configuración e historial se mantiene
3. **Escalabilidad**: Estructura preparada para múltiples aplicaciones
4. **Reutilización**: Infraestructura compartida entre aplicaciones
5. **Independencia**: Cada aplicación puede desarrollarse y deployarse independientemente

**Stack Tecnológico del Monorepo**:

- **Gestión de Workspaces**: pnpm workspaces
- **Build System**: Vite (por workspace)
- **Package Manager**: pnpm (más eficiente que npm/yarn)
- **Deployment**: Vercel (por aplicación)
- **Shared Packages**: @sync/core, @sync/ui, @sync/types

## Architecture

### Estructura Final del Monorepo

```
sync/                                    ← Monorepo principal
├── 📋 README.md                         ← Punto de entrada principal
├── 📋 package.json                      ← Root package.json con workspaces
├── 📋 pnpm-workspace.yaml               ← Configuración de workspaces
├── 📋 .gitignore                        ← Gitignore actualizado
├── 📋 CHANGELOG.md                      ← Changelog centralizado
├── 📋 CONTRIBUTING.md                   ← Guía de contribución
│
├── 📁 .github/                          ← CI/CD y templates
│   ├── workflows/
│   │   ├── credisync-deploy.yml         ← Pipeline CrediSync
│   │   ├── healthsync-deploy.yml        ← Pipeline HealthSync
│   │   ├── surveysync-deploy.yml        ← Pipeline SurveySync
│   │   └── packages-test.yml            ← Tests de packages
│   ├── ISSUE_TEMPLATE/
│   └── PULL_REQUEST_TEMPLATE.md
│
├── 📁 apps/                             ← APLICACIONES
│   ├── 📁 credisync/                    ← CrediSync (código actual migrado)
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json              ← Dependencies específicas
│   │   ├── 📋 vite.config.ts
│   │   ├── 📋 vercel.json               ← Config deployment
│   │   ├── 📋 .env.example
│   │   ├── 📁 src/                      ← Código fuente actual
│   │   ├── 📁 public/                   ← Assets públicos
│   │   └── 📁 docs/                     ← Docs específicas
│   │       ├── 📋 business-logic.md
│   │       ├── 📋 user-guide.md
│   │       └── 📋 deployment.md
│   │
│   ├── 📁 healthsync/                   ← HealthSync (placeholder)
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   └── 📁 src/                      ← Estructura básica
│   │
│   └── 📁 surveysync/                   ← SurveySync (placeholder)
│       ├── 📋 README.md
│       ├── 📋 package.json
│       └── 📁 src/                      ← Estructura básica
│
├── 📁 packages/                         ← PACKAGES COMPARTIDOS
│   ├── 📁 @sync/core/                   ← Infraestructura offline-first
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   ├── 📋 tsconfig.json
│   │   ├── 📁 src/
│   │   │   ├── 📁 db/                   ← IndexedDB + Dexie
│   │   │   ├── 📁 sync/                 ← Sync Manager + CRDT
│   │   │   ├── 📁 storage/              ← Multi-layer storage
│   │   │   ├── 📁 audit/                ← Audit logging
│   │   │   ├── 📁 security/             ← Encryption + Auth
│   │   │   ├── 📁 validation/           ← Zod schemas
│   │   │   ├── 📁 calculations/         ← Business logic
│   │   │   └── 📋 index.ts              ← Main exports
│   │   ├── 📁 tests/
│   │   └── 📁 docs/
│   │
│   ├── 📁 @sync/ui/                     ← Componentes UI compartidos
│   │   ├── 📋 README.md
│   │   ├── 📋 package.json
│   │   ├── 📁 src/
│   │   │   ├── 📁 components/           ← Svelte components
│   │   │   ├── 📁 stores/               ← Svelte stores
│   │   │   ├── 📁 actions/              ← Svelte actions
│   │   │   ├── 📁 styles/               ← CSS compartidos
│   │   │   └── 📋 index.ts
│   │   ├── 📁 storybook/                ← Component documentation
│   │   └── 📁 tests/
│   │
│   └── 📁 @sync/types/                  ← TypeScript types compartidos
│       ├── 📋 README.md
│       ├── 📋 package.json
│       ├── 📁 src/
│       │   ├── 📋 database.ts           ← DB interfaces
│       │   ├── 📋 api.ts                ← API types
│       │   ├── 📋 business.ts           ← Business logic types
│       │   ├── 📋 ui.ts                 ← UI component types
│       │   └── 📋 index.ts
│       └── 📁 tests/
│
├── 📁 docs/                             ← DOCUMENTACIÓN PRINCIPAL
│   ├── 📋 README.md                     ← Índice de documentación
│   ├── 📁 architecture/                 ← Arquitectura del monorepo
│   │   ├── 📋 overview.md
│   │   ├── 📋 monorepo-structure.md
│   │   ├── 📋 shared-packages.md
│   │   └── 📋 deployment-strategy.md
│   ├── 📁 development/                  ← Guías de desarrollo
│   │   ├── 📋 getting-started.md
│   │   ├── 📋 monorepo-workflow.md
│   │   ├── 📋 adding-new-apps.md
│   │   └── 📋 package-development.md
│   ├── 📁 deployment/
│   │   ├── 📋 vercel-setup.md
│   │   ├── 📋 environment-variables.md
│   │   └── 📋 ci-cd-pipelines.md
│   └── 📁 migration/                    ← Documentación de migración
│       ├── 📋 migration-log.md
│       ├── 📋 rollback-procedures.md
│       └── 📋 validation-checklist.md
│
├── 📁 specs/                            ← ESPECIFICACIONES KIRO
│   ├── 📋 README.md
│   ├── 📁 platform/                     ← Specs de la plataforma
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 credisync/                    ← Specs de CrediSync (migradas)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 healthsync/                   ← Specs de HealthSync (futuro)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   ├── 📁 surveysync/                   ← Specs de SurveySync (futuro)
│   │   ├── 📋 requirements.md
│   │   ├── 📋 design.md
│   │   └── 📋 tasks.md
│   └── 📁 monorepo-migration/           ← Specs de migración (actual)
│       ├── 📋 requirements.md
│       ├── 📋 design.md
│       └── 📋 tasks.md
│
├── 📁 tools/                            ← HERRAMIENTAS Y SCRIPTS
│   ├── 📋 README.md
│   ├── 📁 scripts/
│   │   ├── 📋 create-app.js             ← Script para crear nuevas apps
│   │   ├── 📋 migrate-package.js        ← Script para extraer packages
│   │   ├── 📋 build-all.js              ← Build todas las apps
│   │   └── 📋 test-all.js               ← Test todo el monorepo
│   ├── 📁 templates/
│   │   ├── 📁 app-template/             ← Template para nuevas apps
│   │   └── 📁 package-template/         ← Template para packages
│   └── 📁 generators/
│       └── 📋 plop-config.js            ← Generadores automáticos
│
└── 📁 .archive/                         ← ARCHIVOS HISTÓRICOS
    ├── 📁 migration-backup/             ← Backup pre-migración
    ├── 📁 old-structure/                ← Estructura anterior
    └── 📁 migration-logs/               ← Logs de migración
```

### Configuración de Workspaces

#### Mejoras de Implementación

Durante la implementación se realizaron las siguientes optimizaciones al diseño original:

1. **Filtros Específicos de Packages**: Se cambió de `'packages/*'` a `'packages/@sync/*'` para
   evitar conflictos y mejorar la precisión de los filtros de pnpm.

2. **Scripts de Build Granulares**: Se implementaron scripts más específicos (`build:packages`,
   `build:apps`) para mejor control del proceso de construcción y manejo de dependencias entre
   packages.

3. **Scripts de Limpieza Específicos**: Se agregaron `clean:packages` y `clean:apps` para limpieza
   granular.

4. **Orden de Build Optimizado**: Los packages se construyen en orden de dependencias: `@sync/types`
   → `@sync/core` → `@sync/ui`.

#### Root package.json

```json
{
  "name": "sync-platform",
  "version": "1.0.0",
  "description": "Sync Platform - Offline-first data platform",
  "private": true,
  "workspaces": ["apps/*", "packages/*"],
  "scripts": {
    "dev": "pnpm --parallel --filter './apps/*' dev",
    "dev:credisync": "pnpm --filter credisync dev",
    "dev:healthsync": "pnpm --filter healthsync dev",
    "dev:surveysync": "pnpm --filter surveysync dev",
    "build": "pnpm build:packages && pnpm build:apps",
    "build:packages": "pnpm --filter @sync/types build && pnpm --filter @sync/core build && pnpm --filter @sync/ui build",
    "build:apps": "pnpm --filter credisync build",
    "build:credisync": "pnpm --filter credisync build",
    "test": "pnpm --recursive test",
    "test:packages": "pnpm --filter './packages/@sync/*' test",
    "test:apps": "pnpm --filter './apps/*' test",
    "lint": "pnpm --recursive lint",
    "format": "pnpm --recursive format",
    "clean": "pnpm --recursive clean",
    "clean:packages": "pnpm --filter @sync/types clean && pnpm --filter @sync/core clean && pnpm --filter @sync/ui clean",
    "clean:apps": "pnpm --filter credisync clean",
    "create-app": "node tools/scripts/create-app.js",
    "migrate-package": "node tools/scripts/migrate-package.js"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "prettier": "^3.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  }
}
```

#### pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/@sync/*'
  - 'tools/*'

# Configuración de hoisting
prefer-workspace-packages: true
shared-workspace-lockfile: true
save-workspace-protocol: rolling
```

## Components and Interfaces

### Package @sync/core

**Responsabilidad**: Proporcionar toda la infraestructura offline-first reutilizable

**Estructura**:

```typescript
// packages/@sync/core/src/index.ts
export * from './db';
export * from './sync';
export * from './storage';
export * from './audit';
export * from './security';
export * from './validation';
export * from './calculations';

// Main factory function
export function createSyncApp(config: SyncAppConfig): SyncApp;
```

**API Principal**:

```typescript
// packages/@sync/core/src/types.ts
export interface SyncAppConfig {
  appName: string;
  supabaseUrl: string;
  supabaseKey: string;
  encryptionEnabled?: boolean;
  auditEnabled?: boolean;
  syncInterval?: number;
}

export interface SyncApp {
  db: MicrocreditosDB;
  sync: SyncManager;
  storage: StorageManager;
  audit: AuditLogger;
  security: EncryptionService;
  start(): Promise<void>;
  stop(): Promise<void>;
}
```

### Package @sync/ui

**Responsabilidad**: Componentes UI reutilizables entre aplicaciones

**Estructura**:

```typescript
// packages/@sync/ui/src/index.ts
export { default as SyncIndicator } from './components/SyncIndicator.svelte';
export { default as ConnectionStatus } from './components/ConnectionStatus.svelte';
export { default as FormAutoSave } from './components/FormAutoSave.svelte';
export { default as LoadingSpinner } from './components/LoadingSpinner.svelte';
export { default as PinEntry } from './components/PinEntry.svelte';

// Stores
export { syncStore } from './stores/sync.js';
export { authStore } from './stores/auth.js';

// Actions
export { autoSave } from './actions/auto-save.js';
export { gpsCapture } from './actions/gps-capture.js';
```

### Package @sync/types

**Responsabilidad**: Tipos TypeScript compartidos

**Estructura**:

```typescript
// packages/@sync/types/src/index.ts
export * from './database';
export * from './api';
export * from './business';
export * from './ui';

// Common types
export interface BaseEntity {
  id: string;
  tenant_id: string;
  created_at: number;
  updated_at: number;
  synced: boolean;
  checksum: string;
}

export interface SyncableEntity extends BaseEntity {
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
}
```

## Data Models

### Migración de Datos

**Estrategia**: Los datos existentes se mantienen intactos. Solo se reorganiza el código.

**Pasos**:

1. **Preservar**: Toda la estructura de IndexedDB actual
2. **Migrar**: Código de acceso a datos a @sync/core
3. **Mantener**: APIs existentes para compatibilidad
4. **Refactorizar**: Gradualmente hacia nuevas APIs

### Configuración por Aplicación

**CrediSync**:

```typescript
// apps/credisync/src/config.ts
import { createSyncApp } from '@sync/core';

export const app = createSyncApp({
  appName: 'credisync',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  encryptionEnabled: true,
  auditEnabled: true,
  syncInterval: 30000
});
```

## Correctness Properties

_A property is a characteristic or behavior that should hold true across all valid executions of a
system-essentially, a formal statement about what the system should do. Properties serve as the
bridge between human-readable specifications and machine-verifiable correctness guarantees._

### Property 1: Migration Completeness

_For any_ file in the original structure, it must exist in the new monorepo structure at the correct
location with identical content. **Validates: Requirements 1.1, 1.4**

### Property 2: Test Preservation

_For any_ test that passed before migration, it must continue passing after migration with identical
results. **Validates: Requirements 1.1, 11.1**

### Property 3: Dependency Resolution

_For any_ package in the monorepo, all its dependencies must resolve correctly from the workspace or
external registry. **Validates: Requirements 6.2, 6.3**

### Property 4: Build Consistency

_For any_ application in the monorepo, its build output must be functionally identical to the
pre-migration build. **Validates: Requirements 12.1, 12.2**

### Property 5: Workspace Isolation

_For any_ two applications in the monorepo, changes in one application must not affect the build or
runtime of another application unless explicitly shared through packages. **Validates: Requirements
2.7, 8.5**

### Property 6: Package API Stability

_For any_ exported function or class from @sync/core, the API signature must remain stable across
versions within the same major version. **Validates: Requirements 4.4, 4.5**

### Property 7: Deployment Independence

_For any_ application in the monorepo, it must be deployable independently without requiring
deployment of other applications. **Validates: Requirements 9.4, 9.6**

### Property 8: Configuration Isolation

_For any_ application-specific configuration, it must not leak to or affect other applications in
the monorepo. **Validates: Requirements 10.1, 10.6**

## Error Handling

### Migration Error Recovery

**Rollback Strategy**:

```bash
# Automatic rollback script
#!/bin/bash
echo "Rolling back migration..."
git checkout HEAD~1  # Return to pre-migration state
pnpm install         # Restore dependencies
pnpm test           # Verify rollback
echo "Rollback complete"
```

**Validation Checkpoints**:

1. **Pre-migration**: Backup completo + tests baseline
2. **Post-structure**: Validar estructura de archivos
3. **Post-dependencies**: Validar resolución de dependencias
4. **Post-build**: Validar builds exitosos
5. **Post-tests**: Validar todos los tests pasan
6. **Post-deployment**: Validar deployment funcional

## Testing Strategy

### Migration Testing

**Automated Tests**:

```typescript
// tools/tests/migration.test.ts
describe('Migration Validation', () => {
  test('all original files exist in new structure', () => {
    // Validate file migration
  });

  test('all tests pass after migration', () => {
    // Run full test suite
  });

  test('all builds succeed', () => {
    // Test all app builds
  });

  test('dependencies resolve correctly', () => {
    // Validate workspace dependencies
  });
});
```

**Manual Validation Checklist**:

- [ ] Servidor de desarrollo funciona
- [ ] Tests pasan (296/296)
- [ ] Build exitoso
- [ ] Deployment funcional
- [ ] Variables de entorno correctas
- [ ] Supabase conecta
- [ ] PWA funciona offline

### Package Testing

**Unit Tests**: Cada package tiene su suite independiente **Integration Tests**: Tests entre
packages **E2E Tests**: Tests de aplicaciones completas

## Performance Considerations

### Build Optimization

**Estrategias**:

1. **Parallel Builds**: Builds simultáneos de packages independientes
2. **Incremental Builds**: Solo rebuild lo que cambió
3. **Shared Dependencies**: Hoisting de dependencias comunes
4. **Cache Optimization**: Cache de builds y tests

**Métricas Objetivo**:

- Build completo: < 2 minutos
- Build incremental: < 30 segundos
- Test suite completa: < 5 minutos
- Startup desarrollo: < 10 segundos

### Runtime Optimization

**Code Splitting**: Cada app tiene su bundle independiente **Shared Chunks**: Código común en chunks
separados **Tree Shaking**: Eliminación de código no usado **Bundle Analysis**: Monitoreo de tamaño
de bundles

## Security Considerations

### Package Security

**Dependency Management**:

- Audit regular de dependencias
- Versionado estricto de packages críticos
- Isolation de dependencias por workspace

**Access Control**:

- Packages internos no publicados
- Scoped packages (@sync/\*)
- Versionado semántico estricto

## Deployment Strategy

### Multi-App Deployment

**Vercel Configuration**:

```json
// apps/credisync/vercel.json
{
  "name": "credisync",
  "buildCommand": "cd ../.. && pnpm build:credisync",
  "outputDirectory": "dist",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "vite"
}
```

**CI/CD Pipeline**:

```yaml
# .github/workflows/credisync-deploy.yml
name: Deploy CrediSync
on:
  push:
    paths: ['apps/credisync/**', 'packages/**']
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - run: pnpm install
      - run: pnpm build:credisync
      - uses: amondnet/vercel-action@v20
```

### Deployment URLs

- **CrediSync**: credisync.vercel.app
- **HealthSync**: healthsync.vercel.app (futuro)
- **SurveySync**: surveysync.vercel.app (futuro)
- **Admin Panel**: admin-sync.vercel.app (futuro)
- **Documentation**: docs-sync.vercel.app (futuro)

## Migration Phases

### Fase 1: Preparación del Monorepo (1-2 horas)

- Crear estructura de directorios
- Configurar workspaces
- Migrar código actual a apps/credisync/
- Configurar scripts básicos

### Fase 2: Extracción Gradual (2-3 días)

- Extraer @sync/core módulo por módulo
- Crear @sync/ui con componentes comunes
- Establecer @sync/types
- Refactorizar imports gradualmente

### Fase 3: Optimización (1 semana)

- Optimizar builds y dependencies
- Configurar CI/CD por aplicación
- Crear herramientas de desarrollo
- Documentar procesos

### Fase 4: Expansión (futuro)

- Crear HealthSync y SurveySync
- Optimizar packages compartidos
- Implementar features avanzadas
