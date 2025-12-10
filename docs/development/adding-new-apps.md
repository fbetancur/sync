# Agregar Nuevas Apps - Sync Platform

Esta guía te ayudará a crear y configurar nuevas aplicaciones en el monorepo de Sync Platform.

## 🚀 Creación Automática de Apps

### Usando el Generador

```bash
# Crear nueva app con estructura completa
node tools/scripts/create-app.js my-new-app

# Opciones disponibles
node tools/scripts/create-app.js --help
```

El generador creará automáticamente:

- Estructura de directorios
- `package.json` configurado
- Archivos de configuración (Vite, TypeScript, etc.)
- Templates básicos de Svelte
- Configuración de deployment
- Tests básicos

## 📁 Estructura de Nueva App

### Estructura Generada

```
apps/my-new-app/
├── src/
│   ├── lib/
│   │   ├── components/     # Componentes específicos de la app
│   │   ├── stores/         # Stores de Svelte
│   │   ├── utils/          # Utilidades específicas
│   │   └── app-config.ts   # Configuración de la app
│   ├── routes/
│   │   ├── +layout.svelte  # Layout principal
│   │   ├── +page.svelte    # Página principal
│   │   └── +error.svelte   # Página de error
│   ├── app.html            # Template HTML
│   └── app.ts              # Punto de entrada
├── static/                 # Archivos estáticos
├── tests/                  # Tests específicos de la app
├── .env.example            # Variables de entorno de ejemplo
├── package.json            # Configuración del package
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración de TypeScript
├── tailwind.config.js      # Configuración de Tailwind
└── vercel.json             # Configuración de deployment
```

## ⚙️ Configuración Manual

### 1. Crear Estructura Base

```bash
# Crear directorios
mkdir -p apps/my-new-app/{src/{lib/{components,stores,utils},routes,static},tests}

# Crear archivos base
touch apps/my-new-app/{package.json,vite.config.ts,tsconfig.json}
```

### 2. Configurar package.json

```json
{
  "name": "my-new-app",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite dev --port 5174",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "@sync/core": "workspace:*",
    "@sync/types": "workspace:*",
    "@sync/ui": "workspace:*",
    "@supabase/supabase-js": "^2.38.0",
    "svelte": "^4.2.7"
  },
  "devDependencies": {
    "@sveltejs/adapter-vercel": "^3.1.1",
    "@sveltejs/kit": "^1.27.4",
    "@sveltejs/vite-plugin-svelte": "^2.4.6",
    "autoprefixer": "^10.4.16",
    "postcss": "^8.4.31",
    "tailwindcss": "^3.3.5",
    "typescript": "^5.2.2",
    "vite": "^4.5.0",
    "vitest": "^0.34.6"
  }
}
```

### 3. Configurar Vite

```typescript
// apps/my-new-app/vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    include: ['src/**/*.{test,spec}.{js,ts}']
  },
  build: {
    rollupOptions: {
      external: ['@sync/core', '@sync/types', '@sync/ui']
    }
  }
});
```

### 4. Configurar TypeScript

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"],
      "@sync/*": ["../../packages/@sync/*/src"]
    }
  },
  "include": ["src/**/*.ts", "src/**/*.svelte", "tests/**/*.ts"]
}
```

## 🔧 Configuración de la App

### 1. App Configuration

```typescript
// apps/my-new-app/src/lib/app-config.ts
import { createSyncApp } from '@sync/core';
import type { AppConfig } from '@sync/types';

const config: AppConfig = {
  name: 'MyNewApp',
  version: '1.0.0',
  supabase: {
    url: import.meta.env.VITE_SUPABASE_URL,
    anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    serviceRoleKey: import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY
  },
  features: {
    sync: true,
    offline: true,
    encryption: true,
    audit: true
  },
  ui: {
    theme: 'default',
    primaryColor: '#3b82f6'
  }
};

export const app = createSyncApp(config);
export { config };
```

### 2. Layout Principal

```svelte
<!-- apps/my-new-app/src/routes/+layout.svelte -->
<script lang="ts">
  import '../app.css';
  import { app } from '$lib/app-config';
  import { onMount } from 'svelte';

  onMount(async () => {
    await app.initialize();
  });
</script>

<div class="app">
  <header>
    <h1>My New App</h1>
  </header>

  <main>
    <slot />
  </main>

  <footer>
    <p>&copy; 2024 Sync Platform</p>
  </footer>
</div>

<style>
  .app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }

  main {
    flex: 1;
  }
</style>
```

### 3. Página Principal

```svelte
<!-- apps/my-new-app/src/routes/+page.svelte -->
<script lang="ts">
  import { Button } from '@sync/ui';
  import { app } from '$lib/app-config';

  let status = 'Initializing...';

  $: if (app.isReady) {
    status = 'Ready!';
  }
</script>

<svelte:head>
  <title>My New App</title>
</svelte:head>

