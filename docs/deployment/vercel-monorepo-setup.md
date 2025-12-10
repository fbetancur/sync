# Vercel Deployment Setup - Monorepo Strategy

## 🎯 Estrategia: Proyectos Separados

Cada aplicación del monorepo se deploya como un **proyecto independiente** en Vercel para máxima flexibilidad y escalabilidad.

## 📱 Aplicaciones y URLs

| Aplicación | URL de Producción | Estado |
|------------|-------------------|---------|
| CrediSync  | `credisync.vercel.app` | ✅ Activo |
| HealthSync | `healthsync.vercel.app` | 🚧 Futuro |
| SurveySync | `surveysync.vercel.app` | 🚧 Futuro |

## ⚙️ Configuración por Proyecto

### CrediSync (Proyecto Principal)

**Configuración en Vercel Dashboard:**
- **Project Name**: `credisync`
- **Repository**: `fbetancur/sync` 
- **Root Directory**: `apps/credisync/`
- **Build Command**: `cd ../.. && pnpm build:credisync`
- **Install Command**: `cd ../.. && pnpm install`
- **Output Directory**: `dist`
- **Framework**: `vite`

**Variables de Entorno:**
```env
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=CrediSyncApp
```

### HealthSync (Futuro)

**Configuración en Vercel Dashboard:**
- **Project Name**: `healthsync`
- **Repository**: `fbetancur/sync`
- **Root Directory**: `apps/healthsync/`
- **Build Command**: `cd ../.. && pnpm build:healthsync`
- **Install Command**: `cd ../.. && pnpm install`
- **Output Directory**: `dist`
- **Framework**: `vite`

### SurveySync (Futuro)

**Configuración en Vercel Dashboard:**
- **Project Name**: `surveysync`
- **Repository**: `fbetancur/sync`
- **Root Directory**: `apps/surveysync/`
- **Build Command**: `cd ../.. && pnpm build:surveysync`
- **Install Command**: `cd ../.. && pnpm install`
- **Output Directory**: `dist`
- **Framework**: `vite`

## 🔄 Deployment Inteligente

### Ignore Commands

Cada proyecto tiene configurado un `ignoreCommand` para deployar solo cuando hay cambios relevantes:

```json
{
  "ignoreCommand": "git diff --quiet HEAD^ HEAD ./"
}
```

Esto significa que:
- ✅ **Se deploya** si hay cambios en la carpeta de la app
- ✅ **Se deploya** si hay cambios en `packages/` (afecta a todas las apps)
- ❌ **NO se deploya** si solo cambian otras apps

### Build Dependencies

El orden de build es importante:
1. `@sync/types` (sin dependencias)
2. `@sync/core` (depende de types)
3. `@sync/ui` (depende de core)
4. Apps (dependen de todos los packages)

## 🚀 Comandos de Deployment

### Deployment Manual

```bash
# CrediSync
cd apps/credisync
vercel --prod

# HealthSync (cuando esté listo)
cd apps/healthsync  
vercel --prod

# SurveySync (cuando esté listo)
cd apps/surveysync
vercel --prod
```

### Preview Deployments

```bash
# Preview de CrediSync
cd apps/credisync
vercel

# Preview de cualquier app
cd apps/{app-name}
vercel
```

## 📊 Ventajas de esta Estrategia

### ✅ Deployment Independiente
- Cada app se deploya solo cuando es necesario
- Rollback independiente por aplicación
- URLs limpias y profesionales

### ✅ Escalabilidad
- Agregar nueva app = crear nuevo proyecto en Vercel
- Sin afectar deployments existentes
- Configuración aislada por aplicación

### ✅ Performance
- Builds paralelos posibles
- Cache independiente por proyecto
- Optimización específica por aplicación

### ✅ Gestión Simplificada
- Un repositorio, múltiples proyectos
- Shared packages automáticamente disponibles
- Configuración centralizada en el monorepo

## 🔧 Troubleshooting

### Error: "Command failed"
```bash
# Verificar que pnpm está instalado
pnpm --version

# Verificar que el build funciona localmente
pnpm build:credisync
```

### Error: "Dependencies not found"
```bash
# Verificar que el install command es correcto
cd ../.. && pnpm install
```

### Error: "Output directory not found"
```bash
# Verificar que el output directory es correcto
ls apps/credisync/dist/
```

## 📋 Checklist de Deployment

### Para CrediSync (Actual):
- [x] vercel.json configurado
- [x] Build command funciona
- [x] Variables de entorno configuradas
- [x] Output directory correcto
- [ ] Proyecto creado en Vercel Dashboard
- [ ] Deployment de prueba exitoso

### Para HealthSync (Futuro):
- [x] vercel.json preparado
- [ ] Aplicación desarrollada
- [ ] Proyecto creado en Vercel Dashboard
- [ ] Variables de entorno configuradas

### Para SurveySync (Futuro):
- [x] vercel.json preparado
- [ ] Aplicación desarrollada
- [ ] Proyecto creado en Vercel Dashboard
- [ ] Variables de entorno configuradas

## 🎯 Próximos Pasos

1. **Crear proyecto CrediSync en Vercel Dashboard**
2. **Configurar variables de entorno**
3. **Realizar deployment de prueba**
4. **Configurar dominio personalizado (opcional)**
5. **Configurar CI/CD automático**