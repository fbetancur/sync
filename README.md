# PWA Microcréditos - Offline First

Progressive Web App para gestión de microcréditos y cobranza en campo, con capacidad offline completa.

## 🚀 Stack Tecnológico

- **Frontend**: Svelte 4 + TypeScript + Vite 5
- **Base de Datos Local**: Dexie.js (IndexedDB)
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Hosting**: Vercel
- **UI**: Tailwind CSS + DaisyUI
- **PWA**: Vite PWA Plugin + Workbox
- **Testing**: Vitest + Playwright

## 📋 Características Principales

- ✅ **Offline-First**: Funciona completamente sin conexión
- ✅ **Almacenamiento Multi-capa**: 3 capas de redundancia (IndexedDB + LocalStorage + Cache API)
- ✅ **Sincronización Inteligente**: CRDT para resolución de conflictos
- ✅ **Cero Pérdida de Datos**: Checksums, audit logs inmutables
- ✅ **Property-Based Testing**: 10 propiedades de correctness

## 🛠️ Instalación

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus credenciales de Supabase

# Ejecutar en desarrollo
npm run dev

# Ejecutar tests
npm test

# Build para producción
npm run build
```

## 📁 Estructura del Proyecto

```
src/
├── lib/
│   ├── db/              # IndexedDB con Dexie.js
│   ├── sync/            # Sincronización y resolución de conflictos
│   ├── business/        # Lógica de negocio (cálculos, validaciones)
│   ├── services/        # Servicios (GPS, cámara, encriptación)
│   └── validation/      # Esquemas Zod
├── routes/              # Páginas de la aplicación
├── components/          # Componentes reutilizables
├── stores/              # Svelte stores (estado global)
├── types/               # Tipos TypeScript
└── utils/               # Utilidades
```

## 📖 Documentación

Ver carpeta `specs/pwa-microcreditos-offline/` para:
- `requirements.md` - Requisitos completos
- `design.md` - Diseño técnico detallado
- `tasks.md` - Plan de implementación

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

## 🚢 Deployment

El proyecto está configurado para deployment automático en Vercel:

```bash
# Deploy a producción
vercel --prod
```

## 📄 Licencia

[Especificar licencia]

## 👥 Equipo

[Tu nombre/equipo]

---

**Estado**: En desarrollo - Fase 1 completada ✅
