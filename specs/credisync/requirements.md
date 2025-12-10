# Requirements Document
# PWA Offline-First para Gestión de Microcréditos

## Introduction

Este documento especifica los requisitos para una Progressive Web App (PWA) offline-first diseñada para la gestión de microcréditos y cobranza en campo. La aplicación permitirá a cobradores registrar pagos, consultar información de clientes y créditos, y sincronizar datos con el servidor cuando haya conexión disponible. El sistema está optimizado para dispositivos modernos (2022+) y garantiza cero pérdida de datos mediante almacenamiento redundante y sincronización inteligente.

## Glossary

- **PWA (Progressive Web App)**: Aplicación web que funciona como aplicación nativa, con capacidad offline completa
- **Offline-First**: Arquitectura donde la aplicación funciona completamente sin conexión y sincroniza cuando hay conectividad
- **IndexedDB**: Base de datos del navegador para almacenamiento estructurado persistente
- **Service Worker**: Script que se ejecuta en segundo plano para interceptar requests y cachear recursos
- **CRDT (Conflict-free Replicated Data Type)**: Estructura de datos que resuelve conflictos automáticamente sin coordinación central
- **Tenant**: Organización o empresa que usa el sistema (multi-tenancy)
- **Cobrador**: Usuario que realiza cobranza en campo
- **Crédito**: Préstamo otorgado a un cliente
- **Cuota**: Pago programado de un crédito
- **Pago**: Transacción de cobro realizada por un cobrador
- **Sincronización**: Proceso de enviar y recibir datos entre dispositivo y servidor
- **Checksum**: Hash criptográfico para verificar integridad de datos
- **Version Vector**: Estructura para rastrear versiones de datos en sistemas distribuidos
- **Supabase**: Plataforma backend-as-a-service basada en PostgreSQL
- **Dexie.js**: Biblioteca wrapper para IndexedDB con API simplificada
- **Background Sync**: API del navegador para sincronización en segundo plano

## Requirements

### Requirement 1: Autenticación y Gestión de Sesión

**User Story:** Como cobrador, quiero iniciar sesión de forma segura en la aplicación, para que solo yo pueda acceder a los datos de mi organización y realizar operaciones de cobranza.

#### Acceptance Criteria

1. WHEN un cobrador ingresa credenciales válidas, THE Sistema SHALL autenticar al usuario mediante Supabase Auth y generar un JWT token
2. WHEN el JWT token expira, THE Sistema SHALL renovar el token automáticamente sin interrumpir la sesión del usuario
3. WHEN un cobrador cierra sesión, THE Sistema SHALL eliminar el token de memoria y limpiar datos sensibles del almacenamiento local
4. WHEN un cobrador intenta acceder sin autenticación, THE Sistema SHALL redirigir a la página de login
5. THE Sistema SHALL almacenar el JWT token solo en memoria durante la sesión activa

### Requirement 2: Almacenamiento Local Persistente

**User Story:** Como cobrador, quiero que todos mis datos estén disponibles localmente en mi dispositivo, para que pueda trabajar completamente sin conexión a internet.

#### Acceptance Criteria

1. THE Sistema SHALL almacenar todos los datos de negocio en IndexedDB como almacenamiento principal
2. THE Sistema SHALL mantener una copia de respaldo de operaciones críticas en LocalStorage
3. THE Sistema SHALL mantener un snapshot diario de datos críticos en Cache API del Service Worker
4. WHEN se guarda un pago, THE Sistema SHALL escribir simultáneamente en las tres capas de almacenamiento
5. WHEN IndexedDB falla, THE Sistema SHALL recuperar datos automáticamente desde LocalStorage o Cache API
6. THE Sistema SHALL verificar integridad de datos mediante checksums SHA-256 en cada operación crítica
7. THE Sistema SHALL mantener índices optimizados en IndexedDB para consultas por tenant_id, cobrador_id, fecha y estado

### Requirement 3: Registro de Pagos Offline

**User Story:** Como cobrador, quiero registrar pagos de clientes incluso sin conexión, para que no pierda tiempo esperando señal y pueda cobrar en cualquier ubicación.

#### Acceptance Criteria

