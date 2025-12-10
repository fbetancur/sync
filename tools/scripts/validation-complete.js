#!/usr/bin/env node

/**
 * Validación Completa - Ejecuta todas las validaciones del monorepo
 * Uso: node tools/scripts/validation-complete.js [--staging] [--production]
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

function execCommand(command, description, continueOnError = false) {
  log('cyan', `🔧 ${description}...`);

  const startTime = Date.now();
  try {
    const output = execSync(command, {
      stdio: 'pipe',
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });

    const duration = Date.now() - startTime;
    log('green', `✅ ${description} completado (${formatTime(duration)})`);

    return {
      success: true,
      duration,
      command,
      description,
      output: output.toString()
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    log('red', `❌ ${description} falló (${formatTime(duration)})`);

    if (!continueOnError) {
      log('red', `   Error: ${error.message}`);
      if (error.stdout) {
        log('yellow', `   Stdout: ${error.stdout.toString().slice(0, 500)}...`);
      }
      if (error.stderr) {
        log('yellow', `   Stderr: ${error.stderr.toString().slice(0, 500)}...`);
      }
    }

    return {
      success: false,
      duration,
      command,
      description,
      error: error.message,
      stdout: error.stdout?.toString(),
      stderr: error.stderr?.toString()
    };
  }
}

function validateEnvironment() {
  log('blue', '🌍 Validando entorno de desarrollo...');

  const results = [];

  // Validar Node.js version
  try {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion >= 18) {
      log('green', `✅ Node.js version: ${nodeVersion}`);
      results.push({
        check: 'Node.js version',
        status: 'pass',
        value: nodeVersion
      });
    } else {
      log('red', `❌ Node.js version: ${nodeVersion} (requiere >= 18)`);
      results.push({
        check: 'Node.js version',
        status: 'fail',
        value: nodeVersion
      });
    }
  } catch (error) {
    log('red', `❌ Error verificando Node.js: ${error.message}`);
    results.push({
      check: 'Node.js version',
      status: 'error',
      error: error.message
    });
  }

  // Validar pnpm
  try {
    const pnpmVersion = execSync('pnpm --version', { stdio: 'pipe' })
      .toString()
      .trim();
    log('green', `✅ pnpm version: ${pnpmVersion}`);
    results.push({ check: 'pnpm version', status: 'pass', value: pnpmVersion });
  } catch (error) {
    log('red', `❌ pnpm no encontrado`);
    results.push({
      check: 'pnpm version',
      status: 'fail',
      error: 'pnpm not found'
    });
  }

  // Validar Git
  try {
    const gitVersion = execSync('git --version', { stdio: 'pipe' })
      .toString()
      .trim();
    log('green', `✅ ${gitVersion}`);
    results.push({ check: 'Git version', status: 'pass', value: gitVersion });
  } catch (error) {
    log('red', `❌ Git no encontrado`);
    results.push({
      check: 'Git version',
      status: 'fail',
      error: 'Git not found'
    });
  }

  return results;
}

function validateWorkspaceStructure() {
  log('blue', '📁 Validando estructura del workspace...');

  const results = [];
  const requiredDirs = [
    'apps',
    'packages/@sync',
    'docs',
    'tools/scripts',
    'specs'
  ];

  const requiredFiles = [
    'package.json',
    'pnpm-workspace.yaml',
    'tsconfig.json',
    '.eslintrc.shared.cjs',
    '.prettierrc.shared'
  ];

  // Validar directorios
  requiredDirs.forEach(dir => {
    const dirPath = path.join(rootDir, dir);
    if (fs.existsSync(dirPath)) {
      log('green', `✅ Directorio: ${dir}`);
      results.push({ check: `Directory: ${dir}`, status: 'pass' });
    } else {
      log('red', `❌ Directorio faltante: ${dir}`);
      results.push({ check: `Directory: ${dir}`, status: 'fail' });
    }
  });

  // Validar archivos
  requiredFiles.forEach(file => {
    const filePath = path.join(rootDir, file);
    if (fs.existsSync(filePath)) {
      log('green', `✅ Archivo: ${file}`);
      results.push({ check: `File: ${file}`, status: 'pass' });
    } else {
      log('red', `❌ Archivo faltante: ${file}`);
      results.push({ check: `File: ${file}`, status: 'fail' });
    }
  });

  return results;
}

function validateDependencies() {
  log('blue', '📦 Validando dependencias...');

  const results = [];

  // Validar instalación de dependencias
  const installResult = execCommand(
    'pnpm install --frozen-lockfile',
    'Validando instalación de dependencias'
  );
  results.push(installResult);

  if (!installResult.success) {
    return results;
  }

  // Validar variables de entorno
  const envResult = execCommand(
    'node tools/scripts/validate-env.js',
    'Validando variables de entorno',
    true // Continuar aunque falle
  );
  results.push(envResult);

  return results;
}

function validateBuilds() {
  log('blue', '🏗️ Validando builds...');

  const results = [];

  // Build packages
  const packagesResult = execCommand(
    'pnpm build:packages',
    'Building packages'
  );
  results.push(packagesResult);

  if (!packagesResult.success) {
    return results;
  }

  // Build apps
  const appsResult = execCommand('pnpm build:apps', 'Building apps');
  results.push(appsResult);

  return results;
}

function validateTests() {
  log('blue', '🧪 Validando tests...');

  const results = [];

  // Test packages
  const packagesResult = execCommand(
    'pnpm test:packages --run',
    'Testing packages'
  );
  results.push(packagesResult);

  // Test apps (continuar aunque falle)
  const appsResult = execCommand('pnpm test:apps --run', 'Testing apps', true);
  results.push(appsResult);

  return results;
}

function validateLinting() {
  log('blue', '🔍 Validando linting y formatting...');

  const results = [];

  // Lint check
  const lintResult = execCommand(
    'node tools/scripts/lint-fix.js --check',
    'Checking linting',
    true
  );
  results.push(lintResult);

  // Format check
  const formatResult = execCommand(
    'node tools/scripts/lint-fix.js --format',
    'Checking formatting',
    true
  );
  results.push(formatResult);

  return results;
}

function validateDeployment(environment = 'staging') {
  log('blue', `🚀 Validando deployment (${environment})...`);

  const results = [];

  if (environment === 'staging' || environment === 'production') {
    // Validar configuración de Vercel
    const vercelFiles = [
      'apps/credisync/vercel.json',
      'apps/healthsync/vercel.json',
      'apps/surveysync/vercel.json'
    ];

    vercelFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        log('green', `✅ Configuración: ${file}`);
        results.push({ check: `Vercel config: ${file}`, status: 'pass' });
      } else {
        log('yellow', `⚠️  Configuración faltante: ${file}`);
        results.push({ check: `Vercel config: ${file}`, status: 'warning' });
      }
    });

    // Validar GitHub Actions
    const workflowFiles = [
      '.github/workflows/credisync-deploy.yml',
      '.github/workflows/packages-test.yml'
    ];

    workflowFiles.forEach(file => {
      const filePath = path.join(rootDir, file);
      if (fs.existsSync(filePath)) {
        log('green', `✅ Workflow: ${file}`);
        results.push({ check: `GitHub workflow: ${file}`, status: 'pass' });
      } else {
        log('red', `❌ Workflow faltante: ${file}`);
        results.push({ check: `GitHub workflow: ${file}`, status: 'fail' });
      }
    });
  }

  return results;
}

function validatePerformance() {
  log('blue', '⚡ Validando performance...');

  const results = [];

  // Ejecutar performance monitor
  const perfResult = execCommand(
    'node tools/scripts/performance-monitor.js --build',
    'Measuring build performance'
  );
  results.push(perfResult);

  // Bundle analysis
  const bundleResult = execCommand(
    'node tools/scripts/bundle-analyzer.js --all',
    'Analyzing bundle sizes'
  );
  results.push(bundleResult);

  return results;
}

function generateValidationReport(allResults) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      warnings: 0
    },
    sections: {},
    recommendations: []
  };

  // Procesar resultados por sección
  Object.entries(allResults).forEach(([section, results]) => {
    const sectionSummary = {
      total: results.length,
      passed: 0,
      failed: 0,
      warnings: 0,
      details: results
    };

    results.forEach(result => {
      if (result.success === true || result.status === 'pass') {
        sectionSummary.passed++;
        report.summary.passed++;
      } else if (result.success === false || result.status === 'fail') {
        sectionSummary.failed++;
        report.summary.failed++;
      } else if (result.status === 'warning') {
        sectionSummary.warnings++;
        report.summary.warnings++;
      }

      report.summary.total++;
    });

    report.sections[section] = sectionSummary;
  });

  // Generar recomendaciones
  if (report.summary.failed > 0) {
    report.recommendations.push(
      'Corregir validaciones fallidas antes de deployment'
    );
  }

  if (report.summary.warnings > 0) {
    report.recommendations.push(
      'Revisar warnings para optimizar configuración'
    );
  }

  if (report.summary.passed === report.summary.total) {
    report.recommendations.push('¡Monorepo listo para producción!');
  }

  return report;
}

function printValidationSummary(report) {
  log('blue', '\\n📊 Resumen de Validación Completa');
  log('cyan', `⏰ ${new Date(report.timestamp).toLocaleString()}`);

  // Resumen general
  const { total, passed, failed, warnings } = report.summary;
  const successRate = ((passed / total) * 100).toFixed(1);

  log('blue', '\\n📈 Resultados Generales:');
  log('green', `   ✅ Pasaron: ${passed}/${total} (${successRate}%)`);

  if (failed > 0) {
    log('red', `   ❌ Fallaron: ${failed}`);
  }

  if (warnings > 0) {
    log('yellow', `   ⚠️  Warnings: ${warnings}`);
  }

  // Resumen por sección
  log('blue', '\\n📋 Resultados por Sección:');
  Object.entries(report.sections).forEach(([section, data]) => {
    const sectionRate = ((data.passed / data.total) * 100).toFixed(1);
    const status = data.failed === 0 ? '✅' : '❌';
    const color = data.failed === 0 ? 'green' : 'red';

    log(
      color,
      `   ${status} ${section}: ${data.passed}/${data.total} (${sectionRate}%)`
    );
  });

  // Recomendaciones
  if (report.recommendations.length > 0) {
    log('blue', '\\n🎯 Recomendaciones:');
    report.recommendations.forEach(rec => {
      log('yellow', `   • ${rec}`);
    });
  }

  // Status final
  const overallSuccess = failed === 0;
  const statusColor = overallSuccess ? 'green' : 'red';
  const statusIcon = overallSuccess ? '🎉' : '🚨';
  const statusMessage = overallSuccess
    ? 'VALIDACIÓN COMPLETA EXITOSA'
    : 'VALIDACIÓN COMPLETA CON ERRORES';

  log(statusColor, `\\n${statusIcon} ${statusMessage}`);

  return overallSuccess;
}

function saveValidationReport(report, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `validation-report-${timestamp}.json`;
  const filepath = path.join(outputDir, filename);

  // Guardar reporte detallado
  fs.writeFileSync(filepath, JSON.stringify(report, null, 2));

  // Guardar reporte más reciente
  const latestPath = path.join(outputDir, 'validation-report-latest.json');
  fs.writeFileSync(latestPath, JSON.stringify(report, null, 2));

  log('green', `💾 Reporte guardado: ${filepath}`);

  return filepath;
}

function main() {
  const args = process.argv.slice(2);
  const staging = args.includes('--staging');
  const production = args.includes('--production');

  log('blue', '🔍 Validación Completa - Sync Platform');
  log('cyan', '   Ejecutando todas las validaciones del monorepo...');

  const startTime = Date.now();
  const allResults = {};

  try {
    // 1. Validar entorno
    allResults.environment = validateEnvironment();

    // 2. Validar estructura
    allResults.structure = validateWorkspaceStructure();

    // 3. Validar dependencias
    allResults.dependencies = validateDependencies();

    // 4. Validar builds
    allResults.builds = validateBuilds();

    // 5. Validar tests
    allResults.tests = validateTests();

    // 6. Validar linting
    allResults.linting = validateLinting();

    // 7. Validar deployment
    const environment = production
      ? 'production'
      : staging
        ? 'staging'
        : 'development';
    allResults.deployment = validateDeployment(environment);

    // 8. Validar performance
    allResults.performance = validatePerformance();
  } catch (error) {
    log('red', `❌ Error durante validación: ${error.message}`);
    process.exit(1);
  }

  const totalTime = Date.now() - startTime;
  log('cyan', `\\n⏱️  Tiempo total de validación: ${formatTime(totalTime)}`);

  // Generar reporte
  const report = generateValidationReport(allResults);

  // Mostrar resumen
  const success = printValidationSummary(report);

  // Guardar reporte
  const outputDir = path.join(rootDir, 'tools', 'reports', 'validation');
  saveValidationReport(report, outputDir);

  // Exit code basado en éxito
  process.exit(success ? 0 : 1);
}

main();
