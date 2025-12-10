# 📱 Configuración de PWA

## ✅ Configuración Completada

La PWA está configurada con Vite PWA Plugin y Workbox para funcionalidad offline completa.

## 🎯 Características Implementadas

### 1. Manifest (manifest.json)

- ✅ Nombre de la aplicación
- ✅ Iconos en múltiples tamaños (192x192, 512x512)
- ✅ Theme color y background color
- ✅ Display mode: standalone
- ✅ Orientación: portrait
- ✅ Start URL configurada

### 2. Service Worker

- ✅ Auto-update activado
- ✅ Skip waiting habilitado
- ✅ Clients claim habilitado
- ✅ Cleanup de cachés antiguos

### 3. Estrategias de Caché

#### API de Supabase - NetworkFirst

- Intenta red primero
- Fallback a caché si offline
- Cache por 24 horas
- Máximo 100 entradas

#### Fuentes de Google - CacheFirst

- Caché primero
- Cache por 1 año
- Máximo 10 entradas

#### Imágenes - CacheFirst

- Caché primero
- Cache por 30 días
- Máximo 100 entradas

#### JS/CSS - StaleWhileRevalidate

- Sirve desde caché mientras actualiza
- Cache por 7 días
- Máximo 50 entradas

## 📋 Pendiente: Crear Iconos

Necesitas crear los siguientes iconos en la carpeta `public/`:

### Iconos Requeridos

1. **pwa-192x192.png** (192x192 píxeles)
   - Icono principal para Android
   - Fondo sólido

2. **pwa-512x512.png** (512x512 píxeles)
   - Icono de alta resolución
   - Usado para splash screen
   - Fondo sólido

3. **apple-touch-icon.png** (180x180 píxeles)
   - Icono para iOS
   - Fondo sólido

4. **favicon.ico** (32x32 píxeles)
   - Favicon del navegador

5. **masked-icon.svg** (opcional)
   - Icono vectorial para Safari

### Herramientas para Crear Iconos

**Opción 1: PWA Asset Generator**

```bash
npx @vite-pwa/assets-generator --preset minimal public/logo.svg
```

**Opción 2: Online**

- https://realfavicongenerator.net/
- https://www.pwabuilder.com/imageGenerator

**Opción 3: Manual**

- Crea un logo cuadrado de 512x512
- Usa herramientas como Figma, Photoshop, GIMP
- Exporta en los tamaños requeridos

### Guía de Diseño

- **Colores**: Usa el theme color (#1e40af - azul)
- **Estilo**: Simple, reconocible, sin texto pequeño
- **Fondo**: Sólido (no transparente para Android)
- **Padding**: Deja 10% de padding alrededor del logo

## 🧪 Probar la PWA

### En Desarrollo

```bash
npm run dev
```

La PWA está habilitada en desarrollo para testing.

### En Producción

```bash
npm run build
npm run preview
```

### Verificar Instalación

1. Abre Chrome DevTools
2. Ve a **Application** > **Manifest**
3. Verifica que todos los campos estén correctos
4. Ve a **Service Workers**
5. Verifica que el SW esté registrado y activo

### Probar Offline

1. Abre la aplicación
2. En DevTools, ve a **Network**
3. Selecciona **Offline**
4. Recarga la página
5. La aplicación debe seguir funcionando

### Instalar en Móvil

#### Android (Chrome)

1. Abre la app en Chrome
2. Verás un banner "Agregar a pantalla de inicio"
3. O usa el menú: ⋮ > "Agregar a pantalla de inicio"

#### iOS (Safari)

1. Abre la app en Safari
2. Toca el botón de compartir
3. Selecciona "Agregar a pantalla de inicio"

## 📊 Verificación de PWA

### Lighthouse Audit

```bash
# Instalar Lighthouse CLI
npm install -g lighthouse

# Ejecutar audit
lighthouse http://localhost:5173 --view
```

Verifica que obtengas:

- ✅ PWA: 100
- ✅ Performance: >90
- ✅ Accessibility: >90
- ✅ Best Practices: >90
- ✅ SEO: >90

### PWA Checklist

- [x] Manifest configurado
- [x] Service Worker registrado
- [x] HTTPS (en producción)
- [x] Responsive design
- [x] Funciona offline
- [ ] Iconos creados (pendiente)
- [x] Theme color configurado
- [x] Estrategias de caché configuradas

## 🔧 Configuración Avanzada

### Personalizar Manifest

Edita `vite.config.ts` en la sección `manifest`:

```typescript
manifest: {
  name: 'Tu Nombre',
  short_name: 'Nombre Corto',
  description: 'Tu descripción',
  theme_color: '#tu-color',
  // ... más opciones
}
```

### Personalizar Caché

Edita `vite.config.ts` en la sección `workbox.runtimeCaching`:

```typescript
{
  urlPattern: /tu-patron/,
  handler: 'NetworkFirst', // o CacheFirst, StaleWhileRevalidate
  options: {
    cacheName: 'tu-cache',
    expiration: {
      maxEntries: 100,
      maxAgeSeconds: 60 * 60 * 24
    }
  }
}
```

## 📱 Características PWA Adicionales

### Notificaciones Push (Futuro)

Para implementar notificaciones push:

1. Configurar Firebase Cloud Messaging
2. Agregar permisos en manifest
3. Implementar en Service Worker

### Background Sync (Futuro)

Para sincronización en background:

1. Ya está preparado en el diseño
2. Implementar en Phase 4 (Sync Manager)

### Share API (Futuro)

Para compartir contenido:

```typescript
if (navigator.share) {
  await navigator.share({
    title: 'Título',
    text: 'Texto',
    url: 'URL'
  });
}
```

## 🐛 Troubleshooting

### Service Worker no se registra

- Verifica que estés en HTTPS (o localhost)
- Revisa la consola del navegador
- Verifica que `vite-plugin-pwa` esté instalado

### Caché no funciona

- Limpia el caché del navegador
- Desregistra el Service Worker
- Recarga con Ctrl+Shift+R

### Manifest no se detecta

- Verifica que los iconos existan
- Revisa la consola de errores
- Usa Lighthouse para diagnosticar

## 📚 Recursos

- [Vite PWA Plugin](https://vite-pwa-org.netlify.app/)
- [Workbox](https://developers.google.com/web/tools/workbox)
- [PWA Checklist](https://web.dev/pwa-checklist/)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

---

**Estado**: ✅ Configuración completada - Pendiente crear iconos **Siguiente**: Phase 2 - Core Data
Layer
