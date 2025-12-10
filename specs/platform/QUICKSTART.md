# Quick Start Guide

# PWA Offline-First para Gestión de Microcréditos

## 🚀 Inicio Rápido (5 minutos)

### 1. Clonar y Setup Inicial

```bash
# Crear proyecto Svelte con TypeScript
npm create vite@latest microcreditos-pwa -- --template svelte-ts
cd microcreditos-pwa

# Instalar dependencias core
npm install dexie dexie-svelte-hooks
npm install @supabase/supabase-js
npm install zod
npm install tailwindcss daisyui
npm install -D vite-plugin-pwa workbox-window

# Instalar dev dependencies
npm install -D vitest @testing-library/svelte
npm install -D @playwright/test
npm install -D eslint prettier
npm install -D @sentry/svelte
```

### 2. Configurar Supabase

```bash
# Ir a supabase.com y crear proyecto
# Copiar URL y anon key
# Crear archivo .env.local
```

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJxxx...
```

### 3. Configurar Vercel

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login y link proyecto
vercel login
vercel link
```

### 4. Primer Commit

```bash
git init
git add .
git commit -m "feat: initial project setup"
git push
```

## 📚 Próximos Pasos

1. **Leer Documentación**:
   - `requirements.md` - Entender qué construir
   - `design.md` - Entender cómo construirlo
   - `tasks.md` - Saber qué hacer primero

2. **Comenzar Implementación**:
   - Seguir `tasks.md` desde Phase 1
   - Marcar tareas completadas
   - Hacer commits frecuentes

3. **Testing Continuo**:
   - Escribir tests mientras desarrollas
   - Ejecutar `npm test` frecuentemente
   - Mantener coverage > 80%

## 🎯 Primera Tarea: Setup Database

```typescript
// src/lib/db/index.ts
import Dexie, { type Table } from 'dexie';

export class MicrocreditosDB extends Dexie {
  pagos!: Table<Pago>;
  clientes!: Table<Cliente>;
  creditos!: Table<Credito>;

  constructor() {
    super('microcreditos_db');
    this.version(1).stores({
      pagos: 'id, tenant_id, credito_id, fecha, synced',
      clientes: 'id, tenant_id, numero_documento',
      creditos: 'id, tenant_id, cliente_id, estado'
    });
  }
}

export const db = new MicrocreditosDB();
```

## ✅ Checklist Diario

- [ ] Leer task del día en `tasks.md`
- [ ] Implementar funcionalidad
- [ ] Escribir tests
- [ ] Ejecutar tests: `npm test`
- [ ] Commit cambios
- [ ] Actualizar task: `- [x]`
- [ ] Push a Git

## 📞 ¿Necesitas Ayuda?

1. **Requisitos no claros**: Ver `requirements.md`
2. **Decisión técnica**: Ver `design.md`
3. **Orden de tareas**: Ver `tasks.md`
4. **Ejemplos de código**: Ver `design.md` sección "Components and Interfaces"

## 🎓 Recursos Útiles

- [Svelte Tutorial](https://svelte.dev/tutorial)
- [Dexie.js Docs](https://dexie.org)
- [Supabase Docs](https://supabase.com/docs)
- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**¡Éxito en tu implementación!** 🚀
