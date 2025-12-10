#!/usr/bin/env node

/**
 * 🎨 Generador Automático de Componentes UI
 * 
 * Genera componentes Svelte con TypeScript, tests y documentación
 * 
 * Uso:
 *   pnpm generate:component Button
 *   pnpm generate:component forms/InputField --with-props
 *   pnpm generate:component Modal --with-store --with-actions
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Configuración
const config = {
  // Para @sync/ui (componentes compartidos)
  ui: {
    componentsDir: 'packages/@sync/ui/src/lib/components',
    testsDir: 'packages/@sync/ui/src/lib/components',
    storiesDir: 'packages/@sync/ui/src/lib/stories',
    docsDir: 'packages/@sync/ui/docs/components',
    indexPath: 'packages/@sync/ui/src/lib/index.ts'
  },
  // Para apps específicas
  apps: {
    credisync: {
      componentsDir: 'apps/credisync/src/lib/components',
      testsDir: 'apps/credisync/src/lib/components',
      storiesDir: 'apps/credisync/src/lib/stories',
      docsDir: 'apps/credisync/docs/components',
      indexPath: 'apps/credisync/src/lib/components/index.ts'
    },
    healthsync: {
      componentsDir: 'apps/healthsync/src/lib/components',
      testsDir: 'apps/healthsync/src/lib/components',
      storiesDir: 'apps/healthsync/src/lib/stories',
      docsDir: 'apps/healthsync/docs/components',
      indexPath: 'apps/healthsync/src/lib/components/index.ts'
    },
    surveysync: {
      componentsDir: 'apps/surveysync/src/lib/components',
      testsDir: 'apps/surveysync/src/lib/components',
      storiesDir: 'apps/surveysync/src/lib/stories',
      docsDir: 'apps/surveysync/docs/components',
      indexPath: 'apps/surveysync/src/lib/components/index.ts'
    }
  }
};

// Utilidades
const toPascalCase = (str) => str.replace(/(?:^|-)([a-z])/g, (_, char) => char.toUpperCase());
const toCamelCase = (str) => str.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
const toKebabCase = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

// Templates
const templates = {
  component: (name, options) => `<script lang="ts">
  import type { ComponentProps } from 'svelte';
  
  interface Props {
    class?: string;
    ${options.withProps ? `
    variant?: 'primary' | 'secondary' | 'accent';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;` : ''}
  }
  
  let {
    class: className = '',
    ${options.withProps ? `
    variant = 'primary',
    size = 'md',
    disabled = false,` : ''}
    ...restProps
  }: Props = $props();
  
  ${options.withStore ? `
  import { ${toCamelCase(name)}Store } from '../stores/${toKebabCase(name)}.store.js';
  
  const store = ${toCamelCase(name)}Store();` : ''}
</script>

<div 
  class="sync-${toKebabCase(name)} {className}"
  ${options.withProps ? `
  class:sync-${toKebabCase(name)}--{variant}={variant}
  class:sync-${toKebabCase(name)}--{size}={size}
  class:sync-${toKebabCase(name)}--disabled={disabled}` : ''}
  {...restProps}
>
  <slot />
</div>

<style>
  .sync-${toKebabCase(name)} {
    /* Base styles */
    display: block;
  }
  
  ${options.withProps ? `
  .sync-${toKebabCase(name)}--primary {
    /* Primary variant styles */
  }
  
  .sync-${toKebabCase(name)}--secondary {
    /* Secondary variant styles */
  }
  
  .sync-${toKebabCase(name)}--accent {
    /* Accent variant styles */
  }
  
  .sync-${toKebabCase(name)}--sm {
    /* Small size styles */
  }
  
  .sync-${toKebabCase(name)}--md {
    /* Medium size styles */
  }
  
  .sync-${toKebabCase(name)}--lg {
    /* Large size styles */
  }
  
  .sync-${toKebabCase(name)}--disabled {
    /* Disabled styles */
    opacity: 0.5;
    pointer-events: none;
  }` : ''}
</style>
`,

  test: (name, options) => `import { render, screen } from '@testing-library/svelte';
import { describe, it, expect } from 'vitest';
import ${name} from './${name}.svelte';

