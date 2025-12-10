# 📋 Manual Testing Checklist - Task 2.6

## 🎯 Objetivo
Verificar que la funcionalidad de login funciona correctamente según los requisitos de la Task 2.6.

## ✅ Tests a Realizar

### 1. Verificación Visual (Login Page vs Reference)
- [ ] **Layout idéntico**: Comparar pixel por pixel con referencia
- [ ] **Gradientes correctos**: Fondo azul degradado (from-blue-50 to-indigo-100)
- [ ] **Logo correcto**: Círculo azul con "C" blanca
- [ ] **Tipografía consistente**: Títulos, labels, placeholders
- [ ] **Espaciado correcto**: Padding, margins, gaps
- [ ] **Colores exactos**: Azules, grises, estados hover/focus

### 2. Responsive Design (390x844 Mobile)
- [ ] **Viewport móvil**: Verificar en 390x844px
- [ ] **Elementos centrados**: Card centrada verticalmente
- [ ] **Padding responsive**: 4 (1rem) en móvil
- [ ] **Inputs touch-friendly**: Altura adecuada (py-3)
- [ ] **Botones accesibles**: Tamaño mínimo 44px
- [ ] **Texto legible**: Tamaños apropiados para móvil

### 3. Funcionalidad de Autenticación
- [ ] **Login exitoso**: Con credenciales válidas
- [ ] **Redirección correcta**: A /ruta después de login
- [ ] **Estado de loading**: Spinner y texto "Cargando..."
- [ ] **Persistencia de sesión**: Mantener login al recargar
- [ ] **Logout funcional**: Cerrar sesión desde dashboard

### 4. Manejo de Errores
- [ ] **Credenciales inválidas**: Mostrar error apropiado
- [ ] **Email inválido**: Validación de formato
- [ ] **Contraseña corta**: Mínimo 6 caracteres
- [ ] **Campos vacíos**: Validación required
- [ ] **Error de red**: Manejo de conexión perdida
- [ ] **Timeout**: Manejo de respuestas lentas

### 5. Estados de UI
- [ ] **Estado inicial**: Campos vacíos, sin errores
- [ ] **Estado loading**: Botón deshabilitado, spinner visible
- [ ] **Estado error**: Mensaje rojo, campos editables
- [ ] **Estado success**: Redirección inmediata
- [ ] **Toggle sign up**: Cambio entre login/registro

### 6. Integración con @sync/core
- [ ] **Auth service**: Llamadas correctas a @sync/core
- [ ] **Store updates**: Estados sincronizados
- [ ] **Error handling**: Errores de @sync/core manejados
- [ ] **Session management**: Persistencia correcta

## 🧪 Casos de Prueba Específicos

### Caso 1: Login Exitoso
```
Email: [usar email válido de Supabase]
Password: [usar password válido]
Resultado esperado: Redirección a /ruta con usuario autenticado
```

### Caso 2: Credenciales Inválidas
```
Email: test@invalid.com
Password: wrongpassword
Resultado esperado: Error "Invalid login credentials" o similar
```

### Caso 3: Email Inválido
```
Email: invalid-email
Password: password123
Resultado esperado: Validación HTML5 de email
```

### Caso 4: Contraseña Corta
```
Email: test@example.com
Password: 123
Resultado esperado: Validación HTML5 minlength="6"
```

### Caso 5: Registro de Usuario
```
1. Click en "¿No tienes cuenta? Regístrate"
2. Llenar formulario con email nuevo
3. Enviar formulario
Resultado esperado: Mensaje "Revisa tu email para confirmar la cuenta"
```

## 📱 Testing en Diferentes Dispositivos

### Desktop (1920x1080)
- [ ] **Layout centrado**: Card en el centro de la pantalla
- [ ] **Responsive**: max-w-md mantiene ancho apropiado
- [ ] **Hover states**: Efectos hover en botones y links

### Mobile (390x844)
- [ ] **Viewport**: Meta viewport configurado
- [ ] **Touch targets**: Botones y inputs touch-friendly
- [ ] **Keyboard**: Teclado apropiado (email, password)
- [ ] **Scroll**: Sin scroll horizontal

### Tablet (768x1024)
- [ ] **Layout adaptativo**: Funciona correctamente
- [ ] **Orientación**: Portrait y landscape

## 🔧 Herramientas de Testing

### Browser DevTools
- [ ] **Responsive mode**: Probar diferentes tamaños
- [ ] **Network tab**: Verificar llamadas a Supabase
- [ ] **Console**: Sin errores JavaScript
- [ ] **Application**: Verificar localStorage/sessionStorage

### Lighthouse
- [ ] **Performance**: Score > 90
- [ ] **Accessibility**: Score > 90
- [ ] **Best Practices**: Score > 90
- [ ] **PWA**: Verificar criterios PWA

## 📊 Criterios de Éxito

### ✅ Debe Pasar
1. **Visual**: 100% idéntico a referencia
2. **Funcional**: Login/logout funcionando
3. **Responsive**: Perfecto en 390x844
4. **Errores**: Manejo correcto de todos los casos
5. **Performance**: Sin errores en consola
6. **Integración**: @sync/core funcionando correctamente

### ❌ Criterios de Fallo
1. Diferencias visuales con la referencia
2. Errores de autenticación no manejados
3. Layout roto en móvil
4. Errores JavaScript en consola
5. Problemas de integración con @sync/core

## 🚀 Comandos de Testing

```bash
# Iniciar servidor de desarrollo
pnpm dev:credisync

# Ejecutar tests automatizados
pnpm test:credisync --run

# Build para verificar producción
pnpm build:credisync

# Preview de build
pnpm preview:credisync
```

## 📝 Notas de Testing

- **URL Local**: http://localhost:5173
- **URL Producción**: https://credisync-green.vercel.app
- **Credenciales de prueba**: [Usar credenciales reales de Supabase]
- **Navegadores**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, Mobile, Tablet

---

**Estado**: 🚧 En progreso
**Fecha**: Diciembre 10, 2024
**Tester**: Kiro AI Assistant