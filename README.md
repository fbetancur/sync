# Sync Platform

> Plataforma offline-first para recolección de datos en campo

## 🚀 Quick Start

```bash
# Instalar dependencias
pnpm install

# Desarrollo - todas las apps
pnpm dev

# Desarrollo - app específica
pnpm dev:credisync
pnpm dev:healthsync
pnpm dev:surveysync

# Tests
pnpm test
pnpm test:apps
pnpm test:packages
```

## 📱 Aplicaciones

### CrediSync ✅ **Activa**
- **URL**: [credisync.vercel.app](http://localhost:5175) (desarrollo)
- **Descripción**: Gestión offline-first de microcréditos
- **Estado**: Completamente funcional (Tareas 1-19 completadas)
- **Docs**: [apps/credisync/README.md](apps/credisync/README.md)

### HealthSync 🚧 **Próximamente**
- **URL**: healthsync.vercel.app (futuro)
- **Descripción**: Gestión de datos de salud offline-first
- **Estado**: Placeholder creado
- **Docs**: [apps/healthsync/README.md](apps/healthsync/README.md)

### SurveySync 🚧 **Próximamente**
- **URL**: surveysync.vercel.app (futuro)
- **Descripción**: Recolección de encuestas offline-first
- **Estado**: Placeholder creado
- **Docs**: [apps/surveysync/README.md](apps/surveysync/README.md)

## 📦 Packages Compartidos

### @sync/core 🚧 **En desarrollo**
- Infraestructura offline-first reutilizable
- IndexedDB + Dexie.js
- Sincronización bidireccional
- Resolución de conflictos CRDT
- Sistema de auditoría

### @sync/ui 🚧 **En desarrollo**
- Componentes Svelte compartidos
- Stores y actions reutilizables
- Estilos consistentes

### @sync/types 🚧 **En desarrollo**
- Tipos TypeScript compartidos
- Interfaces de base de datos
- Tipos de API y negocio

## 🏗️ Arquitectura

```
sync/                          ← Monorepo principal
├── apps/                      ← Aplicaciones
│   ├── credisync/            ← CrediSync (activa)
│   ├── healthsync/           ← HealthSync (futuro)
│   └── surveysync/           ← SurveySync (futuro)
├── packages/                  ← Packages compartidos
│   ├── @sync/core/           ← Infraestructura offline-first
│   ├── @sync/ui/             ← Componentes UI
│   └── @sync/types/          ← Tipos TypeScript
├── docs/                     ← Documentación
├── specs/                    ← Especificaciones Kiro
└── tools/                    ← Scripts y herramientas
```

## 📚 Documentación

- [Arquitectura](docs/architecture/overview.md)
- [Guía de desarrollo](docs/development/getting-started.md)
- [Especificaciones](specs/README.md)
- [Migración a monorepo](docs/migration/migration-log.md)

## 🎯 Estado Actual

**Fase 1 del Monorepo**: ✅ **Completada**
- ✅ Estructura de monorepo creada
- ✅ CrediSync migrado y funcionando
- ✅ pnpm workspaces configurado
- ✅ 332/333 tests pasando (99.7%)
- ✅ Servidor de desarrollo operativo
- ✅ Placeholders para futuras apps

**Próximo**: Extracción gradual de packages compartidos

## 🔧 Herramientas

- **Package Manager**: pnpm (workspaces)
- **Build**: Vite
- **Testing**: Vitest
- **Linting**: ESLint + Prettier
- **Deployment**: Vercel (por app)

## 📊 Métricas

- **Tests**: 332/333 pasando (99.7%)
- **Apps activas**: 1/3 (CrediSync)
- **Packages**: 0/3 (en desarrollo)
- **Cobertura**: Completa para CrediSync

## 🚀 Deployment

Cada aplicación se despliega independientemente:

```bash
# CrediSync
pnpm build:credisync

# HealthSync (futuro)
pnpm build:healthsync

# SurveySync (futuro)  
pnpm build:surveysync
```

## 🤝 Contribución

Ver [CONTRIBUTING.md](CONTRIBUTING.md) para guías de contribución.

## 📄 Licencia

Ver [LICENSE.md](LICENSE.md) para detalles de licencia.