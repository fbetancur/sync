# Diseño de la Plataforma Universal de Recolección de Datos

## Overview

Este documento describe el diseño técnico para transformar la plataforma actual de microcréditos en una **Plataforma Universal de Recolección de Datos**. La plataforma mantendrá todas las capacidades empresariales existentes (funcionamiento offline, almacenamiento multi-capa, resolución de conflictos CRDT, detección de corrupción, encriptación automática, auditoría completa) pero las hará configurables mediante archivos JSON, permitiendo crear nuevas aplicaciones en 2-3 días en lugar de 3-4 meses.

## Architecture

### Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────┐
│                    APLICACIONES ESPECÍFICAS                 │
│  ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐│
│  │   CrediSync     │ │   HealthSync    │ │   SurveySync    ││
│  │ (Microcréditos) │ │     (Salud)     │ │   (Encuestas)   ││
│  └─────────────────┘ └─────────────────┘ └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                  CAPA DE CONFIGURACIÓN                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  Archivos JSON de Configuración por Aplicación         ││
│  │  - Esquemas de BD    - Validaciones    - Encriptación  ││
│  │  - Sincronización    - Notificaciones  - Alertas      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│                   MOTORES UNIVERSALES                       │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Motor de Esquemas │ Motor de Validación │ Motor de Sync ││
│  │ Motor de Encript. │ Motor de Alertas    │ Motor Backup  ││
│  │ Motor de Errores  │ Motor Notificación  │ Motor Audit   ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────────────┐
│              INFRAESTRUCTURA EXISTENTE                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Storage Multi-Capa │ CRDT │ IndexedDB │ Supabase │ PWA ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### Principios de Diseño

1. **Separación de Infraestructura y Configuración**: La infraestructura técnica (offline, multi-capa, CRDT, etc.) permanece inmutable, solo cambia la configuración por aplicación.

2. **Configuración Declarativa**: Toda la lógica específica de aplicación se define en archivos JSON, no en código.

3. **Motores Universales**: Componentes genéricos que interpretan configuración y aplican comportamientos específicos.

4. **Compatibilidad Retroactiva**: La aplicación de microcréditos existente debe seguir funcionando sin cambios.

## Components and Interfaces

### 1. Motor Universal de Esquemas de Base de Datos

**Responsabilidad**: Generar automáticamente esquemas de IndexedDB basados en configuración JSON.

**Interfaz Principal**:
```typescript
interface SchemaEngine {
  generateSchema(config: DatabaseConfig): DexieSchema;
  createTables(schema: DexieSchema): Promise<void>;
  addSyncFields(tableConfig: TableConfig): TableConfig;
  createIndexes(tableConfig: TableConfig): IndexConfig[];
}
```

**Configuración de Entrada**:
```json
{
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
        }
      }
    }
  }
}
```

**Salida Generada**:
- Esquema Dexie.js completo con todas las tablas
- Campos de sincronización agregados automáticamente (synced, checksum, version_vector, field_versions)
- Índices optimizados para consultas y sincronización
- Relaciones establecidas con integridad referencial

### 2. Motor Universal de Validación

**Responsabilidad**: Aplicar validaciones configurables a todos los datos antes de guardar.

**Interfaz Principal**:
```typescript
interface ValidationEngine {
  validateRecord(tableName: string, data: any, config: ValidationConfig): ValidationResult;
  getValidator(fieldType: string): FieldValidator;
  generateErrorMessage(field: string, rule: ValidationRule, value: any): string;
}
```

**Configuración de Entrada**:
```json
{
  "validation": {
    "pacientes": {
      "nombre": {
        "type": "text",
        "required": true,
        "minLength": 2,
        "maxLength": 100,
        "pattern": "^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$"
      },
      "historia": {
        "type": "number",
        "required": true,
        "unique": true,
        "minValue": 1,
        "maxValue": 999999999
      },
      "telefono": {
        "type": "phone",
        "required": true,
        "format": "colombian"
      },
      "email": {
        "type": "email",
        "required": false
      }
    }
  }
}
```