<div class="container">
  <h1>Welcome to My New App</h1>
  <p>Status: {status}</p>

  <Button on:click={() => console.log('Hello!')}>Get Started</Button>
</div>

<style>
  .container {
    max-width: 800px;
    margin: 0 auto;
    padding: 2rem;
    text-align: center;
  }
</style>
```

## 🌍 Variables de Entorno

### 1. Crear .env.example

```bash
# apps/my-new-app/.env.example
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App-specific variables
VITE_APP_NAME=MyNewApp
VITE_APP_VERSION=1.0.0
VITE_API_BASE_URL=https://api.mynewapp.com
```

### 2. Configurar Variables

```bash
# Copiar template
cp apps/my-new-app/.env.example apps/my-new-app/.env.local

# Editar con valores reales
nano apps/my-new-app/.env.local
```

## 🚀 Deployment Configuration

### 1. Configurar Vercel

```json
{
  "buildCommand": "cd ../.. && pnpm build:packages && pnpm --filter my-new-app build",
  "outputDirectory": "apps/my-new-app/.svelte-kit/output",
  "installCommand": "cd ../.. && pnpm install",
  "framework": "sveltekit",
  "ignoreCommand": "cd ../.. && node tools/scripts/vercel-ignore.js my-new-app"
}
```

### 2. Crear GitHub Actions

```yaml
# .github/workflows/my-new-app-deploy.yml
name: Deploy MyNewApp

on:
  push:
    branches: [main]
    paths:
      - 'apps/my-new-app/**'
      - 'packages/**'
  pull_request:
    paths:
      - 'apps/my-new-app/**'
      - 'packages/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm test:packages
      - run: pnpm --filter my-new-app test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v4
      - uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_MY_NEW_APP_PROJECT_ID }}
          working-directory: ./
```

## 📋 Scripts del Monorepo

### 1. Actualizar Root package.json

```json
{
  "scripts": {
    "dev:my-new-app": "pnpm --filter my-new-app dev",
    "build:my-new-app": "pnpm build:packages && pnpm --filter my-new-app build",
    "test:my-new-app": "pnpm --filter my-new-app test"
  }
}
```

### 2. Actualizar pnpm-workspace.yaml

```yaml
packages:
  - 'apps/*'
  - 'packages/@sync/*'
```

## 🧪 Testing Setup

### 1. Test Básico

```typescript
// apps/my-new-app/tests/app.test.ts
import { describe, it, expect } from 'vitest';
import { app, config } from '../src/lib/app-config';

describe('MyNewApp', () => {
  it('should have correct configuration', () => {
    expect(config.name).toBe('MyNewApp');
    expect(config.version).toBe('1.0.0');
  });

  it('should initialize app', async () => {
    await app.initialize();
    expect(app.isReady).toBe(true);
  });
});
```

### 2. Component Test

```typescript
// apps/my-new-app/tests/components/Button.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from '../../src/lib/components/Button.svelte';

describe('Button Component', () => {
  it('should render with text', () => {
    const { getByText } = render(Button, {
      props: { text: 'Click me' }
    });

    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('should handle click events', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, {
      props: { text: 'Click me', onClick: handleClick }
    });

    await fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalled();
  });
});
```

## ✅ Checklist de Nueva App

### Configuración Inicial

- [ ] Estructura de directorios creada
- [ ] `package.json` configurado
- [ ] Configuración de Vite y TypeScript
- [ ] Variables de entorno configuradas
- [ ] App config implementada

### Desarrollo

- [ ] Layout y páginas básicas
- [ ] Integración con packages compartidos
- [ ] Componentes específicos de la app
- [ ] Tests básicos implementados

### Deployment

- [ ] `vercel.json` configurado
- [ ] GitHub Actions creado
- [ ] Variables de entorno en Vercel
- [ ] Proyecto de Vercel creado

### Integración

- [ ] Scripts agregados al root `package.json`
- [ ] Workspace agregado a `pnpm-workspace.yaml`
- [ ] Documentación actualizada
- [ ] CI/CD funcionando

## 🔧 Comandos Útiles

```bash
# Desarrollo
pnpm dev:my-new-app

# Testing
pnpm test:my-new-app
pnpm --filter my-new-app test:watch

# Build
pnpm build:my-new-app

# Lint y format
pnpm --filter my-new-app lint
pnpm --filter my-new-app format

# Agregar dependencias
pnpm --filter my-new-app add lodash
pnpm --filter my-new-app add -D @types/lodash
```

## 🎯 Best Practices

1. **Naming**: Usar kebab-case para nombres de apps
2. **Configuration**: Usar el patrón de app-config.ts
3. **Shared Code**: Maximizar uso de packages compartidos
4. **Testing**: Implementar tests desde el inicio
5. **Documentation**: Documentar features específicas de la app
6. **Performance**: Monitorear bundle size y performance
7. **Security**: Validar variables de entorno y configuración

¡Tu nueva app estará lista para desarrollo en minutos! 🚀
