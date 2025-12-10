# ESPECIFICACIONES TÉCNICAS COMPLETAS

# PWA OFFLINE-FIRST PARA GESTIÓN DE MICROCRÉDITOS

# Stack: Svelte + Vercel + Supabase

---

## TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Arquitectura General](#2-arquitectura-general)
3. [Análisis de Estrategias de Enketo](#3-análisis-de-estrategias-de-enketo)
4. [Mejoras y Optimizaciones sobre Enketo](#4-mejoras-y-optimizaciones-sobre-enketo)
5. [Estructura de Datos e IndexedDB](#5-estructura-de-datos-e-indexeddb)
6. [Sistema de Sincronización](#6-sistema-de-sincronización)
7. [Gestión de Conflictos](#7-gestión-de-conflictos)
8. [Service Workers y Caché](#8-service-workers-y-caché)
9. [Páginas y Formularios](#9-páginas-y-formularios)
10. [Seguridad y Encriptación](#10-seguridad-y-encriptación)
11. [Auditoría y Logs](#11-auditoría-y-logs)
12. [Performance y Optimizaciones](#12-performance-y-optimizaciones)
13. [Stack Tecnológico Detallado](#13-stack-tecnológico-detallado)
14. [Flujos de Operación](#14-flujos-de-operación)
15. [Consideraciones de Implementación](#15-consideraciones-de-implementación)

---

## 1. RESUMEN EJECUTIVO

### 1.1 Objetivo del Proyecto

Desarrollar una **PWA (Progressive Web App) offline-first** para gestión de microcréditos y
cobranza, donde:

- **La PWA es la fuente de verdad**: Todos los cálculos, validaciones y lógica de negocio ocurren en
  el cliente
- **Supabase es solo respaldo**: Base de datos en la nube para sincronización y backup
- **Cero pérdida de datos**: Sistema redundante multi-capa con recuperación automática
- **Dispositivos modernos**: Optimizado para dispositivos 2022+ (Android 10+, iOS 14+)
- **Stack moderno**: Svelte + Vercel + Supabase

### 1.2 Principios Fundamentales

**OFFLINE-FIRST REAL**:

- La aplicación funciona completamente sin conexión
- Todos los datos críticos están disponibles localmente
- La sincronización es bidireccional pero no bloquea operaciones
- El usuario nunca espera por el servidor

**PWA COMO FUENTE DE VERDAD**:

- Toda la lógica de negocio está en el cliente
- Cálculos de saldos, intereses, días de atraso se hacen localmente
- Validaciones de integridad en el cliente
- Supabase NO tiene triggers ni funciones de negocio

**CONFIABILIDAD MÁXIMA**:

- Almacenamiento redundante en 3 capas
- Logs de auditoría inmutables
- Checksums y validación de integridad
- Recuperación automática ante fallos

**SINCRONIZACIÓN INTELIGENTE**:

- Sincronización diferencial (solo cambios)
- Resolución de conflictos automática con CRDT
- Priorización de operaciones críticas
- Background Sync API para sincronización en segundo plano

### 1.3 Alcance del Sistema

**ENTIDADES PRINCIPALES**:

- Tenants (organizaciones multi-tenant)
- Usuarios (cobradores, administradores)
- Rutas de cobranza
- Clientes
- Productos de crédito
- Créditos
- Cuotas
- Pagos (operación más crítica)

**OPERACIONES CRÍTICAS**:

- Registro de pagos con geolocalización
- Consulta de saldos y estados de créditos
- Generación de cuotas
- Cálculo de intereses y días de atraso
- Auditoría completa de transacciones

---

## 2. ARQUITECTURA GENERAL

### 2.1 Diagrama de Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DISPOSITIVO MÓVIL                            │
│                         (Android 10+, iOS 14+)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    SVELTE PWA                               │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ UI Layer (Svelte Components)                         │  │    │
│  │  │  - Páginas de formularios                            │  │    │
│  │  │  - Componentes reutilizables                         │  │    │
│  │  │  - Stores reactivos (Svelte stores)                  │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Business Logic Layer                                 │  │    │
│  │  │  - Cálculo de saldos                                 │  │    │
│  │  │  - Cálculo de intereses                              │  │    │
│  │  │  - Generación de cuotas                              │  │    │
│  │  │  - Validaciones de negocio                           │  │    │
│  │  │  - Resolución de conflictos (CRDT)                   │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Data Layer                                           │  │    │
│  │  │  - Dexie.js (IndexedDB wrapper)                      │  │    │
│  │  │  - Sync Manager                                      │  │    │
│  │  │  - Conflict Resolver                                 │  │    │
│  │  │  - Audit Logger                                      │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    SERVICE WORKER                           │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Cache Storage (Assets estáticos)                     │  │    │
│  │  │  - HTML, CSS, JS, imágenes                           │  │    │
│  │  │  - Estrategia: Cache-First                           │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Background Sync                                       │  │    │
│  │  │  - Cola de sincronización                            │  │    │
│  │  │  - Reintentos automáticos                            │  │    │
│  │  │  - Sincronización en background                      │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    INDEXEDDB                                │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ CAPA 1: Almacenamiento Principal                     │  │    │
│  │  │  - tenants, users, rutas                             │  │    │
│  │  │  - clientes, productos_credito                       │  │    │
│  │  │  - creditos, cuotas, pagos                           │  │    │
│  │  │  - sync_queue, audit_log                             │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    LOCALSTORAGE                             │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ CAPA 2: Backup Crítico                               │  │    │
│  │  │  - Últimos 100 pagos                                 │  │    │
│  │  │  - Operaciones pendientes de sincronización          │  │    │
│  │  │  - Checksums de integridad                           │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    CACHE API                                │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ CAPA 3: Backup Terciario                             │  │    │
│  │  │  - Snapshot diario de datos críticos                 │  │    │
│  │  │  - Logs de auditoría                                 │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            │ HTTPS / REST API
                            │ (Sincronización bidireccional)
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│                         VERCEL (CDN Global)                            │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Static Assets (Svelte Build)                                 │    │
│  │  - HTML, CSS, JS optimizados                                 │    │
│  │  - Service Worker                                             │    │
│  │  - Manifest.json                                              │    │
│  └──────────────────────────────────────────────────────────────┘    │
└───────────────────────────┬───────────────────────────────────────────┘
                            │
                            │ Supabase REST API
                            │
┌───────────────────────────▼───────────────────────────────────────────┐
│                         SUPABASE                                       │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ PostgreSQL (Solo Almacenamiento)                             │    │
│  │  - Tablas: tenants, users, rutas, clientes, etc.            │    │
│  │  - SIN triggers, SIN funciones de negocio                    │    │
│  │  - Solo constraints básicos (PK, FK, NOT NULL)               │    │
│  │  - Row Level Security (RLS) para multi-tenancy               │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Realtime (Opcional)                                           │    │
│  │  - Notificaciones de cambios                                  │    │
│  │  - Sincronización push                                        │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Auth                                                           │    │
│  │  - Autenticación de cobradores                                │    │
│  │  - JWT tokens                                                 │    │
│  └──────────────────────────────────────────────────────────────┘    │
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────┐    │
│  │ Storage                                                        │    │
│  │  - Fotos de comprobantes de pago                             │    │
│  │  - Documentos de clientes                                     │    │
│  └──────────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Flujo de Datos

**ESCRITURA (Registro de Pago)**:

```
1. Usuario registra pago en formulario
2. Validación en UI (Svelte)
3. Cálculo de saldos en Business Logic
4. Escritura en IndexedDB (CAPA 1)
5. Escritura en LocalStorage (CAPA 2 - backup)
6. Escritura en Cache API (CAPA 3 - backup)
7. Agregar a cola de sincronización
8. Confirmar al usuario (operación completa)
9. [Background] Sincronizar con Supabase cuando hay conexión
10. [Background] Marcar como sincronizado
```

**LECTURA (Consulta de Cliente)**:

```
1. Usuario busca cliente
2. Consulta en IndexedDB (CAPA 1)
3. Si falla, consultar LocalStorage (CAPA 2)
4. Si falla, consultar Cache API (CAPA 3)
5. Mostrar datos al usuario
6. [Background] Verificar si hay actualizaciones en Supabase
7. [Background] Actualizar localmente si hay cambios
```

**SINCRONIZACIÓN BIDIRECCIONAL**:

```
ASCENDENTE (Device → Supabase):
1. Detectar operaciones pendientes en sync_queue
2. Agrupar por tipo y prioridad
3. Enviar en lotes a Supabase REST API
4. Manejar respuestas y errores
5. Marcar como sincronizado o reintentar

DESCENDENTE (Supabase → Device):
1. Consultar cambios desde último timestamp
2. Recibir deltas (solo cambios)
3. Aplicar cambios localmente
4. Resolver conflictos si existen
5. Actualizar timestamp de sincronización
```

---

## 3. ANÁLISIS DE ESTRATEGIAS DE ENKETO

### 3.1 ✅ ESTRATEGIAS QUE SÍ USAREMOS DE ENKETO

#### 3.1.1 IndexedDB como Almacenamiento Principal

**QUÉ HACE ENKETO**:

- Usa IndexedDB para almacenar formularios, registros y archivos
- Estructura de object stores separados por tipo de dato
- Índices para búsquedas rápidas
- Transacciones para operaciones atómicas

**POR QUÉ LO USAREMOS**:

- IndexedDB es la tecnología más robusta para almacenamiento estructurado
- Soporta transacciones ACID
- Capacidad de almacenamiento grande (50MB-1GB+)
- Soporte de índices para consultas eficientes
- API asíncrona no bloquea UI

**CÓMO LO ADAPTAREMOS**:

- Usaremos Dexie.js como wrapper (más fácil que API nativa)
- Estructura de tablas basada en el modelo relacional del CSV
- Índices optimizados para consultas de negocio
- Índices compuestos para filtros multi-campo

**MEJORAS SOBRE ENKETO**:

- Dexie.js tiene mejor API que la biblioteca que usa Enketo
- Soporte de TypeScript para type safety
- Hooks para Svelte (dexie-svelte-hooks)
- Mejor manejo de migraciones de esquema

#### 3.1.2 Service Workers para Caché de Aplicación

**QUÉ HACE ENKETO**:

- Service Worker para cachear assets estáticos
- Estrategia Cache-First para recursos
- Actualización automática de caché
- Versionado basado en hash

**POR QUÉ LO USAREMOS**:

- Service Workers son esenciales para PWA
- Permiten funcionamiento offline completo
- Interceptan requests de red
- Caché inteligente de recursos

**CÓMO LO ADAPTAREMOS**:

- Usaremos Vite PWA Plugin (más moderno que generación manual)
- Workbox para estrategias de caché avanzadas
- Precaching de rutas críticas
- Runtime caching para datos dinámicos

**MEJORAS SOBRE ENKETO**:

- Vite PWA Plugin genera Service Worker optimizado automáticamente
- Workbox tiene estrategias más avanzadas
- Mejor manejo de actualizaciones
- Soporte de Background Sync API

#### 3.1.3 Auto-guardado Continuo

**QUÉ HACE ENKETO**:

- Auto-guarda formularios en cada cambio
- Recuperación automática si app se cierra
- Usa clave especial para auto-guardado

**POR QUÉ LO USAREMOS**:

- Crítico para no perder datos de pagos
- Mejor experiencia de usuario
- Protección contra cierres inesperados

**CÓMO LO ADAPTAREMOS**:

- Auto-guardado cada 2-3 segundos (más agresivo)
- Múltiples slots de auto-guardado (no solo uno)
- Auto-guardado por formulario y por campo crítico
- Indicador visual de estado de guardado

**MEJORAS SOBRE ENKETO**:

- Enketo auto-guarda en cada cambio (puede ser excesivo)
- Nosotros usaremos debouncing inteligente
- Múltiples copias de seguridad
- Mejor feedback visual al usuario

#### 3.1.4 Cola de Sincronización con Reintentos

**QUÉ HACE ENKETO**:

- Cola de registros pendientes de envío
- Backoff exponencial para reintentos
- Sincronización secuencial

**POR QUÉ LO USAREMOS**:

- Backoff exponencial es práctica probada
- Evita saturar servidor con reintentos
- Maneja conexiones intermitentes bien

**CÓMO LO ADAPTAREMOS**:

- Cola persistente en IndexedDB
- Priorización de operaciones (pagos primero)
- Sincronización en lotes (no secuencial)
- Background Sync API cuando disponible

**MEJORAS SOBRE ENKETO**:

- Enketo sincroniza uno por uno (lento)
- Nosotros sincronizaremos en lotes
- Priorización inteligente
- Sincronización paralela de operaciones independientes

#### 3.1.5 Detección de Estado de Conexión

**QUÉ HACE ENKETO**:

- Verifica conexión con endpoint específico
- Detecta cuando vuelve conexión
- Activa sincronización automática

**POR QUÉ LO USAREMOS**:

- Esencial para saber cuándo sincronizar
- Mejor UX mostrando estado de conexión
- Optimiza uso de batería

**CÓMO LO ADAPTAREMOS**:

- Navigator.onLine API + verificación real
- Ping periódico a Supabase
- Indicador visual de estado
- Sincronización automática al detectar conexión

**MEJORAS SOBRE ENKETO**:

- Detección más confiable (Navigator.onLine puede mentir)
- Verificación real con Supabase
- Mejor feedback visual

#### 3.1.6 Versionado y Actualización de Caché

**QUÉ HACE ENKETO**:

- Versiona Service Worker con hash
- Elimina cachés antiguos
- Notifica al usuario de actualizaciones

**POR QUÉ LO USAREMOS**:

- Garantiza que usuarios tengan última versión
- Limpia cachés obsoletos
- Evita bugs por versiones mezcladas

**CÓMO LO ADAPTAREMOS**:

- Versionado automático con Vite
- Actualización en background sin interrumpir
- Prompt al usuario para recargar
- Rollback si nueva versión falla

**MEJORAS SOBRE ENKETO**:

- Vite maneja versionado automáticamente
- Mejor estrategia de actualización
- Menos código manual

### 3.2 ❌ ESTRATEGIAS QUE NO USAREMOS DE ENKETO

#### 3.2.1 Almacenamiento de Formularios como XML

**QUÉ HACE ENKETO**:

- Almacena formularios completos como XML
- Compatible con estándar ODK/XForms
- Serializa/deserializa XML constantemente

**POR QUÉ NO LO USAREMOS**:

- XML es ineficiente para datos relacionales
- Dificulta consultas complejas
- Mayor tamaño de almacenamiento
- Más lento de parsear

**QUÉ HAREMOS EN SU LUGAR**:

- Almacenar datos como objetos JSON estructurados
- Modelo relacional directo (tablas normalizadas)
- Relaciones explícitas con foreign keys
- Consultas SQL-like con Dexie.js

**VENTAJAS DE NUESTRO ENFOQUE**:

- Consultas 10-100x más rápidas
- Menor uso de memoria
- Código más simple y mantenible
- Mejor integración con Svelte (reactivo)

#### 3.2.2 Encriptación Opcional que Bloquea Funcionalidades

**QUÉ HACE ENKETO**:

- Encriptación es opcional
- Si está activa, desactiva auto-guardado y borradores
- Encripta todo el registro completo

**POR QUÉ NO LO USAREMOS**:

- Para datos financieros, encriptación debe ser obligatoria
- No podemos sacrificar auto-guardado
- Encriptar todo es ineficiente

**QUÉ HAREMOS EN SU LUGAR**:

- Encriptación SIEMPRE activa para campos sensibles
- Encriptación a nivel de campo (no registro completo)
- Auto-guardado funciona con encriptación
- Encriptación transparente para el usuario

**VENTAJAS DE NUESTRO ENFOQUE**:

- Seguridad sin sacrificar funcionalidad
- Mejor performance (solo encriptar lo necesario)
- Cumplimiento de regulaciones financieras

#### 3.2.3 Sincronización Secuencial Simple

**QUÉ HACE ENKETO**:

- Envía registros uno por uno
- Espera respuesta antes de enviar siguiente
- No prioriza operaciones

**POR QUÉ NO LO USAREMOS**:

- Muy lento con muchos registros
- No aprovecha conexiones modernas
- No diferencia operaciones críticas

**QUÉ HAREMOS EN SU LUGAR**:

- Sincronización en lotes (batch)
- Sincronización paralela de operaciones independientes
- Priorización: pagos > actualizaciones > consultas
- Sincronización diferencial (solo cambios)

**VENTAJAS DE NUESTRO ENFOQUE**:

- 10-50x más rápido
- Mejor uso de ancho de banda
- Operaciones críticas se sincronizan primero

#### 3.2.4 Actualización Periódica Cada 20 Minutos

**QUÉ HACE ENKETO**:

- Verifica actualizaciones cada 20 minutos
- Descarga formulario completo si cambió

**POR QUÉ NO LO USAREMOS**:

- 20 minutos es mucho para datos financieros
- Descargar todo es ineficiente
- No hay sincronización push

**QUÉ HAREMOS EN SU LUGAR**:

- Sincronización continua cuando hay conexión
- Sincronización diferencial (solo cambios)
- Supabase Realtime para push notifications
- Sincronización cada 1-5 minutos en background

**VENTAJAS DE NUESTRO ENFOQUE**:

- Datos más frescos
- Menos tráfico de red
- Notificaciones en tiempo real

#### 3.2.5 Sin Soporte para Relaciones Complejas

**QUÉ HACE ENKETO**:

- Cada formulario es independiente
- No hay relaciones entre formularios
- No hay integridad referencial

**POR QUÉ NO LO USAREMOS**:

- Microcréditos tiene relaciones complejas
- Necesitamos integridad referencial
- Necesitamos consultas relacionales

**QUÉ HAREMOS EN SU LUGAR**:

- Modelo relacional completo en IndexedDB
- Foreign keys y validación de integridad
- Consultas con joins (Dexie.js)
- Cascadas y validaciones

**VENTAJAS DE NUESTRO ENFOQUE**:

- Datos consistentes
- Consultas complejas posibles
- Mejor modelado del dominio

#### 3.2.6 Exportación Manual a ZIP

**QUÉ HACE ENKETO**:

- Usuario debe exportar manualmente
- Exporta a archivo ZIP
- No hay backup automático

**POR QUÉ NO LO USAREMOS**:

- Para auditoría financiera necesitamos backups automáticos
- ZIP no es formato auditable
- Depende de acción del usuario

**QUÉ HAREMOS EN SU LUGAR**:

- Backup automático continuo a Supabase
- Logs de auditoría inmutables
- Exportación automática a formatos auditables (JSON, CSV)
- Snapshots diarios automáticos

**VENTAJAS DE NUESTRO ENFOQUE**:

- Cumplimiento regulatorio
- No depende del usuario
- Auditoría completa

#### 3.2.7 Sin Sistema de Versionado de Datos

**QUÉ HACE ENKETO**:

- No versiona cambios en datos
- No detecta conflictos de edición concurrente
- Last-write-wins simple

**POR QUÉ NO LO USAREMOS**:

- Múltiples cobradores pueden editar mismo cliente
- Necesitamos detectar y resolver conflictos
- Necesitamos historial de cambios

**QUÉ HAREMOS EN SU LUGAR**:

- Sistema de versionado con vectores de versión
- CRDT para resolución automática de conflictos
- Historial completo de cambios
- Auditoría de quién cambió qué y cuándo

**VENTAJAS DE NUESTRO ENFOQUE**:

- Conflictos resueltos automáticamente
- Auditoría completa
- Colaboración sin pérdida de datos

#### 3.2.8 Sin Validación de Integridad Continua

**QUÉ HACE ENKETO**:

- Validación básica de formularios
- No verifica integridad de datos almacenados
- No detecta corrupción

**POR QUÉ NO LO USAREMOS**:

- Datos financieros requieren integridad garantizada
- Necesitamos detectar corrupción temprano
- Necesitamos validación continua

**QUÉ HAREMOS EN SU LUGAR**:

- Validación multi-nivel (UI, lógica, almacenamiento)
- Checksums de datos críticos
- Verificación periódica de integridad
- Recuperación automática desde backups

**VENTAJAS DE NUESTRO ENFOQUE**:

- Detección temprana de problemas
- Recuperación automática
- Mayor confiabilidad

---

## 4. MEJORAS Y OPTIMIZACIONES SOBRE ENKETO

### 4.1 Sistema de Versionado y Resolución de Conflictos (CRDT)

**PROBLEMA QUE RESUELVE**: Cuando dos cobradores editan el mismo cliente offline, al sincronizar hay
conflicto. Enketo no maneja esto bien.

**SOLUCIÓN: CRDT (Conflict-free Replicated Data Types)**

**QUÉ SON LOS CRDT**: Estructuras de datos que garantizan que múltiples réplicas converjan al mismo
estado sin coordinación central.

**TECNOLOGÍAS PROBADAS**:

- Automerge: Biblioteca JavaScript madura
- Yjs: Optimizado para performance
- Implementación custom basada en vectores de versión

**CÓMO FUNCIONA**:

**Para Pagos (Operación Append-Only)**:

```
Estructura de Pago:
{
  id: UUID v4 generado localmente,
  tenant_id: string,
  credito_id: string,
  cliente_id: string,
  cobrador_id: string,
  monto: number,
  fecha: timestamp,
  latitud: number,
  longitud: number,
  observaciones: string,
  created_at: timestamp,
  created_by: string,
  device_id: string,
  version_vector: {
    [device_id]: counter
  },
  synced: boolean,
  checksum: string (SHA-256)
}

Reglas:
- Los pagos NUNCA se editan, solo se agregan
- ID único garantiza no duplicados
- Imposible tener conflictos
- Orden determinístico por timestamp + device_id
```

**Para Clientes y Créditos (Datos Editables)**:

```
Estructura con Versionado:
{
  id: UUID,
  tenant_id: string,
  // ... campos de negocio ...
  version_vector: {
    [device_id]: counter
  },
  field_versions: {
    nombre: { value: "Juan", timestamp: 1234567890, device_id: "device1" },
    telefono: { value: "555-1234", timestamp: 1234567891, device_id: "device2" },
    // ... cada campo tiene su versión ...
  },
  updated_at: timestamp,
  updated_by: string
}

Resolución de Conflictos:
1. Comparar version_vectors
2. Si un vector domina al otro, usar ese
3. Si hay conflicto, resolver campo por campo:
   - Gana el campo con timestamp más reciente
   - Si timestamps iguales, usar device_id como desempate
4. Merge de vectores de versión
5. Registrar conflicto en audit_log
```

**Para Saldos y Contadores (Datos Calculados)**:

```
Usar CRDT Counter:
{
  credito_id: string,
  saldo_pendiente: {
    [device_id]: delta
  },
  cuotas_pagadas: {
    [device_id]: delta
  }
}

Al sincronizar:
- Sumar todos los deltas de todos los dispositivos
- Resultado final es matemáticamente correcto
- Imposible tener inconsistencias
```

**VENTAJAS**:

- Conflictos resueltos automáticamente
- Matemáticamente correcto
- No requiere coordinación central
- Funciona completamente offline
- Auditoría completa de cambios

### 4.2 Almacenamiento Redundante Multi-capa

**PROBLEMA QUE RESUELVE**: Si IndexedDB se corrompe o falla, se pierden todos los datos. Enketo solo
usa IndexedDB.

**SOLUCIÓN: TRIPLE REDUNDANCIA**

**CAPA 1: IndexedDB (Principal)**

```
Propósito: Almacenamiento principal para operaciones normales
Tecnología: Dexie.js
Capacidad: 50MB - 1GB+ (según navegador)
Ventajas:
- Mejor performance para consultas complejas
- Soporte de transacciones ACID
- Índices para búsquedas rápidas
- API asíncrona

Datos almacenados:
- Todas las tablas del sistema
- Historial completo
- Archivos adjuntos (Blobs)
```

**CAPA 2: LocalStorage (Backup Crítico)**

```
Propósito: Backup de operaciones críticas
Tecnología: LocalStorage API
Capacidad: 5-10 MB
Ventajas:
- Más simple y robusto que IndexedDB
- Sincrónico (más confiable)
- Persiste incluso si IndexedDB falla

Datos almacenados:
- Últimos 100 pagos
- Operaciones pendientes de sincronización
- Checksums de integridad
- Timestamp de última sincronización
- Configuración crítica
```

**CAPA 3: Cache API (Backup Terciario)**

```
Propósito: Backup adicional en Service Worker
Tecnología: Cache API
Capacidad: Variable (controlada por navegador)
Ventajas:
- Persiste incluso si se limpia LocalStorage
- Accesible desde Service Worker
- Formato JSON serializado

Datos almacenados:
- Snapshot diario de datos críticos
- Logs de auditoría
- Estado de sincronización
```

**ESTRATEGIA DE ESCRITURA**:

```
Al registrar un pago:

1. Validar datos en UI
2. Calcular saldos y checksums
3. ESCRIBIR EN CAPA 1 (IndexedDB)
   - Si falla, abortar y mostrar error
4. ESCRIBIR EN CAPA 2 (LocalStorage)
   - Si falla, log warning pero continuar
5. ESCRIBIR EN CAPA 3 (Cache API)
   - Si falla, log warning pero continuar
6. Solo confirmar al usuario cuando CAPA 1 es exitosa
7. Agregar a cola de sincronización
8. Mostrar confirmación visual

Tiempo total: < 100ms en dispositivo moderno
```

**ESTRATEGIA DE LECTURA**:

```
Al consultar datos:

1. INTENTAR CAPA 1 (IndexedDB)
   - Si exitoso, retornar datos
2. Si falla, INTENTAR CAPA 2 (LocalStorage)
   - Si exitoso, retornar datos
   - Iniciar recuperación de CAPA 1 en background
3. Si falla, INTENTAR CAPA 3 (Cache API)
   - Si exitoso, retornar datos
   - Iniciar recuperación de CAPA 1 y 2 en background
4. Si todo falla:
   - Mostrar error al usuario
   - Generar reporte de error detallado
   - Intentar sincronización forzada con Supabase
```

**RECUPERACIÓN AUTOMÁTICA**:

```
Al iniciar la aplicación:

1. Verificar integridad de CAPA 1 (IndexedDB)
   - Verificar checksums
   - Verificar estructura de tablas
   - Verificar índices

2. Si CAPA 1 está corrupta:
   - Intentar reparación automática
   - Si falla, restaurar desde CAPA 2
   - Si falla, restaurar desde CAPA 3
   - Si falla, sincronizar desde Supabase

3. Verificar consistencia entre capas:
   - Comparar checksums
   - Identificar discrepancias
   - Resolver usando timestamp más reciente

4. Sincronizar inmediatamente con Supabase:
   - Enviar datos locales
   - Recibir datos del servidor
   - Resolver conflictos
```

**VENTAJAS**:

- Probabilidad de pérdida de datos: < 0.001%
- Recuperación automática sin intervención del usuario
- Múltiples puntos de fallo deben ocurrir simultáneamente
- Auditoría completa de operaciones de recuperación

### 4.3 Sincronización Diferencial Inteligente

**PROBLEMA QUE RESUELVE**: Enketo sincroniza registros completos. Con miles de clientes y pagos, es
muy ineficiente.

**SOLUCIÓN: DELTA SYNC (Solo Cambios)**

**CONCEPTO**: Solo sincronizar los cambios (deltas) en lugar de registros completos.

**TECNOLOGÍAS PROBADAS**:

- PouchDB: Implementa replicación diferencial
- WatermelonDB: Optimizado para sincronización diferencial
- Implementación custom con change tracking

**IMPLEMENTACIÓN**:

**Tabla de Change Log**:

```
Estructura:
{
  id: UUID,
  timestamp: number,
  tenant_id: string,
  user_id: string,
  device_id: string,
  table_name: string,
  record_id: string,
  operation: 'INSERT' | 'UPDATE' | 'DELETE',
  field_name: string | null,
  old_value: any | null,
  new_value: any | null,
  synced: boolean,
  sync_attempts: number,
  last_sync_attempt: timestamp | null,
  checksum: string
}

Índices:
- (synced, timestamp) para obtener pendientes
- (table_name, record_id) para agrupar cambios
- (tenant_id, timestamp) para filtrar por tenant
```

**Tracking de Cambios**:

```
Al insertar/actualizar/eliminar cualquier registro:

1. Detectar qué cambió (diff)
2. Generar change log entry por cada campo modificado
3. Guardar en tabla change_log
4. Marcar como pendiente de sincronización

Ejemplo - Actualizar teléfono de cliente:
{
  id: "uuid-123",
  timestamp: 1234567890,
  table_name: "clientes",
  record_id: "cliente-456",
  operation: "UPDATE",
  field_name: "telefono",
  old_value: "555-1111",
  new_value: "555-2222",
  synced: false
}
```

**Sincronización Ascendente (Device → Supabase)**:

```
Proceso:

1. Obtener change logs no sincronizados
   - Ordenar por timestamp
   - Agrupar por tabla y operación
   - Priorizar: pagos > creditos > cuotas > clientes

2. Comprimir deltas:
   - Si mismo campo cambió múltiples veces, colapsar
   - Ejemplo: telefono cambió 3 veces → solo enviar valor final

3. Crear batches:
   - Máximo 100 cambios por batch
   - Agrupar por tabla para eficiencia

4. Enviar a Supabase:
   - POST /api/sync/upload
   - Body: { changes: [...], device_id, timestamp }

5. Procesar respuesta:
   - Marcar como sincronizado si exitoso
   - Manejar conflictos si existen
   - Reintentar si falla

6. Limpiar change logs antiguos:
   - Eliminar logs sincronizados > 30 días
   - Mantener logs de pagos indefinidamente
```

**Sincronización Descendente (Supabase → Device)**:

```
Proceso:

1. Enviar timestamp de última sincronización
   - GET /api/sync/download?since=1234567890&tenant_id=xxx

2. Supabase responde con cambios:
   - Solo registros modificados desde ese timestamp
   - Formato: { changes: [...], new_timestamp }

3. Aplicar cambios localmente:
   - Ordenar por timestamp
   - Aplicar uno por uno
   - Resolver conflictos si existen

4. Actualizar timestamp:
   - Guardar new_timestamp para próxima sincronización

5. Notificar al usuario:
   - "X registros actualizados"
```

**Optimizaciones**:

**Compresión de Deltas**:

```
Antes de enviar:
- Comprimir JSON con gzip
- Reducción típica: 70-90%
- Ejemplo: 100KB → 10-30KB
```

**Sincronización por Prioridad**:

```
Prioridad 1 (inmediata):
- Pagos nuevos
- Operaciones críticas

Prioridad 2 (cada 5 min):
- Actualizaciones de créditos
- Actualizaciones de cuotas

Prioridad 3 (cada 30 min):
- Actualizaciones de clientes
- Actualizaciones de rutas

Prioridad 4 (cada hora):
- Datos de referencia
- Configuración
```

**Sincronización Parcial**:

```
Si conexión es lenta o intermitente:
1. Enviar solo prioridad 1
2. Esperar confirmación
3. Enviar prioridad 2
4. Y así sucesivamente

Usuario siempre puede trabajar mientras sincroniza
```

**VENTAJAS**:

- 90-99% menos tráfico de red
- Sincronización 10-100x más rápida
- Funciona bien con conexiones lentas
- Menor consumo de batería

### 4.4 Sistema de Integridad y Validación Multi-nivel

**PROBLEMA QUE RESUELVE**: Enketo solo valida formularios. No valida integridad de datos almacenados
ni detecta corrupción.

**SOLUCIÓN: VALIDACIÓN EN 5 NIVELES**

**NIVEL 1: Validación de Entrada (UI)**

```
Dónde: Componentes Svelte
Cuándo: En tiempo real mientras usuario escribe
Qué valida:
- Tipos de datos (número, texto, fecha)
- Rangos (monto > 0, fecha válida)
- Formatos (teléfono, documento)
- Campos requeridos

Tecnología: Zod (validación de esquemas)

Ejemplo:
const pagoSchema = z.object({
  monto: z.number().positive().max(1000000),
  fecha: z.date().max(new Date()),
  cliente_id: z.string().uuid(),
  observaciones: z.string().max(500).optional()
});

Feedback: Inmediato, mientras usuario escribe
```

**NIVEL 2: Validación Pre-guardado (Business Logic)**

```
Dónde: Capa de lógica de negocio
Cuándo: Antes de guardar en IndexedDB
Qué valida:
- Reglas de negocio complejas
- Integridad referencial
- Duplicados
- Consistencia de datos

Ejemplo - Validar pago:
1. Verificar que crédito existe
2. Verificar que cliente existe
3. Verificar que monto no excede saldo pendiente
4. Verificar que no es duplicado (mismo monto, fecha, cliente en últimos 5 min)
5. Verificar geolocalización válida
6. Verificar que cobrador tiene permiso

Si alguna validación falla:
- No guardar
- Mostrar error específico al usuario
- Registrar intento en audit_log
```

**NIVEL 3: Validación Post-guardado (Integrity Check)**

```
Dónde: Después de guardar en IndexedDB
Cuándo: Inmediatamente después de cada operación
Qué valida:
- Consistencia de datos calculados
- Integridad referencial
- Checksums

Ejemplo - Después de registrar pago:
1. Recalcular saldo_pendiente del crédito
2. Verificar que suma de pagos = monto_pagado de cuotas
3. Verificar que cuotas_pagadas es correcto
4. Verificar que días_atraso es correcto
5. Calcular checksum del pago
6. Verificar que checksum coincide

Si hay inconsistencia:
- Generar alerta
- Registrar en audit_log
- Intentar corrección automática
- Si falla, marcar para revisión manual
```

**NIVEL 4: Validación Periódica (Background)**

```
Dónde: Service Worker o Web Worker
Cuándo: Cada 5 minutos en background
Qué valida:
- Integridad referencial de todas las tablas
- Checksums de datos críticos
- Registros huérfanos
- Duplicados
- Consistencia de saldos

Proceso:
1. Obtener todos los créditos
2. Para cada crédito:
   - Verificar que cliente existe
   - Verificar que producto existe
   - Recalcular saldo desde pagos
   - Comparar con saldo almacenado
   - Si difiere, registrar discrepancia

3. Generar reporte de salud:
   - Total de registros
   - Registros con problemas
   - Tipos de problemas
   - Acciones correctivas tomadas

4. Si hay problemas críticos:
   - Notificar al usuario
   - Intentar corrección automática
   - Si falla, marcar para sincronización forzada
```

**NIVEL 5: Validación Pre-sincronización (Server-side)**

```
Dónde: Antes de enviar a Supabase
Cuándo: Justo antes de sincronización
Qué valida:
- Que todos los foreign keys existen
- Que no hay datos corruptos
- Que timestamps son coherentes
- Que no hay operaciones imposibles

Ejemplo:
1. Obtener pagos pendientes de sincronización
2. Para cada pago:
   - Verificar que crédito existe localmente
   - Verificar que cliente existe localmente
   - Verificar que monto es válido
   - Verificar que fecha es coherente
   - Verificar checksum

3. Si alguna validación falla:
   - No enviar ese pago
   - Registrar error
   - Intentar corrección
   - Notificar al usuario

4. Solo enviar pagos que pasan todas las validaciones
```

**CHECKSUMS Y HASHES**:

```
Cada registro crítico tiene checksum SHA-256:

Cálculo:
const checksum = SHA256(
  JSON.stringify({
    ...record,
    // Excluir campos que cambian automáticamente
    checksum: undefined,
    updated_at: undefined
  })
);

Verificación:
1. Recalcular checksum
2. Comparar con checksum almacenado
3. Si difiere, registro fue modificado o corrupto

Uso:
- Detectar corrupción de datos
- Detectar modificaciones no autorizadas
- Auditoría de integridad
```

**VENTAJAS**:

- Detección temprana de problemas
- Múltiples capas de protección
- Corrección automática cuando es posible
- Auditoría completa
- Mayor confiabilidad

### 4.5 Logs de Auditoría Inmutables (Event Sourcing)

**PROBLEMA QUE RESUELVE**: Enketo no tiene logs de auditoría. No puedes rastrear quién hizo qué,
cuándo, ni detectar fraudes.

**SOLUCIÓN: EVENT SOURCING**

**CONCEPTO**: En lugar de guardar solo el estado actual, guardar TODOS los eventos que llevaron a
ese estado.

**TECNOLOGÍAS PROBADAS**:

- Event Store DB: Base de datos especializada
- Implementación custom en IndexedDB
- Apache Kafka: Para sistemas grandes

**IMPLEMENTACIÓN**:

**Tabla de Eventos (Append-Only)**:

```
Estructura:
{
  id: UUID v4,
  timestamp: number (milisegundos desde epoch),
  sequence: number (contador incremental por dispositivo),
  tenant_id: string,
  user_id: string,
  device_id: string,
  event_type: string,
  aggregate_type: string,
  aggregate_id: string,
  data: object,
  metadata: {
    ip_address: string | null,
    user_agent: string,
    app_version: string,
    latitude: number | null,
    longitud: number | null,
    connection_type: string,
    battery_level: number | null
  },
  previous_hash: string,
  hash: string (SHA-256 del evento + previous_hash)
}

Índices:
- (timestamp) para consultas cronológicas
- (aggregate_type, aggregate_id) para reconstruir estado
- (user_id, timestamp) para auditoría por usuario
- (event_type, timestamp) para análisis
```

**Tipos de Eventos**:

```
PAGOS:
- PAGO_CREADO
- PAGO_SINCRONIZADO
- PAGO_RECHAZADO

CRÉDITOS:
- CREDITO_CREADO
- CREDITO_ACTUALIZADO
- CREDITO_DESEMBOLSADO
- CREDITO_CANCELADO

CLIENTES:
- CLIENTE_CREADO
- CLIENTE_ACTUALIZADO
- CLIENTE_DESACTIVADO

SISTEMA:
- SESION_INICIADA
- SESION_CERRADA
- SINCRONIZACION_INICIADA
- SINCRONIZACION_COMPLETADA
- SINCRONIZACION_FALLIDA
- ERROR_DETECTADO
- RECUPERACION_EJECUTADA
```

**INMUTABILIDAD**:

```
Reglas:
1. Los eventos NUNCA se modifican
2. Los eventos NUNCA se eliminan
3. Solo se agregan nuevos eventos
4. Si hay un error, se crea evento de corrección
5. Cadena de eventos verificable (blockchain-like)

Verificación de cadena:
1. Primer evento tiene previous_hash = "0"
2. Cada evento siguiente:
   hash = SHA256(evento + previous_hash del anterior)
3. Para verificar integridad:
   - Recalcular hash de cada evento
   - Verificar que coincide con hash almacenado
   - Verificar que previous_hash coincide con hash anterior
4. Si algún hash no coincide:
   - Cadena está corrupta
   - Identificar punto de corrupción
   - Registrar alerta crítica
```

**RECONSTRUCCIÓN DE ESTADO**:

```
Para saber el estado actual de un crédito:

1. Obtener todos los eventos del crédito:
   SELECT * FROM audit_log
   WHERE aggregate_type = 'credito'
   AND aggregate_id = 'credito-123'
   ORDER BY timestamp ASC

2. Aplicar eventos en orden cronológico:
   let credito = {};
   for (const evento of eventos) {
     switch (evento.event_type) {
       case 'CREDITO_CREADO':
         credito = evento.data;
         break;
       case 'CREDITO_ACTUALIZADO':
         credito = { ...credito, ...evento.data };
         break;
       case 'PAGO_APLICADO':
         credito.saldo_pendiente -= evento.data.monto;
         break;
     }
   }

3. Resultado = estado actual del crédito

Ventajas:
- Puedes reconstruir estado en cualquier punto del tiempo
- Auditoría completa de cambios
- Debugging más fácil
- Cumplimiento regulatorio
```

**DETECCIÓN DE FRAUDE**:

```
Patrones sospechosos detectables:

1. Múltiples pagos idénticos:
   - Mismo monto, mismo cliente, en corto tiempo
   - Posible duplicación accidental o fraude

2. Pagos sin geolocalización:
   - Todos los pagos deben tener GPS
   - Si falta, es sospechoso

3. Pagos fuera de horario:
   - Pagos registrados a las 3 AM
   - Fuera del horario laboral normal

4. Pagos desde ubicaciones imposibles:
   - Cobrador en ciudad A a las 10 AM
   - Pago en ciudad B (500km) a las 10:30 AM
   - Físicamente imposible

5. Modificaciones de saldos sin pagos:
   - Saldo disminuye sin pago correspondiente
   - Posible manipulación

6. Patrones de edición sospechosos:
   - Mismo registro editado 10 veces en 1 hora
   - Posible intento de ocultar algo

Acción:
- Generar alerta automática
- Marcar para revisión manual
- Bloquear sincronización si es crítico
- Notificar a supervisor
```

**SINCRONIZACIÓN DE LOGS**:

```
Prioridad máxima:
- Los logs se sincronizan antes que los datos
- Incluso si falla sincronización de datos, logs se envían
- Servidor puede reconstruir estado desde logs

Proceso:
1. Obtener eventos no sincronizados
2. Enviar en lotes a Supabase
3. Supabase almacena en tabla audit_log
4. Marcar como sincronizados
5. Nunca eliminar logs locales (mantener indefinidamente)
```

**VENTAJAS**:

- Auditoría completa e inmutable
- Detección de fraude automática
- Cumplimiento regulatorio
- Debugging más fácil
- Reconstrucción de estado en cualquier momento

### 4.6 Pre-carga Inteligente y Caché Predictivo

**PROBLEMA QUE RESUELVE**: Enketo carga datos bajo demanda. En zonas sin señal, no puedes acceder a
datos no cacheados.

**SOLUCIÓN: PREDICTIVE PREFETCHING**

**CONCEPTO**: Predecir qué datos necesitará el usuario y pre-cargarlos antes de que los solicite.

**TECNOLOGÍAS PROBADAS**:

- Workbox: Estrategias de caché avanzadas
- Background Sync API: Sincronización en background
- Periodic Background Sync: Sincronización periódica

**ESTRATEGIAS DE PRE-CARGA**:

**1. Pre-carga al Iniciar Sesión**:

```
Cuando cobrador inicia sesión:

1. Descargar datos del cobrador:
   - Perfil de usuario
   - Ruta asignada
   - Configuración personal

2. Descargar clientes de la ruta:
   - Todos los clientes activos de la ruta
   - Información completa (no solo IDs)
   - Ordenar por prioridad (días de atraso)

3. Descargar créditos activos:
   - Todos los créditos de esos clientes
   - Estado actual de cada crédito
   - Cuotas pendientes

4. Descargar historial reciente:
   - Últimos 30 días de pagos
   - Últimas interacciones con clientes

5. Descargar datos de referencia:
   - Productos de crédito activos
   - Configuración del tenant
   - Catálogos

Tiempo estimado: 5-30 segundos
Tamaño típico: 5-50 MB
```

**2. Pre-carga Geográfica**:

```
Basado en ubicación actual del cobrador:

1. Detectar ubicación GPS
2. Identificar clientes en radio de 5km
3. Pre-cargar datos de esos clientes con prioridad alta
4. Conforme cobrador se mueve:
   - Actualizar lista de clientes cercanos
   - Pre-cargar nuevos clientes que entran al radio
   - Liberar caché de clientes que salen del radio

Ventajas:
- Datos siempre disponibles para clientes cercanos
- Optimiza uso de almacenamiento
- Mejor experiencia de usuario
```

**3. Pre-carga por Patrón de Uso**:

```
Machine Learning simple:

1. Analizar historial del cobrador:
   - Qué clientes visita típicamente cada día
   - En qué orden los visita
   - A qué hora los visita

2. Predecir clientes del día:
   - Basado en día de la semana
   - Basado en historial
   - Basado en días de atraso

3. Pre-cargar clientes probables:
   - Con prioridad alta
   - Antes de que cobrador los solicite

4. Aprender y mejorar:
   - Ajustar predicciones basado en aciertos
   - Mejorar con el tiempo

Ejemplo:
- Lunes: Cobrador típicamente visita zona norte
- Pre-cargar clientes de zona norte el domingo por la noche
- Cuando cobrador abre app el lunes, todo está listo
```

**4. Pre-carga Nocturna**:

```
Cuando dispositivo está:
- Conectado a WiFi
- Cargando batería
- Inactivo (noche)

Proceso:
1. Descargar TODOS los datos del tenant
2. Actualizar todos los datos existentes
3. Descargar imágenes y documentos
4. Verificar integridad de datos
5. Generar índices optimizados
6. Preparar para día completo offline

Ventajas:
- Cobrador puede trabajar todo el día sin conexión
- Datos siempre frescos
- No consume datos móviles (usa WiFi)
- No afecta batería (está cargando)
```

**GESTIÓN DE ESPACIO**:

```
Si espacio de almacenamiento es limitado:

Prioridades:
1. Datos de ruta actual (NUNCA eliminar)
2. Últimos 7 días de actividad (NUNCA eliminar)
3. Clientes activos con créditos (alta prioridad)
4. Historial de pagos (media prioridad)
5. Clientes inactivos (baja prioridad)
6. Datos históricos > 30 días (muy baja prioridad)

Estrategia de limpieza:
1. Monitorear espacio disponible
2. Si < 20% disponible:
   - Eliminar datos de muy baja prioridad
3. Si < 10% disponible:
   - Eliminar datos de baja prioridad
   - Comprimir datos históricos
4. Si < 5% disponible:
   - Alertar al usuario
   - Sugerir liberar espacio
   - Mantener solo datos críticos

Nunca eliminar:
- Datos no sincronizados
- Últimos 7 días
- Ruta actual
```

**VENTAJAS**:

- Usuario casi nunca espera por datos
- Funciona completamente offline
- Optimiza uso de almacenamiento
- Mejor experiencia de usuario
- Menor consumo de datos móviles

### 4.7 Sincronización con Background Sync API

**PROBLEMA QUE RESUELVE**: Enketo solo sincroniza cuando app está abierta. Si cierras la app,
sincronización se detiene.

**SOLUCIÓN: BACKGROUND SYNC API**

**CONCEPTO**: API del navegador que permite sincronizar incluso cuando la app está cerrada.

**SOPORTE**:

- Chrome/Edge 49+: ✅ Completo
- Firefox: ⚠️ Parcial (detrás de flag)
- Safari: ❌ No soportado
- iOS Safari: ❌ No soportado

**IMPLEMENTACIÓN**:

**Registro de Sincronización**:

```
Cuando usuario registra un pago offline:

1. Guardar pago en IndexedDB
2. Agregar a cola de sincronización
3. Registrar sync event con Background Sync API:

   if ('sync' in registration) {
     await registration.sync.register('sync-pagos');
   }

4. Sistema operativo se encarga de ejecutar cuando hay conexión
5. Funciona incluso si app está cerrada
```

**Service Worker Handler**:

```
En Service Worker:

self.addEventListener('sync', async (event) => {
  if (event.tag === 'sync-pagos') {
    event.waitUntil(syncPagos());
  }
});

async function syncPagos() {
  // 1. Obtener pagos pendientes de IndexedDB
  const pagosPendientes = await getPagosPendientes();

  // 2. Enviar a Supabase
  for (const pago of pagosPendientes) {
    try {
      await enviarPago(pago);
      await marcarComoSincronizado(pago.id);
    } catch (error) {
      // Si falla, Background Sync reintentará automáticamente
      throw error;
    }
  }

  // 3. Mostrar notificación al usuario
  await self.registration.showNotification(
    'Sincronización completada',
    {
      body: `${pagosPendientes.length} pagos sincronizados`,
      icon: '/icon-192x192.png'
    }
  );
}
```

**Sincronización Periódica**:

```
Para mantener datos frescos:

// Registrar sincronización periódica (cada 12 horas)
if ('periodicSync' in registration) {
  await registration.periodicSync.register('sync-datos', {
    minInterval: 12 * 60 * 60 * 1000 // 12 horas
  });
}

// Handler en Service Worker
self.addEventListener('periodicsync', async (event) => {
  if (event.tag === 'sync-datos') {
    event.waitUntil(syncDatos());
  }
});

async function syncDatos() {
  // 1. Descargar cambios desde Supabase
  const cambios = await descargarCambios();

  // 2. Aplicar localmente
  await aplicarCambios(cambios);

  // 3. Enviar cambios locales
  await enviarCambiosLocales();
}
```

**FALLBACK PARA iOS**:

```
Si Background Sync no está disponible:

1. Usar sincronización tradicional cuando app está abierta
2. Notificar al usuario que debe mantener app abierta
3. Usar push notifications para recordar sincronizar
4. Sincronización más agresiva cuando app está activa

Detección:
if ('sync' in navigator.serviceWorker) {
  // Usar Background Sync
  usarBackgroundSync();
} else {
  // Fallback para iOS
  usarSincronizacionTradicional();
  mostrarAvisoIOS();
}
```

**VENTAJAS**:

- Sincronización garantizada (el SO reintenta)
- No depende de que app esté abierta
- Ahorra batería (el SO optimiza cuándo ejecutar)
- Mejor experiencia de usuario
- Sincronización más confiable

---

## 5. ESTRUCTURA DE DATOS E INDEXEDDB

### 5.1 Esquema Completo de IndexedDB

**Base de Datos**: `microcreditos_db`  
**Versión**: `1`  
**Tecnología**: Dexie.js

**TABLAS (Object Stores)**:

```javascript
// Definición con Dexie.js
const db = new Dexie('microcreditos_db');

db.version(1).stores({
  // Tablas de negocio
  tenants: 'id, nombre, activo',
  users: 'id, tenant_id, email, [tenant_id+activo]',
  rutas: 'id, tenant_id, nombre, activa, [tenant_id+activa]',
  clientes:
    'id, tenant_id, ruta_id, numero_documento, estado, [tenant_id+ruta_id], [tenant_id+estado]',
  productos_credito: 'id, tenant_id, activo, [tenant_id+activo]',
  creditos:
    'id, tenant_id, cliente_id, cobrador_id, ruta_id, estado, [tenant_id+estado], [cliente_id+estado], [cobrador_id+estado]',
  cuotas:
    'id, credito_id, tenant_id, numero, estado, fecha_programada, [credito_id+numero], [credito_id+estado]',
  pagos:
    'id, tenant_id, credito_id, cliente_id, cobrador_id, fecha, synced, [tenant_id+fecha], [credito_id+fecha], [cobrador_id+fecha], [synced+fecha]',

  // Tablas de sistema
  sync_queue:
    '++id, timestamp, table_name, record_id, operation, synced, priority, [synced+priority+timestamp]',
  audit_log:
    '++id, timestamp, event_type, aggregate_type, aggregate_id, user_id, [aggregate_type+aggregate_id+timestamp], [user_id+timestamp]',
  change_log:
    '++id, timestamp, table_name, record_id, synced, [synced+timestamp], [table_name+record_id]',
  checksums: 'record_key, checksum, timestamp',
  app_state: 'key, value, updated_at'
});
```

### 5.2 Estructura Detallada por Tabla

**TENANTS**:

```typescript
interface Tenant {
  id: string; // UUID
  nombre: string;
  usuarios_contratados: number;
  usuarios_activos: number;
  activo: boolean;
  created_at: number; // timestamp
  updated_at: number;
  // Campos de sincronización
  version_vector: Record<string, number>;
  synced: boolean;
  checksum: string;
}
```

**CLIENTES**:

```typescript
interface Cliente {
  id: string;
  tenant_id: string;
  created_by: string;
  nombre: string;
  created_at: number;
  updated_at: number;
  numero_documento: string;
  telefono: string;
  direccion: string;
  ruta_id: string;
  tipo_documento: string;
  telefono_2: string | null;
  barrio: string | null;
  referencia: string | null;
  latitud: number | null;
  longitud: number | null;
  nombre_fiador: string | null;
  telefono_fiador: string | null;
  creditos_activos: number; // calculado localmente
  saldo_total: number; // calculado localmente
  dias_atraso_max: number; // calculado localmente
  estado: 'activo' | 'inactivo' | 'bloqueado';
  score: number | null;
  // Campos de sincronización
  version_vector: Record<string, number>;
  field_versions: Record<string, FieldVersion>;
  synced: boolean;
  checksum: string;
}

interface FieldVersion {
  value: any;
  timestamp: number;
  device_id: string;
}
```

**PAGOS** (Tabla más crítica):

```typescript
interface Pago {
  id: string; // UUID v4 generado localmente
  tenant_id: string;
  credito_id: string;
  cliente_id: string;
  cobrador_id: string;
  monto: number;
  fecha: number; // timestamp
  latitud: number;
  longitud: number;
  observaciones: string | null;
  created_at: number;
  created_by: string;
  // Campos de sistema
  device_id: string;
  app_version: string;
  connection_type: string;
  battery_level: number | null;
  // Campos de sincronización
  synced: boolean;
  sync_attempts: number;
  last_sync_attempt: number | null;
  sync_error: string | null;
  // Integridad
  checksum: string; // SHA-256
  // Adjuntos
  comprobante_foto_url: string | null;
}
```

### 5.3 Índices Optimizados

**ESTRATEGIA DE ÍNDICES**:

```
Principios:
1. Índice por tenant_id en todas las tablas (multi-tenancy)
2. Índices compuestos para filtros comunes
3. Índice por synced para cola de sincronización
4. Índices por fechas para consultas temporales
5. Índices por estado para filtros

Ejemplos de consultas optimizadas:
- Obtener clientes de una ruta: [tenant_id+ruta_id]
- Obtener créditos activos de un cobrador: [cobrador_id+estado]
- Obtener pagos no sincronizados: [synced+fecha]
- Obtener cuotas pendientes de un crédito: [credito_id+estado]
```

---

## 6. SISTEMA DE SINCRONIZACIÓN

### 6.1 Arquitectura de Sincronización

**COMPONENTES**:

```
SyncManager (Coordinador principal)
├─ ConnectionMonitor (Detecta estado de conexión)
├─ UploadQueue (Cola ascendente)
├─ DownloadManager (Sincronización descendente)
├─ ConflictResolver (Resolución de conflictos)
└─ SyncScheduler (Programación de sincronizaciones)
```

### 6.2 Sincronización Ascendente (Device → Supabase)

**PROCESO COMPLETO**:

```
1. DETECCIÓN DE CAMBIOS PENDIENTES:
   - Consultar sync_queue donde synced = false
   - Ordenar por priority DESC, timestamp ASC
   - Agrupar por tabla y operación

2. PRIORIZACIÓN:
   Priority 1 (crítico): pagos
   Priority 2 (alto): creditos, cuotas
   Priority 3 (medio): clientes
   Priority 4 (bajo): configuración

3. PREPARACIÓN DE BATCHES:
   - Máximo 100 registros por batch
   - Agrupar por tabla para eficiencia
   - Calcular checksums de batch

4. ENVÍO A SUPABASE:
   POST /api/sync/upload
   Headers:
     - Authorization: Bearer {jwt_token}
     - X-Device-ID: {device_id}
     - X-Tenant-ID: {tenant_id}
   Body:
     {
       batch_id: UUID,
       device_id: string,
       timestamp: number,
       changes: [
         {
           table: string,
           operation: 'INSERT' | 'UPDATE' | 'DELETE',
           record_id: string,
           data: object,
           version_vector: object,
           checksum: string
         }
       ]
     }

5. PROCESAMIENTO DE RESPUESTA:
   Success (200):
     - Marcar registros como sincronizados
     - Actualizar version_vectors
     - Eliminar de sync_queue

   Conflict (409):
     - Recibir datos del servidor
     - Resolver conflicto con CRDT
     - Reintentar con datos resueltos

   Error (4xx/5xx):
     - Incrementar sync_attempts
     - Aplicar backoff exponencial
     - Registrar error en audit_log

6. LIMPIEZA:
   - Eliminar registros sincronizados de sync_queue
   - Mantener audit_log indefinidamente
   - Actualizar timestamp de última sincronización
```

### 6.3 Sincronización Descendente (Supabase → Device)

**PROCESO COMPLETO**:

```
1. SOLICITUD DE CAMBIOS:
   GET /api/sync/download
   Query params:
     - since: timestamp de última sincronización
     - tenant_id: ID del tenant
     - device_id: ID del dispositivo

2. RESPUESTA DEL SERVIDOR:
   {
     new_timestamp: number,
     changes: [
       {
         table: string,
         operation: 'INSERT' | 'UPDATE' | 'DELETE',
         record_id: string,
         data: object,
         version_vector: object,
         timestamp: number
       }
     ],
     deleted_ids: {
       clientes: [id1, id2],
       creditos: [id3, id4]
     }
   }

3. APLICACIÓN DE CAMBIOS:
   Para cada cambio:
     a. Verificar si existe localmente
     b. Si existe, comparar version_vectors
     c. Si hay conflicto, resolver con CRDT
     d. Aplicar cambio en IndexedDB
     e. Actualizar version_vector local
     f. Registrar en audit_log

4. MANEJO DE ELIMINACIONES:
   - Eliminar registros en deleted_ids
   - Verificar integridad referencial
   - Registrar eliminaciones en audit_log

5. ACTUALIZACIÓN DE ESTADO:
   - Guardar new_timestamp
   - Actualizar UI si hay cambios visibles
   - Notificar al usuario si es relevante
```

### 6.4 Estrategias de Sincronización

**SINCRONIZACIÓN INMEDIATA**:

```
Cuándo: Después de operaciones críticas (pagos)
Cómo:
  1. Guardar pago localmente
  2. Confirmar al usuario
  3. Intentar sincronización inmediata
  4. Si falla, agregar a cola con prioridad máxima
  5. Background Sync se encargará
```

**SINCRONIZACIÓN PERIÓDICA**:

```
Cuándo: Cada 5 minutos (configurable)
Cómo:
  1. Verificar si hay conexión
  2. Verificar si hay cambios pendientes
  3. Sincronizar ascendente (enviar cambios)
  4. Sincronizar descendente (recibir cambios)
  5. Programar próxima sincronización
```

**SINCRONIZACIÓN EN BACKGROUND**:

```
Cuándo: App cerrada, dispositivo con conexión
Cómo:
  1. Background Sync API detecta conexión
  2. Service Worker se activa
  3. Sincroniza cambios pendientes
  4. Muestra notificación al usuario
```

**SINCRONIZACIÓN MANUAL**:

```
Cuándo: Usuario presiona botón "Sincronizar"
Cómo:
  1. Forzar sincronización inmediata
  2. Mostrar progreso en UI
  3. Notificar resultado al usuario
  4. Actualizar indicadores visuales
```

---

## 7. GESTIÓN DE CONFLICTOS

### 7.1 Tipos de Conflictos

**CONFLICTO TIPO 1: Edición Concurrente del Mismo Campo**:

```
Escenario:
- Cobrador A edita teléfono de cliente offline
- Cobrador B edita mismo teléfono offline
- Ambos sincronizan

Resolución:
- Comparar timestamps
- Gana el cambio más reciente
- Registrar conflicto en audit_log
- Notificar a ambos cobradores
```

**CONFLICTO TIPO 2: Edición de Campos Diferentes**:

```
Escenario:
- Cobrador A edita teléfono de cliente
- Cobrador B edita dirección del mismo cliente
- Ambos sincronizan

Resolución:
- No hay conflicto real
- Merge automático de cambios
- Ambos cambios se aplican
- No requiere intervención
```

**CONFLICTO TIPO 3: Eliminación vs Edición**:

```
Escenario:
- Cobrador A elimina cliente
- Cobrador B edita mismo cliente
- Ambos sincronizan

Resolución:
- Eliminación gana (más seguro)
- Edición se descarta
- Notificar a cobrador B
- Registrar en audit_log
```

### 7.2 Resolución Automática con CRDT

**ALGORITMO DE RESOLUCIÓN**:

```
function resolverConflicto(local, remoto) {
  // 1. Comparar version_vectors
  const localDomina = dominaVector(local.version_vector, remoto.version_vector);
  const remotoDomina = dominaVector(remoto.version_vector, local.version_vector);

  // 2. Si un vector domina, usar ese
  if (localDomina && !remotoDomina) {
    return local; // Local es más reciente
  }
  if (remotoDomina && !localDomina) {
    return remoto; // Remoto es más reciente
  }

  // 3. Si hay conflicto, resolver campo por campo
  const resuelto = {};
  const campos = new Set([
    ...Object.keys(local.field_versions),
    ...Object.keys(remoto.field_versions)
  ]);

  for (const campo of campos) {
    const localField = local.field_versions[campo];
    const remotoField = remoto.field_versions[campo];

    if (!remotoField) {
      resuelto[campo] = localField;
    } else if (!localField) {
      resuelto[campo] = remotoField;
    } else {
      // Comparar timestamps
      if (localField.timestamp > remotoField.timestamp) {
        resuelto[campo] = localField;
      } else if (remotoField.timestamp > localField.timestamp) {
        resuelto[campo] = remotoField;
      } else {
        // Timestamps iguales, usar device_id como desempate
        if (localField.device_id > remotoField.device_id) {
          resuelto[campo] = localField;
        } else {
          resuelto[campo] = remotoField;
        }
      }
    }
  }

  // 4. Merge de version_vectors
  const mergedVector = mergeVectors(
    local.version_vector,
    remoto.version_vector
  );

  // 5. Registrar conflicto
  registrarConflicto({
    tipo: 'EDICION_CONCURRENTE',
    local,
    remoto,
    resuelto,
    timestamp: Date.now()
  });

  return {
    ...resuelto,
    version_vector: mergedVector
  };
}
```

### 7.3 Casos Especiales

**PAGOS (Nunca hay conflictos)**:

```
Razón: Los pagos son append-only
Estrategia:
  - Cada pago tiene UUID único
  - Nunca se editan
  - Nunca se eliminan
  - Solo se agregan
  - Imposible tener conflictos
```

**SALDOS (Calculados, no almacenados)**:

```
Razón: Los saldos se calculan desde pagos
Estrategia:
  - No almacenar saldos directamente
  - Calcular desde lista de pagos
  - Siempre correcto
  - No puede haber conflictos
```

**CONTADORES (CRDT Counter)**:

```
Razón: Múltiples dispositivos incrementan/decrementan
Estrategia:
  - Cada dispositivo mantiene su propio contador
  - Al sincronizar, sumar todos los contadores
  - Matemáticamente correcto
  - No puede haber conflictos
```

---

## 8. SERVICE WORKERS Y CACHÉ

### 8.1 Configuración del Service Worker

**TECNOLOGÍA**: Vite PWA Plugin + Workbox

**CONFIGURACIÓN** (vite.config.js):

```javascript
import { VitePWA } from 'vite-plugin-pwa';

export default {
  plugins: [
    svelte(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'MicroCréditos Pro',
        short_name: 'MicroCréditos',
        description: 'Sistema de gestión de microcréditos offline-first',
        theme_color: '#4F46E5',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: 'icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 año
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              networkTimeoutSeconds: 10,
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 5 // 5 minutos
              }
            }
          }
        ]
      }
    })
  ]
};
```

### 8.2 Estrategias de Caché

**CACHE-FIRST (Assets Estáticos)**:

```
Uso: HTML, CSS, JS, imágenes, fuentes
Estrategia:
  1. Buscar en caché
  2. Si existe, retornar inmediatamente
  3. Si no existe, obtener de red
  4. Cachear para próxima vez

Ventajas:
  - Carga instantánea
  - Funciona offline
  - Ahorra ancho de banda
```

**NETWORK-FIRST (Datos Dinámicos)**:

```
Uso: APIs de Supabase, datos en tiempo real
Estrategia:
  1. Intentar obtener de red
  2. Si exitoso, actualizar caché y retornar
  3. Si falla, retornar desde caché
  4. Timeout de 10 segundos

Ventajas:
  - Datos siempre frescos cuando hay conexión
  - Fallback a caché si no hay conexión
  - Balance entre frescura y disponibilidad
```

**STALE-WHILE-REVALIDATE (Imágenes de Usuarios)**:

```
Uso: Fotos de perfil, comprobantes
Estrategia:
  1. Retornar desde caché inmediatamente
  2. En paralelo, obtener de red
  3. Actualizar caché con versión nueva
  4. Próxima carga usará versión actualizada

Ventajas:
  - Carga instantánea
  - Datos se actualizan en background
  - Mejor experiencia de usuario
```

### 8.3 Actualización del Service Worker

**ESTRATEGIA DE ACTUALIZACIÓN**:

```
1. DETECCIÓN DE NUEVA VERSIÓN:
   - Vite genera nuevo hash en cada build
   - Service Worker detecta cambio automáticamente
   - Descarga nueva versión en background

2. INSTALACIÓN:
   - Nueva versión se instala en paralelo
   - No interrumpe versión actual
   - Pre-cachea nuevos assets

3. ACTIVACIÓN:
   - Espera a que todas las pestañas se cierren
   - O usuario acepta actualizar
   - Elimina cachés antiguos
   - Activa nueva versión

4. NOTIFICACIÓN AL USUARIO:
   - Mostrar banner: "Nueva versión disponible"
   - Botón "Actualizar ahora"
   - O esperar a próximo reinicio
```

**MANEJO DE ACTUALIZACIONES EN SVELTE**:

```javascript
// src/lib/stores/sw-update.js
import { writable } from 'svelte/store';

export const updateAvailable = writable(false);
export const registration = writable(null);

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').then(reg => {
    registration.set(reg);

    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          updateAvailable.set(true);
        }
      });
    });
  });
}

export function skipWaiting() {
  registration.update(reg => {
    reg?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    return reg;
  });
}
```

---

## 9. PÁGINAS Y FORMULARIOS

### 9.1 Estructura de Páginas

**RUTAS PRINCIPALES**:

```
/                           → Dashboard (resumen del día)
/login                      → Autenticación
/clientes                   → Lista de clientes
/clientes/nuevo             → Formulario nuevo cliente
/clientes/:id               → Detalle de cliente
/clientes/:id/editar        → Editar cliente
/creditos                   → Lista de créditos
/creditos/nuevo             → Formulario nuevo crédito
/creditos/:id               → Detalle de crédito
/creditos/:id/pagar         → Formulario de pago
/pagos                      → Historial de pagos
/pagos/:id                  → Detalle de pago
/rutas                      → Gestión de rutas
/sincronizacion             → Estado de sincronización
/configuracion              → Configuración de la app
/offline                    → Página offline (fallback)
```

### 9.2 Formularios por Tabla

**FORMULARIO: CLIENTES**:

```
Campos:
  - Información básica:
    * Nombre (requerido)
    * Tipo de documento (select)
    * Número de documento (requerido, único)
    * Teléfono (requerido)
    * Teléfono 2 (opcional)

  - Ubicación:
    * Dirección (requerido)
    * Barrio (opcional)
    * Referencia (opcional)
    * Latitud/Longitud (auto-capturado con GPS)
    * Botón "Usar ubicación actual"

  - Fiador:
    * Nombre del fiador (opcional)
    * Teléfono del fiador (opcional)

  - Asignación:
    * Ruta (select, requerido)

  - Estado:
    * Estado (select: activo/inactivo/bloqueado)

Validaciones:
  - Nombre: mínimo 3 caracteres
  - Documento: formato según tipo
  - Teléfono: formato válido
  - Dirección: mínimo 10 caracteres
  - Ruta: debe existir y estar activa

Funcionalidades:
  - Auto-guardado cada 3 segundos
  - Captura de ubicación GPS
  - Búsqueda de duplicados por documento
  - Vista previa antes de guardar
```

**FORMULARIO: CRÉDITOS**:

```
Campos:
  - Cliente:
    * Búsqueda de cliente (autocomplete)
    * Mostrar info del cliente seleccionado

  - Producto:
    * Producto de crédito (select)
    * Mostrar detalles del producto

  - Montos:
    * Monto original (requerido)
    * Interés % (auto-llenado desde producto)
    * Total a pagar (calculado automáticamente)

  - Cuotas:
    * Número de cuotas (auto-llenado desde producto)
    * Valor de cuota (calculado automáticamente)
    * Frecuencia (select: diario/semanal/quincenal/mensual)
    * Excluir domingos (checkbox)

  - Fechas:
    * Fecha de desembolso (requerido)
    * Fecha primera cuota (calculado automáticamente)
    * Fecha última cuota (calculado automáticamente)

  - Asignación:
    * Cobrador (select)
    * Ruta (select)

Validaciones:
  - Cliente debe existir y estar activo
  - Monto entre mínimo y máximo del producto
  - Número de cuotas válido según producto
  - Fechas coherentes
  - Cobrador y ruta deben estar activos

Funcionalidades:
  - Cálculo automático de cuotas
  - Generación de calendario de pagos
  - Vista previa de cuotas
  - Validación de capacidad de pago del cliente
```

**FORMULARIO: PAGOS** (MÁS CRÍTICO):

```
Campos:
  - Cliente/Crédito:
    * Búsqueda de cliente (autocomplete)
    * Selección de crédito (si tiene múltiples)
    * Mostrar saldo pendiente
    * Mostrar días de atraso

  - Pago:
    * Monto (requerido)
    * Fecha (default: hoy)
    * Observaciones (opcional)

  - Ubicación:
    * Latitud/Longitud (auto-capturado)
    * Botón "Usar ubicación actual"
    * Mapa mostrando ubicación

  - Comprobante:
    * Foto del comprobante (opcional)
    * Captura desde cámara
    * Selección desde galería

Validaciones:
  - Crédito debe existir y estar activo
  - Monto > 0
  - Monto <= saldo pendiente + tolerancia
  - Fecha no puede ser futura
  - Ubicación GPS requerida
  - No duplicados (mismo monto, cliente, fecha en últimos 5 min)

Funcionalidades:
  - Captura automática de GPS
  - Cálculo de nuevo saldo en tiempo real
  - Actualización de cuotas automática
  - Cálculo de días de atraso
  - Compresión de foto antes de guardar
  - Confirmación visual clara
  - Guardado en 3 capas simultáneamente
  - Sincronización inmediata si hay conexión
```

### 9.3 Componentes Reutilizables

**COMPONENTES CLAVE**:

```
<ClienteAutocomplete>
  - Búsqueda con debouncing
  - Resultados desde IndexedDB
  - Muestra info relevante
  - Maneja selección

<GPSCapture>
  - Captura ubicación actual
  - Muestra en mapa
  - Maneja permisos
  - Fallback si no hay GPS

<CameraCapture>
  - Captura desde cámara
  - Selección desde galería
  - Compresión automática
  - Preview antes de guardar

<SyncIndicator>
  - Muestra estado de conexión
  - Muestra operaciones pendientes
  - Botón de sincronización manual
  - Progreso de sincronización

<FormAutoSave>
  - Auto-guardado con debouncing
  - Indicador visual de estado
  - Recuperación automática
  - Manejo de errores

<ValidationMessage>
  - Mensajes de error
  - Mensajes de advertencia
  - Mensajes de éxito
  - Consistente en toda la app
```

---

## 10. SEGURIDAD Y ENCRIPTACIÓN

### 10.1 Encriptación de Datos Sensibles

**CAMPOS A ENCRIPTAR**:

```
Clientes:
  - numero_documento
  - telefono
  - telefono_2
  - telefono_fiador

Pagos:
  - observaciones (pueden contener info sensible)

Usuarios:
  - email
  - telefono
```

**TECNOLOGÍA**: Web Crypto API

**IMPLEMENTACIÓN**:

```javascript
// Generación de clave de encriptación
async function generarClave(password, salt) {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode(salt),
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

// Encriptar campo
async function encriptarCampo(valor, clave) {
  const encoder = new TextEncoder();
  const data = encoder.encode(valor);
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, clave, data);

  // Retornar IV + datos encriptados en Base64
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

// Desencriptar campo
async function desencriptarCampo(valorEncriptado, clave) {
  const combined = Uint8Array.from(atob(valorEncriptado), c => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const data = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, clave, data);

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}
```

**GESTIÓN DE CLAVES**:

```
1. Clave maestra derivada del PIN del usuario
2. Clave almacenada en memoria durante sesión
3. Nunca almacenar clave en texto plano
4. Limpiar clave de memoria al cerrar sesión
5. Re-encriptar si usuario cambia PIN
```

### 10.2 Autenticación y Autorización

**FLUJO DE AUTENTICACIÓN**:

```
1. Usuario ingresa email y contraseña
2. Enviar a Supabase Auth
3. Recibir JWT token
4. Almacenar token en memoria (no en localStorage)
5. Usar token para todas las requests
6. Renovar token antes de expiración
7. Cerrar sesión si token inválido
```

**ROW LEVEL SECURITY (RLS) EN SUPABASE**:

```sql
-- Política para clientes
CREATE POLICY "Usuarios solo ven clientes de su tenant"
ON clientes
FOR SELECT
USING (tenant_id = auth.jwt() ->> 'tenant_id');

-- Política para pagos
CREATE POLICY "Cobradores solo ven sus pagos"
ON pagos
FOR SELECT
USING (
  tenant_id = auth.jwt() ->> 'tenant_id'
  AND (
    cobrador_id = auth.uid()
    OR auth.jwt() ->> 'role' = 'admin'
  )
);

-- Política para inserción de pagos
CREATE POLICY "Cobradores solo crean pagos propios"
ON pagos
FOR INSERT
WITH CHECK (
  tenant_id = auth.jwt() ->> 'tenant_id'
  AND cobrador_id = auth.uid()
);
```

### 10.3 Protección contra Ataques

**XSS (Cross-Site Scripting)**:

```
- Svelte escapa HTML automáticamente
- Usar {@html} solo cuando sea absolutamente necesario
- Sanitizar inputs de usuario
- Content Security Policy headers
```

**CSRF (Cross-Site Request Forgery)**:

```
- Supabase maneja CSRF automáticamente
- Tokens JWT en headers (no en cookies)
- SameSite cookies si se usan
```

**SQL Injection**:

```
- Supabase usa prepared statements
- Nunca construir queries con concatenación
- Validar todos los inputs
```

**Man-in-the-Middle**:

```
- HTTPS obligatorio (Vercel lo provee)
- Certificate pinning en app nativa (si se hace)
- Verificar certificados SSL
```

---

## 11. AUDITORÍA Y LOGS

### 11.1 Sistema de Logs

**NIVELES DE LOG**:

```
ERROR: Errores críticos que requieren atención
WARN: Advertencias que no bloquean operación
INFO: Información general de operaciones
DEBUG: Información detallada para debugging
```

**IMPLEMENTACIÓN**:

```javascript
class Logger {
  constructor(context) {
    this.context = context;
  }

  async log(level, message, data = {}) {
    const logEntry = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      level,
      context: this.context,
      message,
      data,
      user_id: getCurrentUserId(),
      device_id: getDeviceId(),
      app_version: APP_VERSION,
      url: window.location.href
    };

    // Guardar en IndexedDB
    await db.audit_log.add(logEntry);

    // Enviar a servidor si es ERROR
    if (level === 'ERROR') {
      await enviarLogAlServidor(logEntry);
    }

    // Console en desarrollo
    if (import.meta.env.DEV) {
      console[level.toLowerCase()](message, data);
    }
  }

  error(message, data) {
    return this.log('ERROR', message, data);
  }

  warn(message, data) {
    return this.log('WARN', message, data);
  }

  info(message, data) {
    return this.log('INFO', message, data);
  }

  debug(message, data) {
    return this.log('DEBUG', message, data);
  }
}

// Uso
const logger = new Logger('PagoForm');
logger.info('Pago registrado', { pagoId, monto });
logger.error('Error al sincronizar', { error, pagoId });
```

### 11.2 Monitoreo de Errores

**INTEGRACIÓN CON SENTRY**:

```javascript
import * as Sentry from '@sentry/svelte';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  release: APP_VERSION,
  integrations: [new Sentry.BrowserTracing(), new Sentry.Replay()],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event, hint) {
    // Filtrar información sensible
    if (event.request) {
      delete event.request.cookies;
      delete event.request.headers?.Authorization;
    }
    return event;
  }
});
```

### 11.3 Métricas y Analytics

**MÉTRICAS CLAVE**:

```
Operacionales:
- Pagos registrados por día
- Tiempo promedio de sincronización
- Tasa de éxito de sincronización
- Operaciones pendientes
- Uso de almacenamiento

Performance:
- Tiempo de carga de la app
- Tiempo de respuesta de formularios
- Tiempo de consultas a IndexedDB
- Uso de memoria
- Uso de batería

Negocio:
- Monto total cobrado
- Número de clientes visitados
- Tasa de recuperación
- Días promedio de atraso
```

---

## 12. PERFORMANCE Y OPTIMIZACIONES

### 12.1 Optimizaciones de Svelte

**CODE SPLITTING**:

```javascript
// Lazy loading de rutas
const ClienteDetalle = () => import('./pages/ClienteDetalle.svelte');
const CreditoForm = () => import('./pages/CreditoForm.svelte');
const PagoForm = () => import('./pages/PagoForm.svelte');

// Router con lazy loading
const routes = {
  '/clientes/:id': ClienteDetalle,
  '/creditos/nuevo': CreditoForm,
  '/creditos/:id/pagar': PagoForm
};
```

**VIRTUAL SCROLLING**:

```
Para listas largas (clientes, pagos):
- Renderizar solo elementos visibles
- Biblioteca: svelte-virtual-list
- Mejora performance dramáticamente
- Ejemplo: 10,000 clientes → renderizar solo 20
```

**MEMOIZATION**:

```javascript
// Cachear cálculos costosos
import { derived } from 'svelte/store';

export const saldoTotal = derived([creditos, pagos], ([$creditos, $pagos], set) => {
  // Solo recalcular si creditos o pagos cambian
  const total = calcularSaldoTotal($creditos, $pagos);
  set(total);
});
```

**DEBOUNCING**:

```javascript
// Para búsquedas y auto-guardado
import { debounce } from 'lodash-es';

const buscarClientes = debounce(async query => {
  const resultados = await db.clientes
    .where('nombre')
    .startsWithIgnoreCase(query)
    .limit(20)
    .toArray();
  return resultados;
}, 300);
```

### 12.2 Optimizaciones de IndexedDB

**ÍNDICES COMPUESTOS**:

```javascript
// Optimizar consultas comunes
db.version(1).stores({
  pagos: 'id, [tenant_id+cobrador_id+fecha], [credito_id+fecha]'
});

// Consulta optimizada
const pagosCobrador = await db.pagos
  .where('[tenant_id+cobrador_id+fecha]')
  .between([tenantId, cobradorId, fechaInicio], [tenantId, cobradorId, fechaFin])
  .toArray();
```

**TRANSACCIONES**:

```javascript
// Agrupar operaciones relacionadas
await db.transaction('rw', db.pagos, db.creditos, db.cuotas, async () => {
  // 1. Insertar pago
  await db.pagos.add(pago);

  // 2. Actualizar saldo del crédito
  await db.creditos.update(creditoId, {
    saldo_pendiente: nuevoSaldo
  });

  // 3. Actualizar cuotas
  await db.cuotas.bulkUpdate(cuotasActualizadas);
});
// Todo o nada (ACID)
```

**BULK OPERATIONS**:

```javascript
// Insertar múltiples registros eficientemente
await db.clientes.bulkAdd(arrayDeClientes);
await db.pagos.bulkPut(arrayDePagos);

// Más rápido que insertar uno por uno
```

### 12.3 Optimizaciones de Red

**COMPRESIÓN**:

```javascript
// Comprimir datos antes de enviar
import pako from 'pako';

async function enviarDatos(datos) {
  const json = JSON.stringify(datos);
  const compressed = pako.gzip(json);

  await fetch('/api/sync/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/gzip',
      'Content-Encoding': 'gzip'
    },
    body: compressed
  });
}
// Reducción típica: 70-90%
```

**REQUEST BATCHING**:

```javascript
// Agrupar múltiples requests en uno
const batch = {
  pagos: pagosPendientes,
  creditos: creditosActualizados,
  clientes: clientesModificados
};

await fetch('/api/sync/batch', {
  method: 'POST',
  body: JSON.stringify(batch)
});
// 1 request en lugar de N requests
```

**CACHING INTELIGENTE**:

```javascript
// Cachear respuestas de API
const cache = new Map();

async function fetchConCache(url, ttl = 60000) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < ttl) {
    return cached.data;
  }

  const data = await fetch(url).then(r => r.json());
  cache.set(url, { data, timestamp: Date.now() });
  return data;
}
```

### 12.4 Optimizaciones de Batería

**REDUCIR POLLING**:

```javascript
// En lugar de polling cada segundo
setInterval(verificarConexion, 1000); // ❌ Malo

// Usar eventos del navegador
window.addEventListener('online', sincronizar);
window.addEventListener('offline', pausarSincronizacion);
// ✅ Mejor
```

**BACKGROUND SYNC**:

```javascript
// Dejar que el SO optimice cuándo sincronizar
await registration.sync.register('sync-pagos');
// SO decide el mejor momento (WiFi, batería, etc.)
```

**THROTTLING DE GPS**:

```javascript
// No capturar GPS constantemente
navigator.geolocation.watchPosition(callback, error, {
  enableHighAccuracy: false, // Menos preciso pero menos batería
  maximumAge: 30000, // Cachear por 30 segundos
  timeout: 10000
});
```

---

## 13. STACK TECNOLÓGICO DETALLADO

### 13.1 Frontend

**FRAMEWORK**: Svelte 4

```
Por qué Svelte:
- Compilador (no runtime) → bundles más pequeños
- Reactividad nativa → código más simple
- Performance excelente → ideal para dispositivos móviles
- Curva de aprendizaje suave
- Stores integrados para estado global
```

**BUILD TOOL**: Vite 5

```
Por qué Vite:
- HMR instantáneo
- Build 10-100x más rápido que Webpack
- Plugin PWA oficial
- Optimizaciones automáticas
- Soporte TypeScript nativo
```

**ROUTING**: SvelteKit o svelte-spa-router

```
SvelteKit:
- SSR opcional
- File-based routing
- Layouts anidados
- Más completo

svelte-spa-router:
- Más simple
- Solo client-side
- Más ligero
- Suficiente para PWA
```

**ESTADO GLOBAL**: Svelte Stores + Dexie Observables

```
Svelte Stores:
- writable: Estado mutable
- readable: Estado inmutable
- derived: Estado calculado
- custom: Lógica personalizada

Dexie Observables:
- Reactivo a cambios en IndexedDB
- Integración perfecta con Svelte
- Actualización automática de UI
```

**UI COMPONENTS**: Tailwind CSS + DaisyUI

```
Tailwind CSS:
- Utility-first
- Altamente personalizable
- Tree-shaking automático
- Pequeño bundle final

DaisyUI:
- Componentes pre-diseñados
- Temas
- Accesible
- Compatible con Tailwind
```

**FORMULARIOS**: Svelte Forms Lib + Zod

```
Svelte Forms Lib:
- Manejo de estado de formularios
- Validación
- Errores
- Touched/dirty tracking

Zod:
- Validación de esquemas
- Type-safe
- Mensajes de error personalizables
- Integración con TypeScript
```

**MAPAS**: Leaflet + Svelte-Leaflet

```
Leaflet:
- Open source
- Ligero
- Funciona offline con tiles cacheados
- Alternativa a Google Maps

Svelte-Leaflet:
- Componentes Svelte para Leaflet
- Reactivo
- Fácil de usar
```

### 13.2 Base de Datos Local

**INDEXEDDB WRAPPER**: Dexie.js 3

```
Por qué Dexie:
- API mucho más simple que IndexedDB nativo
- Sintaxis SQL-like
- Soporte de TypeScript
- Hooks para Svelte
- Manejo de errores robusto
- Migraciones de esquema
- Observables para reactividad
```

**SINCRONIZACIÓN**: Implementación custom

```
Por qué custom:
- Control total sobre lógica
- Optimizado para caso de uso específico
- No dependencia de bibliotecas complejas
- Más fácil de debuggear
- Más fácil de mantener
```

### 13.3 Backend

**HOSTING**: Vercel

```
Por qué Vercel:
- Deploy automático desde Git
- CDN global
- HTTPS automático
- Gratis para proyectos pequeños
- Optimizado para frontend
- Edge Functions disponibles
```

**BASE DE DATOS**: Supabase (PostgreSQL)

```
Por qué Supabase:
- PostgreSQL real (no NoSQL)
- REST API automática
- Realtime subscriptions
- Auth integrado
- Row Level Security
- Storage para archivos
- Gratis hasta 500MB
- Backups automáticos
```

**AUTENTICACIÓN**: Supabase Auth

```
Características:
- JWT tokens
- Múltiples providers
- Row Level Security
- Renovación automática de tokens
- Manejo de sesiones
```

**STORAGE**: Supabase Storage

```
Uso:
- Fotos de comprobantes
- Documentos de clientes
- Imágenes de perfil
- Backups de datos
```

### 13.4 Herramientas de Desarrollo

**LENGUAJE**: TypeScript

```
Por qué TypeScript:
- Type safety crítico para datos financieros
- Mejor autocompletado
- Detección de errores en desarrollo
- Refactoring más seguro
- Documentación implícita
```

**LINTING**: ESLint + Prettier

```
ESLint:
- Detectar errores
- Mejores prácticas
- Consistencia de código

Prettier:
- Formateo automático
- Consistencia de estilo
- Integración con editor
```

**TESTING**: Vitest + Testing Library

```
Vitest:
- Compatible con Vite
- Muy rápido
- API similar a Jest
- Coverage integrado

Testing Library:
- Testing centrado en usuario
- Componentes Svelte
- Queries accesibles
```

**MONITOREO**: Sentry

```
Características:
- Error tracking
- Performance monitoring
- Session replay
- Breadcrumbs
- Source maps
- Alertas
```

---

## 14. FLUJOS DE OPERACIÓN

### 14.1 Flujo Completo: Registro de Pago

```
PASO 1: USUARIO ABRE FORMULARIO DE PAGO
├─ Cargar datos del cliente desde IndexedDB
├─ Cargar créditos activos del cliente
├─ Mostrar saldo pendiente
├─ Capturar ubicación GPS automáticamente
└─ Preparar formulario

PASO 2: USUARIO COMPLETA FORMULARIO
├─ Validación en tiempo real (Zod)
├─ Cálculo de nuevo saldo en tiempo real
├─ Auto-guardado cada 3 segundos
└─ Mostrar preview de cambios

PASO 3: USUARIO PRESIONA "GUARDAR"
├─ Validación final
├─ Generar UUID para el pago
├─ Calcular checksum SHA-256
├─ Capturar metadata (device_id, app_version, etc.)
└─ Preparar objeto de pago completo

PASO 4: GUARDAR EN CAPA 1 (IndexedDB)
├─ Iniciar transacción
├─ Insertar pago en tabla pagos
├─ Actualizar saldo_pendiente del crédito
├─ Actualizar cuotas afectadas
├─ Actualizar contadores del cliente
├─ Commit transacción
└─ Si falla, abortar y mostrar error

PASO 5: GUARDAR EN CAPA 2 (LocalStorage)
├─ Serializar pago a JSON
├─ Guardar en localStorage con clave única
├─ Mantener solo últimos 100 pagos
└─ Si falla, log warning pero continuar

PASO 6: GUARDAR EN CAPA 3 (Cache API)
├─ Serializar pago a JSON
├─ Guardar en caché del Service Worker
├─ Agregar a snapshot diario
└─ Si falla, log warning pero continuar

PASO 7: REGISTRAR EN AUDIT LOG
├─ Crear evento PAGO_CREADO
├─ Incluir todos los detalles
├─ Calcular hash con previous_hash
├─ Guardar en tabla audit_log
└─ Marcar para sincronización prioritaria

PASO 8: AGREGAR A COLA DE SINCRONIZACIÓN
├─ Crear entrada en sync_queue
├─ Priority = 1 (máxima)
├─ Marcar como no sincronizado
└─ Timestamp actual

PASO 9: CONFIRMAR AL USUARIO
├─ Mostrar mensaje de éxito
├─ Mostrar nuevo saldo
├─ Mostrar indicador de "pendiente de sincronización"
├─ Limpiar formulario
└─ Preparar para próximo pago

PASO 10: SINCRONIZACIÓN INMEDIATA (Background)
├─ Verificar si hay conexión
├─ Si hay conexión:
│  ├─ Enviar pago a Supabase inmediatamente
│  ├─ Esperar confirmación
│  ├─ Marcar como sincronizado
│  └─ Actualizar indicador en UI
└─ Si no hay conexión:
   ├─ Background Sync API se encargará
   └─ Mostrar "Se sincronizará cuando haya conexión"

PASO 11: ACTUALIZACIÓN DE UI
├─ Actualizar lista de pagos (si está visible)
├─ Actualizar saldo del crédito (si está visible)
├─ Actualizar contador de operaciones pendientes
└─ Actualizar indicador de sincronización

TIEMPO TOTAL: < 500ms en dispositivo moderno
```

### 14.2 Flujo Completo: Sincronización

```
TRIGGER: Conexión detectada o sincronización manual

FASE 1: PREPARACIÓN
├─ Verificar estado de conexión real (ping a Supabase)
├─ Obtener operaciones pendientes de sync_queue
├─ Ordenar por prioridad y timestamp
├─ Agrupar por tabla y tipo de operación
└─ Calcular total de operaciones

FASE 2: SINCRONIZACIÓN ASCENDENTE (Device → Supabase)
├─ LOTE 1: Pagos (Prioridad 1)
│  ├─ Obtener pagos no sincronizados
│  ├─ Validar integridad (checksums)
│  ├─ Crear batch de máximo 100 pagos
│  ├─ Comprimir con gzip
│  ├─ POST /api/sync/upload
│  ├─ Procesar respuesta:
│  │  ├─ Success: Marcar como sincronizados
│  │  ├─ Conflict: Resolver con CRDT
│  │  └─ Error: Aplicar backoff y reintentar
│  └─ Actualizar UI con progreso
│
├─ LOTE 2: Créditos y Cuotas (Prioridad 2)
│  └─ [Mismo proceso que pagos]
│
├─ LOTE 3: Clientes (Prioridad 3)
│  └─ [Mismo proceso que pagos]
│
└─ LOTE 4: Configuración (Prioridad 4)
   └─ [Mismo proceso que pagos]

FASE 3: SINCRONIZACIÓN DESCENDENTE (Supabase → Device)
├─ Obtener timestamp de última sincronización
├─ GET /api/sync/download?since={timestamp}&tenant_id={id}
├─ Recibir cambios desde el servidor
├─ Para cada cambio:
│  ├─ Verificar si existe localmente
│  ├─ Comparar version_vectors
│  ├─ Resolver conflictos si existen
│  ├─ Aplicar cambio en IndexedDB
│  ├─ Actualizar version_vector
│  └─ Registrar en audit_log
├─ Procesar eliminaciones
└─ Actualizar timestamp de última sincronización

FASE 4: VERIFICACIÓN DE INTEGRIDAD
├─ Recalcular checksums de registros críticos
├─ Verificar integridad referencial
├─ Detectar inconsistencias
├─ Intentar corrección automática
└─ Registrar problemas en audit_log

FASE 5: LIMPIEZA
├─ Eliminar registros sincronizados de sync_queue
├─ Limpiar change_logs antiguos (> 30 días)
├─ Limpiar LocalStorage (mantener solo últimos 100)
├─ Optimizar índices de IndexedDB
└─ Liberar memoria

FASE 6: NOTIFICACIÓN AL USUARIO
├─ Mostrar resumen de sincronización:
│  ├─ X pagos sincronizados
│  ├─ Y registros actualizados
│  ├─ Z conflictos resueltos
│  └─ Timestamp de sincronización
├─ Actualizar indicadores visuales
├─ Mostrar notificación si hubo problemas
└─ Programar próxima sincronización

TIEMPO TOTAL: 5-60 segundos (según cantidad de datos)
```

### 14.3 Flujo de Recuperación ante Fallos

```
ESCENARIO: IndexedDB corrupto o inaccesible

PASO 1: DETECCIÓN
├─ Intentar abrir IndexedDB
├─ Error detectado
├─ Registrar en console y Sentry
└─ Iniciar proceso de recuperación

PASO 2: INTENTAR REPARACIÓN
├─ Cerrar todas las conexiones a IndexedDB
├─ Intentar eliminar y recrear base de datos
├─ Si exitoso, continuar a PASO 3
└─ Si falla, continuar a PASO 3

PASO 3: RESTAURAR DESDE CAPA 2 (LocalStorage)
├─ Obtener datos críticos de LocalStorage
├─ Últimos 100 pagos
├─ Operaciones pendientes
├─ Checksums
├─ Recrear estructura en IndexedDB
├─ Insertar datos recuperados
└─ Si exitoso, continuar a PASO 5

PASO 4: RESTAURAR DESDE CAPA 3 (Cache API)
├─ Obtener snapshot diario de Cache API
├─ Deserializar datos
├─ Recrear estructura en IndexedDB
├─ Insertar datos recuperados
└─ Si exitoso, continuar a PASO 5

PASO 5: SINCRONIZAR DESDE SUPABASE
├─ Forzar sincronización completa
├─ Descargar todos los datos del tenant
├─ Aplicar localmente
├─ Verificar integridad
└─ Marcar como recuperado

PASO 6: VERIFICACIÓN
├─ Verificar que IndexedDB funciona
├─ Verificar integridad de datos
├─ Recalcular checksums
├─ Verificar relaciones
└─ Generar reporte de recuperación

PASO 7: NOTIFICAR AL USUARIO
├─ Mostrar mensaje de recuperación exitosa
├─ Explicar qué pasó
├─ Indicar si se perdieron datos
├─ Sugerir sincronización manual
└─ Registrar incidente en audit_log

PASO 8: MONITOREO POST-RECUPERACIÓN
├─ Monitorear estabilidad por 24 horas
├─ Verificar integridad cada hora
├─ Alertar si vuelve a fallar
└─ Enviar reporte a Sentry

TASA DE ÉXITO ESPERADA: > 99.9%
```

---

## 15. CONSIDERACIONES DE IMPLEMENTACIÓN

### 15.1 Fases de Desarrollo

**FASE 1: MVP (4-6 semanas)**

```
Semana 1-2: Setup y Estructura Base
- Configurar proyecto Svelte + Vite
- Configurar Supabase
- Implementar autenticación
- Estructura de rutas básica
- Diseño de UI base con Tailwind

Semana 3-4: Funcionalidad Core
- Implementar IndexedDB con Dexie
- CRUD de clientes
- CRUD de créditos
- Formulario de pagos
- Cálculos de saldos

Semana 5-6: Offline y Sincronización
- Service Worker básico
- Sincronización simple
- Auto-guardado
- Testing básico
- Deploy a Vercel

Entregables:
- PWA funcional offline
- Registro de pagos
- Sincronización básica
- Desplegado en producción
```

**FASE 2: Mejoras (4-6 semanas)**

```
Semana 7-8: Sincronización Avanzada
- Sincronización diferencial
- Resolución de conflictos (CRDT)
- Background Sync API
- Priorización de operaciones

Semana 9-10: Confiabilidad
- Almacenamiento redundante (3 capas)
- Logs de auditoría
- Checksums y validación
- Recuperación automática

Semana 11-12: UX y Performance
- Optimizaciones de performance
- Pre-carga inteligente
- Indicadores visuales mejorados
- Testing exhaustivo

Entregables:
- Sistema de sincronización robusto
- Confiabilidad máxima
- Performance optimizada
```

**FASE 3: Funcionalidades Avanzadas (4-6 semanas)**

```
Semana 13-14: Reportes y Analytics
- Dashboard de métricas
- Reportes de cobranza
- Gráficos y estadísticas
- Exportación de datos

Semana 15-16: Administración
- Panel de administración
- Gestión de usuarios
- Gestión de rutas
- Configuración avanzada

Semana 17-18: Refinamiento
- Testing exhaustivo
- Corrección de bugs
- Optimizaciones finales
- Documentación

Entregables:
- Sistema completo
- Documentación
- Listo para producción a escala
```

### 15.2 Equipo Recomendado

```
ROLES:

1. Frontend Developer (Svelte)
   - Implementar UI
   - Componentes reutilizables
   - Integración con IndexedDB
   - Optimizaciones de performance

2. Backend Developer (Supabase/PostgreSQL)
   - Configurar Supabase
   - Políticas RLS
   - Edge Functions si necesario
   - Optimización de queries

3. DevOps/Deploy
   - Configurar Vercel
   - CI/CD
   - Monitoreo
   - Backups

4. QA/Testing
   - Testing manual
   - Testing automatizado
   - Testing en dispositivos reales
   - Reportes de bugs

OPCIONAL:
- UI/UX Designer
- Product Manager
- Technical Writer (documentación)
```

### 15.3 Costos Estimados

```
DESARROLLO:
- MVP (6 semanas): $15,000 - $25,000
- Mejoras (6 semanas): $15,000 - $25,000
- Avanzado (6 semanas): $15,000 - $25,000
Total: $45,000 - $75,000

INFRAESTRUCTURA MENSUAL:
- Vercel: $0 (plan gratuito suficiente para empezar)
- Supabase: $0-25 (según escala)
- Sentry: $0-26 (según volumen)
- Dominio: $10-15/año
Total: $0-50/mes para empezar

ESCALAMIENTO (1000+ usuarios):
- Vercel Pro: $20/mes
- Supabase Pro: $25/mes
- Sentry Team: $26/mes
- CDN adicional: $0-50/mes
Total: $71-121/mes
```

### 15.4 Métricas de Éxito

```
TÉCNICAS:
- Tiempo de carga inicial: < 2 segundos
- Tiempo de respuesta de formularios: < 300ms
- Tasa de éxito de sincronización: > 99%
- Uptime: > 99.9%
- Pérdida de datos: 0%

NEGOCIO:
- Adopción por cobradores: > 80%
- Satisfacción de usuarios: > 4/5
- Reducción de errores de captura: > 50%
- Tiempo de cobranza reducido: > 30%
- ROI: Positivo en 6 meses
```

---

## CONCLUSIÓN

Este documento especifica una **PWA offline-first moderna y robusta** para gestión de microcréditos,
utilizando:

- **Svelte** para UI reactiva y performante
- **Vercel** para hosting y CDN global
- **Supabase** como respaldo en la nube
- **IndexedDB** como fuente de verdad local
- **CRDT** para resolución de conflictos
- **Almacenamiento redundante** para confiabilidad máxima
- **Sincronización inteligente** para eficiencia

La arquitectura propuesta **mejora significativamente sobre Enketo** en:

- Modelo de datos relacional vs XML
- Sincronización diferencial vs completa
- Resolución automática de conflictos
- Almacenamiento redundante multi-capa
- Logs de auditoría inmutables
- Validación multi-nivel
- Performance optimizada para dispositivos modernos

**La PWA es la fuente de verdad**, con toda la lógica de negocio en el cliente, garantizando
funcionamiento completo offline y cero pérdida de datos.

---

**Documento creado**: Diciembre 2024  
**Versión**: 1.0  
**Stack**: Svelte + Vercel + Supabase  
**Target**: Dispositivos 2022+ (Android 10+, iOS 14+)