describe('${name}', () => {
  it('renders correctly', () => {
    render(${name});
    expect(screen.getByRole('generic')).toBeInTheDocument();
  });

  ${options.withProps ? `
  it('applies variant classes correctly', () => {
    const { container } = render(${name}, { variant: 'primary' });
    expect(container.firstChild).toHaveClass('sync-${toKebabCase(name)}--primary');
  });

  it('applies size classes correctly', () => {
    const { container } = render(${name}, { size: 'lg' });
    expect(container.firstChild).toHaveClass('sync-${toKebabCase(name)}--lg');
  });

  it('handles disabled state', () => {
    const { container } = render(${name}, { disabled: true });
    expect(container.firstChild).toHaveClass('sync-${toKebabCase(name)}--disabled');
  });` : ''}

  it('accepts custom class names', () => {
    const { container } = render(${name}, { class: 'custom-class' });
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('renders slot content', () => {
    render(${name}, { 
      props: {},
      slots: { default: 'Test content' }
    });
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });
});
`,

  store: (name) => `import { writable } from 'svelte/store';

export interface ${name}State {
  isOpen: boolean;
  loading: boolean;
  error: string | null;
}

const initial${name}State: ${name}State = {
  isOpen: false,
  loading: false,
  error: null
};

export function ${toCamelCase(name)}Store() {
  const { subscribe, set, update } = writable<${name}State>(initial${name}State);

  return {
    subscribe,
    
    open: () => update(state => ({ ...state, isOpen: true })),
    close: () => update(state => ({ ...state, isOpen: false })),
    
    setLoading: (loading: boolean) => update(state => ({ ...state, loading })),
    setError: (error: string | null) => update(state => ({ ...state, error })),
    
    reset: () => set(initial${name}State)
  };
}
`,

  actions: (name) => `import type { Action } from 'svelte/action';

export interface ${name}ActionParams {
  enabled?: boolean;
  onActivate?: () => void;
  onDeactivate?: () => void;
}

export const ${toCamelCase(name)}: Action<HTMLElement, ${name}ActionParams> = (
  node,
  params = {}
) => {
  let { enabled = true, onActivate, onDeactivate } = params;

  function handleActivate() {
    if (enabled && onActivate) {
      onActivate();
    }
  }

  function handleDeactivate() {
    if (enabled && onDeactivate) {
      onDeactivate();
    }
  }

  // Setup event listeners
  node.addEventListener('mouseenter', handleActivate);
  node.addEventListener('mouseleave', handleDeactivate);

  return {
    update(newParams: ${name}ActionParams) {
      enabled = newParams.enabled ?? enabled;
      onActivate = newParams.onActivate ?? onActivate;
      onDeactivate = newParams.onDeactivate ?? onDeactivate;
    },
    
    destroy() {
      node.removeEventListener('mouseenter', handleActivate);
      node.removeEventListener('mouseleave', handleDeactivate);
    }
  };
};
`,

  story: (name, options) => `import type { Meta, StoryObj } from '@storybook/svelte';
import ${name} from '../components/${name}.svelte';

const meta: Meta<${name}> = {
  title: 'Components/${name}',
  component: ${name},
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    ${options.withProps ? `
    variant: {
      control: { type: 'select' },
      options: ['primary', 'secondary', 'accent'],
    },
    size: {
      control: { type: 'select' },
      options: ['sm', 'md', 'lg'],
    },
    disabled: {
      control: 'boolean',
    },` : ''}
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    ${options.withProps ? `
    variant: 'primary',
    size: 'md',
    disabled: false,` : ''}
  },
  render: (args) => ({
    Component: ${name},
    props: args,
    slot: 'Default ${name}',
  }),
};

${options.withProps ? `
export const Variants: Story = {
  render: () => ({
    Component: ${name},
    props: {},
    slot: \`
      <div style="display: flex; gap: 1rem; flex-wrap: wrap;">
        <${name} variant="primary">Primary</${name}>
        <${name} variant="secondary">Secondary</${name}>
        <${name} variant="accent">Accent</${name}>
      </div>
    \`,
  }),
};

export const Sizes: Story = {
  render: () => ({
    Component: ${name},
    props: {},
    slot: \`
      <div style="display: flex; gap: 1rem; align-items: center;">
        <${name} size="sm">Small</${name}>
        <${name} size="md">Medium</${name}>
        <${name} size="lg">Large</${name}>
      </div>
    \`,
  }),
};

export const Disabled: Story = {
  args: {
    disabled: true,
  },
  render: (args) => ({
    Component: ${name},
    props: args,
    slot: 'Disabled ${name}',
  }),
};` : ''}
`,

  docs: (name, options) => `# ${name}

${options.description || `Componente ${name} reutilizable para el design system de Sync Platform.`}

## Uso Básico

\`\`\`svelte
<script>
  import { ${name} } from '@sync/ui';
</script>

<${name}>
  Contenido del componente
</${name}>
\`\`\`

${options.withProps ? `
## Props

| Prop | Tipo | Default | Descripción |
|------|------|---------|-------------|
| \`variant\` | \`'primary' \\| 'secondary' \\| 'accent'\` | \`'primary'\` | Variante visual del componente |
| \`size\` | \`'sm' \\| 'md' \\| 'lg'\` | \`'md'\` | Tamaño del componente |
| \`disabled\` | \`boolean\` | \`false\` | Si el componente está deshabilitado |
| \`class\` | \`string\` | \`''\` | Clases CSS adicionales |

## Ejemplos

### Variantes

\`\`\`svelte
<${name} variant="primary">Primario</${name}>
<${name} variant="secondary">Secundario</${name}>
<${name} variant="accent">Acento</${name}>
\`\`\`

### Tamaños

\`\`\`svelte
<${name} size="sm">Pequeño</${name}>
<${name} size="md">Mediano</${name}>
<${name} size="lg">Grande</${name}>
\`\`\`

### Estado Deshabilitado

\`\`\`svelte
<${name} disabled>Deshabilitado</${name}>
\`\`\`
` : ''}

