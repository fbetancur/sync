# 🔑 Solución: Invalid API Key

## Problema

Estás viendo el error: **"Invalid API key"** o **"supabase.rpc(...).catch is not a function"**

## Causa

Supabase cambió el formato de las API keys. Las nuevas keys (`sb_publishable_...`) no funcionan con
el cliente JavaScript antiguo.

## Solución: Obtener la API Key en Formato JWT (Legacy)

### Paso 1: Ve a tu Proyecto Supabase

1. Abre: https://hmnlriywocnpiktflehr.supabase.co
2. O ve a: https://supabase.com/dashboard/projects

### Paso 2: Busca las Legacy API Keys

1. En el menú lateral, click en **⚙️ Settings** (Configuración)
2. Click en **API** en el submenú
3. **IMPORTANTE**: Busca la pestaña o sección que dice **"Legacy anon, service_role API keys"**
4. Si no la ves, scroll hacia abajo en la página

#### Project URL

```
https://hmnlriywocnpiktflehr.supabase.co
```

#### API Keys

Hay dos keys:

- **anon / public**: Esta es la que necesitas (es segura para el frontend)
- **service_role**: NO uses esta (es solo para backend)

### Paso 3: Actualiza tu .env.local

1. Abre el archivo `microcreditos-pwa/.env.local`
2. Reemplaza las variables con los valores correctos:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://hmnlriywocnpiktflehr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzM3NzI0NzksImV4cCI6MjA0OTM0ODQ3OX0.TU_ANON_KEY_COMPLETA_AQUI

# App Configuration
VITE_APP_VERSION=1.0.0
VITE_APP_NAME=Microcréditos PWA
```

**IMPORTANTE**:

- Copia la key **completa** desde Supabase
- La key debe empezar con `eyJ...`
- La key es muy larga (varios cientos de caracteres)
- NO uses la `service_role` key

### Paso 4: Reinicia el Servidor

Después de actualizar `.env.local`:

1. Detén el servidor (Ctrl+C en la terminal)
2. Reinicia: `npm run dev`
3. Recarga la página en el navegador

## Verificación Rápida

Para verificar que tu API key es correcta:

1. Ve a Supabase Dashboard > Settings > API
2. Copia la **anon public** key
3. Compárala con la que tienes en `.env.local`
4. Deben ser **exactamente iguales**

## Ejemplo de API Key Válida

Una API key válida se ve así (ejemplo ficticio):

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByb2plY3RyZWYiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYyMzQ1Njc4OSwiZXhwIjoxOTM5MDMyNzg5fQ.abcdefghijklmnopqrstuvwxyz1234567890ABCDEFGHIJKLMNOP
```

Nota: Es una sola línea muy larga, sin espacios ni saltos de línea.

## Si el Problema Persiste

1. **Verifica que el proyecto existe**: Ve a https://supabase.com/dashboard y confirma que el
   proyecto `hmnlriywocnpiktflehr` está activo
2. **Regenera las keys**: En Settings > API, puedes regenerar las API keys si es necesario
3. **Verifica la URL**: Asegúrate que la URL del proyecto es correcta

## Errores Comunes

❌ **Key incompleta**: Copiaste solo parte de la key ❌ **Key con espacios**: La key tiene espacios
o saltos de línea ❌ **Service role key**: Usaste la key incorrecta (debe ser "anon") ❌ **Proyecto
incorrecto**: La URL no corresponde a tu proyecto ❌ **Servidor no reiniciado**: Olvidaste reiniciar
después de cambiar .env.local

## Siguiente Paso

Una vez que actualices la API key correcta:

1. Reinicia el servidor
2. Recarga http://localhost:5173/test-connection
3. Deberías ver el warning de RLS (que es correcto)
4. Luego puedes hacer login en http://localhost:5173/login

---

**¿Necesitas ayuda?** Comparte un screenshot de tu Supabase Dashboard > Settings > API (sin mostrar
las keys completas, solo los primeros caracteres).
