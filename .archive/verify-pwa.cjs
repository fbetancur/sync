/**
 * Script de Verificación PWA
 * Verifica que todos los componentes de la PWA estén correctamente configurados
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verificando configuración PWA...\n');

const checks = {
  passed: 0,
  failed: 0,
  warnings: 0
};

// 1. Verificar manifest.webmanifest en public
console.log('1️⃣ Verificando manifest.webmanifest en /public...');
const publicManifestPath = path.join(__dirname, 'public', 'manifest.webmanifest');
if (fs.existsSync(publicManifestPath)) {
  console.log('   ✅ manifest.webmanifest existe en /public');
  checks.passed++;
  
  // Leer y validar contenido
  const manifestContent = JSON.parse(fs.readFileSync(publicManifestPath, 'utf8'));
  console.log('   📄 Contenido del manifest:');
  console.log(`      - name: ${manifestContent.name}`);
  console.log(`      - short_name: ${manifestContent.short_name}`);
  console.log(`      - theme_color: ${manifestContent.theme_color}`);
  console.log(`      - display: ${manifestContent.display}`);
  console.log(`      - icons: ${manifestContent.icons.length} iconos`);
  console.log(`      - shortcuts: ${manifestContent.shortcuts?.length || 0} shortcuts`);
} else {
  console.log('   ❌ manifest.webmanifest NO existe en /public');
  checks.failed++;
}

// 2. Verificar manifest.webmanifest en dist (después del build)
console.log('\n2️⃣ Verificando manifest.webmanifest en /dist...');
const distManifestPath = path.join(__dirname, 'dist', 'manifest.webmanifest');
if (fs.existsSync(distManifestPath)) {
  console.log('   ✅ manifest.webmanifest existe en /dist');
  checks.passed++;
} else {
  console.log('   ⚠️  manifest.webmanifest NO existe en /dist (ejecuta npm run build)');
  checks.warnings++;
}

// 3. Verificar referencia en index.html
console.log('\n3️⃣ Verificando referencia en index.html...');
const indexHtmlPath = path.join(__dirname, 'index.html');
const indexHtmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
if (indexHtmlContent.includes('rel="manifest"') && indexHtmlContent.includes('manifest.webmanifest')) {
  console.log('   ✅ index.html tiene referencia correcta al manifest');
  checks.passed++;
} else {
  console.log('   ❌ index.html NO tiene referencia al manifest');
  checks.failed++;
}

// 4. Verificar iconos PWA
console.log('\n4️⃣ Verificando iconos PWA...');
const icon192Path = path.join(__dirname, 'public', 'pwa-192x192.png');
const icon512Path = path.join(__dirname, 'public', 'pwa-512x512.png');

if (fs.existsSync(icon192Path)) {
  const stats = fs.statSync(icon192Path);
  console.log(`   ✅ pwa-192x192.png existe (${(stats.size / 1024).toFixed(2)} KB)`);
  checks.passed++;
} else {
  console.log('   ❌ pwa-192x192.png NO existe');
  checks.failed++;
}

if (fs.existsSync(icon512Path)) {
  const stats = fs.statSync(icon512Path);
  console.log(`   ✅ pwa-512x512.png existe (${(stats.size / 1024).toFixed(2)} KB)`);
  checks.passed++;
} else {
  console.log('   ❌ pwa-512x512.png NO existe');
  checks.failed++;
}

// 5. Verificar Service Worker
console.log('\n5️⃣ Verificando Service Worker...');
const swDistPath = path.join(__dirname, 'dist', 'sw.js');
if (fs.existsSync(swDistPath)) {
  console.log('   ✅ sw.js existe en /dist');
  checks.passed++;
} else {
  console.log('   ⚠️  sw.js NO existe en /dist (ejecuta npm run build)');
  checks.warnings++;
}

// 6. Verificar vite.config.ts
console.log('\n6️⃣ Verificando vite.config.ts...');
const viteConfigPath = path.join(__dirname, 'vite.config.ts');
const viteConfigContent = fs.readFileSync(viteConfigPath, 'utf8');
if (viteConfigContent.includes('VitePWA') && viteConfigContent.includes('manifest')) {
  console.log('   ✅ vite.config.ts tiene configuración PWA');
  checks.passed++;
} else {
  console.log('   ❌ vite.config.ts NO tiene configuración PWA correcta');
  checks.failed++;
}

// 7. Verificar meta tags en index.html
console.log('\n7️⃣ Verificando meta tags PWA en index.html...');
const requiredMetaTags = [
  'theme-color',
  'apple-mobile-web-app-capable',
  'apple-mobile-web-app-title'
];

let metaTagsOk = true;
requiredMetaTags.forEach(tag => {
  if (indexHtmlContent.includes(`name="${tag}"`)) {
    console.log(`   ✅ Meta tag "${tag}" presente`);
  } else {
    console.log(`   ❌ Meta tag "${tag}" faltante`);
    metaTagsOk = false;
  }
});

if (metaTagsOk) {
  checks.passed++;
} else {
  checks.failed++;
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN DE VERIFICACIÓN');
console.log('='.repeat(60));
console.log(`✅ Verificaciones exitosas: ${checks.passed}`);
console.log(`❌ Verificaciones fallidas: ${checks.failed}`);
console.log(`⚠️  Advertencias: ${checks.warnings}`);

if (checks.failed === 0 && checks.warnings === 0) {
  console.log('\n🎉 ¡PERFECTO! La PWA está correctamente configurada.');
} else if (checks.failed === 0) {
  console.log('\n✅ La configuración está correcta.');
  console.log('⚠️  Ejecuta "npm run build" para generar los archivos en /dist');
}

console.log('\n📝 PASOS PARA VERIFICAR EN EL NAVEGADOR:');
console.log('   1. Abre Chrome y ve a: http://localhost:5173');
console.log('   2. Presiona F12 para abrir DevTools');
console.log('   3. Ve a la pestaña "Application"');
console.log('   4. En el menú izquierdo, haz clic en "Manifest"');
console.log('   5. Deberías ver:');
console.log('      - Name: CrediSyncApp');
console.log('      - Short name: CrediSync');
console.log('      - Theme color: #1e40af');
console.log('      - 3 iconos listados');
console.log('   6. También verifica "Service Workers" para ver si está registrado');
console.log('\n   Si NO aparece el manifest:');
console.log('   - Verifica la consola del navegador (pestaña Console)');
console.log('   - Busca errores 404 para manifest.webmanifest');
console.log('   - Verifica la pestaña Network para ver si se carga');

console.log('\n' + '='.repeat(60));
