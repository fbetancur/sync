# Workflow del Monorepo - Sync Platform

Esta guía describe el flujo de trabajo recomendado para desarrollar en el monorepo de Sync Platform.

## 🏗️ Arquitectura del Monorepo

### Estructura de Workspaces

```
sync/
├── apps/                    # Aplicaciones independientes
│   ├── credisync/          # ✅ Activa - App de créditos
│   ├── healthsync/         # 🚧 Placeholder - App de salud
│   └── surveysync/         # 🚧 Placeholder - App de encuestas
└── packages/@sync/         # Paquetes compartidos
    ├── core/              # Lógica de negocio
    ├── types/             # Tipos TypeScript
    └── ui/                # Componentes UI
```

### Dependencias entre Workspaces

```mermaid
graph TD
    A[apps/credisync] --> B[@sync/core]
    A --> C[@sync/types]
    A --> D[@sync/ui]
    B --> C
    D --> C
    E[apps/healthsync] --> B
    E --> C
    E --> D
    F[apps/surveysync] --> B
    F --> C
    F --> D
```

## 🔄 Flujo de Desarrollo

### 1. Configuración Inicial

```bash
# Clonar y configurar
git clone https://github.com/fbetancur/sync.git
cd sync
pnpm install

# Configurar entorno
cp .env.example .env.local
cp apps/credisync/.env.example apps/credisync/.env.local
pnpm validate-env
```

### 2. Desarrollo de Features

#### Para cambios en Apps (credisync)

```bash
# Crear branch para feature
git checkout -b feature/nueva-funcionalidad

# Desarrollar en modo watch
pnpm dev:credisync

# En otra terminal, ejecutar tests en watch
pnpm --filter credisync test:watch
```

#### Para cambios en Packages

```bash
# Desarrollar package
cd packages/@sync/core
pnpm dev  # Si tiene modo watch

# Construir package después de cambios
pnpm build

# Probar en app que lo usa
cd ../../../apps/credisync
pnpm dev
```

### 3. Testing Strategy

#### Orden de Testing

1. **Unit Tests** - Packages individuales
2. **Integration Tests** - Apps usando packages
3. **E2E Tests** - Funcionalidad completa

```bash
# 1. Test packages primero
pnpm test:packages

# 2. Test apps que usan los packages
pnpm test:credisync

# 3. Test completo del monorepo
pnpm test
```

#### Testing Granular

```bash
# Test específico de package
pnpm --filter @sync/core test

# Test específico de app
pnpm --filter credisync test

# Test de archivos específicos
pnpm --filter @sync/core test src/sync/sync-manager.test.ts
```

### 4. Build Strategy

#### Orden de Build

Los packages deben construirse antes que las apps:

```bash
# 1. Construir packages en orden de dependencias
pnpm --filter @sync/types build
pnpm --filter @sync/core build
pnpm --filter @sync/ui build

# 2. Construir apps
pnpm --filter credisync build

# O usar el script que maneja el orden automáticamente
pnpm build
```

#### Build Incremental

```bash
# Solo reconstruir lo que cambió
pnpm build --filter="[HEAD^1]"

# Construir package y sus dependientes
pnpm --filter @sync/core... build
```

## 🔧 Comandos Útiles

### Gestión de Dependencias

```bash
# Agregar dependencia a workspace específico
pnpm --filter credisync add lodash
pnpm --filter @sync/core add -D vitest

# Agregar dependencia a root (herramientas de desarrollo)
pnpm add -D -w eslint

# Actualizar dependencias
pnpm update --recursive
```

### Workspace Operations

```bash
# Ejecutar comando en todos los workspaces
pnpm -r exec npm run lint

# Ejecutar en workspaces que matchean patrón
pnpm --filter "@sync/*" build

# Ejecutar en workspace y sus dependencias
pnpm --filter credisync... test

# Ejecutar en dependientes de un workspace
pnpm --filter ...@sync/core test
```

### Debugging

```bash
# Ver dependencias de workspace
pnpm list --filter credisync

# Ver estructura de workspaces
pnpm list --depth=0

# Verificar configuración de pnpm
pnpm config list
```

## 🚀 Deployment Workflow

### Estrategia de Deployment

Cada app se despliega independientemente:

- **credisync** → `credisync-green.vercel.app`
- **healthsync** → `healthsync-[hash].vercel.app` (futuro)
- **surveysync** → `surveysync-[hash].vercel.app` (futuro)

### Proceso de Deployment

