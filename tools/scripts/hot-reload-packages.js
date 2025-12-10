#!/usr/bin/env node

/**
 * 🔥 Hot Reload Entre Packages
 * 
 * Sistema inteligente de hot reload que detecta cambios en packages
 * y reconstruye automáticamente las dependencias afectadas
 * 
 * Uso:
 *   pnpm hot-reload
 *   pnpm hot-reload --app=credisync
 *   pnpm hot-reload --packages-only
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, statSync } from 'fs';
import { execSync, spawn } from 'child_process';
import { watch } from 'chokidar';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Configuración
const config = {
  packages: [
    { name: '@sync/types', path: 'packages/@sync/types', buildCmd: 'build' },
    { name: '@sync/core', path: 'packages/@sync/core', buildCmd: 'build', deps: ['@sync/types'] },
    { name: '@sync/ui', path: 'packages/@sync/ui', buildCmd: 'build', deps: ['@sync/types'] }
  ],
  apps: [
    { name: 'credisync', path: 'apps/credisync', deps: ['@sync/types', '@sync/core', '@sync/ui'] },
    { name: 'healthsync', path: 'apps/healthsync', deps: ['@sync/types', '@sync/core', '@sync/ui'] },
    { name: 'surveysync', path: 'apps/surveysync', deps: ['@sync/types', '@sync/core', '@sync/ui'] }
  ],
  watchPatterns: {
    packages: ['src/**/*.{ts,js,svelte}', 'package.json'],
    apps: ['src/**/*.{ts,js,svelte}', 'package.json', 'vite.config.ts']
  },
  debounceMs: 300,
  buildTimeout: 30000
};

class HotReloadManager {
  constructor(options = {}) {
    this.options = {
      app: options.app,
      packagesOnly: options.packagesOnly || false,
      verbose: options.verbose || false
    };
    
    this.watchers = new Map();
    this.buildQueue = new Set();
    this.isBuilding = new Map();
    this.lastBuildTime = new Map();
    this.dependencyGraph = this.buildDependencyGraph();
    this.processes = new Map();
    
    // Bind methods
    this.handleFileChange = this.handleFileChange.bind(this);
    this.processBuildQueue = this.processBuildQueue.bind(this);
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Construye el grafo de dependencias
   */
  buildDependencyGraph() {
    const graph = new Map();
    
    // Añadir packages
    config.packages.forEach(pkg => {
      graph.set(pkg.name, {
        ...pkg,
        type: 'package',
        dependents: []
      });
    });
    
    // Añadir apps
    config.apps.forEach(app => {
      graph.set(app.name, {
        ...app,
        type: 'app',
        dependents: []
      });
    });
    
    // Calcular dependents (quién depende de quién)
    graph.forEach((item, name) => {
      if (item.deps) {
        item.deps.forEach(depName => {
          const dep = graph.get(depName);
          if (dep) {
            dep.dependents.push(name);
          }
        });
      }
    });
    
    return graph;
  }

  /**
   * Inicia el sistema de hot reload
   */
  async start() {
    console.log(chalk.blue('🔥 Iniciando Hot Reload System...'));
    
    // Validar estructura
    await this.validateStructure();
    
    // Build inicial
    await this.initialBuild();
    
    // Configurar watchers
    this.setupWatchers();
    
    // Iniciar apps si no es packages-only
    if (!this.options.packagesOnly) {
      await this.startApps();
    }
    
    console.log(chalk.green('✅ Hot Reload System activo'));
    console.log(chalk.gray('Presiona Ctrl+C para detener'));
    
    // Mantener el proceso vivo
    return new Promise(() => {});
  }

  /**
   * Valida que la estructura del monorepo sea correcta
   */
  async validateStructure() {
    console.log(chalk.blue('🔍 Validando estructura del monorepo...'));
    
    const errors = [];
    
    // Validar packages
    config.packages.forEach(pkg => {
      const pkgPath = join(rootDir, pkg.path);
      const packageJsonPath = join(pkgPath, 'package.json');
      
      if (!existsSync(pkgPath)) {
        errors.push(`Package no encontrado: ${pkg.path}`);
      } else if (!existsSync(packageJsonPath)) {
        errors.push(`package.json no encontrado: ${packageJsonPath}`);
      }
    });
    
    // Validar apps
    config.apps.forEach(app => {
      const appPath = join(rootDir, app.path);
      const packageJsonPath = join(appPath, 'package.json');
      
      if (!existsSync(appPath)) {
        errors.push(`App no encontrada: ${app.path}`);
      } else if (!existsSync(packageJsonPath)) {
        errors.push(`package.json no encontrado: ${packageJsonPath}`);
      }
    });
    
    if (errors.length > 0) {
      console.error(chalk.red('❌ Errores de estructura:'));
      errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
      process.exit(1);
    }
    
    console.log(chalk.green('✅ Estructura válida'));
  }

  /**
   * Build inicial de todos los packages
   */
  async initialBuild() {
    console.log(chalk.blue('🏗️  Build inicial de packages...'));
    
    // Ordenar packages por dependencias
    const buildOrder = this.getPackageBuildOrder();
    
    for (const pkgName of buildOrder) {
      const pkg = this.dependencyGraph.get(pkgName);
      if (pkg && pkg.type === 'package') {
        await this.buildPackage(pkg, true);
      }
    }
    
    console.log(chalk.green('✅ Build inicial completado'));
  }

  /**
   * Obtiene el orden correcto para build de packages
   */
  getPackageBuildOrder() {
    const visited = new Set();
    const order = [];
    
    const visit = (pkgName) => {
      if (visited.has(pkgName)) return;
      
      const pkg = this.dependencyGraph.get(pkgName);
      if (!pkg || pkg.type !== 'package') return;
      
      // Visitar dependencias primero
      if (pkg.deps) {
        pkg.deps.forEach(depName => {
          if (this.dependencyGraph.has(depName)) {
            visit(depName);
          }
        });
      }
      
      visited.add(pkgName);
      order.push(pkgName);
    };
    
    config.packages.forEach(pkg => visit(pkg.name));
    
    return order;
  }

  /**
   * Configura los watchers de archivos
   */
  setupWatchers() {
    console.log(chalk.blue('👀 Configurando watchers...'));
    
    // Watcher para packages
    config.packages.forEach(pkg => {
      const pkgPath = join(rootDir, pkg.path);
      const patterns = config.watchPatterns.packages.map(pattern => 
        join(pkgPath, pattern)
      );
      
      const watcher = watch(patterns, {
        ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
        persistent: true,
        ignoreInitial: true
      });
      
      watcher.on('change', (filePath) => {
        this.handleFileChange(pkg.name, filePath, 'change');
      });
      
      watcher.on('add', (filePath) => {
        this.handleFileChange(pkg.name, filePath, 'add');
      });
      
      watcher.on('unlink', (filePath) => {
        this.handleFileChange(pkg.name, filePath, 'unlink');
      });
      
      this.watchers.set(pkg.name, watcher);
      
      if (this.options.verbose) {
        console.log(chalk.gray(`  👀 Watching ${pkg.name}: ${patterns.join(', ')}`));
      }
    });
    
    // Watcher para apps (solo si no es packages-only)
    if (!this.options.packagesOnly) {
      config.apps.forEach(app => {
        // Solo watch de la app específica si se especificó
        if (this.options.app && app.name !== this.options.app) {
          return;
        }
        
        const appPath = join(rootDir, app.path);
        const patterns = config.watchPatterns.apps.map(pattern => 
          join(appPath, pattern)
        );
        
        const watcher = watch(patterns, {
          ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
          persistent: true,
          ignoreInitial: true
        });
        
        watcher.on('change', (filePath) => {
          this.handleFileChange(app.name, filePath, 'change');
        });
        
        this.watchers.set(app.name, watcher);
        
        if (this.options.verbose) {
          console.log(chalk.gray(`  👀 Watching ${app.name}: ${patterns.join(', ')}`));
        }
      });
    }
    
    console.log(chalk.green(`✅ ${this.watchers.size} watchers configurados`));
  }

  /**
   * Maneja cambios en archivos
   */
  async handleFileChange(itemName, filePath, eventType) {
    const relativePath = filePath.replace(rootDir, '.');
    
    if (this.options.verbose) {
      console.log(chalk.yellow(`📝 ${eventType}: ${relativePath} (${itemName})`));
    }
    
    // Debounce: evitar builds múltiples muy rápidos
    const now = Date.now();
    const lastBuild = this.lastBuildTime.get(itemName) || 0;
    
    if (now - lastBuild < config.debounceMs) {
      return;
    }
    
    this.lastBuildTime.set(itemName, now);
    
    // Añadir a la cola de build
    this.buildQueue.add(itemName);
    
    // Procesar cola después de un pequeño delay
    setTimeout(() => {
      this.processBuildQueue();
    }, config.debounceMs);
  }

  /**
   * Procesa la cola de builds
   */
  async processBuildQueue() {
    if (this.buildQueue.size === 0) return;
    
    const itemsToRebuild = Array.from(this.buildQueue);
    this.buildQueue.clear();
    
    console.log(chalk.blue(`🔄 Procesando cambios: ${itemsToRebuild.join(', ')}`));
    
    // Determinar qué necesita rebuild
    const rebuildSet = new Set();
    
    itemsToRebuild.forEach(itemName => {
      rebuildSet.add(itemName);
      
      // Añadir dependents
      const item = this.dependencyGraph.get(itemName);
      if (item && item.dependents) {
        item.dependents.forEach(dependent => {
          rebuildSet.add(dependent);
        });
      }
    });
    
    // Separar packages y apps
    const packagesToRebuild = [];
    const appsToRestart = [];
    
    rebuildSet.forEach(itemName => {
      const item = this.dependencyGraph.get(itemName);
      if (item) {
        if (item.type === 'package') {
          packagesToRebuild.push(item);
        } else if (item.type === 'app') {
          appsToRestart.push(item);
        }
      }
    });
    
    // Rebuild packages en orden correcto
    if (packagesToRebuild.length > 0) {
      const buildOrder = this.getPackageBuildOrder();
      const orderedPackages = buildOrder
        .map(name => this.dependencyGraph.get(name))
        .filter(pkg => packagesToRebuild.includes(pkg));
      
      for (const pkg of orderedPackages) {
        await this.buildPackage(pkg);
      }
    }
    
    // Restart apps afectadas
    if (!this.options.packagesOnly && appsToRestart.length > 0) {
      for (const app of appsToRestart) {
        await this.restartApp(app);
      }
    }
    
    console.log(chalk.green('✅ Rebuild completado'));
  }

  /**
   * Construye un package
   */
  async buildPackage(pkg, isInitial = false) {
    const buildKey = pkg.name;
    
    if (this.isBuilding.get(buildKey)) {
      if (this.options.verbose) {
        console.log(chalk.yellow(`⏳ ${pkg.name} ya está siendo construido, saltando...`));
      }
      return;
    }
    
    this.isBuilding.set(buildKey, true);
    
    try {
      const startTime = Date.now();
      
      if (!isInitial) {
        console.log(chalk.blue(`🔨 Rebuilding ${pkg.name}...`));
      }
      
      const pkgPath = join(rootDir, pkg.path);
      
      // Ejecutar build
      execSync(`pnpm build`, {
        cwd: pkgPath,
        stdio: this.options.verbose ? 'inherit' : 'pipe',
        timeout: config.buildTimeout
      });
      
      const duration = Date.now() - startTime;
      
      if (isInitial) {
        console.log(chalk.green(`✅ ${pkg.name} built (${duration}ms)`));
      } else {
        console.log(chalk.green(`✅ ${pkg.name} rebuilt (${duration}ms)`));
      }
      
    } catch (error) {
      console.error(chalk.red(`❌ Error building ${pkg.name}:`));
      console.error(chalk.red(error.message));
    } finally {
      this.isBuilding.set(buildKey, false);
    }
  }

  /**
   * Inicia las apps en modo desarrollo
   */
  async startApps() {
    const appsToStart = this.options.app 
      ? config.apps.filter(app => app.name === this.options.app)
      : config.apps;
    
    for (const app of appsToStart) {
      await this.startApp(app);
    }
  }

  /**
   * Inicia una app en modo desarrollo
   */
  async startApp(app) {
    const appPath = join(rootDir, app.path);
    
    if (!existsSync(appPath)) {
      console.warn(chalk.yellow(`⚠️  App ${app.name} no encontrada, saltando...`));
      return;
    }
    
    console.log(chalk.blue(`🚀 Iniciando ${app.name}...`));
    
    const process = spawn('pnpm', ['dev'], {
      cwd: appPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });
    
    // Manejar output
    process.stdout.on('data', (data) => {
      const output = data.toString().trim();
      if (output) {
        console.log(chalk.cyan(`[${app.name}] ${output}`));
      }
    });
    
    process.stderr.on('data', (data) => {
      const output = data.toString().trim();
      if (output && !output.includes('EADDRINUSE')) {
        console.error(chalk.red(`[${app.name}] ${output}`));
      }
    });
    
    process.on('exit', (code) => {
      if (code !== 0) {
        console.error(chalk.red(`❌ ${app.name} terminó con código ${code}`));
      }
      this.processes.delete(app.name);
    });
    
    this.processes.set(app.name, process);
    
    // Esperar un poco para que inicie
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log(chalk.green(`✅ ${app.name} iniciada`));
  }

  /**
   * Reinicia una app
   */
  async restartApp(app) {
    console.log(chalk.blue(`🔄 Reiniciando ${app.name}...`));
    
    // Detener proceso actual
    const existingProcess = this.processes.get(app.name);
    if (existingProcess) {
      existingProcess.kill('SIGTERM');
      this.processes.delete(app.name);
      
      // Esperar a que termine
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Iniciar de nuevo
    await this.startApp(app);
  }

  /**
   * Cierra todos los watchers y procesos
   */
  async shutdown() {
    console.log(chalk.blue('\\n🛑 Cerrando Hot Reload System...'));
    
    // Cerrar watchers
    for (const [name, watcher] of this.watchers) {
      await watcher.close();
      if (this.options.verbose) {
        console.log(chalk.gray(`  ✅ Watcher ${name} cerrado`));
      }
    }
    
    // Terminar procesos de apps
    for (const [name, process] of this.processes) {
      process.kill('SIGTERM');
      console.log(chalk.gray(`  ✅ Proceso ${name} terminado`));
    }
    
    console.log(chalk.green('✅ Hot Reload System cerrado'));
    process.exit(0);
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  const options = {
    app: args.find(arg => arg.startsWith('--app='))?.split('=')[1],
    packagesOnly: args.includes('--packages-only'),
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔥 Hot Reload System - Sync Platform

Sistema inteligente de hot reload que detecta cambios en packages
y reconstruye automáticamente las dependencias afectadas.

Uso:
  pnpm hot-reload [opciones]

Opciones:
  --app=<nombre>      Solo watch y restart de una app específica
  --packages-only     Solo rebuild de packages, no iniciar apps
  --verbose, -v       Output detallado
  --help, -h          Mostrar esta ayuda

Ejemplos:
  pnpm hot-reload                    # Watch completo
  pnpm hot-reload --app=credisync    # Solo CrediSync
  pnpm hot-reload --packages-only    # Solo packages
  pnpm hot-reload --verbose          # Con output detallado

Características:
  ✅ Detección inteligente de cambios
  ✅ Rebuild automático de dependencias
  ✅ Orden correcto de builds
  ✅ Debouncing para evitar builds múltiples
  ✅ Restart automático de apps afectadas
  ✅ Manejo robusto de errores
  ✅ Shutdown graceful
`);
    process.exit(0);
  }
  
  const manager = new HotReloadManager(options);
  manager.start().catch(error => {
    console.error(chalk.red('❌ Error iniciando Hot Reload System:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  });
}

// Verificar si chalk está disponible, si no usar console.log simple
let chalk;
try {
  chalk = (await import('chalk')).default;
} catch {
  // Fallback si chalk no está disponible
  chalk = {
    blue: (str) => str,
    green: (str) => str,
    yellow: (str) => str,
    red: (str) => str,
    cyan: (str) => str,
    gray: (str) => str
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { HotReloadManager };