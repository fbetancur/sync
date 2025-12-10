#!/usr/bin/env node

/**
 * Performance Monitor - Monitorea métricas de performance del monorepo
 * Uso: node tools/scripts/performance-monitor.js [--build] [--test] [--all]
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

function execCommand(command, description) {
  log('cyan', `⏱️  ${description}...`);
  
  const startTime = Date.now();
  try {
    execSync(command, { 
      stdio: 'pipe', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    const duration = Date.now() - startTime;
    log('green', `✅ ${description} completado en ${formatTime(duration)}`);
    return { success: true, duration, command, description };
  } catch (error) {
    const duration = Date.now() - startTime;
    log('red', `❌ ${description} falló en ${formatTime(duration)}`);
    return { success: false, duration, command, description, error: error.message };
  }
}

function getWorkspaces() {
  const packages = [];
  const apps = [];
  
  // Obtener packages
  const packagesDir = path.join(rootDir, 'packages/@sync');
  if (fs.existsSync(packagesDir)) {
    fs.readdirSync(packagesDir).forEach(name => {
      const packagePath = path.join(packagesDir, name);
      if (fs.statSync(packagePath).isDirectory() && 
          fs.existsSync(path.join(packagePath, 'package.json'))) {
        packages.push(`@sync/${name}`);
      }
    });
  }
  
  // Obtener apps
  const appsDir = path.join(rootDir, 'apps');
  if (fs.existsSync(appsDir)) {
    fs.readdirSync(appsDir).forEach(name => {
      const appPath = path.join(appsDir, name);
      if (fs.statSync(appPath).isDirectory() && 
          fs.existsSync(path.join(appPath, 'package.json'))) {
        apps.push(name);
      }
    });
  }
  
  return { packages, apps };
}

function measureBuildPerformance() {
  log('blue', '🏗️  Midiendo performance de builds...');
  
  const { packages, apps } = getWorkspaces();
  const results = {
    timestamp: new Date().toISOString(),
    type: 'build',
    packages: [],
    apps: [],
    total: { duration: 0, success: true }
  };
  
  const overallStart = Date.now();
  
  // Build packages
  log('cyan', '📦 Building packages...');
  for (const pkg of packages) {
    const result = execCommand(
      `pnpm --filter ${pkg} build`,
      `Building ${pkg}`
    );
    results.packages.push({ name: pkg, ...result });
    results.total.success = results.total.success && result.success;
  }
  
  // Build apps
  log('cyan', '🚀 Building apps...');
  for (const app of apps) {
    const result = execCommand(
      `pnpm --filter ${app} build`,
      `Building ${app}`
    );
    results.apps.push({ name: app, ...result });
    results.total.success = results.total.success && result.success;
  }
  
  results.total.duration = Date.now() - overallStart;
  
  return results;
}

function measureTestPerformance() {
  log('blue', '🧪 Midiendo performance de tests...');
  
  const { packages, apps } = getWorkspaces();
  const results = {
    timestamp: new Date().toISOString(),
    type: 'test',
    packages: [],
    apps: [],
    total: { duration: 0, success: true }
  };
  
  const overallStart = Date.now();
  
  // Test packages
  log('cyan', '📦 Testing packages...');
  for (const pkg of packages) {
    const result = execCommand(
      `pnpm --filter ${pkg} test --run`,
      `Testing ${pkg}`
    );
    results.packages.push({ name: pkg, ...result });
    results.total.success = results.total.success && result.success;
  }
  
  // Test apps
  log('cyan', '🚀 Testing apps...');
  for (const app of apps) {
    const result = execCommand(
      `pnpm --filter ${app} test --run`,
      `Testing ${app}`
    );
    results.apps.push({ name: app, ...result });
    results.total.success = results.total.success && result.success;
  }
  
  results.total.duration = Date.now() - overallStart;
  
  return results;
}

function measureInstallPerformance() {
  log('blue', '📥 Midiendo performance de instalación...');
  
  // Limpiar node_modules para medición real
  const cleanResult = execCommand(
    'pnpm clean',
    'Cleaning node_modules'
  );
  
  if (!cleanResult.success) {
    log('yellow', '⚠️  No se pudo limpiar, midiendo reinstalación...');
  }
  
  const installResult = execCommand(
    'pnpm install',
    'Installing dependencies'
  );
  
  return {
    timestamp: new Date().toISOString(),
    type: 'install',
    clean: cleanResult,
    install: installResult,
    total: {
      duration: (cleanResult.duration || 0) + installResult.duration,
      success: installResult.success
    }
  };
}

function measureLintPerformance() {
  log('blue', '🔍 Midiendo performance de linting...');
  
  const lintResult = execCommand(
    'node tools/scripts/lint-fix.js --check',
    'Running lint check'
  );
  
  const formatResult = execCommand(
    'node tools/scripts/lint-fix.js --format',
    'Running format check'
  );
  
  return {
    timestamp: new Date().toISOString(),
    type: 'lint',
    lint: lintResult,
    format: formatResult,
    total: {
      duration: lintResult.duration + formatResult.duration,
      success: lintResult.success && formatResult.success
    }
  };
}

function printResults(results) {
  log('blue', `\\n📊 Resultados de Performance - ${results.type.toUpperCase()}`);
  log('cyan', `⏰ ${new Date(results.timestamp).toLocaleString()}`);
  
  if (results.packages && results.packages.length > 0) {
    log('blue', '\\n📦 Packages:');
    results.packages.forEach(pkg => {
      const status = pkg.success ? '✅' : '❌';
      const color = pkg.success ? 'green' : 'red';
      log(color, `   ${status} ${pkg.name}: ${formatTime(pkg.duration)}`);
    });
  }
  
  if (results.apps && results.apps.length > 0) {
    log('blue', '\\n🚀 Apps:');
    results.apps.forEach(app => {
      const status = app.success ? '✅' : '❌';
      const color = app.success ? 'green' : 'red';
      log(color, `   ${status} ${app.name}: ${formatTime(app.duration)}`);
    });
  }
  
  if (results.clean && results.install) {
    log('blue', '\\n📥 Instalación:');
    log('cyan', `   Clean: ${formatTime(results.clean.duration)}`);
    log('cyan', `   Install: ${formatTime(results.install.duration)}`);
  }
  
  if (results.lint && results.format) {
    log('blue', '\\n🔍 Linting:');
    log('cyan', `   Lint: ${formatTime(results.lint.duration)}`);
    log('cyan', `   Format: ${formatTime(results.format.duration)}`);
  }
  
  // Total
  const totalColor = results.total.success ? 'green' : 'red';
  const totalStatus = results.total.success ? '✅' : '❌';
  log('magenta', `\\n${totalStatus} Total: ${formatTime(results.total.duration)}`);
  
  // Análisis y recomendaciones
  log('blue', '\\n📈 Análisis:');
  
  if (results.type === 'build') {
    if (results.total.duration > 120000) { // > 2 minutos
      log('yellow', '   ⚠️  Build time > 2 minutos - considera optimizaciones');
    } else if (results.total.duration < 30000) { // < 30 segundos
      log('green', '   ✅ Build time optimizado');
    }
  }
  
  if (results.type === 'test') {
    if (results.total.duration > 60000) { // > 1 minuto
      log('yellow', '   ⚠️  Test time > 1 minuto - considera paralelización');
    } else if (results.total.duration < 15000) { // < 15 segundos
      log('green', '   ✅ Test time optimizado');
    }
  }
  
  if (results.type === 'install') {
    if (results.total.duration > 180000) { // > 3 minutos
      log('yellow', '   ⚠️  Install time > 3 minutos - revisa dependencias');
    } else if (results.total.duration < 60000) { // < 1 minuto
      log('green', '   ✅ Install time optimizado');
    }
  }
}

function saveResults(results, outputDir) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `performance-${results.type}-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);
  
  // Crear directorio si no existe
  fs.mkdirSync(outputDir, { recursive: true });
  
  // Guardar resultados
  fs.writeFileSync(filepath, JSON.stringify(results, null, 2));
  
  log('green', `💾 Resultados guardados: ${filepath}`);
  
  // Crear/actualizar resultados más recientes
  const latestPath = path.join(outputDir, `performance-${results.type}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(results, null, 2));
  
  return filepath;
}

function compareWithPrevious(results, outputDir) {
  const previousPath = path.join(outputDir, `performance-${results.type}-latest.json`);
  
  if (!fs.existsSync(previousPath)) {
    log('yellow', '📊 No hay resultados previos para comparar');
    return;
  }
  
  try {
    const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));
    
    log('blue', '\\n📈 Comparación con medición previa:');
    
    const totalDiff = results.total.duration - previous.total.duration;
    const totalPercent = ((totalDiff / previous.total.duration) * 100).toFixed(1);
    
    const color = totalDiff > 0 ? 'red' : totalDiff < 0 ? 'green' : 'cyan';
    const sign = totalDiff > 0 ? '+' : '';
    
    log(color, `   Total: ${sign}${formatTime(totalDiff)} (${sign}${totalPercent}%)`);
    
    if (Math.abs(totalDiff) < 1000) {
      log('green', '   ✅ Cambio mínimo en performance');
    } else if (totalDiff > 10000) {
      log('yellow', '   ⚠️  Degradación significativa en performance');
    } else if (totalDiff < -10000) {
      log('green', '   🚀 Mejora significativa en performance');
    }
    
  } catch (error) {
    log('red', `❌ Error comparando con resultados previos: ${error.message}`);
  }
}

function generateReport(outputDir) {
  log('blue', '📋 Generando reporte de performance...');
  
  const reportTypes = ['build', 'test', 'install', 'lint'];
  const report = {
    timestamp: new Date().toISOString(),
    summary: {},
    details: {}
  };
  
  for (const type of reportTypes) {
    const latestPath = path.join(outputDir, `performance-${type}-latest.json`);
    
    if (fs.existsSync(latestPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
        report.details[type] = data;
        report.summary[type] = {
          duration: data.total.duration,
          success: data.total.success,
          timestamp: data.timestamp
        };
      } catch (error) {
        log('yellow', `⚠️  No se pudo leer ${type}: ${error.message}`);
      }
    }
  }
  
  // Guardar reporte
  const reportPath = path.join(outputDir, 'performance-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // Generar reporte markdown
  const mdReport = generateMarkdownReport(report);
  const mdPath = path.join(outputDir, 'performance-report.md');
  fs.writeFileSync(mdPath, mdReport);
  
  log('green', `📋 Reporte generado: ${reportPath}`);
  log('green', `📋 Reporte MD: ${mdPath}`);
  
  return report;
}

function generateMarkdownReport(report) {
  const timestamp = new Date(report.timestamp).toLocaleString();
  
  let md = `# Performance Report\\n\\n`;
  md += `**Generated:** ${timestamp}\\n\\n`;
  
  md += `## Summary\\n\\n`;
  md += `| Metric | Duration | Status | Last Updated |\\n`;
  md += `|--------|----------|--------|--------------|\\n`;
  
  Object.entries(report.summary).forEach(([type, data]) => {
    const status = data.success ? '✅ Pass' : '❌ Fail';
    const lastUpdated = new Date(data.timestamp).toLocaleString();
    md += `| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${formatTime(data.duration)} | ${status} | ${lastUpdated} |\\n`;
  });
  
  md += `\\n## Recommendations\\n\\n`;
  
  Object.entries(report.summary).forEach(([type, data]) => {
    if (type === 'build' && data.duration > 120000) {
      md += `- 🏗️ **Build Performance**: Consider optimizing build pipeline (current: ${formatTime(data.duration)})\\n`;
    }
    if (type === 'test' && data.duration > 60000) {
      md += `- 🧪 **Test Performance**: Consider test parallelization (current: ${formatTime(data.duration)})\\n`;
    }
    if (type === 'install' && data.duration > 180000) {
      md += `- 📥 **Install Performance**: Review dependencies (current: ${formatTime(data.duration)})\\n`;
    }
  });
  
  const totalDuration = Object.values(report.summary).reduce((sum, data) => sum + data.duration, 0);
  md += `\\n**Total Development Cycle Time:** ${formatTime(totalDuration)}\\n`;
  
  return md;
}

function main() {
  const args = process.argv.slice(2);
  const measureBuild = args.includes('--build');
  const measureTest = args.includes('--test');
  const measureAll = args.includes('--all');
  const generateReportOnly = args.includes('--report');
  
  log('blue', '⏱️  Performance Monitor - Sync Platform');
  
  const outputDir = path.join(rootDir, 'tools', 'reports', 'performance');
  
  if (generateReportOnly) {
    generateReport(outputDir);
    return;
  }
  
  const measurements = [];
  
  if (measureAll || (!measureBuild && !measureTest)) {
    // Medir todo por defecto
    measurements.push(
      () => measureInstallPerformance(),
      () => measureLintPerformance(),
      () => measureBuildPerformance(),
      () => measureTestPerformance()
    );
  } else {
    if (measureBuild) measurements.push(() => measureBuildPerformance());
    if (measureTest) measurements.push(() => measureTestPerformance());
  }
  
  // Ejecutar mediciones
  for (const measure of measurements) {
    const results = measure();
    printResults(results);
    saveResults(results, outputDir);
    compareWithPrevious(results, outputDir);
  }
  
  // Generar reporte final
  const report = generateReport(outputDir);
  
  log('blue', '\\n🎯 Próximos pasos:');
  log('yellow', '• Revisar métricas de performance regularmente');
  log('yellow', '• Optimizar procesos que tomen más tiempo');
  log('yellow', '• Configurar alertas para degradación de performance');
  log('yellow', '• Integrar métricas en CI/CD pipeline');
}

main();