#!/usr/bin/env node

/**
 * 🧪 Test del Generador - Diagnóstico
 */

console.log('🔧 DIAGNÓSTICO DEL GENERADOR');
console.log('═══════════════════════════════════════');
console.log('✅ Node.js funcionando');
console.log('✅ Script ejecutándose');

try {
  console.log('📦 Verificando imports...');
  
  const { fileURLToPath } = await import('url');
  const { dirname, join } = await import('path');
  const { existsSync, mkdirSync, writeFileSync, readFileSync } = await import('fs');
  
  console.log('✅ Imports funcionando');
  
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const rootDir = join(__dirname, '../..');
  
  console.log('📁 Directorio raíz:', rootDir);
  console.log('📁 Directorio actual:', __dirname);
  
  // Verificar estructura
  const paths = [
    'packages/@sync/ui/src/components',
    'apps/credisync/src/lib/components',
    'tools/scripts'
  ];
  
  console.log('\n📂 Verificando estructura:');
  paths.forEach(path => {
    const fullPath = join(rootDir, path);
    const exists = existsSync(fullPath);
    console.log(`   ${exists ? '✅' : '❌'} ${path}`);
  });
  
  console.log('\n🎯 Argumentos recibidos:', process.argv.slice(2));
  
  console.log('\n✅ DIAGNÓSTICO COMPLETADO - TODO FUNCIONA');
  
} catch (error) {
  console.error('❌ ERROR:', error.message);
  console.error('📍 Stack:', error.stack);
}