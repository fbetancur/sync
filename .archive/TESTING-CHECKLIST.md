# ✅ Checklist de Pruebas Exhaustivas

## 📋 Fase 1: Project Setup & Infrastructure

### Task 1: Initialize project structure ✅

#### Verificación de Dependencias

- [ ] Ejecutar `npm install` sin errores
- [ ] Verificar que todas las dependencias estén en package.json
- [ ] Verificar versiones correctas:
  - [ ] Svelte 5.x
  - [ ] Vite 7.x
  - [ ] TypeScript 5.x
  - [ ] Dexie 4.x
  - [ ] Supabase JS 2.x
  - [ ] Tailwind CSS 4.x
  - [ ] DaisyUI 5.x

#### Verificación de Configuración

- [ ] `vite.config.ts` existe y es válido
- [ ] `tailwind.config.js` existe y es válido
- [ ] `tsconfig.json` existe y es válido
- [ ] `.eslintrc.cjs` existe y es válido
- [ ] `.prettierrc` existe y es válido

#### Verificación de Estructura de Carpetas

- [ ] `src/lib/db/` existe
- [ ] `src/lib/sync/` existe
- [ ] `src/lib/business/` existe
- [ ] `src/lib/services/` existe
- [ ] `src/lib/validation/` existe
- [ ] `src/routes/` existe
- [ ] `src/components/` existe
- [ ] `src/stores/` existe
- [ ] `src/types/` existe
- [ ] `src/utils/` existe

#### Pruebas de Compilación

```bash
# Ejecutar y verificar que no hay errores
npm run check
```

- [ ] TypeScript compila sin errores
- [ ] Svelte check pasa sin errores

#### Pruebas de Linting

```bash
# Ejecutar y verificar
npm run lint
```

- [ ] ESLint pasa sin errores
- [ ] Prettier está configurado

#### Pruebas de Servidor de Desarrollo

```bash
# Iniciar servidor
npm run dev
```

- [ ] Servidor inicia en http://localhost:5173
- [ ] No hay errores en consola
- [ ] Hot reload funciona
- [ ] Página principal carga correctamente

---

### Task 2: Configure Supabase backend ✅

#### Verificación de Proyecto Supabase

- [ ] Proyecto existe en https://supabase.com/dashboard
- [ ] URL del proyecto es accesible
- [ ] Anon key está disponible

#### Verificación de Schema SQL

