#!/usr/bin/env node

/**
 * 🔧 Generador Automático de Services
 * 
 * Genera services para @sync/core con TypeScript, tests y documentación
 * 
 * Uso:
 *   pnpm generate:service UserManager
 *   pnpm generate:service data/CacheService --with-interface
 *   pnpm generate:service NotificationService --with-events --with-config
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, mkdirSync, writeFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Configuración
const config = {
  servicesDir: 'packages/@sync/core/src/services',
  testsDir: 'packages/@sync/core/src/services',
  typesDir: 'packages/@sync/types/src',
  docsDir: 'packages/@sync/core/docs/services'
};

// Utilidades
const toPascalCase = (str) => str.replace(/(?:^|[-_])([a-z])/g, (_, char) => char.toUpperCase());
const toCamelCase = (str) => str.replace(/[-_]([a-z])/g, (_, char) => char.toUpperCase());
const toKebabCase = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '');
const toSnakeCase = (str) => str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');

// Templates
const templates = {
  service: (name, options) => `import type { ${name}Config, ${name}Events } from '@sync/types';
${options.withEvents ? `import { EventEmitter } from 'events';` : ''}

/**
 * ${name} - ${options.description || `Service para gestión de ${name.toLowerCase()}`}
 * 
 * @example
 * \`\`\`typescript
 * const ${toCamelCase(name)} = new ${name}(config);
 * await ${toCamelCase(name)}.initialize();
 * \`\`\`
 */
export class ${name}${options.withEvents ? ' extends EventEmitter' : ''} {
  private config: ${name}Config;
  private isInitialized = false;
  ${options.withCache ? `private cache = new Map<string, any>();` : ''}
  ${options.withQueue ? `private queue: Array<() => Promise<void>> = [];
  private processing = false;` : ''}

  constructor(config: ${name}Config) {
    ${options.withEvents ? 'super();' : ''}
    this.config = { ...this.getDefaultConfig(), ...config };
  }

