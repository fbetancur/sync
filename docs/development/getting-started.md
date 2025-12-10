# Guía de Inicio - Sync Platform

Esta guía te ayudará a configurar y comenzar a desarrollar en el monorepo de Sync Platform.

## 📋 Prerrequisitos

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0 (gestor de paquetes)
- **Git** para control de versiones

### Instalación de pnpm

```bash
# Usando npm
npm install -g pnpm

# Usando Homebrew (macOS)
brew install pnpm

# Usando Chocolatey (Windows)
choco install pnpm
```

## 🚀 Configuración Inicial

### 1. Clonar el repositorio

```bash
git clone https://github.com/fbetancur/sync.git
cd sync
```

### 2. Instalar dependencias

```bash
# Instalar todas las dependencias del monorepo
pnpm install
```

### 3. Configurar variables de entorno

```bash
# Copiar archivos de ejemplo
cp .env.example .env.local
cp apps/credisync/.env.example apps/credisync/.env.local

# Editar con tus valores
# Necesitarás configurar:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
# - VITE_SUPABASE_SERVICE_ROLE_KEY
```

### 4. Validar configuración

```bash
# Verificar que todo esté configurado correctamente
pnpm validate-env
```

## 🏗️ Estructura del Proyecto

```
sync/
├── apps/                    # Aplicaciones del monorepo
│   ├── credisync/          # App principal de créditos
│   ├── healthsync/         # App de salud (placeholder)
│   └── surveysync/         # App de encuestas (placeholder)
├── packages/               # Paquetes compartidos
│   └── @sync/
│       ├── core/          # Lógica de negocio compartida
│       ├── types/         # Tipos TypeScript compartidos
│       └── ui/            # Componentes UI compartidos
├── docs/                  # Documentación
├── tools/                 # Scripts y herramientas
└── specs/                 # Especificaciones y diseño
```

## 🛠️ Comandos de Desarrollo

### Desarrollo de Apps

```bash
# Iniciar CrediSync en modo desarrollo
pnpm dev:credisync

# Construir CrediSync para producción
pnpm build:credisync

# Ejecutar tests de CrediSync
pnpm test:credisync
```

### Desarrollo de Packages

```bash
# Construir todos los packages
pnpm build:packages

# Construir package específico
pnpm --filter @sync/core build

# Ejecutar tests de packages
pnpm test:packages
```

### Comandos Globales

```bash
# Construir todo el monorepo
pnpm build

# Ejecutar todos los tests
pnpm test

# Limpiar builds
pnpm clean

# Lint y format código
pnpm lint-fix --fix --format
```

## 🧪 Testing

### Ejecutar Tests

```bash
# Todos los tests
pnpm test

# Tests específicos
pnpm test:credisync
pnpm test:packages

# Tests en modo watch
pnpm --filter credisync test:watch
```

### Escribir Tests

- Los tests van junto al código: `src/component.test.ts`
- Usar Vitest como framework de testing
- Seguir el patrón AAA (Arrange, Act, Assert)

```typescript
// Ejemplo de test
import { describe, it, expect } from 'vitest';
import { myFunction } from './my-function';

describe('myFunction', () => {
  it('should return expected result', () => {
    // Arrange
    const input = 'test';
    
    // Act
    const result = myFunction(input);
    
    // Assert
    expect(result).toBe('expected');
  });
});
```

## 🎨 Linting y Formatting

### Configuración Automática

El proyecto usa ESLint y Prettier con configuración centralizada:

```bash
# Lint y fix automático
pnpm lint-fix --fix

# Solo formatear código
pnpm lint-fix --format

# Verificar formato sin cambios
pnpm lint-fix --check
```

### Pre-commit Hooks

Los hooks se ejecutan automáticamente antes de cada commit:

- Lint de archivos modificados
- Verificación de formato
- Tests de workspaces afectados
- Validación de variables de entorno

## 🚀 Deployment

### CrediSync (Producción)

```bash
# Deploy automático via GitHub Actions
git push origin main

# Deploy manual (si tienes acceso a Vercel)
pnpm build:credisync
vercel --prod
```

### Preview Deployments

Los PRs generan automáticamente deployments de preview.

## 🔧 Herramientas de Desarrollo

### Crear Nueva App

```bash
# Generar estructura de nueva app
node tools/scripts/create-app.js my-new-app
```

### Migrar Código a Package

```bash
# Extraer código a package compartido
node tools/scripts/migrate-package.js
```

### Validar Entorno

```bash
# Verificar configuración de variables de entorno
pnpm validate-env
```

## 📚 Recursos Adicionales

- [Workflow del Monorepo](./monorepo-workflow.md)
- [Agregar Nuevas Apps](./adding-new-apps.md)
- [Configuración de CI/CD](./ci-cd-setup.md)
- [Variables de Entorno](./environment-variables.md)

## 🆘 Troubleshooting

### Problemas Comunes

**Error: "Cannot find module '@sync/core'"**
```bash
# Construir packages primero
pnpm build:packages
```

**Tests fallan después de cambios**
```bash
# Limpiar y reconstruir
pnpm clean
pnpm install
pnpm build:packages
pnpm test
```

**Problemas de linting**
```bash
# Instalar dependencias de linting
pnpm lint-fix --install-deps
pnpm lint-fix --fix
```

**Variables de entorno no funcionan**
```bash
# Validar configuración
pnpm validate-env

# Verificar archivos .env.local existen
ls -la apps/*/
```

### Obtener Ayuda

1. Revisar la documentación en `docs/`
2. Buscar issues similares en GitHub
3. Crear nuevo issue con detalles del problema
4. Contactar al equipo de desarrollo

## 🎯 Próximos Pasos

1. Explorar el código de CrediSync en `apps/credisync/`
2. Revisar los packages compartidos en `packages/@sync/`
3. Leer la documentación de [workflow](./monorepo-workflow.md)
4. Comenzar a desarrollar tu primera feature

¡Bienvenido al desarrollo en Sync Platform! 🚀