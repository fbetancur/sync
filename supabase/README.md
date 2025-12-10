# Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Crea un nuevo proyecto:
   - **Nombre**: microcreditos-pwa
   - **Database Password**: [Guarda esta contraseña de forma segura]
   - **Region**: Selecciona la más cercana a tus usuarios
   - **Plan**: Free tier es suficiente para desarrollo

## Paso 2: Ejecutar el Schema SQL

1. En el dashboard de Supabase, ve a **SQL Editor**
2. Crea una nueva query llamada "01-schema"
3. Copia y pega el contenido de `01-schema-only.sql`
4. Ejecuta la query (Run)
5. Verifica que todas las tablas se crearon correctamente en **Table Editor**
6. Deberías ver 8 tablas: tenants, users, rutas, productos_credito, clientes, creditos, cuotas,
   pagos

## Paso 3: Configurar Storage para Imágenes

1. Ve a **Storage** en el dashboard
2. Crea un nuevo bucket:
   - **Name**: `comprobantes`
   - **Public**: No (privado)
3. Configura las políticas de acceso:

```sql
-- Policy para que cobradores puedan subir sus propios comprobantes
CREATE POLICY "Cobradores can upload their comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprobantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy para que cobradores puedan ver sus propios comprobantes
CREATE POLICY "Cobradores can view their comprobantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprobantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Paso 4: Obtener Credenciales

1. Ve a **Settings** > **API**
2. Copia los siguientes valores:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon public key**: `eyJxxx...`

## Paso 5: Configurar Variables de Entorno

1. En el proyecto, copia `.env.example` a `.env.local`:

   ```bash
   cp .env.example .env.local
   ```

2. Edita `.env.local` con tus credenciales:
   ```env
   VITE_SUPABASE_URL=https://xxx.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJxxx...
   ```

## Paso 6: Configurar Autenticación

1. Ve a **Authentication** > **Providers**
2. Habilita **Email** provider
3. Configura las opciones:
   - **Enable email confirmations**: Desactivado (para desarrollo)
   - **Enable email change confirmations**: Activado
   - **Secure email change**: Activado

## Paso 7: Crear Usuario de Prueba

### Crear usuario paso a paso:

1. Ve a **Authentication** > **Users** en el dashboard de Supabase
2. Click en **Add user** > **Create new user**
3. Ingresa:
   - **Email**: cobrador@demo.com
   - **Password**: Demo123456!
   - **Auto Confirm User**: ✅ (activado)
4. Click en **Create user**
5. Copia el UUID del usuario que aparece en la lista

6. Ve a **SQL Editor** y ejecuta este SQL (reemplaza `YOUR_USER_UUID`):

```sql
-- Vincular usuario con tenant y rol
INSERT INTO users (id, tenant_id, email, nombre, rol, activo)
VALUES (
  'YOUR_USER_UUID',  -- Reemplaza con el UUID del paso 5
  '00000000-0000-0000-0000-000000000001',
  'cobrador@demo.com',
  'Juan Cobrador',
  'cobrador',
  true
);
```

7. Opcionalmente, ejecuta `02-seed-data.sql` para crear rutas, productos y clientes de prueba
   (recuerda reemplazar los UUIDs)

## Paso 8: Generar TypeScript Types (Opcional)

Supabase puede generar tipos TypeScript automáticamente:

```bash
# Instalar Supabase CLI
npm install -g supabase

# Login
supabase login

# Link al proyecto
supabase link --project-ref YOUR_PROJECT_REF

# Generar tipos
supabase gen types typescript --local > src/types/supabase.ts
```

## Verificación

Para verificar que todo está configurado correctamente:

1. Verifica que todas las tablas existen en **Table Editor**
2. Verifica que las políticas RLS están activas
3. Verifica que el bucket de storage existe
4. Prueba la conexión desde la aplicación

## Troubleshooting

### Error: "relation does not exist"

- Asegúrate de haber ejecutado el schema.sql completo
- Verifica que estás conectado al proyecto correcto

### Error: "new row violates row-level security policy"

- Verifica que las políticas RLS están configuradas correctamente
- Asegúrate de que el usuario está autenticado

### Error: "permission denied for table"

- Verifica que el usuario tiene los permisos correctos
- Revisa las políticas RLS

## Recursos

- [Documentación de Supabase](https://supabase.com/docs)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Storage](https://supabase.com/docs/guides/storage)