  /**
   * Inicializa el service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      throw new Error('${name} ya está inicializado');
    }

    try {
      await this.setup();
      this.isInitialized = true;
      ${options.withEvents ? `this.emit('initialized');` : ''}
    } catch (error) {
      ${options.withEvents ? `this.emit('error', error);` : ''}
      throw new Error(\`Error inicializando ${name}: \${error.message}\`);
    }
  }

  /**
   * Finaliza el service y limpia recursos
   */
  async destroy(): Promise<void> {
    if (!this.isInitialized) {
      return;
    }

    try {
      await this.cleanup();
      ${options.withCache ? `this.cache.clear();` : ''}
      ${options.withQueue ? `this.queue = [];` : ''}
      this.isInitialized = false;
      ${options.withEvents ? `this.emit('destroyed');` : ''}
    } catch (error) {
      ${options.withEvents ? `this.emit('error', error);` : ''}
      throw new Error(\`Error finalizando ${name}: \${error.message}\`);
    }
  }

  /**
   * Verifica si el service está inicializado
   */
  get initialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Obtiene la configuración actual
   */
  getConfig(): Readonly<${name}Config> {
    return { ...this.config };
  }

  /**
   * Actualiza la configuración
   */
  updateConfig(newConfig: Partial<${name}Config>): void {
    this.config = { ...this.config, ...newConfig };
    ${options.withEvents ? `this.emit('configUpdated', this.config);` : ''}
  }

  ${options.withCache ? `
  /**
   * Obtiene un valor del cache
   */
  protected getCached<T>(key: string): T | undefined {
    return this.cache.get(key);
  }

  /**
   * Guarda un valor en el cache
   */
  protected setCached<T>(key: string, value: T, ttl?: number): void {
    this.cache.set(key, value);
    
    if (ttl) {
      setTimeout(() => {
        this.cache.delete(key);
      }, ttl);
    }
  }

  /**
   * Limpia el cache
   */
  protected clearCache(): void {
    this.cache.clear();
  }` : ''}

  ${options.withQueue ? `
  /**
   * Añade una tarea a la cola
   */
  protected enqueue(task: () => Promise<void>): void {
    this.queue.push(task);
    this.processQueue();
  }

  /**
   * Procesa la cola de tareas
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift();
      if (task) {
        try {
          await task();
        } catch (error) {
          ${options.withEvents ? `this.emit('taskError', error);` : ''}
          console.error('Error procesando tarea:', error);
        }
      }
    }

    this.processing = false;
  }` : ''}

  /**
   * Configuración por defecto
   */
  private getDefaultConfig(): ${name}Config {
    return {
      enabled: true,
      timeout: 5000,
      retries: 3,
      ${options.withCache ? `cacheEnabled: true,
      cacheTtl: 300000, // 5 minutos` : ''}
      ${options.withQueue ? `queueEnabled: true,
      maxQueueSize: 100` : ''}
    };
  }

  /**
   * Configuración inicial del service
   */
  private async setup(): Promise<void> {
    // Implementar lógica de inicialización específica
    ${options.withEvents ? `this.emit('setup');` : ''}
  }

  /**
   * Limpieza de recursos
   */
  private async cleanup(): Promise<void> {
    // Implementar lógica de limpieza específica
    ${options.withEvents ? `this.emit('cleanup');` : ''}
  }

  /**
   * Valida que el service esté inicializado
   */
  protected ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('${name} no está inicializado. Llama a initialize() primero.');
    }
  }

  /**
   * Maneja errores de forma consistente
   */
  protected handleError(error: unknown, context: string): never {
    const message = error instanceof Error ? error.message : String(error);
    const fullMessage = \`\${context}: \${message}\`;
    
    ${options.withEvents ? `this.emit('error', new Error(fullMessage));` : ''}
    throw new Error(fullMessage);
  }
}

export default ${name};
`,

  interface: (name, options) => `/**
 * Configuración para ${name}
 */
export interface ${name}Config {
  /** Si el service está habilitado */
  enabled: boolean;
  
  /** Timeout para operaciones en ms */
  timeout: number;
  
  /** Número de reintentos */
  retries: number;
  
  ${options.withCache ? `/** Si el cache está habilitado */
  cacheEnabled: boolean;
  
  /** TTL del cache en ms */
  cacheTtl: number;` : ''}
  
  ${options.withQueue ? `/** Si la cola está habilitada */
  queueEnabled: boolean;
  
  /** Tamaño máximo de la cola */
  maxQueueSize: number;` : ''}
}

${options.withEvents ? `
/**
 * Eventos emitidos por ${name}
 */
export interface ${name}Events {
  initialized: () => void;
  destroyed: () => void;
  configUpdated: (config: ${name}Config) => void;
  setup: () => void;
  cleanup: () => void;
  error: (error: Error) => void;
  ${options.withQueue ? `taskError: (error: Error) => void;` : ''}
}` : ''}

/**
 * Resultado de operaciones de ${name}
 */
export interface ${name}Result<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

/**
 * Opciones para operaciones de ${name}
 */
export interface ${name}Options {
  timeout?: number;
  retries?: number;
  ${options.withCache ? `useCache?: boolean;` : ''}
}
`,

  test: (name, options) => `import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ${name} } from './${toKebabCase(name)}.service.js';
import type { ${name}Config } from '@sync/types';

describe('${name}', () => {
  let service: ${name};
  let config: ${name}Config;

  beforeEach(() => {
    config = {
      enabled: true,
      timeout: 1000,
      retries: 2,
      ${options.withCache ? `cacheEnabled: true,
      cacheTtl: 5000,` : ''}
      ${options.withQueue ? `queueEnabled: true,
      maxQueueSize: 10` : ''}
    };
    
    service = new ${name}(config);
  });

  afterEach(async () => {
    if (service.initialized) {
      await service.destroy();
    }
  });

  describe('Inicialización', () => {
    it('se inicializa correctamente', async () => {
      expect(service.initialized).toBe(false);
      
      await service.initialize();
      
      expect(service.initialized).toBe(true);
    });

    it('no permite inicializar dos veces', async () => {
      await service.initialize();
      
      await expect(service.initialize()).rejects.toThrow('ya está inicializado');
    });

    it('se destruye correctamente', async () => {
      await service.initialize();
      expect(service.initialized).toBe(true);
      
      await service.destroy();
      expect(service.initialized).toBe(false);
    });

    it('permite destruir sin inicializar', async () => {
      expect(service.initialized).toBe(false);
      
      await expect(service.destroy()).resolves.not.toThrow();
    });
  });

  describe('Configuración', () => {
    it('usa configuración por defecto', () => {
      const defaultConfig = service.getConfig();
      
      expect(defaultConfig.enabled).toBe(true);
      expect(defaultConfig.timeout).toBe(1000);
      expect(defaultConfig.retries).toBe(2);
    });

    it('permite actualizar configuración', () => {
      const newConfig = { timeout: 2000 };
      
      service.updateConfig(newConfig);
      
      expect(service.getConfig().timeout).toBe(2000);
      expect(service.getConfig().retries).toBe(2); // Mantiene otros valores
    });

    it('retorna configuración inmutable', () => {
      const config = service.getConfig();
      
      expect(() => {
        (config as any).timeout = 9999;
      }).not.toThrow();
      
      // La configuración original no debe cambiar
      expect(service.getConfig().timeout).toBe(1000);
    });
  });

  ${options.withEvents ? `
  describe('Eventos', () => {
    it('emite evento de inicialización', async () => {
      const spy = vi.fn();
      service.on('initialized', spy);
      
      await service.initialize();
      
      expect(spy).toHaveBeenCalledOnce();
    });

    it('emite evento de destrucción', async () => {
      const spy = vi.fn();
      service.on('destroyed', spy);
      
      await service.initialize();
      await service.destroy();
      
      expect(spy).toHaveBeenCalledOnce();
    });

    it('emite evento de actualización de config', () => {
      const spy = vi.fn();
      service.on('configUpdated', spy);
      
      service.updateConfig({ timeout: 3000 });
      
      expect(spy).toHaveBeenCalledWith(expect.objectContaining({
        timeout: 3000
      }));
    });
  });` : ''}

  ${options.withCache ? `
  describe('Cache', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('guarda y recupera valores del cache', () => {
      // Acceder a métodos protegidos para testing
      const protectedService = service as any;
      
      protectedService.setCached('test-key', 'test-value');
      
      expect(protectedService.getCached('test-key')).toBe('test-value');
    });

    it('limpia el cache', () => {
      const protectedService = service as any;
      
      protectedService.setCached('test-key', 'test-value');
      protectedService.clearCache();
      
      expect(protectedService.getCached('test-key')).toBeUndefined();
    });

    it('respeta TTL del cache', async () => {
      const protectedService = service as any;
      
      protectedService.setCached('test-key', 'test-value', 10); // 10ms TTL
      
      expect(protectedService.getCached('test-key')).toBe('test-value');
      
      await new Promise(resolve => setTimeout(resolve, 15));
      
      expect(protectedService.getCached('test-key')).toBeUndefined();
    });
  });` : ''}

  describe('Manejo de errores', () => {
    it('maneja errores en inicialización', async () => {
      // Mock setup para que falle
      const originalSetup = (service as any).setup;
      (service as any).setup = vi.fn().mockRejectedValue(new Error('Setup failed'));
      
      await expect(service.initialize()).rejects.toThrow('Error inicializando ${name}');
      
      expect(service.initialized).toBe(false);
      
      // Restaurar método original
      (service as any).setup = originalSetup;
    });

    it('valida que esté inicializado antes de operaciones', () => {
      const protectedService = service as any;
      
      expect(() => {
        protectedService.ensureInitialized();
      }).toThrow('no está inicializado');
    });
  });
});
`,

  docs: (name, options) => `# ${name}

${options.description || `Service para gestión de ${name.toLowerCase()} en Sync Platform.`}

## Instalación

\`\`\`typescript
import { ${name} } from '@sync/core';
\`\`\`

## Uso Básico

\`\`\`typescript
import { ${name} } from '@sync/core';
import type { ${name}Config } from '@sync/types';

// Configuración
const config: ${name}Config = {
  enabled: true,
  timeout: 5000,
  retries: 3
};

// Crear instancia
const ${toCamelCase(name)} = new ${name}(config);

// Inicializar
await ${toCamelCase(name)}.initialize();

// Usar el service
// ... operaciones específicas ...

// Limpiar recursos
await ${toCamelCase(name)}.destroy();
\`\`\`

## Configuración

### ${name}Config

| Propiedad | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| \`enabled\` | \`boolean\` | \`true\` | Si el service está habilitado |
| \`timeout\` | \`number\` | \`5000\` | Timeout para operaciones (ms) |
| \`retries\` | \`number\` | \`3\` | Número de reintentos |
${options.withCache ? `| \`cacheEnabled\` | \`boolean\` | \`true\` | Si el cache está habilitado |
| \`cacheTtl\` | \`number\` | \`300000\` | TTL del cache (ms) |` : ''}
${options.withQueue ? `| \`queueEnabled\` | \`boolean\` | \`true\` | Si la cola está habilitada |
| \`maxQueueSize\` | \`number\` | \`100\` | Tamaño máximo de la cola |` : ''}

### Ejemplo de Configuración Avanzada

\`\`\`typescript
const config: ${name}Config = {
  enabled: true,
  timeout: 10000,
  retries: 5,
  ${options.withCache ? `cacheEnabled: true,
  cacheTtl: 600000, // 10 minutos` : ''}
  ${options.withQueue ? `queueEnabled: true,
  maxQueueSize: 200` : ''}
};
\`\`\`

## API

### Métodos Principales

#### \`initialize(): Promise<void>\`

Inicializa el service y configura los recursos necesarios.

\`\`\`typescript
await ${toCamelCase(name)}.initialize();
\`\`\`

#### \`destroy(): Promise<void>\`

Finaliza el service y limpia todos los recursos.

\`\`\`typescript
await ${toCamelCase(name)}.destroy();
\`\`\`

#### \`getConfig(): Readonly<${name}Config>\`

Obtiene la configuración actual del service.

\`\`\`typescript
const config = ${toCamelCase(name)}.getConfig();
console.log('Timeout actual:', config.timeout);
\`\`\`

#### \`updateConfig(newConfig: Partial<${name}Config>): void\`

Actualiza la configuración del service.

\`\`\`typescript
${toCamelCase(name)}.updateConfig({
  timeout: 8000,
  retries: 2
});
\`\`\`

### Propiedades

#### \`initialized: boolean\`

Indica si el service está inicializado.

\`\`\`typescript
if (${toCamelCase(name)}.initialized) {
  // Service listo para usar
}
\`\`\`

${options.withEvents ? `
## Eventos

