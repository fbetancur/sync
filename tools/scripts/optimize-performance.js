#!/usr/bin/env node

/**
 * Performance Optimizer - Optimiza performance del monorepo
 * Uso: node tools/scripts/optimize-performance.js [--build] [--bundle] [--deps] [--all]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function execCommand(command, description) {
  log('cyan', `🔧 ${description}...`);
  
  const startTime = Date.now();
  try {
    const output = execSync(command, { 
      stdio: 'pipe', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    const duration = Date.now() - startTime;
    log('green', `✅ ${description} completado (${formatTime(duration)})`);
    
    return { 
      success: true, 
      duration, 
      output: output.toString(),
      command,
      description
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    log('red', `❌ ${description} falló (${formatTime(duration)})`);
    
    return { 
      success: false, 
      duration, 
      error: error.message,
      command,
      description
    };
  }
}

function measureBaseline() {
  log('blue', '📊 Midiendo performance baseline...');
  
  const baseline = {
    timestamp: new Date().toISOString(),
    build: null,
    bundle: null,
    install: null
  };
  
  // Medir build time
  const buildResult = execCommand(
    'pnpm build',
    'Measuring build time'
  );
  baseline.build = buildResult;
  
  // Medir bundle sizes
  const bundleResult = execCommand(
    'node tools/scripts/bundle-analyzer.js --all',
    'Measuring bundle sizes'
  );
  baseline.bundle = bundleResult;
  
  // Medir install time
  const installResult = execCommand(
    'pnpm install --force',
    'Measuring install time'
  );
  baseline.install = installResult;
  
  return baseline;
}

function optimizeBuildPerformance() {
  log('blue', '🏗️ Optimizando performance de builds...');
  
  const optimizations = [];
  
  // 1. Optimizar configuración de TypeScript
  log('cyan', '📝 Optimizando configuración de TypeScript...');
  
  const tsConfigs = [
    'tsconfig.json',
    'apps/credisync/tsconfig.json',
    'packages/@sync/core/tsconfig.json',
    'packages/@sync/types/tsconfig.json',
    'packages/@sync/ui/tsconfig.json'
  ];
  
  tsConfigs.forEach(configPath => {
    const fullPath = path.join(rootDir, configPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        let modified = false;
        
        // Optimizaciones de TypeScript
        if (!config.compilerOptions) config.compilerOptions = {};
        
        // Habilitar incremental compilation
        if (!config.compilerOptions.incremental) {
          config.compilerOptions.incremental = true;
          modified = true;
        }
        
        // Optimizar module resolution
        if (config.compilerOptions.moduleResolution !== 'bundler') {
          config.compilerOptions.moduleResolution = 'bundler';
          modified = true;
        }
        
        // Habilitar skip lib check para builds más rápidos
        if (!config.compilerOptions.skipLibCheck) {
          config.compilerOptions.skipLibCheck = true;
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, JSON.stringify(config, null, 2));
          log('green', `✅ Optimizado: ${configPath}`);
          optimizations.push(`TypeScript config optimized: ${configPath}`);
        }
        
      } catch (error) {
        log('yellow', `⚠️  No se pudo optimizar ${configPath}: ${error.message}`);
      }
    }
  });
  
  // 2. Optimizar configuración de Vite
  log('cyan', '⚡ Optimizando configuración de Vite...');
  
  const viteConfigs = [
    'apps/credisync/vite.config.ts',
    'packages/@sync/core/vite.config.ts',
    'packages/@sync/ui/vite.config.ts'
  ];
  
  viteConfigs.forEach(configPath => {
    const fullPath = path.join(rootDir, configPath);
    
    if (fs.existsSync(fullPath)) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;
      
      // Agregar optimizaciones de build
      if (!content.includes('build: {')) {
        const buildConfig = `
  build: {
    target: 'esnext',
    minify: 'esbuild',
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['svelte'],
          utils: ['@sync/core', '@sync/types']
        }
      }
    }
  },`;
        
        content = content.replace(
          'export default defineConfig({',
          `export default defineConfig({${buildConfig}`
        );
        modified = true;
      }
      
      if (modified) {
        fs.writeFileSync(fullPath, content);
        log('green', `✅ Optimizado: ${configPath}`);
        optimizations.push(`Vite config optimized: ${configPath}`);
      }
    }
  });
  
  return optimizations;
}

function optimizeBundleSize() {
  log('blue', '📦 Optimizando tamaño de bundles...');
  
  const optimizations = [];
  
  // 1. Analizar y optimizar imports
  log('cyan', '🔍 Analizando imports...');
  
  const appsToOptimize = ['credisync'];
  
  appsToOptimize.forEach(app => {
    const appDir = path.join(rootDir, 'apps', app, 'src');
    
    if (fs.existsSync(appDir)) {
      // Buscar imports que se pueden optimizar
      const files = findFiles(appDir, /\\.(ts|js|svelte)$/);
      
      files.forEach(file => {
        let content = fs.readFileSync(file, 'utf8');
        let modified = false;
        
        // Optimizar imports de lodash
        if (content.includes("import _ from 'lodash'")) {
          content = content.replace(
            /import _ from 'lodash'/g,
            "// Optimized: use specific lodash imports instead"
          );
          modified = true;
        }
        
        // Optimizar imports de date-fns
        if (content.includes("import * as dateFns from 'date-fns'")) {
          content = content.replace(
            /import \\* as dateFns from 'date-fns'/g,
            "// Optimized: use specific date-fns imports instead"
          );
          modified = true;
        }
        
        if (modified) {
          fs.writeFileSync(file, content);
          optimizations.push(`Optimized imports in: ${path.relative(rootDir, file)}`);
        }
      });
    }
  });
  
  // 2. Configurar code splitting
  log('cyan', '✂️ Configurando code splitting...');
  
  const svelteConfigPath = path.join(rootDir, 'apps/credisync/svelte.config.js');
  
  if (fs.existsSync(svelteConfigPath)) {
    let content = fs.readFileSync(svelteConfigPath, 'utf8');
    
    // Agregar configuración de code splitting si no existe
    if (!content.includes('experimental')) {
      const codeSplittingConfig = `
    kit: {
      adapter: adapter(),
      experimental: {
        dynamicImports: true
      }
    }`;
      
      content = content.replace(
        'kit: {\\n\\t\\tadapter: adapter()',
        codeSplittingConfig
      );
      
      fs.writeFileSync(svelteConfigPath, content);
      optimizations.push('Code splitting configured in Svelte config');
    }
  }
  
  return optimizations;
}

function optimizeDependencies() {
  log('blue', '📚 Optimizando dependencias...');
  
  const optimizations = [];
  
  // 1. Analizar dependencias no utilizadas
  log('cyan', '🔍 Analizando dependencias no utilizadas...');
  
  try {
    // Usar depcheck para encontrar dependencias no utilizadas
    const depcheckResult = execCommand(
      'npx depcheck --json',
      'Analyzing unused dependencies'
    );
    
    if (depcheckResult.success) {
      try {
        const analysis = JSON.parse(depcheckResult.output);
        
        if (analysis.dependencies && analysis.dependencies.length > 0) {
          log('yellow', `⚠️  Dependencias no utilizadas encontradas:`);
          analysis.dependencies.forEach(dep => {
            log('yellow', `   - ${dep}`);
          });
          
          optimizations.push(`Found ${analysis.dependencies.length} unused dependencies`);
        } else {
          log('green', '✅ No se encontraron dependencias no utilizadas');
        }
        
      } catch (parseError) {
        log('yellow', '⚠️  No se pudo parsear resultado de depcheck');
      }
    }
    
  } catch (error) {
    log('yellow', '⚠️  depcheck no disponible, instalando...');
    
    try {
      execCommand('npm install -g depcheck', 'Installing depcheck');
      optimizations.push('Installed depcheck for dependency analysis');
    } catch (installError) {
      log('yellow', '⚠️  No se pudo instalar depcheck');
    }
  }
  
  // 2. Optimizar package.json
  log('cyan', '📝 Optimizando package.json files...');
  
  const packageJsonFiles = [
    'package.json',
    'apps/credisync/package.json',
    'packages/@sync/core/package.json',
    'packages/@sync/types/package.json',
    'packages/@sync/ui/package.json'
  ];
  
  packageJsonFiles.forEach(pkgPath => {
    const fullPath = path.join(rootDir, pkgPath);
    
    if (fs.existsSync(fullPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        let modified = false;
        
        // Agregar engines si no existe
        if (!pkg.engines) {
          pkg.engines = {
            node: '>=18.0.0',
            pnpm: '>=8.0.0'
          };
          modified = true;
        }
        
        // Optimizar scripts si es el root package
        if (pkgPath === 'package.json' && pkg.scripts) {
          // Agregar script de limpieza si no existe
          if (!pkg.scripts['clean:all']) {
            pkg.scripts['clean:all'] = 'pnpm clean && rm -rf node_modules && pnpm install';
            modified = true;
          }
        }
        
        if (modified) {
          fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2));
          optimizations.push(`Optimized: ${pkgPath}`);
        }
        
      } catch (error) {
        log('yellow', `⚠️  No se pudo optimizar ${pkgPath}: ${error.message}`);
      }
    }
  });
  
  return optimizations;
}

function findFiles(dir, pattern) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    items.forEach(item => {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
        scan(fullPath);
      } else if (stat.isFile() && pattern.test(item)) {
        files.push(fullPath);
      }
    });
  }
  
  scan(dir);
  return files;
}

function measureImprovement(baseline) {
  log('blue', '📈 Midiendo mejoras de performance...');
  
  const improved = {
    timestamp: new Date().toISOString(),
    build: null,
    bundle: null,
    install: null
  };
  
  // Medir build time mejorado
  const buildResult = execCommand(
    'pnpm build',
    'Measuring improved build time'
  );
  improved.build = buildResult;
  
  // Medir bundle sizes mejorado
  const bundleResult = execCommand(
    'node tools/scripts/bundle-analyzer.js --all',
    'Measuring improved bundle sizes'
  );
  improved.bundle = bundleResult;
  
  return improved;
}

function generateOptimizationReport(baseline, improved, optimizations) {
  const report = {
    timestamp: new Date().toISOString(),
    baseline,
    improved,
    optimizations,
    improvements: {
      build: null,
      bundle: null
    },
    recommendations: []
  };
  
  // Calcular mejoras de build
  if (baseline.build?.success && improved.build?.success) {
    const buildImprovement = baseline.build.duration - improved.build.duration;
    const buildPercent = ((buildImprovement / baseline.build.duration) * 100).toFixed(1);
    
    report.improvements.build = {
      baseline: baseline.build.duration,
      improved: improved.build.duration,
      difference: buildImprovement,
      percentImprovement: parseFloat(buildPercent)
    };
  }
  
  // Generar recomendaciones
  if (optimizations.length === 0) {
    report.recommendations.push('No se aplicaron optimizaciones automáticas');
    report.recommendations.push('Considerar optimizaciones manuales específicas');
  } else {
    report.recommendations.push('Monitorear performance después de optimizaciones');
    report.recommendations.push('Ejecutar tests para validar que no se rompió funcionalidad');
  }
  
  if (report.improvements.build?.percentImprovement > 10) {
    report.recommendations.push('¡Excelente mejora en build time!');
  } else if (report.improvements.build?.percentImprovement < 0) {
    report.recommendations.push('Build time empeoró, revisar optimizaciones');
  }
  
  return report;
}

function printOptimizationSummary(report) {
  log('blue', '\\n📊 Resumen de Optimización de Performance');
  log('cyan', `⏰ ${new Date(report.timestamp).toLocaleString()}`);
  
  // Optimizaciones aplicadas
  log('blue', '\\n🔧 Optimizaciones Aplicadas:');
  if (report.optimizations.length > 0) {
    report.optimizations.forEach(opt => {
      log('green', `   ✅ ${opt}`);
    });
  } else {
    log('yellow', '   ⚠️  No se aplicaron optimizaciones automáticas');
  }
  
  // Mejoras de performance
  if (report.improvements.build) {
    log('blue', '\\n📈 Mejoras de Performance:');
    
    const { baseline, improved, difference, percentImprovement } = report.improvements.build;
    const sign = difference > 0 ? '-' : '+';
    const color = difference > 0 ? 'green' : 'red';
    
    log('cyan', `   Build Time:`);
    log('cyan', `     Baseline: ${formatTime(baseline)}`);
    log('cyan', `     Mejorado: ${formatTime(improved)}`);
    log(color, `     Diferencia: ${sign}${formatTime(Math.abs(difference))} (${sign}${Math.abs(percentImprovement)}%)`);
  }
  
  // Recomendaciones
  if (report.recommendations.length > 0) {
    log('blue', '\\n🎯 Recomendaciones:');
    report.recommendations.forEach(rec => {
      log('yellow', `   • ${rec}`);
    });
  }
  
  log('blue', '\\n✨ Optimización completada!');
}

function saveOptimizationReport(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `optimization-report-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  // Guardar reporte detallado
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));
  
  // Guardar reporte más reciente
  const latestPath = path.join(outputDir, 'optimization-report-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));
  
  log('green', `💾 Reporte guardado: ${filepath}`);
  
  return filepath;
}

function main() {
  const args = process.argv.slice(2);
  const optimizeBuild = args.includes('--build');
  const optimizeBundle = args.includes('--bundle');
  const optimizeDeps = args.includes('--deps');
  const optimizeAll = args.includes('--all');
  
  log('blue', '⚡ Performance Optimizer - Sync Platform');
  
  const startTime = Date.now();
  
  // Medir baseline
  const baseline = measureBaseline();
  
  // Aplicar optimizaciones
  const allOptimizations = [];
  
  if (optimizeAll || optimizeBuild) {
    const buildOpts = optimizeBuildPerformance();
    allOptimizations.push(...buildOpts);
  }
  
  if (optimizeAll || optimizeBundle) {
    const bundleOpts = optimizeBundleSize();
    allOptimizations.push(...bundleOpts);
  }
  
  if (optimizeAll || optimizeDeps) {
    const depsOpts = optimizeDependencies();
    allOptimizations.push(...depsOpts);
  }
  
  if (!optimizeBuild && !optimizeBundle && !optimizeDeps && !optimizeAll) {
    // Por defecto, optimizar todo
    const buildOpts = optimizeBuildPerformance();
    const bundleOpts = optimizeBundleSize();
    const depsOpts = optimizeDependencies();
    
    allOptimizations.push(...buildOpts, ...bundleOpts, ...depsOpts);
  }
  
  // Medir mejoras
  const improved = measureImprovement(baseline);
  
  // Generar reporte
  const report = generateOptimizationReport(baseline, improved, allOptimizations);
  
  // Mostrar resumen
  printOptimizationSummary(report);
  
  // Guardar reporte
  const outputDir = path.join(rootDir, 'tools', 'reports', 'optimization');
  saveOptimizationReport(report, outputDir);
  
  const totalTime = Date.now() - startTime;
  log('cyan', `\\n⏱️  Tiempo total de optimización: ${formatTime(totalTime)}`);
  
  log('blue', '\\n🎯 Próximos pasos:');
  log('yellow', '• Ejecutar tests para validar funcionalidad');
  log('yellow', '• Monitorear performance en próximos builds');
  log('yellow', '• Considerar optimizaciones adicionales específicas');
  log('yellow', '• Documentar cambios realizados');
}

main();