**Validadores Predefinidos**:
- `text`: Validación de texto con longitud, patrones, caracteres permitidos
- `number`: Validación numérica con rangos, decimales
- `email`: Validación de formato de email estándar
- `phone`: Validación de teléfonos con formatos por país
- `date`: Validación de fechas con rangos permitidos
- `url`: Validación de URLs válidas

### 3. Sistema Universal de Notificaciones

**Responsabilidad**: Mostrar notificaciones consistentes en todas las aplicaciones.

**Interfaz Principal**:
```typescript
interface NotificationSystem {
  show(type: NotificationType, message: string, options?: NotificationOptions): void;
  showProgress(message: string, progress: number): void;
  showWithActions(message: string, actions: NotificationAction[]): void;
  configure(config: NotificationConfig): void;
}
```

**Configuración de Entrada**:
```json
{
  "notifications": {
    "position": "top-right",
    "duration": {
      "success": 3000,
      "error": 5000,
      "warning": 4000,
      "info": 3000
    },
    "templates": {
      "paciente_guardado": {
        "type": "success",
        "message": "Paciente {nombre} registrado correctamente",
        "icon": "user-check"
      },
      "error_validacion": {
        "type": "error",
        "message": "Error en los datos: {detalles}",
        "persistent": true,
        "actions": ["corregir", "cancelar"]
      }
    }
  }
}
```

**Tipos de Notificación**:
- `success`: Acciones completadas exitosamente
- `error`: Errores que requieren atención del usuario
- `warning`: Advertencias importantes
- `info`: Información general
- `progress`: Indicadores de progreso para operaciones largas

### 4. Motor Universal de Alertas Configurables

**Responsabilidad**: Generar alertas automáticas basadas en condiciones de negocio configurables.

**Interfaz Principal**:
```typescript
interface AlertEngine {
  evaluateConditions(config: AlertConfig): Alert[];
  scheduleAlert(alert: Alert): void;
  processAlert(alert: Alert): void;
  suppressDuplicates(alert: Alert, timeWindow: number): boolean;
}
```

**Configuración de Entrada**:
```json
{
  "alerts": {
    "cita_hoy": {
      "condition": "cita.fecha = TODAY() AND cita.estado = 'programada'",
      "message": "Cita programada hoy: {paciente.nombre} a las {cita.hora}",
      "priority": "medium",
      "frequency": "once_per_day",
      "actions": [
        {
          "label": "Confirmar Asistencia",
          "action": "confirm_attendance",
          "params": {"cita_id": "{cita.id}"}
        },
        {
          "label": "Reprogramar",
          "action": "reschedule_appointment",
          "params": {"cita_id": "{cita.id}"}
        }
      ]
    },
    "paciente_sin_consulta": {
      "condition": "paciente.ultima_consulta < DATE_SUB(TODAY(), INTERVAL 6 MONTH)",
      "message": "Paciente {paciente.nombre} sin consulta hace más de 6 meses",
      "priority": "low",
      "frequency": "weekly"
    }
  }
}
```

**Evaluación de Condiciones**:
- Motor de expresiones que evalúa condiciones SQL-like
- Acceso a datos de todas las tablas configuradas
- Funciones predefinidas (TODAY(), DATE_SUB(), etc.)
- Variables de contexto (usuario actual, dispositivo, etc.)

### 5. Sistema Universal de Manejo de Errores

**Responsabilidad**: Capturar, categorizar y manejar todos los errores de manera consistente.

**Interfaz Principal**:
```typescript
interface ErrorHandler {
  captureError(error: Error, context: ErrorContext): void;
  categorizeError(error: Error): ErrorCategory;
  generateUserMessage(error: CategorizedError): string;
  executeRecoveryStrategy(error: CategorizedError): Promise<RecoveryResult>;
}
```

**Configuración de Entrada**:
```json
{
  "errorHandling": {
    "categories": {
      "validation": {
        "userMessage": "Los datos ingresados no son válidos",
        "showDetails": true,
        "recoveryActions": ["corregir_datos", "cancelar"]
      },
      "network": {
        "userMessage": "Problema de conexión. Los datos se guardaron localmente.",
        "autoRetry": true,
        "retryAttempts": 3,
        "retryDelay": 5000
      },
      "storage": {
        "userMessage": "Error guardando datos. Intentando recuperar...",
        "recoveryStrategy": "restore_from_backup",
        "escalate": true
      }
    },
    "contextCapture": {
      "includeUser": true,
      "includeDevice": true,
      "includeLocation": true,
      "includeBattery": true,
      "includeConnection": true
    }
  }
}
```

**Categorías de Error**:
- `validation`: Errores de validación de datos
- `network`: Errores de conectividad
- `storage`: Errores de almacenamiento local
- `sync`: Errores de sincronización
- `business`: Errores de lógica de negocio
- `system`: Errores técnicos del sistema

### 6. Sistema Universal de Backup y Recovery

**Responsabilidad**: Crear backups automáticos y permitir recuperación de datos.

**Interfaz Principal**:
```typescript
interface BackupSystem {
  createIncrementalBackup(tables: string[]): Promise<BackupResult>;
  createFullBackup(): Promise<BackupResult>;
  restoreFromBackup(backupId: string, pointInTime?: Date): Promise<RestoreResult>;
  syncToCloud(backup: Backup): Promise<CloudSyncResult>;
  verifyBackupIntegrity(backupId: string): Promise<IntegrityResult>;
}
```

**Configuración de Entrada**:
```json
{
  "backup": {
    "incremental": {
      "frequency": "15_minutes",
      "enabled": true,
      "criticalTables": ["pacientes", "consultas"]
    },
    "full": {
      "frequency": "daily",
      "time": "02:00",
      "enabled": true
    },
    "retention": {
      "local": "30_days",
      "cloud": "1_year"
    },
    "cloud": {
      "provider": "supabase_storage",
      "encryption": true,
      "compression": true,
      "autoSync": true
    },
    "recovery": {
      "autoRestore": true,
      "verifyIntegrity": true,
      "notifyUser": true
    }
  }
}
```

**Tipos de Backup**:
- `incremental`: Solo cambios desde último backup
- `full`: Backup completo de todas las tablas
- `differential`: Cambios desde último backup completo
- `snapshot`: Estado completo en momento específico

## Data Models

### Modelo de Configuración Universal

```typescript
interface UniversalAppConfig {
  appInfo: {
    name: string;
    version: string;
    description: string;
  };
  database: DatabaseConfig;
  validation: ValidationConfig;
  encryption: EncryptionConfig;
  sync: SyncConfig;
  notifications: NotificationConfig;
  alerts: AlertConfig;
  errorHandling: ErrorHandlingConfig;
  backup: BackupConfig;
}

interface DatabaseConfig {
  name: string;
  multiTenant: boolean;
  tables: Record<string, TableConfig>;
}

interface TableConfig {
  fields: string[];
  indexes?: string[];
  relationships?: Record<string, string>;
  required?: string[];
  unique?: string[];
}
```

### Modelo de Datos Técnicos (Invariante)

Todos los registros en todas las aplicaciones tendrán estos campos técnicos agregados automáticamente:

