# Especificación de Requisitos: Plataforma Universal de Recolección de Datos

## Introducción

Esta especificación define los requisitos para transformar la plataforma actual de microcréditos en una **Plataforma Universal de Recolección de Datos** que sirva como cimientos para cualquier aplicación de recolección de datos offline-first, manteniendo todas las capacidades empresariales existentes (offline, multi-capa, CRDT, encriptación, auditoría) pero haciéndolas configurables por aplicación.

## Glosario

- **Motor Universal**: Componente genérico que funciona para cualquier tipo de aplicación mediante configuración
- **Configuración por App**: Archivo JSON que define el comportamiento específico de cada aplicación sin modificar código
- **Esquema Dinámico**: Estructura de base de datos que se genera automáticamente según configuración
- **Validación Configurable**: Sistema de validación que aplica reglas definidas por configuración
- **Notificación Universal**: Sistema de mensajes que funciona igual en todas las aplicaciones
- **Backup Automático**: Sistema de respaldo que protege datos sin intervención del usuario
- **Manejo de Errores Consistente**: Tratamiento uniforme de errores en todas las aplicaciones

## Requisitos

### Requisito 1: Motor Universal de Esquemas de Base de Datos

**User Story:** Como desarrollador de una nueva aplicación, quiero definir mis tablas y campos en un archivo de configuración, para que la plataforma cree automáticamente toda la estructura de base de datos con las capacidades offline-first.

#### Acceptance Criteria

1. WHEN se proporciona una configuración de esquema THEN el sistema SHALL crear automáticamente todas las tablas especificadas en IndexedDB
2. WHEN se definen campos en la configuración THEN el sistema SHALL agregar automáticamente campos de sincronización (synced, checksum, version_vector, field_versions)
3. WHEN se especifican índices en la configuración THEN el sistema SHALL crear automáticamente índices optimizados para consultas
4. WHEN se definen relaciones entre tablas THEN el sistema SHALL establecer automáticamente las referencias correspondientes
5. WHERE se requiere multi-tenancy THEN el sistema SHALL agregar automáticamente tenant_id a todas las tablas

**Ejemplo de Funcionamiento:**
```
Motor Universal de Esquemas:
- Recibe configuración JSON con definición de tablas
- Genera automáticamente esquema Dexie.js
- Agrega campos técnicos (synced, checksum, version_vector)
- Crea índices optimizados
- Establece relaciones entre tablas

Configuración Microcréditos:
{
  "tablas": {
    "clientes": {
      "campos": ["nombre", "documento", "telefono", "direccion"],
      "indices": ["documento", "telefono"],
      "relaciones": {"ruta_id": "rutas.id"}
    }
  }
}

Configuración Salud:
{
  "tablas": {
    "pacientes": {
      "campos": ["nombre", "historia", "telefono", "direccion"],
      "indices": ["historia", "telefono"],
      "relaciones": {"zona_id": "zonas.id"}
    }
  }
}

Resultado: Ambas apps tienen estructura completa con capacidades offline-first
```

### Requisito 2: Motor Universal de Validación

**User Story:** Como desarrollador de aplicación, quiero definir reglas de validación en configuración, para que todos los datos se validen consistentemente sin escribir código de validación.

#### Acceptance Criteria

1. WHEN se definen reglas de validación en configuración THEN el sistema SHALL aplicar automáticamente todas las validaciones antes de guardar datos
2. WHEN se especifica un tipo de campo (email, telefono, numero) THEN el sistema SHALL usar validadores predefinidos apropiados
3. WHEN se define un campo como requerido THEN el sistema SHALL rechazar datos que no incluyan ese campo
4. WHEN se especifican rangos o longitudes THEN el sistema SHALL validar que los valores estén dentro de los límites
5. WHERE la validación falla THEN el sistema SHALL proporcionar mensajes de error claros y específicos

**Ejemplo de Funcionamiento:**
```
Motor Universal de Validación:
- Lee reglas de configuración por campo
- Aplica validadores predefinidos (email, telefono, numero, fecha)
- Valida rangos, longitudes, formatos
- Genera mensajes de error localizados
- Previene guardado de datos inválidos

Configuración Microcréditos:
{
  "validaciones": {
    "clientes": {
      "nombre": {"tipo": "texto", "requerido": true, "minimo": 2, "maximo": 100},
      "documento": {"tipo": "numero", "requerido": true, "minimo": 8, "maximo": 15},
      "telefono": {"tipo": "telefono", "requerido": true},
      "email": {"tipo": "email", "requerido": false}
    }
  }
}

Configuración Salud:
{
  "validaciones": {
    "pacientes": {
      "nombre": {"tipo": "texto", "requerido": true, "minimo": 2, "maximo": 100},
      "historia": {"tipo": "numero", "requerido": true, "unico": true},
      "telefono": {"tipo": "telefono", "requerido": true},
      "edad": {"tipo": "numero", "minimo": 0, "maximo": 120}
    }
  }
}

Resultado: Validación consistente y robusta en todas las apps
```

### Requisito 3: Sistema Universal de Notificaciones

**User Story:** Como usuario de cualquier aplicación, quiero recibir notificaciones consistentes y claras sobre el estado de mis acciones, para entender qué está pasando en la aplicación.

#### Acceptance Criteria

1. WHEN ocurre una acción exitosa THEN el sistema SHALL mostrar una notificación de éxito con mensaje apropiado
2. WHEN ocurre un error THEN el sistema SHALL mostrar una notificación de error con información clara del problema
3. WHEN hay procesos en background THEN el sistema SHALL mostrar notificaciones de progreso apropiadas
4. WHEN se requiere atención del usuario THEN el sistema SHALL mostrar alertas con acciones claras
5. WHERE la aplicación está offline THEN el sistema SHALL mostrar notificaciones de estado de conectividad

**Ejemplo de Funcionamiento:**
```
Sistema Universal de Notificaciones:
- Tipos predefinidos: éxito, error, advertencia, información, progreso
- Posicionamiento consistente en todas las apps
- Duración automática según tipo de mensaje
- Acciones configurables (deshacer, reintentar, etc.)
- Persistencia de notificaciones importantes

Configuración Microcréditos:
{
  "notificaciones": {
    "cliente_guardado": {"tipo": "exito", "mensaje": "Cliente guardado correctamente"},
    "pago_registrado": {"tipo": "exito", "mensaje": "Pago registrado exitosamente"},
    "error_validacion": {"tipo": "error", "persistente": true}
  }
}

Configuración Salud:
{
  "notificaciones": {
    "paciente_guardado": {"tipo": "exito", "mensaje": "Paciente registrado correctamente"},
    "consulta_creada": {"tipo": "exito", "mensaje": "Consulta registrada exitosamente"},
    "error_validacion": {"tipo": "error", "persistente": true}
  }
}

Resultado: UX consistente y profesional en todas las apps
```

### Requisito 4: Motor Universal de Alertas Configurables

**User Story:** Como usuario de aplicación, quiero recibir alertas automáticas sobre situaciones importantes de mi negocio, para poder tomar acciones oportunas.

#### Acceptance Criteria

1. WHEN se cumplen condiciones definidas en configuración THEN el sistema SHALL generar alertas automáticamente
2. WHEN se define una prioridad de alerta THEN el sistema SHALL mostrar la alerta con el nivel visual apropiado
3. WHEN se especifican acciones en la alerta THEN el sistema SHALL proporcionar botones para ejecutar esas acciones
4. WHEN se configura frecuencia de alerta THEN el sistema SHALL respetar los intervalos para evitar spam
5. WHERE el usuario está offline THEN el sistema SHALL almacenar alertas para mostrar cuando regrese online

**Ejemplo de Funcionamiento:**
```
Motor Universal de Alertas:
- Evalúa condiciones configuradas periódicamente
- Genera alertas según reglas definidas
- Maneja prioridades (baja, media, alta, crítica)
- Permite acciones configurables por alerta
- Evita duplicación de alertas

Configuración Microcréditos:
{
  "alertas": {
    "pago_vencido": {
      "condicion": "cuota.fecha_vencimiento < hoy() AND cuota.estado = 'pendiente'",
      "mensaje": "Pago vencido de {cliente.nombre} por ${cuota.valor}",
      "prioridad": "alta",
      "acciones": ["llamar_cliente", "registrar_pago", "reprogramar"]
    }
  }
}

Configuración Salud:
{
  "alertas": {
    "cita_pendiente": {
      "condicion": "cita.fecha = hoy() AND cita.estado = 'programada'",
      "mensaje": "Cita hoy con {paciente.nombre} a las {cita.hora}",
      "prioridad": "media",
      "acciones": ["confirmar_asistencia", "reprogramar", "cancelar"]
    }
  }
}

Resultado: Gestión proactiva y automatizada en todas las apps
```

### Requisito 5: Sistema Universal de Manejo de Errores

**User Story:** Como usuario de aplicación, quiero que todos los errores se manejen de manera consistente y comprensible, para saber qué hacer cuando algo sale mal.

#### Acceptance Criteria

1. WHEN ocurre cualquier error THEN el sistema SHALL capturar automáticamente toda la información de contexto relevante
2. WHEN se presenta un error al usuario THEN el sistema SHALL mostrar un mensaje claro y acciones posibles
3. WHEN ocurren errores técnicos THEN el sistema SHALL registrar automáticamente detalles para debugging
4. WHEN hay errores de conectividad THEN el sistema SHALL manejar automáticamente reintentos y fallbacks
5. WHERE los errores son recuperables THEN el sistema SHALL proporcionar opciones de recuperación automática

**Ejemplo de Funcionamiento:**
```
Sistema Universal de Manejo de Errores:
- Captura automática de contexto (usuario, dispositivo, acción, timestamp)
- Categorización automática (red, validación, sistema, negocio)
- Mensajes de usuario amigables y técnicos para logs
- Estrategias de recuperación automática
- Integración con sistema de notificaciones

Configuración Microcréditos:
{
  "errores": {
    "cliente_duplicado": {
      "mensaje_usuario": "Ya existe un cliente con este documento",
      "acciones": ["editar_existente", "usar_documento_diferente"],
      "nivel": "advertencia"
    },
    "error_sincronizacion": {
      "mensaje_usuario": "No se pudo sincronizar. Se guardó localmente.",
      "acciones": ["reintentar", "continuar_offline"],
      "reintento_automatico": true
    }
  }
}

Configuración Salud:
{
  "errores": {
    "paciente_duplicado": {
      "mensaje_usuario": "Ya existe un paciente con esta historia clínica",
      "acciones": ["ver_existente", "usar_historia_diferente"],
      "nivel": "advertencia"
    },
    "error_sincronizacion": {
      "mensaje_usuario": "No se pudo sincronizar. Se guardó localmente.",
      "acciones": ["reintentar", "continuar_offline"],
      "reintento_automatico": true
    }
  }
}

Resultado: Experiencia robusta y confiable en todas las apps
```

### Requisito 6: Sistema Universal de Backup y Recovery

**User Story:** Como administrador de aplicación, quiero que todos los datos estén automáticamente respaldados y sean recuperables, para garantizar que nunca se pierda información crítica del negocio.

#### Acceptance Criteria

1. WHEN se guardan datos críticos THEN el sistema SHALL crear automáticamente backups incrementales
2. WHEN se detecta corrupción de datos THEN el sistema SHALL restaurar automáticamente desde el backup más reciente válido
3. WHEN se requiere recuperación manual THEN el sistema SHALL proporcionar herramientas de restauración por fecha/hora
4. WHEN ocurren fallos del dispositivo THEN el sistema SHALL permitir recuperación completa en nuevo dispositivo
5. WHERE se configura backup en la nube THEN el sistema SHALL sincronizar automáticamente backups encriptados

**Ejemplo de Funcionamiento:**
```
Sistema Universal de Backup y Recovery:
- Backup incremental automático cada X minutos
- Backup completo diario automático
- Encriptación automática de todos los backups
- Verificación de integridad de backups
- Restauración point-in-time
- Sincronización segura con almacenamiento en la nube

Configuración Microcréditos:
{
  "backup": {
    "frecuencia_incremental": "15_minutos",
    "frecuencia_completo": "diario",
    "retencion_local": "30_dias",
    "retencion_nube": "1_año",
    "tablas_criticas": ["clientes", "creditos", "pagos"],
    "almacenamiento_nube": "supabase_storage"
  }
}

Configuración Salud:
{
  "backup": {
    "frecuencia_incremental": "10_minutos",
    "frecuencia_completo": "diario",
    "retencion_local": "60_dias",
    "retencion_nube": "7_años",
    "tablas_criticas": ["pacientes", "consultas", "tratamientos"],
    "almacenamiento_nube": "supabase_storage"
  }
}

Resultado: Protección total de datos en todas las apps
```

