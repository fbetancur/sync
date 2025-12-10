#!/usr/bin/env node

/**
 * Script para construir todo el monorepo en el orden correcto
 * Uso: node tools/scripts/build-all.js [--packages-only] [--apps-only]
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
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
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function execCommand(command, description) {
  log('cyan', `🔨 ${description}`);
  
  try {
    const startTime = Date.now();
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('green', `✅ ${description} completado (${duration}s)`);
    return true;
  } catch (error) {
    log('red', `❌ Error en: ${description}`);
    log('red', `   ${error.message}`);
    return false;
  }
}

function getPackages() {
  const packagesDir = path.join(rootDir, 'packages/@sync');
  if (!fs.existsSync(packagesDir)) {
    return [];
  }
  
  return fs.readdirSync(packagesDir)
    .filter(name => {
      const packagePath = path.join(packagesDir, name);
      return fs.statSync(packagePath).isDirectory() && 
             fs.existsSync(path.join(packagePath, 'package.json'));
    })
    .map(name => `@sync/${name}`);
}

function getApps() {
  const appsDir = path.join(rootDir, 'apps');
  if (!fs.existsSync(appsDir)) {
    return [];
  }
  
  return fs.readdirSync(appsDir)
    .filter(name => {
      const appPath = path.join(appsDir, name);
      return fs.statSync(appPath).isDirectory() && 
             fs.existsSync(path.join(appPath, 'package.json'));
    });
}

function buildPackages() {
  log('blue', '📦 Construyendo packages...');
  
  const packages = getPackages();
  const buildOrder = ['@sync/types', '@sync/core', '@sync/ui'];
  
  // Construir en orden de dependencias
  for (const packageName of buildOrder) {
    if (packages.includes(packageName)) {
      const success = execCommand(
        `pnpm --filter ${packageName} build`,
        `Construyendo ${packageName}`
      );
      
      if (!success) {
        return false;
      }
    }
  }
  
  // Construir packages restantes
  for (const packageName of packages) {
    if (!buildOrder.includes(packageName)) {
      const success = execCommand(
        `pnpm --filter ${packageName} build`,
        `Construyendo ${packageName}`
      );
      
      if (!success) {
        return false;
      }
    }
  }
  
  log('green', '✅ Todos los packages construidos exitosamente');
  return true;
}

function buildApps() {
  log('blue', '📱 Construyendo aplicaciones...');
  
  const apps = getApps();
  
  for (const appName of apps) {
    const success = execCommand(
      `pnpm --filter ${appName} build`,
      `Construyendo ${appName}`
    );
    
    if (!success) {
      return false;
    }
  }
  
  log('green', '✅ Todas las aplicaciones construidas exitosamente');
  return true;
}

function cleanAll() {
  log('blue', '🧹 Limpiando builds anteriores...');
  
  const success = execCommand(
    'pnpm clean',
    'Limpiando todos los builds'
  );
  
  return success;
}

function validateEnvironment() {
  log('blue', '🔍 Validando entorno...');
  
  // Verificar pnpm
  try {
    execSync('pnpm --version', { stdio: 'pipe' });
  } catch (error) {
    log('red', '❌ pnpm no está instalado');
    return false;
  }
  
  // Verificar que estamos en la raíz del monorepo
  if (!fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) {
    log('red', '❌ No se encontró pnpm-workspace.yaml');
    return false;
  }
  
  log('green', '✅ Entorno validado');
  return true;
}

function printSummary(packagesBuilt, appsBuilt, totalTime) {
  log('blue', '\\n📊 Resumen del Build:');
  log('cyan', `📦 Packages construidos: ${packagesBuilt ? '✅' : '❌'}`);
  log('cyan', `📱 Apps construidas: ${appsBuilt ? '✅' : '❌'}`);
  log('cyan', `⏱️  Tiempo total: ${totalTime}s`);
  
  if (packagesBuilt && appsBuilt) {
    log('green', '\\n🎉 Build completo exitoso!');
    log('yellow', '\\n📋 Próximos pasos:');
    log('yellow', '• Ejecutar tests: pnpm test');
    log('yellow', '• Iniciar desarrollo: pnpm dev:credisync');
    log('yellow', '• Hacer deployment: git push');
  } else {
    log('red', '\\n❌ Build falló');
    log('yellow', '\\n🔧 Troubleshooting:');
    log('yellow', '• Verificar errores de TypeScript');
    log('yellow', '• Ejecutar: pnpm install');
    log('yellow', '• Revisar dependencias entre packages');
  }
}

function main() {
  const args = process.argv.slice(2);
  const packagesOnly = args.includes('--packages-only');
  const appsOnly = args.includes('--apps-only');
  const clean = args.includes('--clean');
  const skipValidation = args.includes('--skip-validation');
  
  log('blue', '🏗️  Build System - Sync Platform');
  
  const startTime = Date.now();
  let packagesBuilt = false;
  let appsBuilt = false;
  
  // Validar entorno
  if (!skipValidation && !validateEnvironment()) {
    process.exit(1);
  }
  
  // Limpiar si se solicita
  if (clean) {
    if (!cleanAll()) {
      process.exit(1);
    }
  }
  
  // Construir packages
  if (!appsOnly) {
    packagesBuilt = buildPackages();
    if (!packagesBuilt) {
      process.exit(1);
    }
  } else {
    packagesBuilt = true; // Asumimos que ya están construidos
  }
  
  // Construir apps
  if (!packagesOnly) {
    appsBuilt = buildApps();
    if (!appsBuilt) {
      process.exit(1);
    }
  } else {
    appsBuilt = true; // No se construyen apps
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  printSummary(packagesBuilt, appsBuilt, totalTime);
  
  process.exit(0);
}

main();