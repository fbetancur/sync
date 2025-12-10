/**
 * Script para crear iconos placeholder para la PWA
 * Ejecutar con: node scripts/create-placeholder-icons.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Crear SVG placeholder
function createSVGIcon(size) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="#1e40af"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${size * 0.35}" fill="#ffffff"/>
  <text x="${size / 2}" y="${size / 2}" font-family="Arial" font-size="${size * 0.4}" font-weight="bold" fill="#1e40af" text-anchor="middle" dominant-baseline="central">$</text>
</svg>`;
}

// Crear archivo README para los iconos
const iconReadme = `# Iconos de la PWA

## Iconos Actuales

Los iconos actuales son placeholders generados automáticamente.

## Reemplazar con Iconos Reales

Para reemplazar con iconos de diseño profesional:

1. **Opción 1: Usar herramienta online**
   - Ve a https://realfavicongenerator.net/
   - Sube tu logo (512x512 mínimo)
   - Descarga el paquete generado
   - Reemplaza los archivos en esta carpeta

2. **Opción 2: Usar PWA Asset Generator**
   \`\`\`bash
   npx @vite-pwa/assets-generator --preset minimal public/logo.svg
   \`\`\`

3. **Opción 3: Crear manualmente**
   - Diseña un logo cuadrado de 512x512
   - Exporta en los siguientes tamaños:
     - 192x192 → pwa-192x192.png
     - 512x512 → pwa-512x512.png
     - 180x180 → apple-touch-icon.png
     - 32x32 → favicon-32x32.png

## Especificaciones

- **Formato**: PNG
- **Fondo**: Sólido (no transparente para Android)
- **Padding**: 10% alrededor del logo
- **Color principal**: #1e40af (azul)
- **Estilo**: Simple, reconocible, sin texto pequeño

## Archivos Requeridos

- ✅ pwa-192x192.png (192x192)
- ✅ pwa-512x512.png (512x512)
- ✅ apple-touch-icon.png (180x180)
- ✅ favicon-32x32.png (32x32)
- ✅ icon.svg (opcional, vectorial)
`;

// Crear directorio public si no existe
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Crear iconos SVG
const sizes = [
  { size: 192, name: 'pwa-192x192.svg' },
  { size: 512, name: 'pwa-512x512.svg' },
  { size: 180, name: 'apple-touch-icon.svg' },
  { size: 32, name: 'favicon-32x32.svg' }
];

sizes.forEach(({ size, name }) => {
  const svg = createSVGIcon(size);
  const filePath = path.join(publicDir, name);
  fs.writeFileSync(filePath, svg);
  console.log(`✅ Created: ${name}`);
});

// Crear README
fs.writeFileSync(path.join(publicDir, 'ICONS-README.md'), iconReadme);
console.log('✅ Created: ICONS-README.md');

console.log('\n🎉 Iconos placeholder creados exitosamente!');
console.log('📁 Ubicación: public/');
console.log('📝 Lee public/ICONS-README.md para instrucciones de reemplazo');
