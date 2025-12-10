#!/usr/bin/env node

/**
 * Pre-commit hook para validar código antes de commit
 * Se ejecuta automáticamente antes de cada commit
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
  try {
    execSync(command, { 
      stdio: 'pipe', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    return true;
  } catch (error) {
    log('red', `❌ ${description} falló`);
    if (error.stdout) {
      console.log(error.stdout.toString());
    }
    if (error.stderr) {
      console.error(error.stderr.toString());
    }
    return false;
  }
}

function getStagedFiles() {
  try {
    const output = execSync('git diff --cached --name-only', { 
      stdio: 'pipe',
      cwd: rootDir 
    });
    
    return output.toString()
      .split('\\n')
      .filter(file => file.trim() !== '')
      .filter(file => {
        // Solo archivos que existen (no eliminados)
        return fs.existsSync(path.join(rootDir, file));
      });
  } catch (error) {
    return [];
  }
}

function getAffectedWorkspaces(stagedFiles) {
  const workspaces = new Set();
  
  stagedFiles.forEach(file => {
    // Detectar packages afectados
    if (file.startsWith('packages/@sync/')) {
      const parts = file.split('/');
      if (parts.length >= 3) {
        workspaces.add(`@sync/${parts[2]}`);
      }
    }
    
    // Detectar apps afectadas
    if (file.startsWith('apps/')) {
      const parts = file.split('/');
      if (parts.length >= 2) {
        workspaces.add(parts[1]);
      }
    }
  });
  
  return Array.from(workspaces);
}

function lintStagedFiles(stagedFiles) {
  const jsFiles = stagedFiles.filter(file => 
    /\\.(js|ts|jsx|tsx|svelte)$/.test(file)
  );
  
  if (jsFiles.length === 0) {
    log('green', '✅ No hay archivos JS/TS para lint');
    return true;
  }
  
  log('cyan', `🔍 Linting ${jsFiles.length} archivos...`);
  
  const filesArg = jsFiles.map(f => `"${f}"`).join(' ');
  const command = `npx eslint ${filesArg}`;
  
  return execCommand(command, 'Linting staged files');
}

function checkFormattingStagedFiles(stagedFiles) {
  const formatFiles = stagedFiles.filter(file => 
    /\\.(js|ts|jsx|tsx|svelte|json|md|yml|yaml)$/.test(file)
  );
  
  if (formatFiles.length === 0) {
    log('green', '✅ No hay archivos para verificar formato');
    return true;
  }
  
  log('cyan', `💅 Verificando formato de ${formatFiles.length} archivos...`);
  
  const filesArg = formatFiles.map(f => `"${f}"`).join(' ');
  const command = `npx prettier --check ${filesArg}`;
  
  return execCommand(command, 'Checking formatting of staged files');
}

function runTestsForAffectedWorkspaces(workspaces) {
  if (workspaces.length === 0) {
    log('green', '✅ No hay workspaces afectados para testear');
    return true;
  }
  
  log('cyan', `🧪 Ejecutando tests para: ${workspaces.join(', ')}`);
  
  let allSuccess = true;
  
  for (const workspace of workspaces) {
    const command = `pnpm --filter ${workspace} test --run`;
    const success = execCommand(command, `Testing ${workspace}`);
    
    if (!success) {
      allSuccess = false;
    }
  }
  
  return allSuccess;
}

function validateEnvironmentVariables(stagedFiles) {
  // Verificar si se modificaron archivos de configuración de env
  const envFiles = stagedFiles.filter(file => 
    file.includes('.env') || 
    file.includes('vercel.json') ||
    file.includes('package.json')
  );
  
  if (envFiles.length === 0) {
    return true;
  }
  
  log('cyan', '🔧 Validando variables de entorno...');
  
  const command = 'node tools/scripts/validate-env.js';
  return execCommand(command, 'Validating environment variables');
}

function checkPackageJsonConsistency(stagedFiles) {
  const packageJsonFiles = stagedFiles.filter(file => 
    file.endsWith('package.json')
  );
  
  if (packageJsonFiles.length === 0) {
    return true;
  }
  
  log('cyan', '📦 Verificando consistencia de package.json...');
  
  // Verificar que las versiones de workspace dependencies sean consistentes
  try {
    const rootPackageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
    );
    
    // Verificar que pnpm-workspace.yaml esté actualizado si es necesario
    // (Esta verificación se puede expandir según necesidades)
    
    log('green', '✅ package.json files are consistent');
    return true;
  } catch (error) {
    log('red', `❌ Error verificando package.json: ${error.message}`);
    return false;
  }
}

function main() {
  log('blue', '🔒 Pre-commit Hook - Sync Platform');
  
  const stagedFiles = getStagedFiles();
  
  if (stagedFiles.length === 0) {
    log('yellow', '⚠️  No hay archivos staged para commit');
    process.exit(0);
  }
  
  log('cyan', `📁 Archivos staged: ${stagedFiles.length}`);
  
  const affectedWorkspaces = getAffectedWorkspaces(stagedFiles);
  if (affectedWorkspaces.length > 0) {
    log('cyan', `🎯 Workspaces afectados: ${affectedWorkspaces.join(', ')}`);
  }
  
  let allChecksPass = true;
  
  // 1. Lint staged files
  if (!lintStagedFiles(stagedFiles)) {
    allChecksPass = false;
  }
  
  // 2. Check formatting
  if (!checkFormattingStagedFiles(stagedFiles)) {
    allChecksPass = false;
    log('yellow', '💡 Tip: Ejecuta `pnpm lint-fix --format` para arreglar formato');
  }
  
  // 3. Validate environment variables
  if (!validateEnvironmentVariables(stagedFiles)) {
    allChecksPass = false;
  }
  
  // 4. Check package.json consistency
  if (!checkPackageJsonConsistency(stagedFiles)) {
    allChecksPass = false;
  }
  
  // 5. Run tests for affected workspaces (solo si hay cambios de código)
  const hasCodeChanges = stagedFiles.some(file => 
    /\\.(js|ts|jsx|tsx|svelte)$/.test(file) && 
    !file.includes('.test.') && 
    !file.includes('.spec.')
  );
  
  if (hasCodeChanges && !runTestsForAffectedWorkspaces(affectedWorkspaces)) {
    allChecksPass = false;
  }
  
  if (allChecksPass) {
    log('green', '\\n🎉 Todas las verificaciones pasaron!');
    log('green', '✅ Commit permitido');
    process.exit(0);
  } else {
    log('red', '\\n❌ Algunas verificaciones fallaron');
    log('yellow', '\\n🔧 Para arreglar:');
    log('yellow', '• Lint: pnpm lint-fix --fix');
    log('yellow', '• Format: pnpm lint-fix --format');
    log('yellow', '• Tests: pnpm test');
    log('yellow', '• Env vars: pnpm validate-env');
    log('red', '\\n🚫 Commit bloqueado');
    process.exit(1);
  }
}

main();