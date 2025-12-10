#!/usr/bin/env node

/**
 * Script para crear nuevas aplicaciones en el monorepo
 * Uso: node tools/scripts/create-app.js <app-name> [template]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function validateAppName(name) {
  if (!name) {
    log('red', '❌ Nombre de app requerido');
    return false;
  }
  
  if (!/^[a-z][a-z0-9-]*$/.test(name)) {
    log('red', '❌ Nombre inválido. Usa solo letras minúsculas, números y guiones');
    return false;
  }
  
  if (name.length < 3 || name.length > 20) {
    log('red', '❌ Nombre debe tener entre 3 y 20 caracteres');
    return false;
  }
  
  return true;
}

function createPackageJson(appName, appDisplayName) {
  return {
    name: appName,
    version: "1.0.0",
    description: `${appDisplayName} - PWA offline-first application`,
    type: "module",
    scripts: {
      dev: "vite",
      build: "vite build",
      preview: "vite preview",
      test: "vitest",
      "test:ui": "vitest --ui",
      "test:coverage": "vitest --coverage",
      lint: "eslint . --ext .js,.ts,.svelte",
      format: "prettier --write .",
      clean: "rm -rf dist"
    },
    dependencies: {
      "@sync/core": "workspace:*",
      "@sync/types": "workspace:*",
      "@sync/ui": "workspace:*",
      "@supabase/supabase-js": "^2.87.1",
      "dexie": "^4.2.1",
      "zod": "^4.1.13"
    },
    devDependencies: {
      "@sveltejs/vite-plugin-svelte": "^6.2.1",
      "@testing-library/svelte": "^5.2.9",
      "@types/node": "^24.10.2",
      "eslint": "^9.39.1",
      "jsdom": "^27.3.0",
      "prettier": "^3.7.4",
      "svelte": "^5.45.8",
      "svelte-check": "^4.3.4",
      "typescript": "~5.9.3",
      "vite": "^7.2.7",
      "vite-plugin-pwa": "^1.2.0",
      "vitest": "^4.0.15"
    }
  };
}

function createViteConfig(appName) {
  return `import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      },
      manifest: {
        name: '${appName.charAt(0).toUpperCase() + appName.slice(1)}',
        short_name: '${appName.charAt(0).toUpperCase() + appName.slice(1)}',
        description: 'PWA offline-first application',
        theme_color: '#1e40af',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts']
  }
});`;
}

function createVercelJson(appName, appDisplayName) {
  return {
    "$schema": "https://openapi.vercel.sh/vercel.json",
    name: appName,
    buildCommand: `cd ../.. && pnpm build:packages && pnpm build:${appName}`,
    outputDirectory: "dist",
    devCommand: `cd ../.. && pnpm dev:${appName}`,
    installCommand: "cd ../.. && pnpm install",
    framework: "vite",
    rewrites: [
      {
        source: "/(.*)",
        destination: "/index.html"
      }
    ],
    headers: [
      {
        source: "/service-worker.js",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, must-revalidate"
          },
          {
            key: "Service-Worker-Allowed",
            value: "/"
          }
        ]
      },
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "X-XSS-Protection",
            value: "1; mode=block"
          }
        ]
      }
    ],
    build: {
      env: {
        VITE_SUPABASE_URL: "https://hmnlriywocnpiktflehr.supabase.co",
        VITE_SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDE4MzIsImV4cCI6MjA4MDg3NzgzMn0.P4ZZdWAPgby89Rc8yYAZB9f2bwRrRuLEsS_6peobkf4",
        VITE_APP_VERSION: "1.0.0",
        VITE_APP_NAME: `${appDisplayName}App`
      }
    }
  };
}

function createEnvExample(appName, appDisplayName) {
  return `# ${appDisplayName} - Variables de Entorno (Template)
# Copia este archivo a .env.local y configura los valores reales

# Supabase Configuration
# Compartido con otras apps del monorepo
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# ${appDisplayName} App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=${appDisplayName}App
VITE_APP_DESCRIPTION=PWA para ${appName} offline-first
VITE_APP_THEME_COLOR=#1e40af
VITE_APP_BACKGROUND_COLOR=#ffffff

# Sentry Configuration (opcional)
VITE_SENTRY_DSN=your_sentry_dsn_if_using_error_tracking

# Development Configuration
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=false

# ${appDisplayName} Specific Configuration
# Agregar variables específicas aquí según necesidades`;
}

function createAppSvelte(appDisplayName) {
  return `<script lang="ts">
  import { onMount } from 'svelte';
  import { createSyncApp } from '@sync/core';
  
  let syncApp: any = null;
  let isReady = false;
  
  onMount(async () => {
    try {
      syncApp = await createSyncApp({
        appName: '${appDisplayName}',
        supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
        supabaseKey: import.meta.env.VITE_SUPABASE_ANON_KEY
      });
      
      isReady = true;
      console.log('${appDisplayName} initialized successfully');
    } catch (error) {
      console.error('Error initializing ${appDisplayName}:', error);
    }
  });
</script>

<main class="min-h-screen bg-gray-50 flex items-center justify-center">
  <div class="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
    <div class="text-center">
      <h1 class="text-3xl font-bold text-gray-900 mb-4">
        ${appDisplayName}
      </h1>
      
      {#if isReady}
        <div class="text-green-600 mb-4">
          <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
          </svg>
          <p class="text-sm">Aplicación inicializada correctamente</p>
        </div>
      {:else}
        <div class="text-blue-600 mb-4">
          <svg class="w-16 h-16 mx-auto mb-2 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm">Inicializando aplicación...</p>
        </div>
      {/if}
      
      <div class="space-y-4">
        <p class="text-gray-600">
          PWA offline-first construida con Sync Platform
        </p>
        
        <div class="flex justify-center space-x-4">
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            Offline Ready
          </span>
          <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            Sync Enabled
          </span>
        </div>
      </div>
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
  }
</style>`;
}

function createIndexHtml(appDisplayName) {
  return `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="description" content="${appDisplayName} - PWA offline-first" />
    <meta name="theme-color" content="#1e40af" />
    <title>${appDisplayName}</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>`;
}

function createMainTs(appDisplayName) {
  return `import './app.css';
import App from './App.svelte';

const app = new App({
  target: document.getElementById('app')!,
});

export default app;`;
}

function createAppCss() {
  return `@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  font-family: Inter, system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;
  
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-text-size-adjust: 100%;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}`;
}

function createReadme(appName, appDisplayName) {
  return `# ${appDisplayName}

PWA offline-first construida con Sync Platform.

## 🚀 Desarrollo

\`\`\`bash
# Instalar dependencias (desde la raíz del monorepo)
pnpm install

# Desarrollo
pnpm dev:${appName}

# Build
pnpm build:${appName}

# Tests
pnpm test:${appName}
\`\`\`

## 📱 Características

- ✅ **Offline-first** con sincronización automática
- ✅ **PWA** con service worker
- ✅ **Sync Platform** integrado
- ✅ **TypeScript** y **Svelte**
- ✅ **Tailwind CSS** para estilos
- ✅ **Vitest** para testing

## 🔧 Configuración

1. Copia \`.env.example\` a \`.env.local\`
2. Configura las variables de entorno
3. Ejecuta \`pnpm dev:${appName}\`

## 📚 Documentación

Ver [documentación del monorepo](../../docs/) para más información.`;
}

function createApp(appName, template = 'basic') {
  log('blue', `🚀 Creando nueva aplicación: ${appName}`);
  
  if (!validateAppName(appName)) {
    return false;
  }
  
  const appDir = path.join(rootDir, 'apps', appName);
  const appDisplayName = appName.charAt(0).toUpperCase() + appName.slice(1);
  
  // Verificar que no existe
  if (fs.existsSync(appDir)) {
    log('red', `❌ La aplicación ${appName} ya existe`);
    return false;
  }
  
  try {
    // Crear estructura de directorios
    log('cyan', '📁 Creando estructura de directorios...');
    fs.mkdirSync(appDir, { recursive: true });
    fs.mkdirSync(path.join(appDir, 'src'), { recursive: true });
    fs.mkdirSync(path.join(appDir, 'public'), { recursive: true });
    
    // Crear archivos de configuración
    log('cyan', '⚙️ Creando archivos de configuración...');
    
    // package.json
    fs.writeFileSync(
      path.join(appDir, 'package.json'),
      JSON.stringify(createPackageJson(appName, appDisplayName), null, 2)
    );
    
    // vite.config.ts
    fs.writeFileSync(
      path.join(appDir, 'vite.config.ts'),
      createViteConfig(appName)
    );
    
    // vercel.json
    fs.writeFileSync(
      path.join(appDir, 'vercel.json'),
      JSON.stringify(createVercelJson(appName, appDisplayName), null, 2)
    );
    
    // .env.example
    fs.writeFileSync(
      path.join(appDir, '.env.example'),
      createEnvExample(appName, appDisplayName)
    );
    
    // Crear archivos de aplicación
    log('cyan', '📱 Creando archivos de aplicación...');
    
    // index.html
    fs.writeFileSync(
      path.join(appDir, 'index.html'),
      createIndexHtml(appDisplayName)
    );
    
    // src/main.ts
    fs.writeFileSync(
      path.join(appDir, 'src', 'main.ts'),
      createMainTs(appDisplayName)
    );
    
    // src/App.svelte
    fs.writeFileSync(
      path.join(appDir, 'src', 'App.svelte'),
      createAppSvelte(appDisplayName)
    );
    
    // src/app.css
    fs.writeFileSync(
      path.join(appDir, 'src', 'app.css'),
      createAppCss()
    );
    
    // README.md
    fs.writeFileSync(
      path.join(appDir, 'README.md'),
      createReadme(appName, appDisplayName)
    );
    
    log('green', `✅ Aplicación ${appName} creada exitosamente`);
    
    // Instrucciones
    log('yellow', '\n📋 Próximos pasos:');
    log('yellow', `1. cd apps/${appName}`);
    log('yellow', `2. cp .env.example .env.local`);
    log('yellow', `3. Editar .env.local con valores reales`);
    log('yellow', `4. Agregar scripts al package.json raíz:`);
    log('yellow', `   - "dev:${appName}": "pnpm --filter ${appName} dev"`);
    log('yellow', `   - "build:${appName}": "pnpm --filter ${appName} build"`);
    log('yellow', `   - "test:${appName}": "pnpm --filter ${appName} test"`);
    log('yellow', `5. pnpm dev:${appName}`);
    
    return true;
  } catch (error) {
    log('red', `❌ Error creando aplicación: ${error.message}`);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);
  const appName = args[0];
  const template = args[1] || 'basic';
  
  log('blue', '🛠️  Generador de Aplicaciones - Sync Platform');
  
  if (!appName) {
    log('red', '❌ Uso: node tools/scripts/create-app.js <app-name> [template]');
    log('yellow', '\nEjemplos:');
    log('yellow', '  node tools/scripts/create-app.js myapp');
    log('yellow', '  node tools/scripts/create-app.js my-awesome-app basic');
    process.exit(1);
  }
  
  const success = createApp(appName, template);
  process.exit(success ? 0 : 1);
}

main();