El service extiende \`EventEmitter\` y emite los siguientes eventos:

### \`initialized\`

Se emite cuando el service se inicializa correctamente.

\`\`\`typescript
${toCamelCase(name)}.on('initialized', () => {
  console.log('Service inicializado');
});
\`\`\`

### \`destroyed\`

Se emite cuando el service se destruye.

\`\`\`typescript
${toCamelCase(name)}.on('destroyed', () => {
  console.log('Service destruido');
});
\`\`\`

### \`configUpdated\`

Se emite cuando se actualiza la configuración.

\`\`\`typescript
${toCamelCase(name)}.on('configUpdated', (config) => {
  console.log('Nueva configuración:', config);
});
\`\`\`

### \`error\`

Se emite cuando ocurre un error.

\`\`\`typescript
${toCamelCase(name)}.on('error', (error) => {
  console.error('Error en service:', error);
});
\`\`\`
` : ''}

${options.withCache ? `
## Cache

El service incluye un sistema de cache interno para optimizar operaciones.

### Configuración del Cache

\`\`\`typescript
const config: ${name}Config = {
  cacheEnabled: true,
  cacheTtl: 300000 // 5 minutos
};
\`\`\`

### Uso del Cache

El cache se maneja automáticamente por el service, pero puedes controlarlo:

\`\`\`typescript
// El cache se usa automáticamente en operaciones que lo soporten
// No requiere intervención manual
\`\`\`
` : ''}

