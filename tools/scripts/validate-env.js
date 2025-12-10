#!/usr/bin/env node

/**
 * Script para validar variables de entorno en todas las apps
 * Uso: node tools/scripts/validate-env.js [app-name]
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Variables requeridas por app
const REQUIRED_VARS = {
  credisync: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_VERSION',
    'VITE_APP_NAME'
  ],
  healthsync: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_VERSION',
    'VITE_APP_NAME',
    'VITE_HEALTH_API_ENDPOINT'
  ],
  surveysync: [
    'VITE_SUPABASE_URL',
    'VITE_SUPABASE_ANON_KEY',
    'VITE_APP_VERSION',
    'VITE_APP_NAME',
    'VITE_SURVEY_API_ENDPOINT'
  ]
};

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const vars = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (line && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        vars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return vars;
}

function validateApp(appName) {
  log('blue', `\n🔍 Validando ${appName}...`);

  const appDir = path.join(rootDir, 'apps', appName);
  const envLocalPath = path.join(appDir, '.env.local');
  const envExamplePath = path.join(appDir, '.env.example');

  // Verificar que existe .env.example
  if (!fs.existsSync(envExamplePath)) {
    log('red', `❌ No existe .env.example en ${appName}`);
    return false;
  }

  // Verificar que existe .env.local
  if (!fs.existsSync(envLocalPath)) {
    log('yellow', `⚠️  No existe .env.local en ${appName}`);
    log('yellow', `   Copia .env.example a .env.local y configura los valores`);
    return false;
  }

  // Parsear variables
  const envLocal = parseEnvFile(envLocalPath);
  const envExample = parseEnvFile(envExamplePath);

  if (!envLocal || !envExample) {
    log('red', `❌ Error parseando archivos de entorno en ${appName}`);
    return false;
  }

  // Verificar variables requeridas
  const requiredVars = REQUIRED_VARS[appName] || [];
  let allValid = true;

  for (const varName of requiredVars) {
    if (
      !envLocal[varName] ||
      envLocal[varName] === 'your_' + varName.toLowerCase().replace('vite_', '')
    ) {
      log('red', `❌ Variable faltante o no configurada: ${varName}`);
      allValid = false;
    } else {
      log('green', `✅ ${varName}`);
    }
  }

  // Verificar que .env.local tiene todas las variables de .env.example
  for (const varName of Object.keys(envExample)) {
    if (!envLocal[varName]) {
      log(
        'yellow',
        `⚠️  Variable en .env.example pero no en .env.local: ${varName}`
      );
    }
  }

  if (allValid) {
    log('green', `✅ ${appName} configurado correctamente`);
  }

  return allValid;
}

function validateSupabase(vars) {
  log('blue', '\n🔍 Validando conexión a Supabase...');

  const url = vars.VITE_SUPABASE_URL;
  const key = vars.VITE_SUPABASE_ANON_KEY;

  if (!url || !key) {
    log('red', '❌ Variables de Supabase no configuradas');
    return false;
  }

  if (!url.startsWith('https://') || !url.includes('.supabase.co')) {
    log('red', '❌ URL de Supabase inválida');
    return false;
  }

  if (key.length < 100) {
    log('red', '❌ Anon key de Supabase parece inválida (muy corta)');
    return false;
  }

  log('green', '✅ Variables de Supabase válidas');
  return true;
}

function main() {
  const args = process.argv.slice(2);
  const targetApp = args[0];

  log('blue', '🔧 Validador de Variables de Entorno - Sync Platform');

  if (targetApp) {
    // Validar app específica
    if (!REQUIRED_VARS[targetApp]) {
      log('red', `❌ App desconocida: ${targetApp}`);
      log(
        'yellow',
        `Apps disponibles: ${Object.keys(REQUIRED_VARS).join(', ')}`
      );
      process.exit(1);
    }

    const isValid = validateApp(targetApp);

    // Validar Supabase si la app está configurada
    if (isValid) {
      const envPath = path.join(rootDir, 'apps', targetApp, '.env.local');
      const vars = parseEnvFile(envPath);
      validateSupabase(vars);
    }

    process.exit(isValid ? 0 : 1);
  } else {
    // Validar todas las apps
    let allValid = true;

    for (const appName of Object.keys(REQUIRED_VARS)) {
      const isValid = validateApp(appName);
      if (!isValid) allValid = false;
    }

    // Validar Supabase con CrediSync (que está activo)
    const credisyncEnvPath = path.join(rootDir, 'apps/credisync/.env.local');
    if (fs.existsSync(credisyncEnvPath)) {
      const vars = parseEnvFile(credisyncEnvPath);
      validateSupabase(vars);
    }

    log('blue', '\n📋 Resumen:');
    if (allValid) {
      log('green', '✅ Todas las apps están configuradas correctamente');
    } else {
      log('red', '❌ Algunas apps necesitan configuración');
      log('yellow', '\nPara configurar una app:');
      log('yellow', '1. cd apps/[app-name]');
      log('yellow', '2. cp .env.example .env.local');
      log('yellow', '3. Editar .env.local con valores reales');
    }

    process.exit(allValid ? 0 : 1);
  }
}

main();
