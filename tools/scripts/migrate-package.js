#!/usr/bin/env node

/**
 * Script para migrar código a packages compartidos
 * Uso: node tools/scripts/migrate-package.js <source-path> <package-name> [module-name]
 */

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

function validateInputs(sourcePath, packageName, moduleName) {
  // Validar source path
  const fullSourcePath = path.resolve(rootDir, sourcePath);
  if (!fs.existsSync(fullSourcePath)) {
    log('red', `❌ Ruta fuente no existe: ${sourcePath}`);
    return false;
  }

  // Validar package name
  if (!packageName || !packageName.startsWith('@sync/')) {
    log('red', '❌ Package name debe empezar con @sync/');
    return false;
  }

  const packageDir = path.join(rootDir, 'packages', packageName);
  if (!fs.existsSync(packageDir)) {
    log('red', `❌ Package no existe: ${packageName}`);
    log('yellow', `   Packages disponibles: @sync/core, @sync/ui, @sync/types`);
    return false;
  }

  return true;
}

function analyzeSourceCode(sourcePath) {
  log('cyan', '🔍 Analizando código fuente...');

  const stats = {
    files: 0,
    tsFiles: 0,
    jsFiles: 0,
    svelteFiles: 0,
    testFiles: 0,
    totalLines: 0,
    imports: new Set(),
    exports: new Set()
  };

  function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    stats.totalLines += lines.length;

    // Analizar imports
    lines.forEach(line => {
      const importMatch = line.match(/import.*from ['"]([^'"]+)['"]/);
      if (importMatch) {
        stats.imports.add(importMatch[1]);
      }

      const exportMatch = line.match(
        /export\\s+(class|function|const|let|var)\\s+(\\w+)/
      );
      if (exportMatch) {
        stats.exports.add(exportMatch[2]);
      }
    });
  }

  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDirectory(filePath);
      } else {
        stats.files++;

        if (file.endsWith('.ts')) {
          stats.tsFiles++;
          analyzeFile(filePath);
        } else if (file.endsWith('.js')) {
          stats.jsFiles++;
          analyzeFile(filePath);
        } else if (file.endsWith('.svelte')) {
          stats.svelteFiles++;
          analyzeFile(filePath);
        }

        if (file.includes('.test.') || file.includes('.spec.')) {
          stats.testFiles++;
        }
      }
    });
  }

  const fullSourcePath = path.resolve(rootDir, sourcePath);
  if (fs.statSync(fullSourcePath).isDirectory()) {
    walkDirectory(fullSourcePath);
  } else {
    stats.files = 1;
    analyzeFile(fullSourcePath);
  }

  return stats;
}

function generateMigrationPlan(sourcePath, packageName, moduleName, stats) {
  log('cyan', '📋 Generando plan de migración...');

  const packageDir = path.join(rootDir, 'packages', packageName);
  const targetDir = moduleName
    ? path.join(packageDir, 'src', moduleName)
    : path.join(packageDir, 'src');

  const plan = {
    source: path.resolve(rootDir, sourcePath),
    target: targetDir,
    packageName,
    moduleName,
    stats,
    steps: []
  };

  // Generar pasos
  plan.steps.push({
    type: 'create_directory',
    path: targetDir,
    description: `Crear directorio ${targetDir}`
  });

  plan.steps.push({
    type: 'copy_files',
    source: plan.source,
    target: targetDir,
    description: `Copiar archivos de ${sourcePath} a ${targetDir}`
  });

  plan.steps.push({
    type: 'update_imports',
    description: 'Actualizar imports en archivos copiados'
  });

  plan.steps.push({
    type: 'update_exports',
    description: 'Actualizar exports en package index'
  });

  plan.steps.push({
    type: 'update_package_json',
    description: 'Actualizar package.json si es necesario'
  });

  plan.steps.push({
    type: 'run_tests',
    description: 'Ejecutar tests para validar migración'
  });

  return plan;
}

function executeMigrationPlan(plan, dryRun = false) {
  log('cyan', `${dryRun ? '🔍 Simulando' : '🚀 Ejecutando'} migración...`);

  for (const step of plan.steps) {
    log('blue', `📌 ${step.description}`);

    if (dryRun) {
      log('yellow', '   [DRY RUN] - No se ejecutarán cambios');
      continue;
    }

    try {
      switch (step.type) {
        case 'create_directory':
          if (!fs.existsSync(step.path)) {
            fs.mkdirSync(step.path, { recursive: true });
            log('green', `   ✅ Directorio creado: ${step.path}`);
          } else {
            log('yellow', `   ⚠️  Directorio ya existe: ${step.path}`);
          }
          break;

        case 'copy_files':
          copyRecursive(step.source, step.target);
          log('green', `   ✅ Archivos copiados`);
          break;

        case 'update_imports':
          updateImports(step.target || plan.target);
          log('green', `   ✅ Imports actualizados`);
          break;

        case 'update_exports':
          updatePackageExports(plan.packageName, plan.moduleName);
          log('green', `   ✅ Exports actualizados`);
          break;

        case 'update_package_json':
          log(
            'yellow',
            `   ⚠️  Revisar package.json manualmente si es necesario`
          );
          break;

        case 'run_tests':
          log(
            'yellow',
            `   ⚠️  Ejecutar tests manualmente: pnpm test:packages`
          );
          break;

        default:
          log('yellow', `   ⚠️  Paso no implementado: ${step.type}`);
      }
    } catch (error) {
      log('red', `   ❌ Error en paso: ${error.message}`);
      return false;
    }
  }

  return true;
}