${options.withQueue ? `
## Cola de Tareas

El service incluye un sistema de cola para procesar tareas de forma secuencial.

### Configuración de la Cola

\`\`\`typescript
const config: ${name}Config = {
  queueEnabled: true,
  maxQueueSize: 100
};
\`\`\`

### Uso de la Cola

Las tareas se añaden automáticamente a la cola cuando es necesario:

\`\`\`typescript
// Las operaciones se encolan automáticamente
// No requiere intervención manual
\`\`\`
` : ''}

## Manejo de Errores

El service incluye manejo robusto de errores:

\`\`\`typescript
try {
  await ${toCamelCase(name)}.initialize();
  // Operaciones del service
} catch (error) {
  console.error('Error:', error.message);
}
\`\`\`

${options.withEvents ? `
### Escuchar Errores

\`\`\`typescript
${toCamelCase(name)}.on('error', (error) => {
  // Manejar errores de forma centralizada
  console.error('Error en ${name}:', error);
});
\`\`\`
` : ''}

## Testing

\`\`\`bash
# Ejecutar tests del service
pnpm test ${name}

# Ejecutar tests con coverage
pnpm test:coverage ${name}
\`\`\`

### Ejemplo de Test

\`\`\`typescript
import { ${name} } from '@sync/core';

describe('${name}', () => {
  let service: ${name};

  beforeEach(() => {
    service = new ${name}({
      enabled: true,
      timeout: 1000,
      retries: 1
    });
  });

  afterEach(async () => {
    if (service.initialized) {
      await service.destroy();
    }
  });

  it('se inicializa correctamente', async () => {
    await service.initialize();
    expect(service.initialized).toBe(true);
  });
});
\`\`\`

## Mejores Prácticas

1. **Siempre inicializar**: Llama a \`initialize()\` antes de usar el service
2. **Limpiar recursos**: Llama a \`destroy()\` cuando termines
3. **Manejar errores**: Usa try/catch o escucha eventos de error
4. **Configuración apropiada**: Ajusta timeouts y reintentos según tu caso de uso
${options.withCache ? `5. **Cache inteligente**: Configura TTL apropiado para tus datos` : ''}
${options.withQueue ? `6. **Cola eficiente**: Ajusta el tamaño de cola según tu carga` : ''}

## Integración con createSyncApp

\`\`\`typescript
import { createSyncApp } from '@sync/core';

const app = createSyncApp({
  // ... otras configuraciones
  services: {
    ${toCamelCase(name)}: {
      enabled: true,
      timeout: 5000,
      retries: 3
    }
  }
});

// El service estará disponible en app.services.${toCamelCase(name)}
\`\`\`
`
};