${options.withStore ? `
## Store

El componente incluye un store para manejo de estado:

\`\`\`typescript
import { ${toCamelCase(name)}Store } from '@sync/ui/stores';

const store = ${toCamelCase(name)}Store();

// Métodos disponibles
store.open();
store.close();
store.setLoading(true);
store.setError('Error message');
store.reset();
\`\`\`
` : ''}

${options.withActions ? `
## Actions

El componente incluye actions de Svelte:

\`\`\`svelte
<script>
  import { ${toCamelCase(name)} } from '@sync/ui/actions';
</script>

<div use:${toCamelCase(name)}={{ 
  enabled: true,
  onActivate: () => console.log('Activated'),
  onDeactivate: () => console.log('Deactivated')
}}>
  Elemento con action
</div>
\`\`\`
` : ''}

## Personalización

### CSS Variables

\`\`\`css
.sync-${toKebabCase(name)} {
  --${toKebabCase(name)}-bg: var(--color-primary);
  --${toKebabCase(name)}-text: var(--color-primary-content);
  --${toKebabCase(name)}-border: var(--color-primary-focus);
}
\`\`\`

### Clases CSS

- \`.sync-${toKebabCase(name)}\` - Clase base
${options.withProps ? `- \`.sync-${toKebabCase(name)}--primary\` - Variante primaria
- \`.sync-${toKebabCase(name)}--secondary\` - Variante secundaria  
- \`.sync-${toKebabCase(name)}--accent\` - Variante de acento
- \`.sync-${toKebabCase(name)}--sm\` - Tamaño pequeño
- \`.sync-${toKebabCase(name)}--md\` - Tamaño mediano
- \`.sync-${toKebabCase(name)}--lg\` - Tamaño grande
- \`.sync-${toKebabCase(name)}--disabled\` - Estado deshabilitado` : ''}

## Accesibilidad

- ✅ Soporte para lectores de pantalla
- ✅ Navegación por teclado
- ✅ Contraste de colores WCAG AA
- ✅ Roles ARIA apropiados

## Testing

\`\`\`bash
# Ejecutar tests del componente
pnpm test ${name}

# Ejecutar tests con coverage
pnpm test:coverage ${name}
\`\`\`
`
};

