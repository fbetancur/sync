# Implementation Plan
# Lista de Tareas: Motor Universal de Esquemas de Base de Datos

## Requisito 1: Motor Universal de Esquemas de Base de Datos

### Análisis del Estado Actual

**Infraestructura Existente Reutilizable:**
- ✅ `@sync/core` con toda la infraestructura offline-first
- ✅ `MicrocreditosDB` (Dexie) con esquema hardcodeado para microcréditos
- ✅ Sistema de tipos en `@sync/types`
- ✅ Configuración por aplicación (`SyncAppConfig`)
- ✅ CrediSync funcionando con la infraestructura actual

**Lo que se va a Transformar:**
- 🔄 `MicrocreditosDB` → `UniversalDB` (esquema dinámico desde configuración)
- 🔄 Configuración hardcodeada → Configuración JSON por aplicación
- ➕ Nuevo motor de generación de esquemas
- ➕ Sistema de validación de configuraciones
- ➕ Migración automática de CrediSync

---

### Fase 1

- [x] 1. Crear interfaces y tipos para configuración universal



  - Crear `packages/@sync/core/src/schema/types.ts` con interfaces para configuración de esquemas
  - Definir `DatabaseConfig`, `TableConfig`, `FieldConfig`, `IndexConfig`
  - Definir tipos para validación de configuraciones JSON
  - Agregar tipos al export principal de `@sync/types`
  - **Ubicación**: `packages/@sync/types/src/database.ts` (extender existente)
  - **Cambios**: Agregar nuevos tipos sin romper los existentes
  - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Implementar motor de generación de esquemas



  - Crear `packages/@sync/core/src/schema/schema-engine.ts`
  - Implementar `SchemaEngine` que lee configuración JSON y genera esquema Dexie
  - Agregar lógica para campos técnicos automáticos (synced, checksum, version_vector, etc.)
  - Implementar generación de índices optimizados
  - Implementar validación de configuración JSON
  - **Ubicación**: Nueva carpeta `packages/@sync/core/src/schema/`
  - **Cambios**: Agregar nueva funcionalidad sin afectar código existente
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 3. Crear base de datos universal dinámica



  - Crear `packages/@sync/core/src/db/universal-database.ts`
  - Implementar `UniversalDB` que extiende Dexie con esquema dinámico
  - Mantener compatibilidad con `MicrocreditosDB` existente
  - Agregar soporte para multi-tenancy automático
  - Implementar inicialización dinámica de tablas
  - **Ubicación**: `packages/@sync/core/src/db/universal-database.ts`
  - **Cambios**: Agregar nueva clase sin modificar `MicrocreditosDB`
  - _Requirements: 1.1, 1.2, 1.5_

- [x] 4. Integrar motor de esquemas con configuración de aplicación



  - Modificar `packages/@sync/core/src/app.ts` para soportar configuración de esquemas
  - Extender `SyncAppConfig` para incluir `databaseSchema`
  - Implementar factory que crea `UniversalDB` o `MicrocreditosDB` según configuración
  - Mantener compatibilidad retroactiva con CrediSync
  - **Ubicación**: `packages/@sync/core/src/app.ts` (modificar existente)
  - **Cambios**: Extender configuración existente manteniendo compatibilidad
  - _Requirements: 1.1, 1.4, 1.5_

- [x] 5. Crear configuración JSON para CrediSync (migración)




  - Crear `apps/credisync/credisync-schema.json` con esquema actual de microcréditos
  - Extraer definición de tablas desde `MicrocreditosDB` a JSON
  - Incluir todas las tablas: clientes, creditos, cuotas, pagos, etc.
  - Definir índices y relaciones existentes
  - **Ubicación**: `apps/credisync/credisync-schema.json`
  - **Cambios**: Nuevo archivo de configuración
  - _Requirements: 1.1, 1.3, 1.4_



