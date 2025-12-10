// Script para crear iconos PWA placeholder usando Canvas
// Este script crea iconos básicos con el logo de CrediSync

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('📱 Creando iconos PWA placeholder...');

// Crear un SVG simple como placeholder
const createSVGIcon = size => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e40af"/>
  <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="${size * 0.15}" fill="white" text-anchor="middle" dominant-baseline="middle" font-weight="bold">
    CrediSync
  </text>
  <circle cx="${size * 0.5}" cy="${size * 0.3}" r="${size * 0.15}" fill="white" opacity="0.3"/>
  <circle cx="${size * 0.5}" cy="${size * 0.3}" r="${size * 0.1}" fill="white"/>
</svg>`;
};

// Crear directorio public si no existe
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crear iconos SVG (los navegadores modernos los aceptan)
const icon192 = createSVGIcon(192);
const icon512 = createSVGIcon(512);

fs.writeFileSync(path.join(publicDir, 'pwa-192x192.svg'), icon192);
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.svg'), icon512);

console.log('✅ Iconos SVG creados:');
console.log('   - public/pwa-192x192.svg');
console.log('   - public/pwa-512x512.svg');
console.log('');
console.log(
  '⚠️  NOTA: Para producción, debes reemplazar estos iconos SVG con imágenes PNG reales.'
);
console.log('   Puedes usar herramientas como:');
console.log('   - https://realfavicongenerator.net/');
console.log('   - https://www.pwabuilder.com/imageGenerator');
console.log('');
console.log('💡 Mientras tanto, los iconos SVG funcionarán como placeholder.');