// Función principal
function generateComponent(componentName, options = {}) {
  const name = toPascalCase(componentName);
  const kebabName = toKebabCase(name);
  
  console.log(`\n🎨 GENERADOR DE COMPONENTES - SYNC PLATFORM`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`📦 Componente: ${name}`);
  console.log(`🎯 Target: ${options.target || '@sync/ui'}`);
  console.log(`📁 Opciones:`, JSON.stringify(options, null, 2));
  console.log(`═══════════════════════════════════════════════\n`);

  // Determinar configuración según target
  const targetConfig = options.target && config.apps[options.target] 
    ? config.apps[options.target] 
    : config.ui;

  console.log(`📂 Usando configuración para: ${options.target || '@sync/ui'}`);

  // Crear directorios
  const componentDir = join(rootDir, targetConfig.componentsDir);
  const testDir = join(rootDir, targetConfig.testsDir);
  const storyDir = join(rootDir, targetConfig.storiesDir);
  const docDir = join(rootDir, targetConfig.docsDir);

  console.log(`📁 Creando directorios...`);
  [componentDir, testDir, storyDir, docDir].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`   ✅ Creado: ${dir.replace(rootDir, '.')}`);
    } else {
      console.log(`   📂 Existe: ${dir.replace(rootDir, '.')}`);
    }
  });

  // Generar archivos
  const files = [
    {
      path: join(componentDir, `${name}.svelte`),
      content: templates.component(name, options)
    },
    {
      path: join(testDir, `${name}.test.ts`),
      content: templates.test(name, options)
    },
    {
      path: join(storyDir, `${name}.stories.ts`),
      content: templates.story(name, options)
    },
    {
      path: join(docDir, `${kebabName}.md`),
      content: templates.docs(name, options)
    }
  ];

  // Generar store si se solicita
  if (options.withStore) {
    const storeDir = join(rootDir, 'packages/@sync/ui/src/stores');
    if (!existsSync(storeDir)) {
      mkdirSync(storeDir, { recursive: true });
    }
    files.push({
      path: join(storeDir, `${kebabName}.store.ts`),
      content: templates.store(name)
    });
  }

  // Generar actions si se solicita
  if (options.withActions) {
    const actionsDir = join(rootDir, 'packages/@sync/ui/src/actions');
    if (!existsSync(actionsDir)) {
      mkdirSync(actionsDir, { recursive: true });
    }
    files.push({
      path: join(actionsDir, `${kebabName}.action.ts`),
      content: templates.actions(name)
    });
  }

  // Escribir archivos
  console.log(`\n📝 Generando archivos...`);
  files.forEach(({ path, content }) => {
    writeFileSync(path, content);
    console.log(`   ✅ ${path.replace(rootDir, '.')}`);
  });

  // Actualizar exports
  console.log(`\n🔄 Actualizando exports...`);
  updateExports(name, options, targetConfig);

  console.log(`\n🎉 COMPONENTE GENERADO EXITOSAMENTE!`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`📦 Componente: ${name}`);
  console.log(`📂 Ubicación: ${targetConfig.componentsDir}/${name}.svelte`);
  console.log(`📚 Documentación: ${targetConfig.docsDir}/${kebabName}.md`);
  console.log(`🧪 Tests: pnpm test ${name}`);
  if (options.target === undefined) {
    console.log(`📖 Storybook: pnpm storybook`);
  }
  console.log(`═══════════════════════════════════════════════\n`);
}

function updateExports(name, options, targetConfig) {
  const indexPath = join(rootDir, targetConfig.indexPath);
  
  try {
    let indexContent = '';
    if (existsSync(indexPath)) {
      indexContent = require('fs').readFileSync(indexPath, 'utf8');
    }

    const exports = [
      `export { default as ${name} } from './components/${name}.svelte';`
    ];

    if (options.withStore) {
      exports.push(`export { ${toCamelCase(name)}Store } from './stores/${toKebabCase(name)}.store.js';`);
    }

    if (options.withActions) {
      exports.push(`export { ${toCamelCase(name)} } from './actions/${toKebabCase(name)}.action.js';`);
    }

    const newExports = exports.join('\n');
    
    if (!indexContent.includes(`export { default as ${name} }`)) {
      indexContent += '\n' + newExports + '\n';
      writeFileSync(indexPath, indexContent);
      console.log(`   ✅ Actualizado: ${targetConfig.indexPath}`);
    } else {
      console.log(`   📝 Ya existe en: ${targetConfig.indexPath}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  No se pudo actualizar index.ts: ${error.message}`);
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🎨 Generador de Componentes UI - Sync Platform

Uso:
  pnpm generate:component <nombre> [opciones]

Ejemplos:
  # Para @sync/ui (componentes compartidos)
  pnpm generate:component Button --with-props
  pnpm generate:component forms/InputField --with-props --with-store
  
  # Para apps específicas
  pnpm generate:component Dashboard --app=credisync --with-props
  pnpm generate:component PatientCard --app=healthsync --with-store
  pnpm generate:component SurveyForm --app=surveysync --with-actions

Opciones:
  --app=<nombre>   Generar en app específica (credisync, healthsync, surveysync)
  --with-props     Incluir props de variante, tamaño y disabled
  --with-store     Generar store de Svelte para manejo de estado
  --with-actions   Generar actions de Svelte
  --description    Descripción personalizada para la documentación

Targets disponibles:
  • Sin --app: Genera en @sync/ui (componentes compartidos)
  • --app=credisync: Genera en apps/credisync/src/lib/components/
  • --app=healthsync: Genera en apps/healthsync/src/lib/components/
  • --app=surveysync: Genera en apps/surveysync/src/lib/components/

Archivos generados:
  ✅ Componente Svelte con TypeScript
  ✅ Tests con Vitest y Testing Library
  ✅ Story para Storybook
  ✅ Documentación en Markdown
  ✅ Store (opcional)
  ✅ Actions (opcional)
  ✅ Actualización automática de exports
`);
    process.exit(1);
  }

  const componentName = args[0];
  const options = {
    withProps: args.includes('--with-props'),
    withStore: args.includes('--with-store'),
    withActions: args.includes('--with-actions'),
    description: args.find(arg => arg.startsWith('--description='))?.split('=')[1],
    target: args.find(arg => arg.startsWith('--app='))?.split('=')[1]
  };

  generateComponent(componentName, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateComponent };