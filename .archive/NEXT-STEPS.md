# Próximos Pasos - Configuración de Supabase

## ✅ Completado

- [x] Proyecto Svelte + Vite + TypeScript inicializado
- [x] Dependencias instaladas (Dexie, Supabase, Tailwind, etc.)
- [x] Configuración de Tailwind CSS + DaisyUI
- [x] Schema SQL creado (`supabase/01-schema-only.sql`)
- [x] Tipos TypeScript generados
- [x] Servicio de autenticación implementado
- [x] Variables de entorno configuradas (`.env.local`)

## 🔄 Pendiente - Configuración de Supabase

### 1. Ejecutar el Schema SQL en Supabase

1. Ve a tu proyecto en Supabase: https://hmnlriywocnpiktflehr.supabase.co
2. Navega a **SQL Editor** en el menú lateral
3. Click en **New query**
4. Copia y pega el contenido de `supabase/01-schema-only.sql`
5. Click en **Run** (o presiona Ctrl+Enter)
6. Verifica que no haya errores
7. Ve a **Table Editor** y confirma que se crearon 8 tablas:
   - tenants
   - users
   - rutas
   - productos_credito
   - clientes
   - creditos
   - cuotas
   - pagos

### 2. Configurar Storage para Comprobantes

1. Ve a **Storage** en el menú lateral
2. Click en **Create a new bucket**
3. Configura:
   - **Name**: `comprobantes`
   - **Public bucket**: ❌ (desactivado - privado)
4. Click en **Create bucket**

5. Configura las políticas de acceso:
   - Click en el bucket `comprobantes`
   - Ve a **Policies**
   - Click en **New policy**
   - Crea dos políticas:

**Política 1: Upload**

```sql
CREATE POLICY "Cobradores can upload their comprobantes"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'comprobantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Política 2: View**

```sql
CREATE POLICY "Cobradores can view their comprobantes"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'comprobantes'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

### 3. Crear Usuario de Prueba

1. Ve a **Authentication** > **Users**
2. Click en **Add user** > **Create new user**
3. Ingresa:
   - **Email**: cobrador@demo.com
   - **Password**: Demo123456!
   - **Auto Confirm User**: ✅ (activado)
4. Click en **Create user**
5. **IMPORTANTE**: Copia el UUID del usuario (aparece en la columna ID)

6. Ve a **SQL Editor** y ejecuta (reemplaza `YOUR_USER_UUID`):

```sql
INSERT INTO users (id, tenant_id, email, nombre, rol, activo)
VALUES (
  'YOUR_USER_UUID',  -- Pega aquí el UUID del paso 5
  '00000000-0000-0000-0000-000000000001',
  'cobrador@demo.com',
  'Juan Cobrador',
  'cobrador',
  true
);
```

### 4. (Opcional) Crear Datos de Prueba

Si quieres datos de prueba (rutas, productos, clientes):

1. Abre `supabase/02-seed-data.sql`
2. Descomenta las secciones que quieras
3. Reemplaza `YOUR_AUTH_USER_UUID` con el UUID del usuario
4. Ejecuta el SQL en **SQL Editor**

### 5. Probar la Conexión

1. Inicia el servidor de desarrollo:

   ```bash
   npm run dev
   ```

2. Abre el navegador en: http://localhost:5173

3. Deberías ver la página principal con el estado del proyecto

4. Para probar la conexión a Supabase:
   - Click en "Probar Conexión Supabase"
   - Verás un warning ⚠️ indicando que RLS está bloqueando el acceso (esto es CORRECTO)
   - Para ver "✅ Conexión exitosa", tienes dos opciones:

**Opción A (Recomendada): Login con usuario de prueba**

- Click en "🔐 Login" desde la página de test
- Ingresa las credenciales del usuario que creaste en el paso 3
- Después del login exitoso, verás "✅ Conexión exitosa a Supabase"

**Opción B: Permitir acceso público temporal (solo para testing)**

- Ejecuta el script `supabase/03-fix-rls-for-testing.sql` en Supabase SQL Editor
- Esto permite acceso público a la tabla tenants (NO recomendado para producción)
- Recarga la página de test

## 📋 Checklist de Verificación

- [ ] Schema SQL ejecutado sin errores
- [ ] 8 tablas creadas en Table Editor
- [ ] Bucket `comprobantes` creado en Storage
- [ ] Políticas de Storage configuradas
- [ ] Usuario de prueba creado en Authentication
- [ ] Usuario vinculado en tabla `users`
- [ ] Aplicación inicia sin errores (`npm run dev`)
- [ ] Página de test muestra conexión exitosa

## 🐛 Troubleshooting

### Error: "relation does not exist"

- Verifica que ejecutaste `01-schema-only.sql` completo
- Verifica que estás en el proyecto correcto de Supabase

### Error: "new row violates row-level security policy"

- Verifica que las políticas RLS están creadas
- Verifica que el usuario está autenticado

### Error: "Failed to fetch"

- Verifica que las variables en `.env.local` son correctas
- Verifica que la URL de Supabase es accesible

### La página de test no carga

- Verifica que el servidor de desarrollo está corriendo
- Verifica que no hay errores en la consola del navegador

## 🎯 Siguiente Fase

Una vez completados estos pasos, estaremos listos para:

**Fase 2: Core Data Layer**

- Task 5: Implement IndexedDB with Dexie.js
- Task 6: Implement multi-layer storage system
- Task 7: Implement checksum and integrity verification

## 📞 Ayuda

Si encuentras problemas:

1. Revisa la documentación en `supabase/README.md`
2. Verifica los logs en la consola del navegador (F12)
3. Revisa los logs de Supabase en el dashboard

---

**Estado actual**: ✅ Fase 1 completada - Pendiente configuración manual de Supabase
