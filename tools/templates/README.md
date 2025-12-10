# 📋 Templates - Sync Platform

Este directorio contiene templates utilizados por las herramientas de generación automática del monorepo.

## 📁 Estructura

```
tools/templates/
├── component/          # Templates para componentes UI
│   ├── Component.svelte.template
│   ├── Component.test.ts.template
│   ├── Component.stories.ts.template
│   └── component.md.template
├── service/           # Templates para services
│   ├── Service.ts.template
│   ├── Service.test.ts.template
│   ├── Service.interface.ts.template
│   └── service.md.template
├── app/              # Templates para nuevas apps
│   ├── package.json.template
│   ├── vite.config.ts.template
│   └── README.md.template
└── package/          # Templates para packages
    ├── package.json.template
    ├── tsconfig.json.template
    └── README.md.template
```

## 🎨 Uso de Templates

Los templates utilizan un sistema de variables que son reemplazadas automáticamente por las herramientas de generación:

### Variables Comunes

- `{{NAME}}` - Nombre en PascalCase (ej: `UserProfile`)
- `{{name}}` - Nombre en camelCase (ej: `userProfile`)
- `{{kebab-name}}` - Nombre en kebab-case (ej: `user-profile`)
- `{{DESCRIPTION}}` - Descripción del componente/service
- `{{TIMESTAMP}}` - Timestamp de generación
- `{{AUTHOR}}` - Autor (desde git config)

### Variables Específicas de Componentes

- `{{WITH_PROPS}}` - Si incluye props avanzadas
- `{{WITH_STORE}}` - Si incluye store de Svelte
- `{{WITH_ACTIONS}}` - Si incluye actions de Svelte

### Variables Específicas de Services

- `{{WITH_EVENTS}}` - Si incluye EventEmitter
- `{{WITH_CACHE}}` - Si incluye sistema de cache
- `{{WITH_QUEUE}}` - Si incluye cola de tareas

## 🔧 Personalización

Para personalizar los templates:

1. **Edita templates existentes**: Modifica los archivos `.template`
2. **Añade nuevos templates**: Crea nuevos archivos siguiendo la convención
3. **Actualiza generadores**: Modifica los scripts en `tools/scripts/`

### Ejemplo de Template

```typescript
// Service.ts.template
import type { {{NAME}}Config } from '@sync/types';

/**
 * {{DESCRIPTION}}
 * 
 * @example
 * ```typescript
 * const {{name}} = new {{NAME}}(config);
 * await {{name}}.initialize();
 * ```
 */
export class {{NAME}} {
  private config: {{NAME}}Config;
  
  constructor(config: {{NAME}}Config) {
    this.config = config;
  }
  
  // ... resto del template
}
```

## 📚 Documentación

- [🎨 Generador de Componentes](../scripts/generate-component.js)
- [🔧 Generador de Services](../scripts/generate-service.js)
- [🛠️ Herramientas Avanzadas](../../docs/development/advanced-tools.md)

---

*Templates para generación automática de código en Sync Platform* 🚀