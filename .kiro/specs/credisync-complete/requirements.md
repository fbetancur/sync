# Requirements Document - CrediSync Complete Rebuild

## Introduction

CrediSync es una aplicación completa de gestión de microcréditos offline-first que debe ser reconstruida desde cero usando SvelteKit, reutilizando la interfaz y experiencia de usuario de la app de referencia (`tools/examples/src/`), pero implementada 100% sobre la arquitectura empresarial del monorepo Sync Platform (@sync/core, @sync/types, @sync/ui).

La aplicación debe seguir el flujo de usuario completo: Login → Dashboard/Ruta → Gestión de Clientes → Gestión de Créditos → Registro de Pagos → Sincronización, con pruebas exhaustivas en cada fase.

## Glossary

- **CrediSync**: Aplicación completa de gestión de microcréditos offline-first
- **App_de_Referencia**: Aplicación ubicada en `tools/examples/src/` con UI/UX a reutilizar
- **Sync_Platform**: Infraestructura empresarial del monorepo (@sync/core, @sync/types, @sync/ui)
- **SvelteKit**: Framework moderno de Svelte para aplicaciones web
- **Usuario_Cobrador**: Usuario que gestiona clientes y cobra cuotas en campo
- **Cliente**: Persona que recibe microcréditos
- **Credito**: Préstamo otorgado a un cliente con cuotas programadas
- **Cuota**: Pago programado de un crédito con fecha y monto específico
- **Pago**: Registro de dinero recibido de un cliente
- **Ruta**: Lista priorizada de clientes para visitar en el día
- **Offline_First**: Funciona sin conexión, sincroniza cuando hay internet
- **Sync_Inteligente**: Sincronización automática que pausa durante actividad del usuario

## Requirements

### Requirement 1: Autenticación y Seguridad

**User Story:** Como Usuario_Cobrador, quiero iniciar sesión en CrediSync de forma segura, para acceder a la aplicación y comenzar mi trabajo de campo con garantías de seguridad empresarial.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador accede a localhost:5173, THEN CrediSync SHALL mostrar página de login idéntica a App_de_Referencia
2. WHEN Usuario_Cobrador ingresa credenciales válidas, THEN Sync_Platform SHALL autenticar usando @sync/core y redirigir a ruta principal
3. WHEN Usuario_Cobrador ingresa credenciales inválidas, THEN CrediSync SHALL mostrar mensaje de error sin redirigir
4. WHEN Usuario_Cobrador está autenticado, THEN Sync_Platform SHALL mantener sesión usando @sync/core hasta logout manual
5. WHERE Usuario_Cobrador selecciona "Crear cuenta", THEN CrediSync SHALL permitir registro usando @sync/core
6. WHEN Usuario_Cobrador cierra sesión, THEN Sync_Platform SHALL limpiar datos de sesión y redirigir a login

### Requirement 2: Dashboard y Ruta Principal

**User Story:** Como Usuario_Cobrador, quiero ver mi ruta del día con estadísticas y lista priorizada de clientes, para organizar eficientemente mi trabajo de cobranza.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador accede después de login, THEN CrediSync SHALL mostrar página de ruta idéntica a App_de_Referencia
2. WHEN página de ruta se carga, THEN CrediSync SHALL mostrar estadísticas del día calculadas desde @sync/core
3. WHEN página de ruta se carga, THEN CrediSync SHALL mostrar lista de clientes ordenada por prioridad (mora primero)
4. WHEN Usuario_Cobrador busca cliente, THEN CrediSync SHALL filtrar lista en tiempo real con debounce de 200ms
5. WHEN Usuario_Cobrador selecciona cliente, THEN CrediSync SHALL mostrar opciones de cobro y ver detalles
6. WHEN datos cambian por sync, THEN CrediSync SHALL actualizar vista automáticamente preservando scroll

### Requirement 3: Gestión de Clientes

**User Story:** Como Usuario_Cobrador, quiero gestionar clientes (crear, ver, editar), para mantener información actualizada y accesible offline.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador accede a sección clientes, THEN CrediSync SHALL mostrar lista de clientes idéntica a App_de_Referencia
2. WHEN Usuario_Cobrador crea nuevo cliente, THEN Sync_Platform SHALL guardar usando @sync/core offline-first
3. WHEN cliente se guarda offline, THEN Sync_Platform SHALL sincronizar automáticamente cuando hay conexión
4. WHEN Usuario_Cobrador busca cliente, THEN CrediSync SHALL filtrar por nombre, documento o teléfono con debounce
5. WHEN Usuario_Cobrador ve detalle de cliente, THEN CrediSync SHALL mostrar información completa y créditos activos
6. WHEN datos de cliente se sincronizan, THEN CrediSync SHALL actualizar vista sin perder posición de scroll

### Requirement 4: Gestión de Créditos

**User Story:** Como Usuario_Cobrador, quiero otorgar créditos a clientes con cálculo automático de cuotas, para gestionar préstamos de forma precisa y offline.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador otorga crédito, THEN Sync_Platform SHALL calcular cuotas usando @sync/core
2. WHEN crédito se crea, THEN Sync_Platform SHALL generar cuotas programadas con fechas y montos correctos
3. WHEN crédito se guarda offline, THEN Sync_Platform SHALL sincronizar automáticamente cuando hay conexión
4. WHEN Usuario_Cobrador ve créditos de cliente, THEN CrediSync SHALL mostrar estado actual y cuotas pendientes
5. WHEN cuotas se calculan, THEN Sync_Platform SHALL aplicar tasas de interés y comisiones correctamente
6. WHEN crédito se sincroniza, THEN Sync_Platform SHALL mantener integridad de datos y resolver conflictos

