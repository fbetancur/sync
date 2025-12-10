# Troubleshooting - Sync Platform

Esta guía cubre los problemas más comunes y sus soluciones en el monorepo de Sync Platform.

## 📋 Tabla de Contenidos

- [Problemas de Instalación](#problemas-de-instalación)
- [Problemas de Build](#problemas-de-build)
- [Problemas de Tests](#problemas-de-tests)
- [Problemas de Deployment](#problemas-de-deployment)
- [Problemas de Performance](#problemas-de-performance)
- [Problemas de Git](#problemas-de-git)
- [Procedimientos de Rollback](#procedimientos-de-rollback)

## 🚨 Problemas de Instalación

### Error: "Cannot find module '@sync/core'"

**Síntomas:**
```
Error: Cannot find module '@sync/core'
```

**Causa:** Los packages compartidos no están construidos.

**Solución:**
```bash
# 1. Construir packages primero
pnpm build:packages

# 2. Si persiste, limpiar y reinstalar
pnpm clean
pnpm install
pnpm build:packages
```

### Error: "pnpm command not found"

**Síntomas:**
```
bash: pnpm: command not found
```

**Causa:** pnpm no está instalado.

**Solución:**
```bash
# Instalar pnpm globalmente
npm install -g pnpm

# O usando Homebrew (macOS)
brew install pnpm

# Verificar instalación
pnpm --version
```

### Error: "Node version not supported"

**Síntomas:**
```
error: The engine "node" is incompatible with this module
```

**Causa:** Versión de Node.js incompatible.

**Solución:**
```bash
# Verificar versión actual
node --version

# Instalar Node.js >= 18.0.0
# Usar nvm para gestionar versiones
nvm install 18
nvm use 18
```

## 🏗️ Problemas de Build

### Error: "TypeScript compilation failed"

**Síntomas:**
```
error TS2307: Cannot find module '@sync/types'
```

**Causa:** Orden incorrecto de build o tipos no generados.

**Solución:**
```bash
# 1. Construir en orden correcto
pnpm --filter @sync/types build
pnpm --filter @sync/core build
pnpm --filter @sync/ui build

# 2. O usar el script que maneja el orden
pnpm build:packages
```

### Error: "Vite build failed"

**Síntomas:**
```
[vite]: Rollup failed to resolve import
```

**Causa:** Configuración incorrecta de imports o dependencias faltantes.

**Solución:**
```bash
# 1. Verificar que packages estén construidos
pnpm build:packages

# 2. Limpiar cache de Vite
rm -rf apps/credisync/.vite
rm -rf apps/credisync/dist

# 3. Reconstruir
pnpm build:credisync
```

### Error: "Out of memory during build"

**Síntomas:**
```
FATAL ERROR: Ineffective mark-compacts near heap limit
```

**Causa:** Memoria insuficiente para el proceso de build.

**Solución:**
```bash
# 1. Aumentar memoria de Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# 2. O usar script con memoria aumentada
node --max-old-space-size=4096 node_modules/.bin/vite build

# 3. Construir packages por separado
pnpm --filter @sync/types build
pnpm --filter @sync/core build
pnpm --filter @sync/ui build
```

## 🧪 Problemas de Tests

### Error: "IndexedDB not supported"

**Síntomas:**
```
Error: IndexedDB no está soportado en este navegador
```

**Causa:** Tests de base de datos ejecutándose en Node.js sin polyfill.

**Solución:**
```bash
# 1. Instalar fake-indexeddb si no está
pnpm add -D fake-indexeddb

# 2. Verificar configuración en vitest.config.ts
# setupFiles: ['fake-indexeddb/auto']

# 3. O ejecutar solo tests que no requieren IndexedDB
pnpm --filter @sync/types test
pnpm --filter @sync/ui test
```

### Error: "Tests timeout"

**Síntomas:**
```
Test timeout of 5000ms exceeded
```

**Causa:** Tests lentos o operaciones asíncronas no resueltas.

**Solución:**
```bash
# 1. Aumentar timeout en vitest.config.ts
# testTimeout: 10000

# 2. O ejecutar con timeout específico
pnpm test --testTimeout=10000

# 3. Revisar tests específicos que fallan
pnpm test --reporter=verbose
```

### Error: "Module not found in tests"

**Síntomas:**
```
Cannot resolve dependency '@sync/core'
```

**Causa:** Configuración incorrecta de paths en tests.

**Solución:**
```bash
# 1. Verificar que packages estén construidos
pnpm build:packages

# 2. Verificar configuración de paths en tsconfig.json
# "paths": {
#   "@sync/*": ["./packages/@sync/*/src"]
# }

# 3. Limpiar cache de tests
rm -rf node_modules/.vitest
```

## 🚀 Problemas de Deployment

### Error: "Vercel build failed"

**Síntomas:**
```
Error: Command "pnpm build:credisync" exited with 1
```

**Causa:** Build falla en el entorno de Vercel.

**Solución:**
```bash
# 1. Verificar vercel.json configuration
# "buildCommand": "cd ../.. && pnpm build:packages && pnpm --filter credisync build"

# 2. Verificar variables de entorno en Vercel
# VITE_SUPABASE_URL
# VITE_SUPABASE_ANON_KEY

# 3. Test build localmente
pnpm build:packages
pnpm build:credisync
```

### Error: "Environment variables not found"

**Síntomas:**
```
Error: VITE_SUPABASE_URL is not defined
```

**Causa:** Variables de entorno no configuradas.

**Solución:**
```bash
# 1. Verificar archivos .env.local
ls -la apps/credisync/.env.local

# 2. Validar variables
pnpm validate-env

# 3. Configurar en Vercel dashboard
# Project Settings > Environment Variables
```

### Error: "Deployment size limit exceeded"

**Síntomas:**
```
Error: The Serverless Function exceeds the maximum size limit
```

**Causa:** Bundle demasiado grande.

**Solución:**
```bash
# 1. Analizar bundle size
pnpm bundle-analyzer:credisync

# 2. Optimizar imports
# Usar imports específicos en lugar de imports completos

# 3. Configurar code splitting
# Ver vite.config.ts para configuración de chunks
```

## ⚡ Problemas de Performance

### Build lento (> 2 minutos)

**Síntomas:** Builds que toman más de 2 minutos.

**Solución:**
```bash
# 1. Medir performance actual
pnpm performance-monitor:build

# 2. Optimizar configuración
pnpm optimize-performance:build

# 3. Usar builds incrementales
# Verificar incremental: true en tsconfig.json

# 4. Paralelizar builds
pnpm --parallel --filter './packages/@sync/*' build
```

### Tests lentos (> 1 minuto)

**Síntomas:** Test suite que toma más de 1 minuto.

**Solución:**
```bash
# 1. Medir performance de tests
pnpm performance-monitor:test

# 2. Ejecutar tests en paralelo
pnpm test --reporter=verbose --threads

# 3. Filtrar tests específicos
pnpm --filter @sync/types test
pnpm --filter @sync/core test --run
```

### Bundle size grande (> 1MB)

**Síntomas:** Bundles de cliente mayores a 1MB.

**Solución:**
```bash
# 1. Analizar bundle
pnpm bundle-analyzer:credisync

# 2. Optimizar imports
# Cambiar: import _ from 'lodash'
# Por: import { debounce } from 'lodash'

# 3. Configurar code splitting
# Ver vite.config.ts para manualChunks

# 4. Lazy loading de componentes
# const Component = lazy(() => import('./Component.svelte'))
```

## 🔧 Problemas de Git

### Error: "Merge conflicts"

**Síntomas:**
```
CONFLICT (content): Merge conflict in package.json
```

**Solución:**
```bash
# 1. Ver archivos en conflicto
git status

# 2. Resolver conflictos manualmente
# Editar archivos y remover marcadores <<<< ==== >>>>

# 3. Marcar como resuelto
git add .
git commit -m "resolve merge conflicts"

# 4. Si es muy complejo, usar herramientas
git mergetool
```

### Error: "Detached HEAD state"

**Síntomas:**
```
You are in 'detached HEAD' state
```

**Solución:**
```bash
# 1. Crear branch desde el estado actual
git checkout -b fix-detached-head

# 2. O volver al branch principal
git checkout main

# 3. Si hay cambios importantes
git stash
git checkout main
git stash pop
```

### Error: "Large files in repository"

**Síntomas:** Repository muy grande o push rechazado.

**Solución:**
```bash
# 1. Verificar archivos grandes
git ls-files | xargs ls -la | sort -k5 -rn | head

# 2. Remover archivos grandes del historial
git filter-branch --tree-filter 'rm -f large-file.zip' HEAD

# 3. Usar .gitignore para prevenir
echo "*.zip" >> .gitignore
echo "node_modules/" >> .gitignore
echo "dist/" >> .gitignore
```

## 🔄 Procedimientos de Rollback

### Rollback Completo a Estado Anterior

```bash
# 1. Listar backups disponibles
node tools/scripts/rollback.js --list-backups

# 2. Rollback a backup específico
node tools/scripts/rollback.js --to-backup=backup-pre-migration

# 3. O rollback a commit específico
node tools/scripts/rollback.js --to-commit=abc123

# 4. Dry run para simular
node tools/scripts/rollback.js --to-backup=backup-pre-migration --dry-run
```

### Rollback Parcial (Solo Dependencias)

```bash
# 1. Limpiar y reinstalar dependencias
pnpm clean
rm -rf node_modules
rm pnpm-lock.yaml
pnpm install

# 2. Reconstruir packages
pnpm build:packages

# 3. Validar funcionamiento
pnpm test
pnpm build
```

### Rollback de Deployment

```bash
# 1. En Vercel dashboard
# Ir a Deployments > Previous deployment > Promote to Production

# 2. O revertir commit y re-deploy
git revert HEAD
git push origin main

# 3. Verificar deployment
curl -f https://credisync-green.vercel.app
```

## 🆘 Procedimientos de Emergencia

### Sistema Completamente Roto

```bash
# 1. Rollback completo al backup
node tools/scripts/rollback.js --to-backup=backup-pre-migration

# 2. Si no hay backup, clonar repositorio limpio
git clone https://github.com/fbetancur/sync.git sync-clean
cd sync-clean
pnpm install
pnpm build

# 3. Copiar cambios importantes manualmente
```

### Corrupción de node_modules

```bash
# 1. Limpieza completa
rm -rf node_modules
rm -rf packages/*/node_modules
rm -rf apps/*/node_modules
rm pnpm-lock.yaml

# 2. Reinstalación limpia
pnpm install --frozen-lockfile=false
pnpm build:packages
pnpm build:apps

# 3. Validar funcionamiento
pnpm test
pnpm dev:credisync
```

### Base de Datos Corrupta (Desarrollo)

```bash
# 1. Limpiar datos de desarrollo
# En navegador: Application > Storage > Clear storage

# 2. O usar script de limpieza
pnpm dev:credisync
# En la app: Settings > Clear all data

# 3. Reinicializar con datos de prueba
# Ejecutar seed scripts si existen
```

## 📞 Obtener Ayuda

### Información de Debug

```bash
# 1. Recopilar información del sistema
node --version
pnpm --version
git --version

# 2. Estado del proyecto
pnpm validation-complete --dry-run

# 3. Logs detallados
pnpm build:credisync 2>&1 | tee build.log
pnpm test 2>&1 | tee test.log

# 4. Métricas de performance
pnpm performance-monitor:all
pnpm bundle-analyzer:all
```

### Contactar Soporte

1. **GitHub Issues**: Para bugs y problemas técnicos
2. **Discussions**: Para preguntas generales
3. **Email**: Para problemas críticos de producción

### Información a Incluir

- Versión de Node.js y pnpm
- Sistema operativo
- Comando exacto que falló
- Mensaje de error completo
- Logs relevantes
- Pasos para reproducir

---

**Recuerda:** Siempre crear un backup antes de hacer cambios importantes. El script de rollback está disponible para emergencias.

¿No encuentras tu problema aquí? [Crear un issue](https://github.com/fbetancur/sync/issues/new) con los detalles.