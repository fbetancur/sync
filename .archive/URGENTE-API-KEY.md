# 🚨 URGENTE: Necesitas la API Key en Formato JWT

## El Problema

Las keys que me compartiste son del **nuevo formato** de Supabase:

- ❌ `sb_publishable_HFIzCX6PRqOjPkHU0ddiHA_HKsaqNb-`
- ❌ `sb_secret_IZEulAUyDczReiV9LUchCg_kVz1kijZ`

Pero el cliente de Supabase JS necesita el **formato JWT antiguo** (Legacy):

- ✅ `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (muy largo)

## Solución Rápida

### Opción 1: Buscar Legacy Keys en Supabase

1. Ve a: https://supabase.com/dashboard/project/hmnlriywocnpiktflehr/settings/api

2. En la página de API Keys, busca una sección que diga:
   - **"Legacy anon, service_role API keys"**
   - O un botón que diga **"Show legacy keys"**
   - O una pestaña que diga **"Legacy"**

3. Copia la key **"anon"** (NO la service_role)

4. Esa key debe verse así:
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzI0NzksImV4cCI6MjA0OTM0ODQ3OX0.RESTO_DE_LA_KEY_AQUI
   ```

### Opción 2: Actualizar el Cliente de Supabase

Si no encuentras las Legacy keys, podemos actualizar el código para usar las nuevas keys.

**¿Qué prefieres?**

- A) Buscar las Legacy keys en Supabase (más rápido)
- B) Actualizar el código para usar las nuevas keys (requiere cambios)

## Cómo Identificar el Formato Correcto

### ❌ Formato NUEVO (no funciona con el código actual):

```
sb_publishable_HFIzCX6PRqOjPkHU0ddiHA_HKsaqNb-
sb_secret_IZEulAUyDczReiV9LUchCg_kVz1kijZ
```

### ✅ Formato JWT/Legacy (funciona):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzI0NzksImV4cCI6MjA0OTM0ODQ3OX0.HFIzCX6PRqOjPkHU0ddiHA_HKsaqNb-Yw8vZXqJqZxo
```

## Screenshot de Referencia

Busca algo como esto en tu dashboard de Supabase:

```
┌─────────────────────────────────────────────┐
│ API Keys                                     │
├─────────────────────────────────────────────┤
│ Publishable and secret API keys             │
│ [Tab activo]                                │
│                                             │
│ Legacy anon, service_role API keys          │
│ [Tab que necesitas clickear] ← AQUÍ        │
└─────────────────────────────────────────────┘
```

## Siguiente Paso

Una vez que encuentres la Legacy anon key:

1. Cópiala completa
2. Actualiza `.env.local`:
   ```env
   VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.TU_KEY_COMPLETA_AQUI
   ```
3. Reinicia el servidor: `npm run dev`
4. Recarga la página

---

**¿Necesitas ayuda?** Comparte un screenshot de toda la página de API settings para ver si hay una
sección de Legacy keys.