### Requirement 5: Registro de Pagos

**User Story:** Como Usuario_Cobrador, quiero registrar pagos de clientes con distribución automática entre créditos, para manejar cobranza de forma inteligente y offline.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador registra pago, THEN CrediSync SHALL mostrar modal de cobro idéntico a App_de_Referencia
2. WHEN Usuario_Cobrador ingresa monto, THEN CrediSync SHALL calcular distribución proporcional entre créditos automáticamente
3. WHEN pago se registra, THEN Sync_Platform SHALL actualizar estados de cuotas y créditos usando @sync/core
4. WHEN pago se guarda offline, THEN Sync_Platform SHALL sincronizar automáticamente cuando hay conexión
5. WHEN distribución se calcula, THEN CrediSync SHALL mostrar preview detallado antes de confirmar
6. WHEN pago se confirma, THEN Sync_Platform SHALL actualizar campos calculados de cliente automáticamente

### Requirement 6: Modal de Cobro Inteligente

**User Story:** Como Usuario_Cobrador, quiero un modal inteligente para cobros que distribuya pagos automáticamente, para manejar múltiples créditos de forma eficiente.

#### Acceptance Criteria

1. WHEN modal de cobro se abre, THEN CrediSync SHALL mostrar todos los créditos del cliente con adeudos
2. WHEN Usuario_Cobrador ingresa monto, THEN CrediSync SHALL calcular distribución proporcional en tiempo real
3. WHEN Usuario_Cobrador selecciona créditos específicos, THEN CrediSync SHALL recalcular distribución automáticamente
4. WHEN distribución se calcula, THEN CrediSync SHALL mostrar preview detallado por crédito
5. WHEN pago es completo, THEN CrediSync SHALL indicar visualmente que liquida todas las cuotas atrasadas
6. WHEN pago se confirma, THEN Sync_Platform SHALL registrar transacciones usando @sync/core

### Requirement 7: Sincronización Inteligente

**User Story:** Como Usuario_Cobrador, quiero sincronización automática e inteligente que no interfiera con mi trabajo, para mantener datos actualizados sin interrupciones.

#### Acceptance Criteria

1. WHEN Usuario_Cobrador está inactivo por 50 segundos, THEN Sync_Platform SHALL iniciar sincronización automática
2. WHEN Usuario_Cobrador está activo, THEN Sync_Platform SHALL pausar sincronización para no interferir
3. WHEN conexión se restaura, THEN Sync_Platform SHALL sincronizar automáticamente con prioridad alta
4. WHEN sincronización ocurre, THEN CrediSync SHALL mostrar indicador visual de estado
5. WHEN conflictos se detectan, THEN Sync_Platform SHALL resolver usando estrategias de @sync/core
6. WHEN sincronización completa, THEN CrediSync SHALL actualizar vistas preservando estado de usuario

### Requirement 8: Estados Offline y Conectividad

**User Story:** Como Usuario_Cobrador, quiero que la aplicación funcione completamente offline, para trabajar en campo sin depender de conexión a internet.

#### Acceptance Criteria

1. WHEN no hay conexión, THEN CrediSync SHALL funcionar completamente offline usando @sync/core
2. WHEN datos se modifican offline, THEN Sync_Platform SHALL guardar en cola de sincronización
3. WHEN conexión se restaura, THEN Sync_Platform SHALL sincronizar cola automáticamente
4. WHEN Usuario_Cobrador ve estado de conexión, THEN CrediSync SHALL mostrar indicador visual claro
5. WHEN operaciones fallan por conectividad, THEN CrediSync SHALL permitir retry manual
6. WHEN datos están pendientes de sync, THEN CrediSync SHALL mostrar contador de operaciones pendientes

### Requirement 9: Interfaz de Usuario y Experiencia

**User Story:** Como Usuario_Cobrador, quiero una interfaz idéntica a la App_de_Referencia pero mobile-first, para tener experiencia familiar y optimizada para trabajo en campo.

#### Acceptance Criteria

1. WHEN cualquier página se renderiza, THEN CrediSync SHALL usar diseño idéntico a App_de_Referencia
2. WHEN Usuario_Cobrador navega, THEN CrediSync SHALL usar bottom navigation con 4 secciones principales
3. WHEN Usuario_Cobrador interactúa con elementos, THEN CrediSync SHALL mostrar feedback visual inmediato
4. WHEN pantalla es móvil, THEN CrediSync SHALL optimizar layout para touch y pantallas pequeñas
5. WHEN Usuario_Cobrador hace scroll, THEN CrediSync SHALL preservar posición durante actualizaciones
6. WHEN estados cambian, THEN CrediSync SHALL usar transiciones suaves y loading states apropiados

### Requirement 10: Calidad y Testing

**User Story:** Como desarrollador, quiero tests automatizados completos para cada funcionalidad, para garantizar calidad y funcionamiento correcto en todas las fases.

#### Acceptance Criteria

1. WHEN se ejecutan tests unitarios, THEN CrediSync SHALL validar renderizado y lógica de todos los componentes
2. WHEN se ejecutan tests de integración, THEN CrediSync SHALL validar flujos completos con @sync/core
3. WHEN se ejecutan tests de propiedades, THEN CrediSync SHALL validar correctness properties usando property-based testing
4. WHEN se ejecutan tests de UI, THEN CrediSync SHALL validar responsive design y accesibilidad
5. WHEN se ejecutan tests offline, THEN CrediSync SHALL validar funcionalidad sin conexión
6. WHEN se ejecutan tests de sync, THEN CrediSync SHALL validar sincronización bidireccional con Supabase