function copyRecursive(source, target) {
  const stat = fs.statSync(source);

  if (stat.isDirectory()) {
    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    const files = fs.readdirSync(source);
    files.forEach(file => {
      copyRecursive(path.join(source, file), path.join(target, file));
    });
  } else {
    fs.copyFileSync(source, target);
  }
}

function updateImports(targetDir) {
  function updateFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    let updatedContent = content;

    // Actualizar imports relativos que apunten fuera del package
    updatedContent = updatedContent.replace(
      /from ['"](\.\.\/.*)['"]]/g,
      (match, importPath) => {
        // Convertir imports relativos a imports de packages
        if (importPath.includes('lib/')) {
          return match.replace(importPath, '@sync/core');
        }
        return match;
      }
    );

    if (content !== updatedContent) {
      fs.writeFileSync(filePath, updatedContent);
    }
  }

  function walkDirectory(dir) {
    const files = fs.readdirSync(dir);

    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) {
        walkDirectory(filePath);
      } else if (
        file.endsWith('.ts') ||
        file.endsWith('.js') ||
        file.endsWith('.svelte')
      ) {
        updateFile(filePath);
      }
    });
  }

  walkDirectory(targetDir);
}

function updatePackageExports(packageName, moduleName) {
  const packageDir = path.join(rootDir, 'packages', packageName);
  const indexPath = path.join(packageDir, 'src', 'index.ts');

  if (!fs.existsSync(indexPath)) {
    log('yellow', `   ⚠️  No existe index.ts en ${packageName}`);
    return;
  }

  const content = fs.readFileSync(indexPath, 'utf8');

  if (moduleName && !content.includes(`export * from './${moduleName}';`)) {
    const newExport = `export * from './${moduleName}';\\n`;
    fs.writeFileSync(indexPath, content + newExport);
    log('green', `   ✅ Agregado export para ${moduleName}`);
  }
}

function printMigrationSummary(plan, success) {
  log('blue', '\\n📊 Resumen de Migración:');
  log('cyan', `📁 Fuente: ${plan.source}`);
  log(
    'cyan',
    `📦 Destino: ${plan.packageName}${plan.moduleName ? '/' + plan.moduleName : ''}`
  );
  log('cyan', `📄 Archivos: ${plan.stats.files}`);
  log('cyan', `📝 Líneas: ${plan.stats.totalLines}`);
  log('cyan', `🔗 Imports únicos: ${plan.stats.imports.size}`);
  log('cyan', `📤 Exports detectados: ${plan.stats.exports.size}`);

  if (success) {
    log('green', '\\n✅ Migración completada exitosamente');
    log('yellow', '\\n📋 Próximos pasos:');
    log('yellow', '1. Revisar imports y exports manualmente');
    log('yellow', '2. Ejecutar tests: pnpm test:packages');
    log('yellow', '3. Actualizar imports en apps que usen el código migrado');
    log('yellow', '4. Eliminar código fuente original si todo funciona');
  } else {
    log('red', '\\n❌ Migración falló');
  }
}

function main() {
  const args = process.argv.slice(2);
  const sourcePath = args[0];
  const packageName = args[1];
  const moduleName = args[2];
  const dryRun = args.includes('--dry-run');

  log('blue', '📦 Migrador de Packages - Sync Platform');

  if (!sourcePath || !packageName) {
    log(
      'red',
      '❌ Uso: node tools/scripts/migrate-package.js <source-path> <package-name> [module-name]'
    );
    log('yellow', '\\nEjemplos:');
    log(
      'yellow',
      '  node tools/scripts/migrate-package.js src/lib/utils @sync/core utils'
    );
    log(
      'yellow',
      '  node tools/scripts/migrate-package.js apps/credisync/src/lib/components @sync/ui'
    );
    log('yellow', '\\nOpciones:');
    log('yellow', '  --dry-run    Simular migración sin hacer cambios');
    process.exit(1);
  }

  if (!validateInputs(sourcePath, packageName, moduleName)) {
    process.exit(1);
  }

  const stats = analyzeSourceCode(sourcePath);
  const plan = generateMigrationPlan(
    sourcePath,
    packageName,
    moduleName,
    stats
  );
  const success = executeMigrationPlan(plan, dryRun);

  printMigrationSummary(plan, success && !dryRun);

  process.exit(success ? 0 : 1);
}

main();