```sql
-- Ejecutar en Supabase SQL Editor
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

- [ ] Tabla `tenants` existe
- [ ] Tabla `users` existe
- [ ] Tabla `rutas` existe
- [ ] Tabla `productos_credito` existe
- [ ] Tabla `clientes` existe
- [ ] Tabla `creditos` existe
- [ ] Tabla `cuotas` existe
- [ ] Tabla `pagos` existe

#### Verificación de RLS Policies

```sql
-- Verificar políticas
SELECT * FROM pg_policies;
```

- [ ] Políticas para `tenants` existen
- [ ] Políticas para `users` existen
- [ ] Políticas para `clientes` existen
- [ ] Políticas para `creditos` existen
- [ ] Políticas para `cuotas` existen
- [ ] Políticas para `pagos` existen
- [ ] No hay recursión infinita en políticas

#### Verificación de Storage

- [ ] Bucket `comprobantes` existe
- [ ] Bucket es privado
- [ ] Políticas de upload configuradas
- [ ] Políticas de view configuradas

#### Verificación de Auth

- [ ] Email provider habilitado
- [ ] Usuario de prueba creado
- [ ] Usuario puede hacer login

#### Pruebas de Conexión desde la App

```bash
# Iniciar app
npm run dev
# Abrir http://localhost:5173/test-connection
```

- [ ] Página de test carga
- [ ] Conexión a Supabase exitosa
- [ ] Login funciona
- [ ] Datos del tenant se cargan
- [ ] No hay errores en consola

#### Pruebas de Autenticación

```bash
# Abrir http://localhost:5173/login
```

- [ ] Página de login carga
- [ ] Formulario de login funciona
- [ ] Login con credenciales correctas funciona
- [ ] Login con credenciales incorrectas muestra error
- [ ] Redirección después de login funciona
- [ ] Logout funciona
- [ ] Session persiste en refresh

#### Verificación de TypeScript Types

- [ ] `src/types/database.ts` existe
- [ ] Tipos coinciden con schema de Supabase
- [ ] No hay errores de TypeScript

---

### Task 3: Setup Vercel deployment ⏳

#### Verificación de Archivos de Configuración

- [ ] `vercel.json` existe
- [ ] `.vercelignore` existe
- [ ] `VERCEL-SETUP.md` existe

#### Verificación de vercel.json

- [ ] `buildCommand` está configurado
- [ ] `outputDirectory` es "dist"
- [ ] Rewrites para SPA configurados
- [ ] Headers de seguridad configurados
- [ ] Headers de Service Worker configurados

#### Pruebas de Build Local

```bash
# Build de producción
npm run build
```

- [ ] Build completa sin errores
- [ ] Carpeta `dist/` se crea
- [ ] Archivos HTML, JS, CSS generados
- [ ] Assets copiados correctamente

#### Pruebas de Preview Local

```bash
# Preview del build
npm run preview
```

- [ ] Preview inicia correctamente
- [ ] Aplicación funciona en preview
- [ ] Rutas funcionan correctamente
- [ ] No hay errores en consola

#### Verificación de Vercel CLI

```bash
# Verificar instalación
vercel --version
```

- [ ] Vercel CLI instalado
- [ ] Versión >= 28.0.0

#### Link con Vercel (Manual)

```bash
# Link proyecto
vercel link
```

- [ ] Proyecto linkeado exitosamente
- [ ] `.vercel/` carpeta creada
- [ ] `project.json` contiene project ID

#### Configuración de Variables de Entorno en Vercel

- [ ] `VITE_SUPABASE_URL` configurada
- [ ] `VITE_SUPABASE_ANON_KEY` configurada
- [ ] Variables disponibles en Production
- [ ] Variables disponibles en Preview
- [ ] Variables disponibles en Development

#### Deploy de Preview

```bash
# Deploy a preview
vercel
```

- [ ] Deploy exitoso
- [ ] URL de preview generada
- [ ] Aplicación accesible en URL
- [ ] Login funciona en preview
- [ ] Conexión a Supabase funciona

#### Deploy a Production

```bash
# Deploy a production
vercel --prod
```

- [ ] Deploy exitoso
- [ ] URL de producción generada
- [ ] Aplicación accesible en producción
- [ ] Login funciona en producción
- [ ] Conexión a Supabase funciona

#### Verificación de Deployments Automáticos (si Git conectado)

- [ ] Push a main/master despliega a producción
- [ ] Push a otras ramas despliega a preview
- [ ] Pull requests generan preview

---

### Task 4: Configure PWA with Vite Plugin ⏳

#### Verificación de Configuración

- [ ] `vite-plugin-pwa` instalado
- [ ] `vite.config.ts` tiene configuración PWA
- [ ] Manifest configurado
- [ ] Workbox configurado

#### Verificación de Manifest

- [ ] `name` configurado
- [ ] `short_name` configurado
- [ ] `description` configurado
- [ ] `theme_color` configurado (#1e40af)
- [ ] `background_color` configurado (#ffffff)
- [ ] `display` es "standalone"
- [ ] `orientation` es "portrait"
- [ ] `start_url` es "/"
- [ ] `icons` array configurado

#### Generación de Iconos

```bash
# Abrir en navegador
open scripts/generate-icons.html
```

- [ ] Página de generación carga
- [ ] Iconos se generan correctamente
- [ ] Descargar `pwa-192x192.png`
- [ ] Descargar `pwa-512x512.png`
- [ ] Descargar `apple-touch-icon.png`
- [ ] Descargar `favicon-32x32.png`
- [ ] Guardar todos en `public/`

#### Verificación de Iconos

- [ ] `public/pwa-192x192.png` existe
- [ ] `public/pwa-512x512.png` existe
- [ ] `public/apple-touch-icon.png` existe
- [ ] `public/favicon-32x32.png` existe
- [ ] Iconos tienen el tamaño correcto
- [ ] Iconos se ven bien

#### Pruebas de Service Worker en Desarrollo

```bash
# Iniciar dev server
npm run dev
```

- [ ] Abrir DevTools > Application > Service Workers
- [ ] Service Worker registrado
- [ ] Service Worker activo
- [ ] No hay errores en consola

#### Pruebas de Manifest en Desarrollo

- [ ] Abrir DevTools > Application > Manifest
- [ ] Manifest se carga correctamente
- [ ] Todos los campos visibles
- [ ] Iconos se muestran
- [ ] No hay warnings

#### Pruebas de Caché

- [ ] Abrir DevTools > Application > Cache Storage
- [ ] Cachés creados:
  - [ ] `workbox-precache-v2-...`
  - [ ] `supabase-api`
  - [ ] `google-fonts-cache`
  - [ ] `images-cache`
  - [ ] `static-resources`

#### Pruebas Offline en Desarrollo

```bash
# Con app abierta
# DevTools > Network > Offline
```

- [ ] Activar modo offline
- [ ] Recargar página
- [ ] Página carga desde caché
- [ ] Assets se cargan
- [ ] No hay errores críticos

#### Pruebas de Build con PWA

```bash
npm run build
npm run preview
```

- [ ] Build incluye Service Worker
- [ ] `dist/sw.js` existe
- [ ] `dist/manifest.webmanifest` existe
- [ ] Iconos copiados a `dist/`

#### Pruebas de Instalación (Desktop)

```bash
# Con preview corriendo
# Chrome: Icono de instalación en barra de direcciones
```

- [ ] Icono de instalación aparece
- [ ] Click en instalar
- [ ] PWA se instala
- [ ] PWA abre en ventana standalone
- [ ] Funciona correctamente

#### Pruebas de Instalación (Mobile - Android)

- [ ] Abrir en Chrome Android
- [ ] Banner "Agregar a pantalla de inicio" aparece
- [ ] Agregar a pantalla de inicio
- [ ] Icono aparece en home screen
- [ ] Abrir desde home screen
- [ ] Abre en modo standalone
- [ ] Funciona correctamente

#### Pruebas de Instalación (Mobile - iOS)

- [ ] Abrir en Safari iOS
- [ ] Botón compartir > Agregar a pantalla de inicio
- [ ] Icono aparece en home screen
- [ ] Abrir desde home screen
- [ ] Funciona correctamente

#### Lighthouse Audit

```bash
# Instalar Lighthouse
npm install -g lighthouse