// Función principal
function generateService(serviceName, options = {}) {
  const name = toPascalCase(serviceName);
  const kebabName = toKebabCase(name);
  
  console.log(`🔧 Generando service: ${name}`);
  console.log(`📁 Opciones:`, options);

  // Crear directorios
  const serviceDir = join(rootDir, config.servicesDir);
  const testDir = join(rootDir, config.testsDir);
  const typesDir = join(rootDir, config.typesDir);
  const docDir = join(rootDir, config.docsDir);

  [serviceDir, testDir, typesDir, docDir].forEach(dir => {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  });

  // Generar archivos
  const files = [
    {
      path: join(serviceDir, `${kebabName}.service.ts`),
      content: templates.service(name, options)
    },
    {
      path: join(testDir, `${kebabName}.service.test.ts`),
      content: templates.test(name, options)
    },
    {
      path: join(docDir, `${kebabName}.md`),
      content: templates.docs(name, options)
    }
  ];

  // Generar interface si se solicita
  if (options.withInterface) {
    files.push({
      path: join(typesDir, `${kebabName}.ts`),
      content: templates.interface(name, options)
    });
  }

  // Escribir archivos
  files.forEach(({ path, content }) => {
    writeFileSync(path, content);
    console.log(`✅ Creado: ${path.replace(rootDir, '.')}`);
  });

  // Actualizar exports
  updateExports(name, options);

  console.log(`🎉 Service ${name} generado exitosamente!`);
  console.log(`📚 Documentación: packages/@sync/core/docs/services/${kebabName}.md`);
  console.log(`🧪 Tests: pnpm test ${name}`);
}