### Requisito 7: Configuración Universal de Encriptación

**User Story:** Como desarrollador de aplicación, quiero definir qué campos deben encriptarse en mi configuración, para que la plataforma maneje automáticamente la seguridad de datos sensibles.

#### Acceptance Criteria

1. WHEN se definen campos sensibles en configuración THEN el sistema SHALL encriptar automáticamente esos campos al guardar
2. WHEN se leen datos encriptados THEN el sistema SHALL desencriptar automáticamente usando el PIN del usuario
3. WHEN se cambian los campos sensibles en configuración THEN el sistema SHALL aplicar encriptación a nuevos campos automáticamente
4. WHEN se exportan datos THEN el sistema SHALL mantener encriptados los campos sensibles configurados
5. WHERE no hay PIN configurado THEN el sistema SHALL solicitar configuración de PIN antes de manejar datos sensibles

**Ejemplo de Funcionamiento:**
```
Configuración Universal de Encriptación:
- Lee lista de campos sensibles por tabla
- Aplica encriptación AES-256-GCM automáticamente
- Maneja desencriptación transparente para el usuario
- Mantiene campos no sensibles sin encriptar para performance
- Permite cambios dinámicos de configuración

Configuración Microcréditos:
{
  "encriptacion": {
    "campos_sensibles": {
      "clientes": ["documento", "telefono", "direccion", "telefono_fiador"],
      "creditos": [],
      "pagos": ["observaciones"]
    }
  }
}

Configuración Salud:
{
  "encriptacion": {
    "campos_sensibles": {
      "pacientes": ["historia", "telefono", "direccion"],
      "consultas": ["diagnostico", "tratamiento", "observaciones"],
      "tratamientos": ["medicamentos", "dosis"]
    }
  }
}

Resultado: Seguridad automática y apropiada para cada tipo de app
```

### Requisito 8: Configuración Universal de Sincronización

**User Story:** Como desarrollador de aplicación, quiero definir las prioridades y reglas de sincronización en configuración, para que mi aplicación sincronice datos según las necesidades específicas de mi negocio.

#### Acceptance Criteria

1. WHEN se definen prioridades en configuración THEN el sistema SHALL sincronizar datos en el orden especificado
2. WHEN se configuran reglas de conflicto THEN el sistema SHALL resolver conflictos según las reglas definidas para cada tabla
3. WHEN se especifican intervalos de sincronización THEN el sistema SHALL respetar los tiempos configurados
4. WHEN se definen condiciones de sincronización THEN el sistema SHALL sincronizar solo cuando se cumplan las condiciones
5. WHERE hay múltiples usuarios offline THEN el sistema SHALL aplicar las reglas de resolución configuradas consistentemente

**Ejemplo de Funcionamiento:**
```
Configuración Universal de Sincronización:
- Aplica prioridades definidas por app
- Usa reglas de conflicto específicas por tabla
- Respeta intervalos y condiciones configuradas
- Mantiene consistencia entre dispositivos
- Optimiza ancho de banda según configuración

Configuración Microcréditos:
{
  "sincronizacion": {
    "prioridades": {"pagos": 1, "creditos": 2, "clientes": 3},
    "reglas_conflicto": {
      "pagos": "append_only",
      "creditos": "last_write_wins", 
      "clientes": "field_merge"
    },
    "intervalo": "30_segundos",
    "condiciones": ["wifi_disponible", "bateria_mayor_20"]
  }
}

Configuración Salud:
{
  "sincronizacion": {
    "prioridades": {"emergencias": 1, "consultas": 2, "pacientes": 3},
    "reglas_conflicto": {
      "consultas": "append_only",
      "pacientes": "field_merge",
      "tratamientos": "last_write_wins"
    },
    "intervalo": "15_segundos",
    "condiciones": ["conexion_disponible"]
  }
}

Resultado: Sincronización optimizada para cada tipo de negocio
```