# Ejecutar audit
lighthouse http://localhost:4173 --view
```

- [ ] PWA score >= 90
- [ ] Performance score >= 80
- [ ] Accessibility score >= 90
- [ ] Best Practices score >= 90
- [ ] SEO score >= 90

#### Verificación de Estrategias de Caché

- [ ] NetworkFirst para API Supabase
- [ ] CacheFirst para Google Fonts
- [ ] CacheFirst para imágenes
- [ ] StaleWhileRevalidate para JS/CSS

---

## 📊 Resumen de Estado

### Completado ✅

- [x] Task 1: Initialize project structure
- [x] Task 2: Configure Supabase backend

### En Progreso ⏳

- [ ] Task 3: Setup Vercel deployment
- [ ] Task 4: Configure PWA with Vite Plugin

### Pendiente ⏸️

- [ ] Task 5: Implement IndexedDB with Dexie.js
- [ ] Task 6: Implement multi-layer storage system
- [ ] Task 7: Implement checksum and integrity verification

---

## 🎯 Criterios de Éxito para Commit

Antes de hacer commit, TODOS estos deben estar ✅:

### Código

- [ ] No hay errores de TypeScript
- [ ] No hay errores de ESLint
- [ ] Build de producción exitoso
- [ ] Preview funciona correctamente

### Funcionalidad

- [ ] Servidor de desarrollo funciona
- [ ] Login funciona
- [ ] Conexión a Supabase funciona
- [ ] PWA se instala correctamente
- [ ] Funciona offline

### Documentación

- [ ] README.md actualizado
- [ ] Guías de setup completas
- [ ] Checklist de pruebas completo
- [ ] Comentarios en código

### Testing

- [ ] Todas las pruebas manuales pasadas
- [ ] Lighthouse audit >= 90 en PWA
- [ ] No hay warnings críticos

---

## 📝 Notas de Pruebas

### Fecha: [Completar al probar]

### Probado por: [Tu nombre]

#### Resultados:

```
[Pegar resultados de pruebas aquí]
```

#### Issues Encontrados:

```
[Listar cualquier problema encontrado]
```

#### Soluciones Aplicadas:

```
[Documentar soluciones]
```

---

**Última actualización**: [Fecha] **Estado**: En progreso
