#!/usr/bin/env node

/**
 * Rollback Script - Procedimientos de rollback para el monorepo
 * Uso: node tools/scripts/rollback.js [--to-commit=<hash>] [--to-backup] [--dry-run]
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

function execCommand(command, description, dryRun = false) {
  log('cyan', `🔧 ${description}...`);
  
  if (dryRun) {
    log('yellow', `   [DRY RUN] Ejecutaría: ${command}`);
    return { success: true, output: '[DRY RUN]', command, description };
  }
  
  try {
    const output = execSync(command, { 
      stdio: 'pipe', 
      cwd: rootDir,
      env: { ...process.env, FORCE_COLOR: '0' }
    });
    
    log('green', `✅ ${description} completado`);
    return { 
      success: true, 
      output: output.toString(),
      command,
      description
    };
  } catch (error) {
    log('red', `❌ ${description} falló`);
    log('red', `   Error: ${error.message}`);
    
    return { 
      success: false, 
      error: error.message,
      command,
      description
    };
  }
}

function checkGitStatus() {
  log('blue', '🔍 Verificando estado de Git...');
  
  try {
    // Verificar si hay cambios no committeados
    const status = execSync('git status --porcelain', { 
      stdio: 'pipe', 
      cwd: rootDir 
    }).toString();
    
    if (status.trim()) {
      log('yellow', '⚠️  Hay cambios no committeados:');
      status.split('\\n').filter(line => line.trim()).forEach(line => {
        log('yellow', `   ${line}`);
      });
      return { hasUncommittedChanges: true, status };
    }
    
    // Verificar branch actual
    const currentBranch = execSync('git branch --show-current', { 
      stdio: 'pipe', 
      cwd: rootDir 
    }).toString().trim();
    
    log('green', `✅ Branch actual: ${currentBranch}`);
    log('green', '✅ No hay cambios no committeados');
    
    return { 
      hasUncommittedChanges: false, 
      currentBranch,
      status: 'clean'
    };
    
  } catch (error) {
    log('red', `❌ Error verificando Git: ${error.message}`);
    return { error: error.message };
  }
}

function createBackup(backupName) {
  log('blue', `💾 Creando backup: ${backupName}...`);
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const branchName = backupName || `backup-${timestamp}`;
  
  const results = [];
  
  // Crear branch de backup
  const createBranchResult = execCommand(
    `git checkout -b ${branchName}`,
    `Creando branch de backup: ${branchName}`
  );
  results.push(createBranchResult);
  
  if (!createBranchResult.success) {
    return { success: false, results };
  }
  
  // Volver al branch original
  const backToBranchResult = execCommand(
    'git checkout -',
    'Volviendo al branch original'
  );
  results.push(backToBranchResult);
  
  return { 
    success: backToBranchResult.success, 
    backupBranch: branchName,
    results 
  };
}

function rollbackToCommit(commitHash, dryRun = false) {
  log('blue', `🔄 Rollback a commit: ${commitHash}...`);
  
  const results = [];
  
  // Verificar que el commit existe
  const verifyResult = execCommand(
    `git cat-file -e ${commitHash}`,
    `Verificando commit ${commitHash}`,
    dryRun
  );
  results.push(verifyResult);
  
  if (!verifyResult.success && !dryRun) {
    return { success: false, results };
  }
  
  // Crear backup antes del rollback
  if (!dryRun) {
    const backupResult = createBackup(`pre-rollback-${commitHash.slice(0, 7)}`);
    if (!backupResult.success) {
      log('red', '❌ No se pudo crear backup, abortando rollback');
      return { success: false, results: [...results, ...backupResult.results] };
    }
    log('green', `✅ Backup creado: ${backupResult.backupBranch}`);
  }
  
  // Ejecutar rollback
  const rollbackResult = execCommand(
    `git reset --hard ${commitHash}`,
    `Ejecutando rollback a ${commitHash}`,
    dryRun
  );
  results.push(rollbackResult);
  
  if (!rollbackResult.success) {
    return { success: false, results };
  }
  
  // Limpiar dependencias y reconstruir
  const cleanResult = execCommand(
    'pnpm clean',
    'Limpiando dependencias',
    dryRun
  );
  results.push(cleanResult);
  
  const installResult = execCommand(
    'pnpm install',
    'Reinstalando dependencias',
    dryRun
  );
  results.push(installResult);
  
  const buildResult = execCommand(
    'pnpm build',
    'Reconstruyendo proyecto',
    dryRun
  );
  results.push(buildResult);
  
  return { 
    success: buildResult.success, 
    results,
    commitHash 
  };
}

function rollbackToBackup(backupBranch, dryRun = false) {
  log('blue', `🔄 Rollback a backup: ${backupBranch}...`);
  
  const results = [];
  
  // Verificar que el branch existe
  const verifyResult = execCommand(
    `git show-ref --verify --quiet refs/heads/${backupBranch}`,
    `Verificando branch ${backupBranch}`,
    dryRun
  );
  results.push(verifyResult);
  
  if (!verifyResult.success && !dryRun) {
    return { success: false, results };
  }
  
  // Crear backup del estado actual
  if (!dryRun) {
    const currentBackupResult = createBackup(`pre-restore-${Date.now()}`);
    if (!currentBackupResult.success) {
      log('red', '❌ No se pudo crear backup del estado actual');
      return { success: false, results: [...results, ...currentBackupResult.results] };
    }
    log('green', `✅ Estado actual respaldado: ${currentBackupResult.backupBranch}`);
  }
  
  // Ejecutar rollback al backup
  const rollbackResult = execCommand(
    `git reset --hard ${backupBranch}`,
    `Restaurando desde backup ${backupBranch}`,
    dryRun
  );
  results.push(rollbackResult);
  
  if (!rollbackResult.success) {
    return { success: false, results };
  }
  
  // Limpiar y reconstruir
  const cleanResult = execCommand(
    'pnpm clean',
    'Limpiando dependencias',
    dryRun
  );
  results.push(cleanResult);
  
  const installResult = execCommand(
    'pnpm install',
    'Reinstalando dependencias',
    dryRun
  );
  results.push(installResult);
  
  const buildResult = execCommand(
    'pnpm build',
    'Reconstruyendo proyecto',
    dryRun
  );
  results.push(buildResult);
  
  return { 
    success: buildResult.success, 
    results,
    backupBranch 
  };
}

function listAvailableBackups() {
  log('blue', '📋 Backups disponibles...');
  
  try {
    const branches = execSync('git branch --list "backup-*"', { 
      stdio: 'pipe', 
      cwd: rootDir 
    }).toString();
    
    if (!branches.trim()) {
      log('yellow', '⚠️  No hay backups disponibles');
      return [];
    }
    
    const backupBranches = branches
      .split('\\n')
      .map(line => line.trim().replace(/^\\*\\s*/, ''))
      .filter(line => line && line.startsWith('backup-'));
    
    log('green', `✅ Encontrados ${backupBranches.length} backups:`);
    backupBranches.forEach((branch, index) => {
      log('cyan', `   ${index + 1}. ${branch}`);
    });
    
    return backupBranches;
    
  } catch (error) {
    log('red', `❌ Error listando backups: ${error.message}`);
    return [];
  }
}