1. WHEN un cobrador registra un pago, THE Sistema SHALL generar un UUID único localmente para el pago
2. WHEN un cobrador registra un pago, THE Sistema SHALL capturar automáticamente la ubicación GPS del dispositivo
3. WHEN un cobrador registra un pago, THE Sistema SHALL calcular el nuevo saldo del crédito localmente
4. WHEN un cobrador registra un pago, THE Sistema SHALL actualizar las cuotas afectadas automáticamente
5. WHEN un cobrador registra un pago, THE Sistema SHALL guardar el pago en las tres capas de almacenamiento antes de confirmar al usuario
6. WHEN un cobrador registra un pago, THE Sistema SHALL calcular un checksum SHA-256 del pago para verificación de integridad
7. WHEN un cobrador registra un pago, THE Sistema SHALL agregar el pago a la cola de sincronización con prioridad máxima
8. THE Sistema SHALL completar el registro de un pago en menos de 500 milisegundos en dispositivos modernos
9. WHEN un cobrador intenta registrar un pago duplicado, THE Sistema SHALL detectar y prevenir la duplicación basándose en monto, cliente y timestamp

### Requirement 4: Auto-guardado Continuo

**User Story:** Como cobrador, quiero que mis datos se guarden automáticamente mientras completo formularios, para que no pierda información si la aplicación se cierra inesperadamente.

#### Acceptance Criteria

1. WHEN un cobrador modifica un formulario, THE Sistema SHALL auto-guardar los cambios cada 3 segundos
2. WHEN un cobrador cierra la aplicación con un formulario incompleto, THE Sistema SHALL preservar el estado del formulario
3. WHEN un cobrador reabre la aplicación, THE Sistema SHALL ofrecer recuperar formularios auto-guardados
4. THE Sistema SHALL mantener múltiples slots de auto-guardado por tipo de formulario
5. WHEN un cobrador completa y guarda un formulario, THE Sistema SHALL eliminar el auto-guardado correspondiente

### Requirement 5: Sincronización Bidireccional Inteligente

**User Story:** Como cobrador, quiero que mis datos se sincronicen automáticamente con el servidor cuando haya conexión, para que la información esté actualizada en todos los dispositivos.

#### Acceptance Criteria

1. WHEN el dispositivo detecta conexión a internet, THE Sistema SHALL iniciar sincronización automática de operaciones pendientes
2. THE Sistema SHALL sincronizar operaciones en orden de prioridad: pagos primero, luego créditos, luego clientes
3. THE Sistema SHALL enviar solo los cambios (deltas) en lugar de registros completos para optimizar ancho de banda
4. WHEN la sincronización ascendente es exitosa, THE Sistema SHALL marcar las operaciones como sincronizadas
5. WHEN la sincronización descendente recibe cambios, THE Sistema SHALL aplicar los cambios localmente y resolver conflictos automáticamente
6. THE Sistema SHALL comprimir datos con gzip antes de enviar para reducir uso de ancho de banda
7. THE Sistema SHALL agrupar múltiples operaciones en lotes de máximo 100 registros por request
8. WHEN la sincronización falla, THE Sistema SHALL aplicar backoff exponencial con máximo de 5 minutos entre reintentos
9. THE Sistema SHALL usar Background Sync API cuando esté disponible para sincronizar incluso con la app cerrada

### Requirement 6: Resolución Automática de Conflictos

**User Story:** Como administrador del sistema, quiero que los conflictos de edición concurrente se resuelvan automáticamente, para que múltiples cobradores puedan trabajar offline sin perder datos.

#### Acceptance Criteria

1. WHEN dos cobradores editan el mismo cliente offline, THE Sistema SHALL resolver el conflicto usando CRDT con vectores de versión
2. WHEN hay conflicto en un campo específico, THE Sistema SHALL usar el valor con timestamp más reciente
3. WHEN dos cobradores editan campos diferentes del mismo registro, THE Sistema SHALL hacer merge automático de ambos cambios
4. THE Sistema SHALL registrar todos los conflictos detectados en el audit log con detalles completos
5. WHEN un registro es eliminado en un dispositivo y editado en otro, THE Sistema SHALL dar prioridad a la eliminación
6. THE Sistema SHALL mantener vectores de versión por dispositivo para cada registro editable
7. THE Sistema SHALL garantizar que los pagos nunca tengan conflictos mediante operaciones append-only

### Requirement 7: Validación Multi-nivel de Datos

**User Story:** Como administrador del sistema, quiero que los datos sean validados en múltiples niveles, para garantizar integridad y detectar errores tempranamente.

#### Acceptance Criteria

1. WHEN un cobrador ingresa datos en un formulario, THE Sistema SHALL validar en tiempo real usando esquemas Zod
2. WHEN un cobrador intenta guardar un registro, THE Sistema SHALL validar reglas de negocio antes de escribir en IndexedDB
3. WHEN un registro es guardado, THE Sistema SHALL verificar integridad referencial y recalcular campos derivados
4. THE Sistema SHALL ejecutar verificación de integridad en background cada 5 minutos
5. WHEN se detecta inconsistencia de datos, THE Sistema SHALL intentar corrección automática y registrar el incidente
6. THE Sistema SHALL validar checksums de registros críticos antes de sincronizar con el servidor
7. WHEN la validación falla en cualquier nivel, THE Sistema SHALL registrar el error en audit log con contexto completo

### Requirement 8: Logs de Auditoría Inmutables

**User Story:** Como auditor, quiero un registro completo e inmutable de todas las operaciones, para poder rastrear cualquier transacción y detectar fraudes.

#### Acceptance Criteria

1. THE Sistema SHALL registrar cada operación crítica como un evento en el audit log
2. THE Sistema SHALL incluir en cada evento: timestamp, user_id, device_id, tipo de evento, datos completos y metadata
3. THE Sistema SHALL calcular un hash SHA-256 de cada evento concatenado con el hash del evento anterior
4. THE Sistema SHALL garantizar que los eventos nunca se modifiquen o eliminen del audit log
5. WHEN se detecta un patrón sospechoso, THE Sistema SHALL generar una alerta automática
6. THE Sistema SHALL sincronizar el audit log con prioridad máxima incluso si otras sincronizaciones fallan
7. THE Sistema SHALL permitir reconstruir el estado de cualquier registro en cualquier punto del tiempo desde el audit log

### Requirement 9: Funcionamiento Offline Completo

**User Story:** Como cobrador, quiero que la aplicación funcione completamente sin conexión a internet, para poder trabajar en zonas rurales sin cobertura.

#### Acceptance Criteria

1. THE Sistema SHALL cachear todos los assets estáticos mediante Service Worker para permitir lanzamiento offline
2. THE Sistema SHALL pre-cargar todos los clientes de la ruta asignada al cobrador al iniciar sesión
3. THE Sistema SHALL pre-cargar todos los créditos activos y cuotas pendientes de esos clientes
4. THE Sistema SHALL permitir registrar pagos, crear clientes y actualizar información completamente offline
5. WHEN el dispositivo está offline, THE Sistema SHALL mostrar un indicador visual claro del estado de conexión
6. WHEN el dispositivo está offline, THE Sistema SHALL mostrar el número de operaciones pendientes de sincronización
7. THE Sistema SHALL funcionar por tiempo indefinido sin conexión sin pérdida de funcionalidad

### Requirement 10: Pre-carga Inteligente de Datos

**User Story:** Como cobrador, quiero que los datos que probablemente necesitaré estén disponibles antes de solicitarlos, para tener una experiencia fluida incluso offline.

#### Acceptance Criteria

1. WHEN un cobrador inicia sesión, THE Sistema SHALL descargar automáticamente todos los datos de su ruta asignada
2. WHEN el dispositivo detecta ubicación GPS, THE Sistema SHALL pre-cargar clientes en un radio de 5 kilómetros con prioridad
3. WHEN el dispositivo está conectado a WiFi y cargando, THE Sistema SHALL descargar todos los datos del tenant en background
4. THE Sistema SHALL analizar patrones de uso del cobrador para predecir qué clientes visitará
5. WHEN el espacio de almacenamiento es limitado, THE Sistema SHALL mantener solo datos de ruta actual y últimos 7 días

### Requirement 11: Gestión de Clientes

**User Story:** Como cobrador, quiero gestionar información completa de mis clientes, para mantener datos actualizados y facilitar la cobranza.

#### Acceptance Criteria

1. WHEN un cobrador crea un cliente, THE Sistema SHALL validar que el número de documento no esté duplicado
2. WHEN un cobrador crea un cliente, THE Sistema SHALL capturar automáticamente la ubicación GPS
3. THE Sistema SHALL permitir buscar clientes por nombre, documento o teléfono con resultados instantáneos desde IndexedDB
4. THE Sistema SHALL calcular automáticamente créditos activos, saldo total y días de atraso máximo para cada cliente
5. WHEN un cobrador edita un cliente, THE Sistema SHALL mantener el historial de cambios con timestamps y user_id
6. THE Sistema SHALL permitir asignar clientes a rutas específicas
7. THE Sistema SHALL permitir marcar clientes como activos, inactivos o bloqueados

### Requirement 12: Gestión de Créditos

**User Story:** Como cobrador, quiero gestionar créditos de clientes, para registrar préstamos y dar seguimiento a pagos.

#### Acceptance Criteria

1. WHEN un cobrador crea un crédito, THE Sistema SHALL calcular automáticamente el total a pagar basado en monto e interés
2. WHEN un cobrador crea un crédito, THE Sistema SHALL generar automáticamente el calendario de cuotas
3. THE Sistema SHALL calcular el valor de cada cuota dividiendo el total entre el número de cuotas
4. WHEN el crédito tiene frecuencia diaria y excluir domingos activo, THE Sistema SHALL omitir domingos en el calendario
5. THE Sistema SHALL calcular automáticamente días de atraso comparando fecha actual con fechas programadas de cuotas
6. THE Sistema SHALL actualizar el saldo pendiente automáticamente cuando se registra un pago
7. THE Sistema SHALL permitir consultar el historial completo de pagos de un crédito

### Requirement 13: Cálculos Locales de Negocio

**User Story:** Como desarrollador del sistema, quiero que todos los cálculos de negocio se realicen localmente, para que la PWA sea la fuente de verdad y no dependa del servidor.

#### Acceptance Criteria

1. THE Sistema SHALL calcular saldos pendientes de créditos sumando pagos localmente
2. THE Sistema SHALL calcular días de atraso comparando fechas localmente sin consultar al servidor
3. THE Sistema SHALL calcular intereses y totales a pagar usando fórmulas implementadas en el cliente
4. THE Sistema SHALL actualizar contadores de créditos activos y saldos totales de clientes localmente
5. THE Sistema SHALL generar calendarios de cuotas con todas las reglas de negocio implementadas en el cliente
6. THE Sistema SHALL validar capacidad de pago y límites de crédito usando lógica local
7. THE Sistema SHALL recalcular todos los campos derivados después de cada operación que los afecte

### Requirement 14: Interfaz de Usuario Responsiva

**User Story:** Como cobrador, quiero una interfaz clara y fácil de usar en mi dispositivo móvil, para poder trabajar eficientemente en campo.

#### Acceptance Criteria

1. THE Sistema SHALL ser completamente responsivo y funcionar en pantallas desde 320px de ancho
2. THE Sistema SHALL usar componentes táctiles con áreas de toque mínimas de 44x44 píxeles
3. THE Sistema SHALL mostrar indicadores visuales claros del estado de sincronización
4. THE Sistema SHALL mostrar el número de operaciones pendientes de sincronización en todo momento
5. WHEN una operación está en progreso, THE Sistema SHALL mostrar un indicador de carga
6. THE Sistema SHALL usar colores y iconos consistentes para estados (activo, pendiente, sincronizado, error)
7. THE Sistema SHALL proporcionar feedback visual inmediato para todas las acciones del usuario

### Requirement 15: Captura de Geolocalización

**User Story:** Como administrador, quiero que todos los pagos incluyan la ubicación GPS donde se realizaron, para verificar que los cobradores visiten a los clientes.

#### Acceptance Criteria

1. WHEN un cobrador registra un pago, THE Sistema SHALL solicitar permisos de geolocalización si no están otorgados
2. WHEN un cobrador registra un pago, THE Sistema SHALL capturar latitud y longitud con precisión disponible
3. THE Sistema SHALL mostrar la ubicación capturada en un mapa para confirmación visual
4. WHEN la geolocalización no está disponible, THE Sistema SHALL permitir continuar pero marcar el pago como sin ubicación
5. THE Sistema SHALL almacenar coordenadas GPS con cada pago para auditoría
6. THE Sistema SHALL detectar ubicaciones imposibles (movimiento muy rápido entre pagos) y generar alertas

### Requirement 16: Manejo de Archivos Multimedia

