# Guía de Contribución - Sync Platform

¡Gracias por tu interés en contribuir a Sync Platform! Esta guía te ayudará a entender cómo
participar en el desarrollo del proyecto.

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [Cómo Contribuir](#cómo-contribuir)
- [Configuración del Entorno](#configuración-del-entorno)
- [Flujo de Desarrollo](#flujo-de-desarrollo)
- [Estándares de Código](#estándares-de-código)
- [Testing](#testing)
- [Documentación](#documentación)
- [Proceso de Review](#proceso-de-review)

## 🤝 Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este
código. Por favor reporta comportamientos inaceptables.

### Nuestros Valores

- **Respeto**: Tratamos a todos con respeto y dignidad
- **Inclusión**: Valoramos la diversidad y creamos un ambiente inclusivo
- **Colaboración**: Trabajamos juntos hacia objetivos comunes
- **Excelencia**: Nos esforzamos por la calidad en todo lo que hacemos
- **Transparencia**: Comunicamos abierta y honestamente

## 🚀 Cómo Contribuir

### Tipos de Contribuciones

Valoramos todos los tipos de contribuciones:

- 🐛 **Bug Reports**: Reportar problemas o errores
- ✨ **Feature Requests**: Sugerir nuevas funcionalidades
- 📝 **Documentación**: Mejorar o agregar documentación
- 🧪 **Testing**: Agregar o mejorar tests
- 🔧 **Code**: Implementar features o fixes
- 🎨 **UI/UX**: Mejorar la experiencia de usuario
- 🌐 **Traducción**: Agregar soporte para nuevos idiomas

### Antes de Empezar

1. **Busca issues existentes** para evitar duplicados
2. **Discute cambios grandes** creando un issue primero
3. **Lee la documentación** para entender la arquitectura
4. **Configura tu entorno** siguiendo esta guía

## ⚙️ Configuración del Entorno

### Prerrequisitos

- **Node.js** >= 18.0.0
- **pnpm** >= 8.0.0
- **Git** >= 2.30.0

### Setup Inicial

```bash
# 1. Fork el repositorio en GitHub
# 2. Clonar tu fork
git clone https://github.com/TU_USERNAME/sync.git
cd sync

# 3. Agregar upstream remote
git remote add upstream https://github.com/fbetancur/sync.git

# 4. Instalar dependencias
pnpm install

# 5. Configurar variables de entorno
cp .env.example .env.local
cp apps/credisync/.env.example apps/credisync/.env.local

# 6. Validar configuración
pnpm validate-env
pnpm test
```

### Verificar Setup

```bash
# Ejecutar tests
pnpm test

# Iniciar desarrollo
pnpm dev:credisync

# Verificar linting
pnpm lint-fix --check
```

## 🔄 Flujo de Desarrollo

### 1. Crear Branch

```bash
# Actualizar main
git checkout main
git pull upstream main

# Crear branch para tu feature/fix
git checkout -b feature/descripcion-corta
# o
git checkout -b fix/descripcion-del-bug
```

### 2. Desarrollo

```bash
# Desarrollar con hot reload
pnpm dev:credisync

# Ejecutar tests en watch mode
pnpm --filter credisync test:watch

# Lint y format automático
pnpm lint-fix --fix --format
```

### 3. Commits

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Ejemplos de commits
git commit -m "feat: agregar autenticación biométrica"
git commit -m "fix: corregir error de sincronización offline"
git commit -m "docs: actualizar guía de instalación"
git commit -m "test: agregar tests para sync-manager"
git commit -m "refactor: optimizar algoritmo de resolución de conflictos"
```

#### Tipos de Commit

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (no afectan lógica)
- `refactor`: Refactoring de código
- `test`: Agregar o modificar tests
- `chore`: Tareas de mantenimiento
- `perf`: Mejoras de performance
- `ci`: Cambios en CI/CD

### 4. Pre-commit Validation

El proyecto tiene hooks automáticos que validan:

- ✅ Linting (ESLint)
- ✅ Formatting (Prettier)
- ✅ Tests de workspaces afectados
- ✅ Variables de entorno
- ✅ Consistencia de package.json

```bash
# Si los hooks fallan, arregla los problemas:
pnpm lint-fix --fix --format
pnpm test
pnpm validate-env
```

### 5. Push y Pull Request

```bash
# Push a tu fork
git push origin feature/descripcion-corta

# Crear PR en GitHub con:
# - Título descriptivo
# - Descripción detallada
# - Screenshots si aplica
# - Referencias a issues relacionados
```

## 📏 Estándares de Código

### TypeScript

```typescript
// ✅ Bueno
interface UserConfig {
  id: string;
  email: string;
  preferences: UserPreferences;
}

function createUser(config: UserConfig): Promise<User> {
  // Implementación
}

// ❌ Evitar
function createUser(config: any): any {
  // Implementación
}
```

### Svelte Components

```svelte
<!-- ✅ Bueno -->
<script lang="ts">
  import type { User } from '@sync/types';

  export let user: User;
  export let onEdit: (user: User) => void = () => {};

  $: displayName = user.firstName + ' ' + user.lastName;
</script>

<div class="user-card">
  <h3>{displayName}</h3>
  <button on:click={() => onEdit(user)}> Edit </button>
</div>

<style>
  .user-card {
    padding: 1rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.5rem;
  }
</style>
```

### Naming Conventions

- **Files**: `kebab-case.ts`, `PascalCase.svelte`
- **Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Types/Interfaces**: `PascalCase`
- **Functions**: `camelCase`
- **Classes**: `PascalCase`

### Code Organization

```typescript
// 1. Imports externos
import { writable } from 'svelte/store';
import { supabase } from '@supabase/supabase-js';

// 2. Imports internos
import { SyncManager } from '@sync/core';
import type { User, SyncConfig } from '@sync/types';

// 3. Tipos locales
interface LocalConfig {
  // ...
}

// 4. Constantes
const DEFAULT_CONFIG: SyncConfig = {
  // ...
};

// 5. Implementación
export class UserService {
  // ...
}
```

## 🧪 Testing

### Estrategia de Testing

1. **Unit Tests**: Funciones y clases individuales
2. **Integration Tests**: Interacción entre módulos
3. **Component Tests**: Componentes Svelte
4. **E2E Tests**: Flujos completos de usuario

### Escribir Tests

```typescript
// tests/sync-manager.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SyncManager } from '../src/sync-manager';

describe('SyncManager', () => {
  let syncManager: SyncManager;

  beforeEach(() => {
    syncManager = new SyncManager({
      apiUrl: 'http://localhost:3000'
    });
  });

  describe('syncData', () => {
    it('should sync data successfully', async () => {
      // Arrange
      const mockData = { id: '1', name: 'Test' };

      // Act
      const result = await syncManager.syncData(mockData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockData);
    });

    it('should handle sync errors', async () => {
      // Arrange
      const invalidData = null;

      // Act & Assert
      await expect(syncManager.syncData(invalidData)).rejects.toThrow('Invalid data');
    });
  });
});
```

### Component Testing

```typescript
// tests/Button.test.ts
import { render, fireEvent } from '@testing-library/svelte';
import { describe, it, expect, vi } from 'vitest';
import Button from '../src/Button.svelte';

describe('Button Component', () => {
  it('should render with correct text', () => {
    const { getByText } = render(Button, {
      props: { text: 'Click me' }
    });

    expect(getByText('Click me')).toBeInTheDocument();
  });

  it('should emit click event', async () => {
    const handleClick = vi.fn();
    const { getByRole } = render(Button, {
      props: {
        text: 'Click me',
        onClick: handleClick
      }
    });

    await fireEvent.click(getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });
});
```

### Coverage Requirements

- **Packages**: Mínimo 80% coverage
- **Apps**: Mínimo 70% coverage
- **Critical paths**: 100% coverage

```bash
# Ejecutar tests con coverage
pnpm test --coverage

# Ver reporte de coverage
open coverage/index.html
```

## 📚 Documentación

### Tipos de Documentación

1. **Code Comments**: Para lógica compleja
2. **JSDoc**: Para APIs públicas
3. **README**: Para packages y apps
4. **Guides**: Para workflows y procesos
5. **API Docs**: Para endpoints y interfaces

### JSDoc Standards

````typescript
/**
 * Sincroniza datos entre cliente y servidor
 *
 * @param data - Los datos a sincronizar
 * @param options - Opciones de configuración
 * @returns Promise que resuelve con el resultado de la sincronización
 *
 * @example
 * ```typescript
 * const result = await syncManager.syncData(
 *   { id: '1', name: 'Test' },
 *   { retries: 3 }
 * );
 * ```
 */
async syncData(
  data: SyncData,
  options: SyncOptions = {}
): Promise<SyncResult> {
  // Implementación
}
````

### README Template

```markdown
# Package/App Name

Brief description of what this package/app does.

## Installation

\`\`\`bash pnpm add @sync/package-name \`\`\`

## Usage

\`\`\`typescript import { FeatureName } from '@sync/package-name';

const feature = new FeatureName(); await feature.doSomething(); \`\`\`

## API Reference

### ClassName

#### Methods

- `method(param: Type): ReturnType` - Description

## Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md)
```

## 🔍 Proceso de Review

### Checklist para PRs

#### Autor del PR

- [ ] Código sigue los estándares del proyecto
- [ ] Tests agregados/actualizados
- [ ] Documentación actualizada
- [ ] Commits siguen conventional commits
- [ ] CI/CD pasa exitosamente
- [ ] PR tiene descripción clara
- [ ] Screenshots incluidos (si aplica)

#### Reviewer

- [ ] Código es legible y mantenible
- [ ] Lógica es correcta y eficiente
- [ ] Tests cubren casos importantes
- [ ] No hay vulnerabilidades de seguridad
- [ ] Performance es aceptable
- [ ] Documentación es clara
- [ ] Cambios son backwards compatible

### Tipos de Review

1. **Code Review**: Revisar lógica y calidad
2. **Design Review**: Revisar arquitectura y patrones
3. **Security Review**: Revisar vulnerabilidades
4. **Performance Review**: Revisar impacto en performance

### Feedback Guidelines

#### Dar Feedback

- 🎯 **Específico**: Señala líneas exactas
- 🤝 **Constructivo**: Sugiere mejoras
- 📚 **Educativo**: Explica el "por qué"
- 🎨 **Balanceado**: Reconoce lo bueno también

```markdown
# ✅ Buen feedback

En línea 45: Considera usar `Promise.all()` aquí para mejorar performance cuando las operaciones son
independientes.

# ❌ Feedback poco útil

Este código está mal.
```

#### Recibir Feedback

- 🧠 **Mente abierta**: Considera todas las sugerencias
- 🤔 **Pregunta**: Si no entiendes algo
- 🙏 **Agradece**: El tiempo del reviewer es valioso
- 🔄 **Itera**: Haz cambios y solicita re-review

## 🏷️ Release Process

### Semantic Versioning

- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (0.1.0): New features (backwards compatible)
- **PATCH** (0.0.1): Bug fixes

### Release Checklist

- [ ] Todos los tests pasan
- [ ] Documentación actualizada
- [ ] CHANGELOG.md actualizado
- [ ] Version bumped en package.json
- [ ] Tag creado en Git
- [ ] Release notes escritas

## 🆘 Obtener Ayuda

### Canales de Comunicación

1. **GitHub Issues**: Para bugs y feature requests
2. **GitHub Discussions**: Para preguntas generales
3. **Discord/Slack**: Para chat en tiempo real (si aplica)
4. **Email**: Para temas sensibles

### Recursos Útiles

- [Documentación del Proyecto](./docs/)
- [Guía de Desarrollo](./docs/development/)
- [API Reference](./docs/api/)
- [Troubleshooting](./docs/troubleshooting/)

## 🎉 Reconocimientos

Agradecemos a todos los contribuidores que hacen posible este proyecto:

- Mantainers principales
- Contributors regulares
- Reportadores de bugs
- Escritores de documentación
- Testers de la comunidad

### Cómo ser Reconocido

- Contribuciones aparecen en el changelog
- Contributors listados en README
- Reconocimiento especial para contribuciones significativas

---

¡Gracias por contribuir a Sync Platform! Juntos estamos construyendo algo increíble. 🚀

## 📞 Contacto

- **Maintainer**: [fbetancur](https://github.com/fbetancur)
- **Email**: [email@example.com]
- **Website**: [syncplatform.dev]

---

_Esta guía está en constante evolución. Si tienes sugerencias para mejorarla, ¡no dudes en
contribuir!_