function updateExports(name, options) {
  // Actualizar exports de @sync/core
  const coreIndexPath = join(rootDir, 'packages/@sync/core/src/index.ts');
  
  try {
    let coreContent = '';
    if (existsSync(coreIndexPath)) {
      coreContent = require('fs').readFileSync(coreIndexPath, 'utf8');
    }

    const serviceExport = `export { ${name} } from './services/${toKebabCase(name)}.service.js';`;
    
    if (!coreContent.includes(`export { ${name} }`)) {
      coreContent += '\n' + serviceExport + '\n';
      writeFileSync(coreIndexPath, coreContent);
      console.log(`✅ Actualizado: packages/@sync/core/src/index.ts`);
    }
  } catch (error) {
    console.warn(`⚠️  No se pudo actualizar @sync/core index.ts: ${error.message}`);
  }

  // Actualizar exports de @sync/types si se generó interface
  if (options.withInterface) {
    const typesIndexPath = join(rootDir, 'packages/@sync/types/src/index.ts');
    
    try {
      let typesContent = '';
      if (existsSync(typesIndexPath)) {
        typesContent = require('fs').readFileSync(typesIndexPath, 'utf8');
      }

      const typeExports = [
        `export type { ${name}Config, ${name}Result, ${name}Options } from './${toKebabCase(name)}.js';`
      ];

      if (options.withEvents) {
        typeExports.push(`export type { ${name}Events } from './${toKebabCase(name)}.js';`);
      }

      const newExports = typeExports.join('\n');
      
      if (!typesContent.includes(`${name}Config`)) {
        typesContent += '\n' + newExports + '\n';
        writeFileSync(typesIndexPath, typesContent);
        console.log(`✅ Actualizado: packages/@sync/types/src/index.ts`);
      }
    } catch (error) {
      console.warn(`⚠️  No se pudo actualizar @sync/types index.ts: ${error.message}`);
    }
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(`
🔧 Generador de Services - Sync Platform

Uso:
  pnpm generate:service <nombre> [opciones]

Ejemplos:
  pnpm generate:service UserManager
  pnpm generate:service data/CacheService --with-interface
  pnpm generate:service NotificationService --with-events --with-config

Opciones:
  --with-interface    Generar interfaces TypeScript en @sync/types
  --with-events       Incluir EventEmitter para manejo de eventos
  --with-cache        Incluir sistema de cache interno
  --with-queue        Incluir cola de tareas secuenciales
  --description       Descripción personalizada para la documentación

Archivos generados:
  ✅ Service class con TypeScript
  ✅ Tests con Vitest
  ✅ Documentación en Markdown
  ✅ Interfaces TypeScript (opcional)
  ✅ Actualización automática de exports

Características incluidas:
  ✅ Inicialización/destrucción segura
  ✅ Configuración flexible
  ✅ Manejo robusto de errores
  ✅ Validaciones de estado
  ✅ Sistema de eventos (opcional)
  ✅ Cache interno (opcional)
  ✅ Cola de tareas (opcional)
`);
    process.exit(1);
  }

  const serviceName = args[0];
  const options = {
    withInterface: args.includes('--with-interface'),
    withEvents: args.includes('--with-events'),
    withCache: args.includes('--with-cache'),
    withQueue: args.includes('--with-queue'),
    description: args.find(arg => arg.startsWith('--description='))?.split('=')[1]
  };

  generateService(serviceName, options);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generateService };