```bash
# 1. Desarrollo local
pnpm dev:credisync

# 2. Tests completos
pnpm test

# 3. Build de producción
pnpm build:credisync

# 4. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# 5. PR → Deploy automático de preview
# 6. Merge → Deploy automático a producción
```

### CI/CD Pipeline

```yaml
# Ejemplo de workflow
name: Deploy CrediSync
on:
  push:
    branches: [main]
    paths: ['apps/credisync/**', 'packages/**']

jobs:
  test:
    - pnpm install
    - pnpm test:packages
    - pnpm test:credisync

  build:
    - pnpm build:packages
    - pnpm build:credisync

  deploy:
    - vercel deploy --prod
```

## 📦 Package Development

### Crear Nuevo Package

```bash
# Usar herramienta de generación
node tools/scripts/create-package.js @sync/new-package

# O manualmente
mkdir -p packages/@sync/new-package
cd packages/@sync/new-package
pnpm init
```

### Package Structure

```
packages/@sync/new-package/
├── src/
│   ├── index.ts          # Punto de entrada principal
│   ├── types.ts          # Tipos específicos
│   └── utils/            # Utilidades internas
├── tests/
│   └── index.test.ts     # Tests del package
├── package.json          # Configuración del package
├── tsconfig.json         # Config TypeScript
├── vite.config.ts        # Config de build
└── README.md             # Documentación
```

### Package Best Practices

1. **Exports claros**: Define exports específicos en `package.json`
2. **Tipos incluidos**: Genera `.d.ts` files automáticamente
3. **Testing**: Cada package debe tener sus propios tests
4. **Documentación**: README con ejemplos de uso
5. **Versionado**: Usar semantic versioning

```json
{
  "name": "@sync/new-package",
  "version": "1.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  }
}
```

## 🔄 Code Sharing Patterns

### 1. Shared Business Logic (@sync/core)

```typescript
// packages/@sync/core/src/sync/sync-manager.ts
export class SyncManager {
  async syncData(config: SyncConfig) {
    // Lógica compartida entre apps
  }
}

// apps/credisync/src/lib/sync.ts
import { SyncManager } from '@sync/core';
const syncManager = new SyncManager();
```

### 2. Shared Types (@sync/types)

```typescript
// packages/@sync/types/src/database.ts
export interface User {
  id: string;
  email: string;
}

// apps/credisync/src/routes/users.ts
import type { User } from '@sync/types';
```

### 3. Shared UI Components (@sync/ui)

```svelte
<!-- packages/@sync/ui/src/components/Button.svelte -->
<script lang="ts">
  export let variant: 'primary' | 'secondary' = 'primary';
</script>

<!-- apps/credisync/src/routes/+page.svelte -->
<script>
  import { Button } from '@sync/ui';
</script>
<Button variant="primary">Click me</Button>
```

## 🐛 Troubleshooting

### Problemas Comunes

**"Cannot resolve @sync/core"**

```bash
# Construir packages primero
pnpm build:packages
```

**"Circular dependency detected"**

```bash
# Revisar imports entre packages
pnpm list --depth=1
```

**"Tests failing after package changes"**

```bash
# Reconstruir todo
pnpm clean
pnpm build:packages
pnpm test
```

### Performance Tips

1. **Usar filtros**: `pnpm --filter` para operaciones específicas
2. **Build incremental**: Solo construir lo que cambió
3. **Cache de tests**: Vitest cachea automáticamente
4. **Parallel execution**: pnpm ejecuta en paralelo cuando es posible

## 📋 Checklist de Development

### Antes de Commit

- [ ] Tests pasan: `pnpm test`
- [ ] Lint limpio: `pnpm lint-fix --check`
- [ ] Build exitoso: `pnpm build`
- [ ] Variables de entorno válidas: `pnpm validate-env`

### Antes de PR

- [ ] Branch actualizado con main
- [ ] Documentación actualizada
- [ ] Tests de integración pasan
- [ ] Preview deployment funciona

### Antes de Release

- [ ] Todos los tests pasan en CI
- [ ] Performance benchmarks OK
- [ ] Documentación completa
- [ ] Migration guide (si aplica)

## 🎯 Best Practices

1. **Atomic commits**: Un cambio lógico por commit
2. **Descriptive messages**: Usar conventional commits
3. **Test coverage**: Mantener >80% coverage
4. **Documentation**: Actualizar docs con cambios
5. **Performance**: Monitorear bundle size y build times

¡Este workflow te ayudará a ser productivo en el monorepo! 🚀
