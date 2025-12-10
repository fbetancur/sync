#!/usr/bin/env node

/**
 * Script para ejecutar linting y formatting en todo el monorepo
 * Uso: node tools/scripts/lint-fix.js [--fix] [--format] [--check]
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

function execCommand(command, description, continueOnError = false) {
  log('cyan', `🔧 ${description}`);
  
  const startTime = Date.now();
  try {
    execSync(command, { 
      stdio: 'inherit', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '1' }
    });
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('green', `✅ ${description} completado (${duration}s)`);
    return true;
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log('red', `❌ ${description} falló (${duration}s)`);
    
    if (!continueOnError) {
      log('red', `   ${error.message}`);
      return false;
    }
    
    log('yellow', `   ⚠️  Continuando a pesar del error...`);
    return true;
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

function lintRoot(fix = false) {
  log('blue', '🔍 Linting root...');
  
  const fixFlag = fix ? '--fix' : '';
  const command = `npx eslint . --ext .js,.ts,.cjs ${fixFlag}`;
  
  return execCommand(command, 'Linting root', true);
}

function lintWorkspaces(fix = false) {
  log('blue', '🔍 Linting workspaces...');
  
  const { packages, apps } = getWorkspaces();
  const allWorkspaces = [...packages, ...apps];
  let allSuccess = true;
  
  for (const workspace of allWorkspaces) {
    const fixFlag = fix ? '--fix' : '';
    const command = `pnpm --filter ${workspace} lint ${fixFlag}`;
    
    const success = execCommand(
      command, 
      `Linting ${workspace}`,
      true // Continuar aunque falle
    );
    
    if (!success) allSuccess = false;
  }
  
  return allSuccess;
}

function formatRoot() {
  log('blue', '💅 Formatting root...');
  
  const command = 'npx prettier --write "**/*.{js,ts,json,md,yml,yaml}" --ignore-path .gitignore';
  
  return execCommand(command, 'Formatting root files', true);
}

function formatWorkspaces() {
  log('blue', '💅 Formatting workspaces...');
  
  const { packages, apps } = getWorkspaces();
  const allWorkspaces = [...packages, ...apps];
  let allSuccess = true;
  
  for (const workspace of allWorkspaces) {
    const command = `pnpm --filter ${workspace} format`;
    
    const success = execCommand(
      command,
      `Formatting ${workspace}`,
      true // Continuar aunque falle
    );
    
    if (!success) allSuccess = false;
  }
  
  return allSuccess;
}

function checkFormatting() {
  log('blue', '🔍 Checking formatting...');
  
  const command = 'npx prettier --check "**/*.{js,ts,json,md,yml,yaml}" --ignore-path .gitignore';
  
  return execCommand(command, 'Checking formatting', true);
}

function installDependencies() {
  log('blue', '📦 Installing lint/format dependencies...');
  
  // Verificar si las dependencias están instaladas
  const requiredDeps = [
    '@typescript-eslint/parser',
    '@typescript-eslint/eslint-plugin',
    'eslint-plugin-svelte',
    'svelte-eslint-parser',
    'prettier',
    'prettier-plugin-svelte'
  ];
  
  const packageJsonPath = path.join(rootDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
  
  const missingDeps = requiredDeps.filter(dep => !allDeps[dep]);
  
  if (missingDeps.length > 0) {
    log('yellow', `⚠️  Faltan dependencias: ${missingDeps.join(', ')}`);
    log('yellow', '   Instalando dependencias faltantes...');
    
    const installCommand = `pnpm add -D ${missingDeps.join(' ')}`;
    return execCommand(installCommand, 'Installing missing dependencies');
  }
  
  log('green', '✅ Todas las dependencias están instaladas');
  return true;
}

function printSummary(lintSuccess, formatSuccess, checkSuccess) {
  log('blue', '\\n📊 Resumen de Lint & Format:');
  
  const lintStatus = lintSuccess ? '✅' : '❌';
  const formatStatus = formatSuccess ? '✅' : '❌';
  const checkStatus = checkSuccess !== null ? (checkSuccess ? '✅' : '❌') : '⏭️';
  
  log('cyan', `🔍 Linting: ${lintStatus}`);
  log('cyan', `💅 Formatting: ${formatStatus}`);
  if (checkSuccess !== null) {
    log('cyan', `🔍 Format Check: ${checkStatus}`);
  }
  
  const overallSuccess = lintSuccess && formatSuccess && (checkSuccess === null || checkSuccess);
  
  if (overallSuccess) {
    log('green', '\\n🎉 Código limpio y bien formateado!');
    log('yellow', '\\n📋 Próximos pasos:');
    log('yellow', '• Commit cambios: git add . && git commit');
    log('yellow', '• Ejecutar tests: pnpm test');
  } else {
    log('red', '\\n❌ Hay problemas de linting o formatting');
    log('yellow', '\\n🔧 Soluciones:');
    log('yellow', '• Ejecutar con --fix: pnpm lint-fix --fix');
    log('yellow', '• Revisar errores específicos arriba');
    log('yellow', '• Formatear código: pnpm lint-fix --format');
  }
  
  return overallSuccess;
}

function main() {
  const args = process.argv.slice(2);
  const fix = args.includes('--fix');
  const format = args.includes('--format');
  const check = args.includes('--check');
  const installDeps = args.includes('--install-deps');
  
  log('blue', '🧹 Lint & Format - Sync Platform');
  
  const startTime = Date.now();
  
  // Instalar dependencias si se solicita
  if (installDeps) {
    if (!installDependencies()) {
      process.exit(1);
    }
  }
  
  let lintSuccess = true;
  let formatSuccess = true;
  let checkSuccess = null;
  
  // Linting
  if (!format && !check) {
    log('blue', '\\n🔍 Ejecutando linting...');
    const rootLintSuccess = lintRoot(fix);
    const workspacesLintSuccess = lintWorkspaces(fix);
    lintSuccess = rootLintSuccess && workspacesLintSuccess;
  }
  
  // Formatting
  if (format || (!fix && !check)) {
    log('blue', '\\n💅 Ejecutando formatting...');
    const rootFormatSuccess = formatRoot();
    const workspacesFormatSuccess = formatWorkspaces();
    formatSuccess = rootFormatSuccess && workspacesFormatSuccess;
  }
  
  // Check formatting
  if (check) {
    log('blue', '\\n🔍 Verificando formatting...');
    checkSuccess = checkFormatting();
  }
  
  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  log('cyan', `\\n⏱️  Tiempo total: ${totalTime}s`);
  
  const success = printSummary(lintSuccess, formatSuccess, checkSuccess);
  
  process.exit(success ? 0 : 1);
}

main();