- [ ] 6. Actualizar CrediSync para usar motor universal
  - Modificar `apps/credisync/src/lib/app-config.ts` para incluir configuración de esquema
  - Cargar `credisync-schema.json` en la configuración
  - Verificar que todos los servicios sigan funcionando
  - Mantener nombres de tablas existentes para compatibilidad
  - **Ubicación**: `apps/credisync/src/lib/app-config.ts`
  - **Cambios**: Agregar carga de configuración de esquema
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 7. Crear configuración de ejemplo para HealthSync
  - Crear `apps/healthsync/healthsync-schema.json` con esquema de salud
  - Definir tablas: pacientes, consultas, tratamientos, zonas
  - Incluir campos, índices y relaciones apropiadas
  - Demostrar diferencias con microcréditos
  - **Ubicación**: `apps/healthsync/healthsync-schema.json`
  - **Cambios**: Nuevo archivo de configuración
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 8. Implementar validación y testing del motor
  - Crear `packages/@sync/core/src/schema/schema-engine.test.ts`
  - Implementar tests unitarios para generación de esquemas
  - Crear tests de validación de configuraciones JSON
  - Verificar generación correcta de campos técnicos
  - Probar con configuraciones de CrediSync y HealthSync
  - **Ubicación**: `packages/@sync/core/src/schema/schema-engine.test.ts`
  - **Cambios**: Nuevos archivos de testing
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 9. Actualizar documentación y estructura del monorepo
  - Actualizar `.kiro/specs/plataforma-universal/EstructuraMonorepo.md`
  - Agregar sección sobre configuraciones de esquemas JSON
  - Documentar ubicación de archivos de configuración
  - Agregar ejemplos de uso del motor universal
  - **Ubicación**: `.kiro/specs/plataforma-universal/EstructuraMonorepo.md`
  - **Cambios**: Agregar sección sobre motor de esquemas
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 10. Crear documentación de uso del motor universal
  - Crear `packages/@sync/core/docs/schema-engine-guide.md`
  - Documentar formato de configuración JSON
  - Incluir ejemplos prácticos de CrediSync y HealthSync
  - Explicar campos técnicos automáticos
  - Documentar mejores prácticas para definir esquemas
  - **Ubicación**: `packages/@sync/core/docs/schema-engine-guide.md`
  - **Cambios**: Nuevo archivo de documentación
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [ ] 11. Verificación final y git push
  - Ejecutar todos los tests para verificar que no se rompió nada
  - Verificar que CrediSync sigue funcionando correctamente
  - Probar creación de cliente con nueva infraestructura
  - Verificar que se generen correctamente los esquemas dinámicos
  - **Preguntar al usuario si está conforme con la implementación**
  - Hacer `git add .` y `git commit -m "feat: implementar motor universal de esquemas de base de datos"`
  - Hacer `git push origin main`
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

---

## Ejemplo Práctico de Funcionamiento

### CÓMO FUNCIONA CON EJEMPLO REAL

**PASO 1: Desarrollador crea configuración**

Para app de salud (archivo: `apps/healthsync/healthsync-schema.json`):
```json
{
  "appName": "HealthSync",
  "database": {
    "name": "healthsync_db",
    "multiTenant": true,
    "tables": {
      "pacientes": {
        "fields": ["nombre", "historia", "telefono", "direccion", "zona_id"],
        "indexes": ["historia", "telefono", "zona_id"],
        "relationships": {
          "zona_id": "zonas.id"
        },
        "required": ["nombre", "historia", "telefono"]
      },
      "consultas": {
        "fields": ["paciente_id", "fecha", "diagnostico", "tratamiento"],
        "indexes": ["paciente_id", "fecha"],
        "relationships": {
          "paciente_id": "pacientes.id"
        },
        "required": ["paciente_id", "fecha"]
      },
      "zonas": {
        "fields": ["nombre", "descripcion"],
        "indexes": ["nombre"],
        "required": ["nombre"]
      }
    }
  }
}
```

**PASO 2: Motor Universal lee configuración**

Lo que hace el motor automáticamente:
1. Lee el JSON desde `apps/healthsync/healthsync-schema.json`
2. Ve que necesita crear 3 tablas: "pacientes", "consultas", "zonas"
3. Ve los campos que necesita cada tabla
4. **AUTOMÁTICAMENTE** agrega campos técnicos a cada tabla:
   - `id`, `tenant_id`, `created_at`, `updated_at`, `created_by`
   - `synced`, `checksum`, `version_vector`, `field_versions`

**PASO 3: Motor genera esquema Dexie**

El motor convierte la configuración en esto:
```javascript
// Esto se genera AUTOMÁTICAMENTE
this.version(1).stores({
  pacientes: `id,tenant_id,historia,telefono,zona_id,[tenant_id+historia],[tenant_id+telefono],[tenant_id+zona_id]`,
  consultas: `id,tenant_id,paciente_id,fecha,[tenant_id+paciente_id],[tenant_id+fecha]`,
  zonas: `id,tenant_id,nombre,[tenant_id+nombre]`
});
```

**PASO 4: Aplicación funciona inmediatamente**

```javascript
// En HealthSync app-config.ts
import healthSyncSchema from './healthsync-schema.json';

const healthSyncConfig = {
  appName: 'HealthSync',
  databaseSchema: healthSyncSchema,
  // ... resto de configuración
};

const healthSyncApp = createSyncApp(healthSyncConfig);

// ¡Ya funciona con toda la infraestructura offline-first!
await healthSyncApp.services.db.pacientes.add({
  nombre: "Juan Pérez",
  historia: "12345",
  telefono: "3001234567",
  direccion: "Calle 123",
  zona_id: "zona-1"
});
```

**RESULTADO**: Nueva aplicación de salud funcionando en 2-3 días con:
- ✅ Almacenamiento offline-first
- ✅ Sincronización automática
- ✅ Resolución de conflictos CRDT
- ✅ Auditoría completa
- ✅ Encriptación de campos sensibles
- ✅ Backup automático
- ✅ Multi-tenancy
- ✅ Integridad de datos con checksums

**SIN ESCRIBIR UNA SOLA LÍNEA DE CÓDIGO DE INFRAESTRUCTURA**