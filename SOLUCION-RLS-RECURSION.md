# 🔧 Solución: Infinite Recursion en RLS

## El Problema

Estás viendo el error:

```
infinite recursion detected in policy for relation "users"
Código: 42P17
```

## Causa

La política RLS de la tabla `users` tiene una recursión infinita:

```sql
-- ❌ PROBLEMA: Esta política consulta la tabla users para verificar acceso a users
CREATE POLICY "Users can view users in their tenant"
  ON users FOR SELECT
  USING (tenant_id = (SELECT tenant_id FROM users WHERE id = auth.uid()));
```

Cuando intentas acceder a la tabla `users`, la política intenta consultar la tabla `users` para
verificar el `tenant_id`, lo cual requiere verificar la política nuevamente, creando un loop
infinito.

## Solución

He creado un script SQL que corrige este problema usando una función `SECURITY DEFINER` que rompe la
recursión.

### Paso 1: Ejecutar el Script de Corrección

1. Ve a Supabase SQL Editor: https://supabase.com/dashboard/project/hmnlriywocnpiktflehr/sql

2. Click en **"New query"**

3. Copia y pega el contenido del archivo: `microcreditos-pwa/supabase/04-fix-rls-recursion.sql`

4. Click en **"Run"** (o presiona Ctrl+Enter)

5. Deberías ver: **"Success. No rows returned"**

### Paso 2: Verificar la Corrección

1. Recarga la página de test: http://localhost:5173/test-connection

2. Ahora deberías ver:
   - ✅ **"Conexión exitosa a Supabase"**
   - ✅ **"Autenticado como: cobrador@demo.com"**
   - ✅ **"Tenant encontrado: [nombre del tenant]"**

## ¿Qué Hace el Script?

El script hace tres cosas:

1. **Elimina las políticas problemáticas**:
   - Borra la política recursiva de `users`
   - Borra la política recursiva de `tenants`

2. **Crea una función helper**:

   ```sql
   CREATE FUNCTION get_user_tenant_id()
   ```

   Esta función usa `SECURITY DEFINER` para obtener el `tenant_id` sin activar las políticas RLS,
   rompiendo la recursión.

3. **Crea políticas corregidas**:
   - Política para ver usuarios del mismo tenant (usando la función)
   - Política para ver tu propio registro de usuario
   - Política para ver tu tenant

## Verificación Rápida

Después de ejecutar el script, puedes verificar que funcionó ejecutando esto en SQL Editor:

```sql
-- Esto debería devolver tu registro de usuario sin error
SELECT * FROM users WHERE id = auth.uid();

-- Esto debería devolver tu tenant sin error
SELECT * FROM tenants WHERE id = (SELECT tenant_id FROM users WHERE id = auth.uid());
```

## Si el Problema Persiste

Si después de ejecutar el script sigues viendo el error:

1. Verifica que el script se ejecutó sin errores
2. Cierra sesión y vuelve a iniciar sesión
3. Recarga la página con Ctrl+F5 (hard refresh)
4. Verifica que no haya otras políticas conflictivas:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'users';
   ```

## Siguiente Paso

Una vez corregido el error de recursión:

- ✅ Podrás ver la conexión exitosa
- ✅ Podrás acceder a los datos de tu tenant
- ✅ Podrás continuar con la Fase 2 del proyecto

---

**¿Necesitas ayuda?** Si el error persiste después de ejecutar el script, comparte un screenshot del
resultado de la ejecución del SQL.