function validateRollback(dryRun = false) {
  log('blue', '✅ Validando rollback...');
  
  const results = [];
  
  // Verificar que el proyecto funciona
  const testResult = execCommand(
    'pnpm test --run',
    'Ejecutando tests de validación',
    dryRun
  );
  results.push(testResult);
  
  const lintResult = execCommand(
    'pnpm lint-fix --check',
    'Verificando linting',
    dryRun
  );
  results.push(lintResult);
  
  const buildResult = execCommand(
    'pnpm build',
    'Verificando build',
    dryRun
  );
  results.push(buildResult);
  
  const allSuccess = results.every(r => r.success);
  
  if (allSuccess) {
    log('green', '🎉 Rollback validado exitosamente');
  } else {
    log('red', '❌ Rollback tiene problemas, revisar errores');
  }
  
  return { success: allSuccess, results };
}

function generateRollbackReport(operation, results) {
  const timestamp = new Date().toISOString();
  const report = {
    timestamp,
    operation,
    success: results.success,
    steps: results.results || [],
    summary: {
      total: (results.results || []).length,
      successful: (results.results || []).filter(r => r.success).length,
      failed: (results.results || []).filter(r => !r.success).length
    }
  };
  
  // Guardar reporte
  const reportsDir = path.join(rootDir, 'tools', 'reports', 'rollback');
  fs.mkdirSync(reportsDir, { recursive: true });
  
  const reportFile = path.join(reportsDir, `rollback-${timestamp.replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
  
  log('green', `📊 Reporte guardado: ${reportFile}`);
  
  return report;
}

function printRollbackSummary(operation, results) {
  log('blue', '\\n📊 Resumen de Rollback');
  log('cyan', `⏰ ${new Date().toLocaleString()}`);
  log('cyan', `🔄 Operación: ${operation}`);
  
  const success = results.success;
  const statusColor = success ? 'green' : 'red';
  const statusIcon = success ? '✅' : '❌';
  
  log(statusColor, `\\n${statusIcon} Estado: ${success ? 'EXITOSO' : 'FALLÓ'}`);
  
  if (results.results && results.results.length > 0) {
    log('blue', '\\n📋 Pasos ejecutados:');
    results.results.forEach((step, index) => {
      const stepIcon = step.success ? '✅' : '❌';
      const stepColor = step.success ? 'green' : 'red';
      log(stepColor, `   ${stepIcon} ${index + 1}. ${step.description}`);
    });
  }
  
  if (success) {
    log('blue', '\\n🎯 Próximos pasos:');
    log('yellow', '• Verificar que la aplicación funciona correctamente');
    log('yellow', '• Ejecutar tests completos');
    log('yellow', '• Validar deployment si es necesario');
    log('yellow', '• Documentar el rollback realizado');
  } else {
    log('blue', '\\n🆘 Acciones de recuperación:');
    log('yellow', '• Revisar errores específicos arriba');
    log('yellow', '• Verificar estado de Git');
    log('yellow', '• Considerar rollback manual');
    log('yellow', '• Contactar al equipo de desarrollo');
  }
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const toCommit = args.find(arg => arg.startsWith('--to-commit='))?.split('=')[1];
  const toBackup = args.find(arg => arg.startsWith('--to-backup='))?.split('=')[1] || 
                   (args.includes('--to-backup') ? 'backup-pre-migration' : null);
  const listBackups = args.includes('--list-backups');
  
  log('blue', '🔄 Rollback Script - Sync Platform');
  
  if (dryRun) {
    log('yellow', '⚠️  MODO DRY RUN - No se ejecutarán cambios reales');
  }
  
  // Listar backups disponibles
  if (listBackups) {
    listAvailableBackups();
    return;
  }
  
  // Verificar estado de Git
  const gitStatus = checkGitStatus();
  if (gitStatus.error) {
    log('red', '❌ No se puede continuar debido a errores de Git');
    process.exit(1);
  }
  
  if (gitStatus.hasUncommittedChanges && !dryRun) {
    log('red', '❌ Hay cambios no committeados. Commit o stash antes de continuar.');
    process.exit(1);
  }
  
  let results;
  let operation;
  
  if (toCommit) {
    // Rollback a commit específico
    operation = `Rollback to commit ${toCommit}`;
    results = rollbackToCommit(toCommit, dryRun);
  } else if (toBackup) {
    // Rollback a backup
    operation = `Rollback to backup ${toBackup}`;
    results = rollbackToBackup(toBackup, dryRun);
  } else {
    // Mostrar ayuda
    log('blue', '\\n📖 Uso del script de rollback:');
    log('cyan', '\\n🔄 Rollback a commit específico:');
    log('yellow', '   node tools/scripts/rollback.js --to-commit=<hash>');
    log('cyan', '\\n🔄 Rollback a backup:');
    log('yellow', '   node tools/scripts/rollback.js --to-backup=<branch-name>');
    log('yellow', '   node tools/scripts/rollback.js --to-backup  # usa backup-pre-migration');
    log('cyan', '\\n📋 Listar backups disponibles:');
    log('yellow', '   node tools/scripts/rollback.js --list-backups');
    log('cyan', '\\n🧪 Modo dry run (simular sin ejecutar):');
    log('yellow', '   node tools/scripts/rollback.js --to-commit=<hash> --dry-run');
    
    log('blue', '\\n📋 Backups disponibles:');
    listAvailableBackups();
    return;
  }
  
  // Mostrar resumen
  printRollbackSummary(operation, results);
  
  // Generar reporte
  generateRollbackReport(operation, results);
  
  // Validar rollback si fue exitoso
  if (results.success && !dryRun) {
    log('blue', '\\n🔍 Validando rollback...');
    const validationResults = validateRollback();
    
    if (!validationResults.success) {
      log('red', '⚠️  Rollback completado pero la validación falló');
      process.exit(1);
    }
  }
  
  // Exit code basado en éxito
  process.exit(results.success ? 0 : 1);
}

main();