```typescript
interface UniversalRecord {
  // Campos de identificación
  id: string;
  tenant_id?: string;
  
  // Campos de auditoría
  created_at: number;
  updated_at: number;
  created_by: string;
  
  // Campos de sincronización CRDT
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  
  // Campos de integridad
  checksum: string;
  
  // Campos específicos de la aplicación
  [key: string]: any;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Schema Generation Completeness
*For any* valid database configuration, the schema engine should generate a complete Dexie schema with all specified tables, fields, indexes, and technical fields
**Validates: Requirements 1.1, 1.2, 1.3, 1.4, 1.5**

### Property 2: Validation Rule Consistency  
*For any* validation configuration and data input, the validation engine should consistently apply all rules and reject invalid data while accepting valid data
**Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5**

### Property 3: Notification System Reliability
*For any* configured notification type and trigger condition, the notification system should display the appropriate message with correct styling and duration
**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5**

### Property 4: Alert Condition Evaluation
*For any* alert configuration and data state, the alert engine should correctly evaluate conditions and generate alerts only when conditions are met
**Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**

### Property 5: Error Context Capture
*For any* error that occurs in the system, the error handler should capture complete context information and provide appropriate user messaging and recovery options
**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 6: Backup Integrity Preservation
*For any* backup operation, the system should create verifiable backups that can be used to restore data to the exact state at backup time
**Validates: Requirements 6.1, 6.2, 6.5**

### Property 7: Encryption Configuration Compliance
*For any* encryption configuration, the system should encrypt exactly the specified sensitive fields and leave non-sensitive fields unencrypted
**Validates: Requirements 7.1, 7.2, 7.3, 7.4**

### Property 8: Sync Priority Enforcement
*For any* synchronization configuration, the system should process sync operations in the exact order specified by the priority configuration
**Validates: Requirements 8.1, 8.2, 8.3, 8.4, 8.5**

## Error Handling

### Estrategia de Manejo de Errores por Capas

1. **Capa de Configuración**: Validación estricta de archivos de configuración al inicio
2. **Capa de Motores**: Manejo robusto de errores con fallbacks a comportamiento por defecto
3. **Capa de Infraestructura**: Manejo existente de errores offline, multi-capa, etc.

### Tipos de Error y Estrategias

- **Errores de Configuración**: Validación al inicio, mensajes claros de corrección
- **Errores de Validación**: Mensajes específicos por campo, opciones de corrección
- **Errores de Red**: Reintentos automáticos, funcionamiento offline
- **Errores de Storage**: Recuperación automática desde backups
- **Errores de Sincronización**: Resolución de conflictos, cola de reintentos

## Testing Strategy

### Enfoque de Testing Dual

**Unit Tests**:
- Validación de configuraciones específicas
- Casos edge de cada motor universal
- Integración entre motores
- Compatibilidad retroactiva

**Property-Based Tests**:
- Generación de configuraciones aleatorias válidas
- Verificación de propiedades invariantes
- Testing de robustez con datos aleatorios
- Verificación de consistencia entre aplicaciones

### Configuración de Property-Based Testing

- **Framework**: fast-check para JavaScript/TypeScript
- **Iteraciones mínimas**: 100 por propiedad
- **Generadores personalizados**: Para configuraciones válidas de cada motor
- **Shrinking**: Para encontrar casos mínimos que fallan

### Estrategia de Testing por Motor

**Motor de Esquemas**:
- Generar configuraciones de BD aleatorias
- Verificar que se creen todas las tablas especificadas
- Verificar que se agreguen campos técnicos automáticamente
- Verificar integridad referencial

**Motor de Validación**:
- Generar reglas de validación aleatorias
- Generar datos válidos e inválidos
- Verificar que se rechacen datos inválidos consistentemente
- Verificar mensajes de error apropiados

**Sistema de Notificaciones**:
- Generar configuraciones de notificación aleatorias
- Simular eventos que disparan notificaciones
- Verificar que se muestren con formato correcto
- Verificar duración y comportamiento

**Motor de Alertas**:
- Generar condiciones de alerta aleatorias
- Generar datos que cumplan y no cumplan condiciones
- Verificar que se generen alertas apropiadas
- Verificar throttling y deduplicación

**Sistema de Errores**:
- Generar diferentes tipos de errores
- Verificar captura de contexto completo
- Verificar estrategias de recuperación
- Verificar mensajes de usuario apropiados

**Sistema de Backup**:
- Generar datos aleatorios para backup
- Verificar integridad de backups creados
- Verificar restauración exacta de datos
- Verificar encriptación y compresión

### Testing de Integración

- **Compatibilidad entre Motores**: Verificar que los motores trabajen correctamente juntos
- **Configuración End-to-End**: Testing completo con configuraciones reales de aplicaciones
- **Performance**: Verificar que la generalización no degrade performance
- **Migración**: Verificar que aplicaciones existentes sigan funcionando