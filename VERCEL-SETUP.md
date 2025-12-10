# 🚀 Configuración de Vercel

## Paso 1: Instalar Vercel CLI (si no lo tienes)

```bash
npm install -g vercel
```

## Paso 2: Login en Vercel

```bash
vercel login
```

## Paso 3: Link el proyecto

Desde la carpeta del proyecto:

```bash
vercel link
```

Selecciona:

- **Scope**: Tu cuenta/organización
- **Link to existing project?**: No (primera vez) o Yes (si ya existe)
- **Project name**: credisyncapp (o el nombre que prefieras)

## Paso 4: Configurar Variables de Entorno

### Opción A: Desde la CLI

```bash
vercel env add VITE_SUPABASE_URL
# Pega tu URL de Supabase cuando te lo pida

vercel env add VITE_SUPABASE_ANON_KEY
# Pega tu Anon Key de Supabase cuando te lo pida
```

### Opción B: Desde el Dashboard

1. Ve a https://vercel.com/dashboard
2. Selecciona tu proyecto
3. Ve a **Settings** > **Environment Variables**
4. Agrega:
   - `VITE_SUPABASE_URL` = `https://hmnlriywocnpiktflehr.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` = `[tu anon key]`
5. Selecciona los ambientes: Production, Preview, Development

## Paso 5: Deploy a Preview

```bash
vercel
```

Esto creará un deployment de preview. Vercel te dará una URL como:
`https://credisyncapp-xxx.vercel.app`

## Paso 6: Deploy a Production

```bash
vercel --prod
```

## Configuración Automática con Git

### Conectar con GitHub/GitLab/Bitbucket

1. Ve a https://vercel.com/dashboard
2. Click en **Add New** > **Project**
3. Importa tu repositorio Git
4. Vercel detectará automáticamente que es un proyecto Vite
5. Configura las variables de entorno
6. Click en **Deploy**

### Deployments Automáticos

Una vez conectado con Git:

- **Push a main/master** → Deploy a Production automático
- **Push a otras ramas** → Deploy a Preview automático
- **Pull Requests** → Deploy de preview con URL única

## Verificación

Después del deploy, verifica:

1. ✅ La aplicación carga correctamente
2. ✅ Puedes hacer login
3. ✅ La conexión a Supabase funciona
4. ✅ Los assets se cargan correctamente
5. ✅ No hay errores en la consola

## URLs del Proyecto

- **Production**: https://microcreditos-pwa.vercel.app (o tu dominio custom)
- **Preview**: https://microcreditos-pwa-git-[branch].vercel.app
- **Dashboard**: https://vercel.com/dashboard

## Dominio Personalizado (Opcional)

1. Ve a **Settings** > **Domains**
2. Click en **Add Domain**
3. Ingresa tu dominio (ej: `app.microcreditos.com`)
4. Sigue las instrucciones para configurar DNS

## Troubleshooting

### Error: "Missing environment variables"

- Verifica que las variables estén configuradas en Vercel
- Asegúrate de que tengan el prefijo `VITE_`

### Error: "Build failed"

- Verifica que `npm run build` funcione localmente
- Revisa los logs en el dashboard de Vercel

### Error: "404 on refresh"

- Ya está configurado en `vercel.json` con rewrites
- Si persiste, verifica que el archivo `vercel.json` esté en la raíz

## Comandos Útiles

```bash
# Ver deployments
vercel ls

# Ver logs del último deployment
vercel logs

# Eliminar un deployment
vercel rm [deployment-url]

# Ver información del proyecto
vercel inspect

# Abrir el dashboard
vercel open
```

## Configuración Completada ✅

- [x] `vercel.json` creado con configuración
- [x] `.vercelignore` creado
- [x] Rewrites configurados para SPA
- [x] Headers de seguridad configurados
- [x] Service Worker headers configurados
- [x] Variables de entorno documentadas

---

**Siguiente paso**: Configurar PWA con Vite Plugin (Task 4)
