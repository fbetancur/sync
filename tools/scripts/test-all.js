#!/usr/bin/env node

/**
 * Script para ejecutar todos los tests del monorepo
 * Uso: node tools/scripts/test-all.js [--packages-only] [--apps-only] [--coverage]
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
  log('cyan', `🧪 ${description}`);

  try {
    const startTime = Date.now();
    const output = execSync(command, {
      stdio: 'pipe',
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    // Parsear output para obtener estadísticas
    const outputStr = output.toString();
    const testMatch = outputStr.match(/(\\d+) passed/);
    const failMatch = outputStr.match(/(\\d+) failed/);

    const passed = testMatch ? parseInt(testMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    if (failed > 0) {
      log(
        'red',
        `❌ ${description} - ${passed} passed, ${failed} failed (${duration}s)`
      );
      log('red', outputStr);
      return { success: false, passed, failed, duration: parseFloat(duration) };
    } else {
      log('green', `✅ ${description} - ${passed} tests passed (${duration}s)`);
      return { success: true, passed, failed, duration: parseFloat(duration) };
    }
  } catch (error) {
    log('red', `❌ Error en: ${description}`);
    log('red', error.stdout?.toString() || error.message);
    return { success: false, passed: 0, failed: 1, duration: 0 };
  }
}

function getPackages() {
  const packagesDir = path.join(rootDir, 'packages/@sync');
  if (!fs.existsSync(packagesDir)) {
    return [];
  }

  return fs
    .readdirSync(packagesDir)
    .filter(name => {
      const packagePath = path.join(packagesDir, name);
      return (
        fs.statSync(packagePath).isDirectory() &&
        fs.existsSync(path.join(packagePath, 'package.json'))
      );
    })
    .map(name => `@sync/${name}`);
}

function getApps() {
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

function testPackages(coverage = false) {
  log('blue', '📦 Ejecutando tests de packages...');

  const packages = getPackages();
  const results = [];

  for (const packageName of packages) {
    const coverageFlag = coverage ? '--coverage' : '';
    const result = execCommand(
      `pnpm --filter ${packageName} test ${coverageFlag}`,
      `Testing ${packageName}`
    );

    results.push({
      name: packageName,
      ...result
    });
  }

  return results;
}

function testApps(coverage = false) {
  log('blue', '📱 Ejecutando tests de aplicaciones...');

  const apps = getApps();
  const results = [];

  for (const appName of apps) {
    const coverageFlag = coverage ? '--coverage' : '';
    const result = execCommand(
      `pnpm --filter ${appName} test ${coverageFlag}`,
      `Testing ${appName}`
    );

    results.push({
      name: appName,
      ...result
    });
  }

  return results;
}

function lintAll() {
  log('blue', '🔍 Ejecutando linting...');

  const result = execCommand('pnpm lint', 'Linting todo el código');

  return result;
}

function typeCheck() {
  log('blue', '🔎 Verificando tipos TypeScript...');

  const packages = getPackages();
  const apps = getApps();
  const results = [];

  // Type check packages
  for (const packageName of packages) {
    const result = execCommand(
      `pnpm --filter ${packageName} run tsc --noEmit`,
      `Type checking ${packageName}`
    );

    results.push({
      name: packageName,
      ...result
    });
  }

  // Type check apps
  for (const appName of apps) {
    const result = execCommand(
      `pnpm --filter ${appName} run svelte-check --tsconfig ./tsconfig.json`,
      `Type checking ${appName}`
    );

    results.push({
      name: appName,
      ...result
    });
  }

  return results;
}

function printSummary(
  packageResults,
  appResults,
  lintResult,
  typeResults,
  totalTime
) {
  log('blue', '\\n📊 Resumen de Tests:');

  // Estadísticas de packages
  if (packageResults.length > 0) {
    const packageStats = packageResults.reduce(
      (acc, result) => ({
        passed: acc.passed + result.passed,
        failed: acc.failed + result.failed,
        duration: acc.duration + result.duration
      }),
      { passed: 0, failed: 0, duration: 0 }
    );

    log(
      'cyan',
      `📦 Packages: ${packageStats.passed} passed, ${packageStats.failed} failed`
    );

    packageResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      log(
        'cyan',
        `   ${status} ${result.name}: ${result.passed} passed, ${result.failed} failed`
      );
    });
  }

  // Estadísticas de apps
  if (appResults.length > 0) {
    const appStats = appResults.reduce(
      (acc, result) => ({
        passed: acc.passed + result.passed,
        failed: acc.failed + result.failed,
        duration: acc.duration + result.duration
      }),
      { passed: 0, failed: 0, duration: 0 }
    );

    log(
      'cyan',
      `📱 Apps: ${appStats.passed} passed, ${appStats.failed} failed`
    );

    appResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      log(
        'cyan',
        `   ${status} ${result.name}: ${result.passed} passed, ${result.failed} failed`
      );
    });
  }

  // Linting
  if (lintResult) {
    const lintStatus = lintResult.success ? '✅' : '❌';
    log('cyan', `🔍 Linting: ${lintStatus}`);
  }

  // Type checking
  if (typeResults.length > 0) {
    const typeErrors = typeResults.filter(r => !r.success).length;
    const typeStatus = typeErrors === 0 ? '✅' : '❌';
    log('cyan', `🔎 Type Check: ${typeStatus} (${typeErrors} errors)`);
  }

  log('cyan', `⏱️  Tiempo total: ${totalTime}s`);

  // Determinar éxito general
  const allPackagesPass = packageResults.every(r => r.success);
  const allAppsPass = appResults.every(r => r.success);
  const lintPasses = !lintResult || lintResult.success;
  const typeCheckPasses = typeResults.every(r => r.success);

  const overallSuccess =
    allPackagesPass && allAppsPass && lintPasses && typeCheckPasses;

  if (overallSuccess) {
    log('green', '\\n🎉 Todos los tests pasaron!');
    log('yellow', '\\n📋 Próximos pasos:');
    log('yellow', '• Build: pnpm build');
    log('yellow', '• Deploy: git push');
  } else {
    log('red', '\\n❌ Algunos tests fallaron');
    log('yellow', '\\n🔧 Troubleshooting:');
    log('yellow', '• Revisar errores específicos arriba');
    log('yellow', '• Ejecutar tests individuales para debug');
    log('yellow', '• Verificar dependencias y configuración');
  }

  return overallSuccess;
}

function main() {
  const args = process.argv.slice(2);
  const packagesOnly = args.includes('--packages-only');
  const appsOnly = args.includes('--apps-only');
  const coverage = args.includes('--coverage');
  const skipLint = args.includes('--skip-lint');
  const skipTypeCheck = args.includes('--skip-type-check');

  log('blue', '🧪 Test Suite - Sync Platform');

  const startTime = Date.now();
  let packageResults = [];
  let appResults = [];
  let lintResult = null;
  let typeResults = [];

  // Ejecutar tests de packages
  if (!appsOnly) {
    packageResults = testPackages(coverage);
  }

  // Ejecutar tests de apps
  if (!packagesOnly) {
    appResults = testApps(coverage);
  }

  // Linting
  if (!skipLint) {
    lintResult = lintAll();
  }

  // Type checking
  if (!skipTypeCheck) {
    typeResults = typeCheck();
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  const success = printSummary(
    packageResults,
    appResults,
    lintResult,
    typeResults,
    totalTime
  );

  process.exit(success ? 0 : 1);
}

main();
