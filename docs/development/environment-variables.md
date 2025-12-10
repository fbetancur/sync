# Environment Variables - Sync Platform

## 🎯 Estrategia de Variables de Entorno

Cada aplicación del monorepo tiene su propia configuración de variables de entorno, permitiendo configuración independiente mientras comparte recursos comunes como Supabase.

## 📁 Estructura de Archivos

```
sync-platform/
├── .env.local                    # Variables globales (legacy)
├── apps/
│   ├── credisync/
│   │   ├── .env.local           # Variables específicas de CrediSync
│   │   └── .env.example         # Template para CrediSync
│   ├── healthsync/
│   │   ├── .env.local           # Variables específicas de HealthSync
│   │   └── .env.example         # Template para HealthSync
│   └── surveysync/
│       ├── .env.local           # Variables específicas de SurveySync
│       └── .env.example         # Template para SurveySync
```

## 🔧 Variables por Aplicación

### **CrediSync** (Activo)

**Archivo**: `apps/credisync/.env.local`

```env
# Supabase (Compartido)
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=CrediSyncApp
VITE_APP_DESCRIPTION=PWA para gestión de microcréditos offline-first
VITE_APP_THEME_COLOR=#1e40af
VITE_APP_BACKGROUND_COLOR=#ffffff

# Development
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=false

# Sentry (Opcional)
VITE_SENTRY_DSN=
```

### **HealthSync** (Preparado)

**Archivo**: `apps/healthsync/.env.local`

```env
# Supabase (Compartido)
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=HealthSyncApp
VITE_APP_DESCRIPTION=PWA para gestión de salud offline-first
VITE_APP_THEME_COLOR=#059669
VITE_APP_BACKGROUND_COLOR=#ffffff

# HealthSync Specific
VITE_HEALTH_API_ENDPOINT=your_health_api_endpoint
VITE_ENABLE_BIOMETRIC_AUTH=true
VITE_SYNC_INTERVAL_MINUTES=30

# Development
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=false
```

### **SurveySync** (Preparado)

**Archivo**: `apps/surveysync/.env.local`

```env
# Supabase (Compartido)
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=SurveySyncApp
VITE_APP_DESCRIPTION=PWA para encuestas y formularios offline-first
VITE_APP_THEME_COLOR=#7c3aed
VITE_APP_BACKGROUND_COLOR=#ffffff

# SurveySync Specific
VITE_SURVEY_API_ENDPOINT=your_survey_api_endpoint
VITE_MAX_OFFLINE_RESPONSES=1000
VITE_AUTO_SYNC_ENABLED=true
VITE_SYNC_INTERVAL_MINUTES=15

# Development
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=false
```

## 🌍 Variables de Entorno en Vercel

### **CrediSync** (Configurado)

**Vercel Dashboard** → Project Settings → Environment Variables:

```env
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=CrediSyncApp
```

### **HealthSync** (Por configurar)

**Cuando se active**:
1. Crear proyecto en Vercel
2. Configurar variables en Dashboard
3. Usar las mismas credenciales de Supabase
4. Configurar variables específicas de HealthSync

### **SurveySync** (Por configurar)

**Cuando se active**:
1. Crear proyecto en Vercel
2. Configurar variables en Dashboard
3. Usar las mismas credenciales de Supabase
4. Configurar variables específicas de SurveySync

## 🔄 Migración de Variables

### **Estado Actual**:
- ✅ **Root `.env.local`**: Variables legacy (mantener por compatibilidad)
- ✅ **CrediSync**: Variables migradas y funcionando
- ✅ **HealthSync**: Template preparado
- ✅ **SurveySync**: Template preparado

### **Proceso de Migración**:

1. **Mantener compatibilidad**: El root `.env.local` se mantiene para no romper configuraciones existentes
2. **Apps específicas**: Cada app tiene su propio `.env.local`
3. **Templates**: Cada app tiene su `.env.example` para nuevos desarrolladores
4. **Vercel**: Variables configuradas por proyecto

## 📋 Setup para Nuevos Desarrolladores

### **1. Clonar repositorio**
```bash
git clone https://github.com/fbetancur/sync.git
cd sync
```

### **2. Instalar dependencias**
```bash
pnpm install
```

### **3. Configurar variables por app**

**Para CrediSync**:
```bash
cd apps/credisync
cp .env.example .env.local
# Editar .env.local con valores reales
```

**Para HealthSync** (cuando esté listo):
```bash
cd apps/healthsync
cp .env.example .env.local
# Editar .env.local con valores reales
```

**Para SurveySync** (cuando esté listo):
```bash
cd apps/surveysync
cp .env.example .env.local
# Editar .env.local con valores reales
```

### **4. Obtener credenciales de Supabase**

1. Ve a https://supabase.com/dashboard
2. Selecciona el proyecto: `hmnlriywocnpiktflehr`
3. Ve a **Settings** → **API**
4. Copia:
   - **Project URL**: `VITE_SUPABASE_URL`
   - **anon public key**: `VITE_SUPABASE_ANON_KEY`

## 🔒 Seguridad

### **Variables Públicas** (VITE_*):
- ✅ Seguras para el frontend
- ✅ Se incluyen en el bundle
- ✅ Visibles en el navegador

### **Variables Privadas**:
- ❌ **NO usar** variables privadas en Vite
- ❌ **NO incluir** secrets en variables VITE_*
- ✅ **Usar** variables de servidor si es necesario

### **Buenas Prácticas**:
- ✅ Usar `.env.example` como template
- ✅ Nunca commitear `.env.local`
- ✅ Documentar todas las variables
- ✅ Usar valores por defecto cuando sea posible

## 🎯 Variables Compartidas vs Específicas

### **Compartidas** (Todas las apps):
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_APP_VERSION=1.0.0
VITE_DEV_MODE=true
VITE_DEBUG_ENABLED=false
```

### **Específicas por App**:

**CrediSync**:
```env
VITE_APP_NAME=CrediSyncApp
VITE_APP_THEME_COLOR=#1e40af
```

**HealthSync**:
```env
VITE_APP_NAME=HealthSyncApp
VITE_APP_THEME_COLOR=#059669
VITE_HEALTH_API_ENDPOINT=...
VITE_ENABLE_BIOMETRIC_AUTH=true
```

**SurveySync**:
```env
VITE_APP_NAME=SurveySyncApp
VITE_APP_THEME_COLOR=#7c3aed
VITE_SURVEY_API_ENDPOINT=...
VITE_MAX_OFFLINE_RESPONSES=1000
```

## 🔧 Troubleshooting

### **Error: "Environment variable not found"**
```bash
# Verificar que existe .env.local en la app
ls apps/credisync/.env.local

# Verificar que la variable está definida
grep VITE_SUPABASE_URL apps/credisync/.env.local
```

### **Error: "Supabase connection failed"**
```bash
# Verificar credenciales
curl -I https://hmnlriywocnpiktflehr.supabase.co/rest/v1/
```

### **Variables no se cargan en desarrollo**
```bash
# Verificar que Vite está leyendo el archivo correcto
pnpm dev:credisync --debug
```

## 📈 Próximos Pasos

1. **Migrar completamente** del root `.env.local`
2. **Configurar Sentry** para error tracking
3. **Agregar variables** de feature flags
4. **Implementar** configuración por entorno (dev/staging/prod)
5. **Crear scripts** de validación de variables