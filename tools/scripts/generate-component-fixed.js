#!/usr/bin/env node

/**
 * 🎨 Generador de Componentes - Sync Platform
 * 
 * Funciona como un relojito suizo ⚙️
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// 🎯 CONFIGURACIÓN PERFECTA
const config = {
  ui: {
    componentsDir: 'packages/@sync/ui/src/lib/components',
    testsDir: 'packages/@sync/ui/src/lib/components',
    indexPath: 'packages/@sync/ui/src/lib/index.ts'
  },
  credisync: {
    componentsDir: 'apps/credisync/src/lib/components',
    testsDir: 'apps/credisync/src/lib/components',
    indexPath: 'apps/credisync/src/lib/components/index.ts'
  }
};

// 🛠️ UTILIDADES
const toPascalCase = (str) => str.replace(/(?:^|-)([a-z])/g, (_, char) => char.toUpperCase());
const toKebabCase = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');

// 📝 TEMPLATES
const componentTemplate = (name, options) => `<script lang="ts">
  ${options.target === 'credisync' ? `
  // Usando stores de CrediSync con @sync/core
  import { app } from '../stores';
  import { crediSyncApp } from '../app-config';` : ''}
  
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
  
  ${options.target === 'credisync' ? `
  // Ejemplo de uso de @sync/core
  async function handleAction() {
    try {
      // Usar servicios de @sync/core
      const status = await crediSyncApp.getStatus();
      console.log('App status:', status);
      
      app.addNotification({
        type: 'success',
        title: '${name}',
        message: 'Acción ejecutada correctamente'
      });
    } catch (error) {
      app.addNotification({
        type: 'error',
        title: 'Error',
        message: 'No se pudo ejecutar la acción'
      });
    }
  }` : ''}
</script>

<div 
  class="sync-${toKebabCase(name)} {className}"
  ${options.withProps ? `
  class:sync-${toKebabCase(name)}--{variant}
  class:sync-${toKebabCase(name)}--{size}
  class:sync-${toKebabCase(name)}--disabled={disabled}` : ''}
  {...restProps}
>
  ${options.target === 'credisync' ? `
  <!-- Ejemplo de UI para CrediSync -->
  <div class="card bg-base-100 shadow-xl">
    <div class="card-body">
      <h2 class="card-title">${name}</h2>
      <p>${options.description || `Componente ${name} para CrediSync`}</p>
      <div class="card-actions justify-end">
        <button class="btn btn-primary" on:click={handleAction}>
          Acción
        </button>
      </div>
    </div>
  </div>` : `
  <!-- Componente base para @sync/ui -->
  <slot />`}
</div>

<style>
  .sync-${toKebabCase(name)} {
    display: block;
  }
  
  ${options.withProps ? `
  .sync-${toKebabCase(name)}--primary {
    --color: var(--color-primary);
  }
  
  .sync-${toKebabCase(name)}--secondary {
    --color: var(--color-secondary);
  }
  
  .sync-${toKebabCase(name)}--disabled {
    opacity: 0.5;
    pointer-events: none;
  }` : ''}
</style>
`;

const testTemplate = (name, options) => `import { render, screen } from '@testing-library/svelte';
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
  });` : ''}

  it('accepts custom class names', () => {
    const { container } = render(${name}, { class: 'custom-class' });
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
`;

// 🎨 FUNCIÓN PRINCIPAL
async function generateComponent(componentName, options = {}) {
  const name = toPascalCase(componentName);
  const kebabName = toKebabCase(name);
  
  console.log(`\n🎨 GENERADOR DE COMPONENTES - SYNC PLATFORM`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`📦 Componente: ${name}`);
  console.log(`🎯 Target: ${options.target || '@sync/ui'}`);
  console.log(`📝 Descripción: ${options.description || 'Sin descripción'}`);
  console.log(`⚙️  Opciones: ${JSON.stringify(options, null, 2)}`);
  console.log(`═══════════════════════════════════════════════\n`);

  // Determinar configuración
  const targetConfig = config[options.target] || config.ui;
  
  console.log(`📂 Configuración seleccionada:`);
  console.log(`   📁 Componentes: ${targetConfig.componentsDir}`);
  console.log(`   🧪 Tests: ${targetConfig.testsDir}`);
  console.log(`   📄 Index: ${targetConfig.indexPath}\n`);

  // Crear directorios
  console.log(`📁 Verificando directorios...`);
  const componentDir = join(rootDir, targetConfig.componentsDir);
  const testDir = join(rootDir, targetConfig.testsDir);
  
  [componentDir, testDir].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      console.log(`   ✅ Creado: ${dir.replace(rootDir, '.')}`);
    } else {
      console.log(`   📂 Existe: ${dir.replace(rootDir, '.')}`);
    }
  });

  // Generar archivos
  console.log(`\n📝 Generando archivos...`);
  
  const files = [
    {
      path: join(componentDir, `${name}.svelte`),
      content: componentTemplate(name, options),
      type: 'Componente'
    },
    {
      path: join(testDir, `${name}.test.ts`),
      content: testTemplate(name, options),
      type: 'Test'
    }
  ];

  files.forEach(({ path, content, type }) => {
    writeFileSync(path, content);
    console.log(`   ✅ ${type}: ${path.replace(rootDir, '.')}`);
  });

  // Actualizar exports
  console.log(`\n🔄 Actualizando exports...`);
  updateExports(name, targetConfig);

  console.log(`\n🎉 ¡COMPONENTE GENERADO EXITOSAMENTE!`);
  console.log(`═══════════════════════════════════════════════`);
  console.log(`📦 ${name} creado en ${options.target || '@sync/ui'}`);
  console.log(`📂 Ubicación: ${targetConfig.componentsDir}/${name}.svelte`);
  console.log(`🧪 Test: pnpm test ${name}`);
  console.log(`🚀 Listo para usar!`);
  console.log(`═══════════════════════════════════════════════\n`);
}

function updateExports(name, targetConfig) {
  const indexPath = join(rootDir, targetConfig.indexPath);
  
  try {
    // Crear index.ts si no existe
    let indexContent = '';
    if (existsSync(indexPath)) {
      indexContent = readFileSync(indexPath, 'utf8');
    } else {
      // Crear directorio si no existe
      const indexDir = dirname(indexPath);
      if (!existsSync(indexDir)) {
        mkdirSync(indexDir, { recursive: true });
      }
    }

    const exportLine = `export { default as ${name} } from './${name}.svelte';`;
    
    if (!indexContent.includes(`export { default as ${name} }`)) {
      indexContent += indexContent ? '\n' + exportLine : exportLine;
      writeFileSync(indexPath, indexContent);
      console.log(`   ✅ Export agregado: ${targetConfig.indexPath}`);
    } else {
      console.log(`   📝 Export ya existe: ${targetConfig.indexPath}`);
    }
  } catch (error) {
    console.warn(`   ⚠️  Error actualizando exports: ${error.message}`);
  }
}

// 🚀 CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help')) {
    console.log(`
🎨 GENERADOR DE COMPONENTES - SYNC PLATFORM

Uso:
  pnpm generate:component <nombre> [opciones]

Ejemplos:
  # Para @sync/ui (componentes compartidos)
  pnpm generate:component Button --with-props
  
  # Para CrediSync
  pnpm generate:component Dashboard --app=credisync --with-props
  pnpm generate:component ClientCard --app=credisync --description="Tarjeta de cliente"

Opciones:
  --app=credisync     Generar en apps/credisync/src/lib/components/
  --with-props        Incluir props de variante, tamaño y disabled
  --description="..."  Descripción del componente

🎯 Targets:
  • Sin --app: @sync/ui (componentes compartidos)
  • --app=credisync: CrediSync específico

⚙️  Funciona como un relojito suizo!
`);
    process.exit(0);
  }

  const componentName = args[0];
  const options = {
    target: args.find(arg => arg.startsWith('--app='))?.split('=')[1],
    withProps: args.includes('--with-props'),
    description: args.find(arg => arg.startsWith('--description='))?.split('=')[1]
  };

  generateComponent(componentName, options);
}

// Ejecutar si es llamado directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}