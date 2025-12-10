#!/usr/bin/env node

/**
 * Bundle Analyzer - Analiza el tamaño de bundles de las apps
 * Uso: node tools/scripts/bundle-analyzer.js [app-name]
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function getDirectorySize(dirPath) {
  let totalSize = 0;

  if (!fs.existsSync(dirPath)) {
    return 0;
  }

  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stats = fs.statSync(filePath);

    if (stats.isDirectory()) {
      totalSize += getDirectorySize(filePath);
    } else {
      totalSize += stats.size;
    }
  }

  return totalSize;
}

function analyzeBundle(appName) {
  log('cyan', `📊 Analizando bundle de ${appName}...`);

  const appDir = path.join(rootDir, 'apps', appName);
  const buildDir = path.join(appDir, '.svelte-kit', 'output');

  if (!fs.existsSync(buildDir)) {
    log('red', `❌ Build directory no encontrado: ${buildDir}`);
    log('yellow', `💡 Ejecuta: pnpm build:${appName}`);
    return null;
  }

  // Analizar diferentes partes del bundle
  const clientDir = path.join(buildDir, 'client');
  const serverDir = path.join(buildDir, 'server');
  const prerenderDir = path.join(buildDir, 'prerendered');

  const analysis = {
    app: appName,
    timestamp: new Date().toISOString(),
    client: {
      size: getDirectorySize(clientDir),
      path: clientDir
    },
    server: {
      size: getDirectorySize(serverDir),
      path: serverDir
    },
    prerendered: {
      size: getDirectorySize(prerenderDir),
      path: prerenderDir
    },
    total: getDirectorySize(buildDir)
  };

  // Analizar archivos JavaScript específicos
  if (fs.existsSync(clientDir)) {
    const jsFiles = [];
    const cssFiles = [];

    function scanDirectory(dir, relativePath = '') {
      const files = fs.readdirSync(dir);

      for (const file of files) {
        const filePath = path.join(dir, file);
        const stats = fs.statSync(filePath);

        if (stats.isDirectory()) {
          scanDirectory(filePath, path.join(relativePath, file));
        } else if (file.endsWith('.js')) {
          jsFiles.push({
            name: path.join(relativePath, file),
            size: stats.size,
            path: filePath
          });
        } else if (file.endsWith('.css')) {
          cssFiles.push({
            name: path.join(relativePath, file),
            size: stats.size,
            path: filePath
          });
        }
      }
    }

    scanDirectory(clientDir);

    analysis.assets = {
      js: jsFiles.sort((a, b) => b.size - a.size),
      css: cssFiles.sort((a, b) => b.size - a.size)
    };
  }

  return analysis;
}

function printAnalysis(analysis) {
  if (!analysis) return;

  log('blue', `\\n📦 Bundle Analysis - ${analysis.app}`);
  log('cyan', `⏰ ${new Date(analysis.timestamp).toLocaleString()}`);

  // Tamaños generales
  log('blue', '\\n📊 Tamaños Generales:');
  log('cyan', `   Client:      ${formatBytes(analysis.client.size)}`);
  log('cyan', `   Server:      ${formatBytes(analysis.server.size)}`);
  log('cyan', `   Prerendered: ${formatBytes(analysis.prerendered.size)}`);
  log('magenta', `   Total:       ${formatBytes(analysis.total)}`);

  // Assets JavaScript
  if (analysis.assets?.js?.length > 0) {
    log('blue', '\\n🟨 JavaScript Files (Top 10):');
    analysis.assets.js.slice(0, 10).forEach((file, index) => {
      const color = index < 3 ? 'yellow' : 'cyan';
      log(color, `   ${index + 1}. ${file.name} - ${formatBytes(file.size)}`);
    });
  }

  // Assets CSS
  if (analysis.assets?.css?.length > 0) {
    log('blue', '\\n🎨 CSS Files:');
    analysis.assets.css.forEach((file, index) => {
      log('cyan', `   ${index + 1}. ${file.name} - ${formatBytes(file.size)}`);
    });
  }

  // Warnings y recomendaciones
  log('blue', '\\n⚠️  Análisis y Recomendaciones:');

  const totalClientSize = analysis.client.size;
  if (totalClientSize > 1024 * 1024) {
    // > 1MB
    log('yellow', '   ⚠️  Bundle client > 1MB - considera code splitting');
  }

  if (analysis.assets?.js) {
    const largeJsFiles = analysis.assets.js.filter(f => f.size > 100 * 1024); // > 100KB
    if (largeJsFiles.length > 0) {
      log('yellow', `   ⚠️  ${largeJsFiles.length} archivos JS > 100KB`);
    }
  }

  if (totalClientSize < 500 * 1024) {
    // < 500KB
    log('green', '   ✅ Tamaño de bundle optimizado');
  }
}

function saveAnalysis(analysis, outputDir) {
  if (!analysis) return;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `bundle-analysis-${analysis.app}-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  // Crear directorio si no existe
  fs.mkdirSync(outputDir, { recursive: true });

  // Guardar análisis
  fs.writeFileSync(filepath, JSON.stringify(analysis, null, 2));

  log('green', `💾 Análisis guardado: ${filepath}`);

  // Crear/actualizar análisis más reciente
  const latestPath = path.join(
    outputDir,
    `bundle-analysis-${analysis.app}-latest.json`
  );
  fs.writeFileSync(latestPath, JSON.stringify(analysis, null, 2));

  return filepath;
}

function compareWithPrevious(analysis, outputDir) {
  if (!analysis) return;

  const previousPath = path.join(
    outputDir,
    `bundle-analysis-${analysis.app}-latest.json`
  );

  if (!fs.existsSync(previousPath)) {
    log('yellow', '📊 No hay análisis previo para comparar');
    return;
  }

  try {
    const previous = JSON.parse(fs.readFileSync(previousPath, 'utf8'));

    log('blue', '\\n📈 Comparación con análisis previo:');

    const totalDiff = analysis.total - previous.total;
    const clientDiff = analysis.client.size - previous.client.size;

    const totalColor = totalDiff > 0 ? 'red' : totalDiff < 0 ? 'green' : 'cyan';
    const clientColor =
      clientDiff > 0 ? 'red' : clientDiff < 0 ? 'green' : 'cyan';

    const totalSign = totalDiff > 0 ? '+' : '';
    const clientSign = clientDiff > 0 ? '+' : '';

    log(totalColor, `   Total: ${totalSign}${formatBytes(totalDiff)}`);
    log(clientColor, `   Client: ${clientSign}${formatBytes(clientDiff)}`);

    if (Math.abs(totalDiff) < 1024) {
      log('green', '   ✅ Cambio mínimo en tamaño');
    } else if (totalDiff > 50 * 1024) {
      log('yellow', '   ⚠️  Incremento significativo en tamaño');
    }
  } catch (error) {
    log('red', `❌ Error comparando con análisis previo: ${error.message}`);
  }
}

function getAvailableApps() {
  const appsDir = path.join(rootDir, 'apps');

  if (!fs.existsSync(appsDir)) {
    return [];
  }

  return fs.readdirSync(appsDir).filter(name => {
    const appPath = path.join(appsDir, name);
    return (
      fs.statSync(appPath).isDirectory() &&
      fs.existsSync(path.join(appPath, 'package.json'))
    );
  });
}

function analyzeAllApps() {
  const apps = getAvailableApps();
  const results = [];

  log('blue', '🔍 Analizando todas las apps...');

  for (const app of apps) {
    const analysis = analyzeBundle(app);
    if (analysis) {
      results.push(analysis);
      printAnalysis(analysis);

      const outputDir = path.join(
        rootDir,
        'tools',
        'reports',
        'bundle-analysis'
      );
      saveAnalysis(analysis, outputDir);
      compareWithPrevious(analysis, outputDir);
    }
  }

  // Resumen general
  if (results.length > 0) {
    log('blue', '\\n📊 Resumen General:');

    const totalSize = results.reduce((sum, r) => sum + r.total, 0);
    const totalClientSize = results.reduce((sum, r) => sum + r.client.size, 0);

    log('cyan', `   Apps analizadas: ${results.length}`);
    log('cyan', `   Tamaño total: ${formatBytes(totalSize)}`);
    log('cyan', `   Tamaño client total: ${formatBytes(totalClientSize)}`);
    log(
      'cyan',
      `   Promedio por app: ${formatBytes(totalSize / results.length)}`
    );
  }

  return results;
}

function main() {
  const args = process.argv.slice(2);
  const appName = args[0];

  log('blue', '📊 Bundle Analyzer - Sync Platform');

  if (appName && appName !== '--all') {
    // Analizar app específica
    const analysis = analyzeBundle(appName);
    printAnalysis(analysis);

    if (analysis) {
      const outputDir = path.join(
        rootDir,
        'tools',
        'reports',
        'bundle-analysis'
      );
      saveAnalysis(analysis, outputDir);
      compareWithPrevious(analysis, outputDir);
    }
  } else {
    // Analizar todas las apps
    analyzeAllApps();
  }

  log('blue', '\\n🎯 Próximos pasos:');
  log('yellow', '• Revisar archivos grandes y considerar code splitting');
  log('yellow', '• Optimizar imports y dependencias no utilizadas');
  log('yellow', '• Configurar compresión en servidor');
  log('yellow', '• Monitorear cambios en tamaño con cada deploy');
}

main();