**User Story:** Como cobrador, quiero adjuntar fotos de comprobantes a los pagos, para tener evidencia de las transacciones.

#### Acceptance Criteria

1. THE Sistema SHALL permitir capturar fotos desde la cámara del dispositivo
2. THE Sistema SHALL permitir seleccionar fotos desde la galería del dispositivo
3. THE Sistema SHALL comprimir fotos automáticamente antes de guardar para optimizar almacenamiento
4. THE Sistema SHALL almacenar fotos como Blobs en IndexedDB
5. WHEN hay conexión, THE Sistema SHALL subir fotos a Supabase Storage
6. THE Sistema SHALL mostrar preview de fotos antes de guardar
7. THE Sistema SHALL permitir eliminar fotos adjuntas antes de sincronizar

### Requirement 17: Seguridad y Encriptación

**User Story:** Como administrador de seguridad, quiero que los datos sensibles estén encriptados, para cumplir con regulaciones de protección de datos financieros.

#### Acceptance Criteria

1. THE Sistema SHALL encriptar campos sensibles usando Web Crypto API con AES-256-GCM
2. THE Sistema SHALL encriptar números de documento, teléfonos y datos personales de clientes
3. THE Sistema SHALL derivar la clave de encriptación del PIN del usuario usando PBKDF2 con 100,000 iteraciones
4. THE Sistema SHALL mantener la clave de encriptación solo en memoria durante la sesión activa
5. WHEN un usuario cierra sesión, THE Sistema SHALL limpiar la clave de encriptación de la memoria
6. THE Sistema SHALL usar HTTPS para todas las comunicaciones con el servidor
7. THE Sistema SHALL implementar Row Level Security en Supabase para multi-tenancy

### Requirement 18: Performance y Optimización

**User Story:** Como cobrador, quiero que la aplicación sea rápida y fluida, para poder trabajar eficientemente sin esperas.

#### Acceptance Criteria

1. THE Sistema SHALL cargar la interfaz inicial en menos de 2 segundos en dispositivos modernos
2. THE Sistema SHALL responder a interacciones del usuario en menos de 300 milisegundos
3. THE Sistema SHALL usar virtual scrolling para listas con más de 50 elementos
4. THE Sistema SHALL implementar debouncing en búsquedas con delay de 300 milisegundos
5. THE Sistema SHALL usar code splitting para cargar solo el código necesario por ruta
6. THE Sistema SHALL comprimir assets estáticos con Brotli o Gzip
7. THE Sistema SHALL optimizar consultas a IndexedDB usando índices apropiados

### Requirement 19: Recuperación ante Fallos

**User Story:** Como cobrador, quiero que la aplicación se recupere automáticamente de errores, para no perder datos ni tiempo resolviendo problemas técnicos.

#### Acceptance Criteria

1. WHEN IndexedDB falla, THE Sistema SHALL intentar recuperación automática desde LocalStorage
2. WHEN LocalStorage falla, THE Sistema SHALL intentar recuperación desde Cache API
3. WHEN todas las capas de almacenamiento fallan, THE Sistema SHALL forzar sincronización completa desde Supabase
4. THE Sistema SHALL verificar integridad de datos al iniciar y reparar inconsistencias automáticamente
5. WHEN se detecta corrupción de datos, THE Sistema SHALL registrar el incidente en Sentry y audit log
6. THE Sistema SHALL mostrar mensajes de error claros al usuario con acciones sugeridas
7. THE Sistema SHALL mantener la aplicación funcional incluso con errores parciales

### Requirement 20: Monitoreo y Observabilidad

**User Story:** Como desarrollador, quiero monitorear el comportamiento de la aplicación en producción, para detectar y resolver problemas proactivamente.

#### Acceptance Criteria

1. THE Sistema SHALL integrar Sentry para captura automática de errores
2. THE Sistema SHALL enviar métricas de performance a Sentry (tiempo de carga, tiempo de respuesta)
3. THE Sistema SHALL registrar eventos críticos en el audit log local
4. THE Sistema SHALL enviar logs de errores al servidor cuando hay conexión
5. THE Sistema SHALL incluir contexto completo en reportes de error (user_id, device_id, app_version, stack trace)
6. THE Sistema SHALL filtrar información sensible de logs antes de enviar al servidor
7. THE Sistema SHALL permitir habilitar modo debug para troubleshooting en campo

