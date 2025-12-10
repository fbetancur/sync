# Procedimientos de Rollback - Sync Platform

Esta guía detalla los procedimientos completos de rollback para el monorepo de Sync Platform.

## 📋 Tabla de Contenidos

- [Visión General](#visión-general)
- [Tipos de Rollback](#tipos-de-rollback)
- [Preparación](#preparación)
- [Procedimientos Paso a Paso](#procedimientos-paso-a-paso)
- [Validación Post-Rollback](#validación-post-rollback)
- [Casos de Emergencia](#casos-de-emergencia)

## 🎯 Visión General

Los procedimientos de rollback están diseñados para restaurar el sistema a un estado funcional anterior cuando ocurren problemas críticos. El sistema incluye múltiples niveles de rollback según la severidad del problema.

### Principios de Rollback

1. **Seguridad Primero**: Siempre crear backup antes de rollback
2. **Validación**: Verificar funcionamiento después del rollback
3. **Documentación**: Registrar todos los cambios realizados
4. **Comunicación**: Notificar al equipo sobre rollbacks críticos

## 🔄 Tipos de Rollback

### 1. Rollback de Código (Git)

**Cuándo usar:**
- Bugs críticos en producción
- Funcionalidad rota después de deploy
- Problemas de performance severos

**Alcance:**
- Código fuente
- Configuración
- Dependencias (package.json)

### 2. Rollback de Dependencias

**Cuándo usar:**
- Problemas con nuevas dependencias
- Conflictos de versiones
- Vulnerabilidades de seguridad

**Alcance:**
- node_modules
- pnpm-lock.yaml
- package.json files

### 3. Rollback de Deployment

**Cuándo usar:**
- Deployment falló
- Aplicación no funciona en producción
- Variables de entorno incorrectas

**Alcance:**
- Vercel deployments
- Variables de entorno
- Configuración de build

### 4. Rollback de Base de Datos

**Cuándo usar:**
- Migración de schema falló
- Corrupción de datos
- Pérdida de datos críticos

**Alcance:**
- Schema de IndexedDB
- Datos de usuario
- Configuración de aplicación

## 🛠️ Preparación

### Verificar Estado Actual

```bash
# 1. Verificar estado de Git
git status
git log --oneline -10

# 2. Verificar funcionamiento actual
pnpm validation-complete --dry-run

# 3. Crear snapshot del estado actual
node tools/scripts/rollback.js --list-backups
```

### Crear Backup de Emergencia

```bash
# 1. Backup automático (recomendado)
git checkout -b emergency-backup-$(date +%Y%m%d-%H%M%S)
git checkout -

# 2. O usar script de rollback
node tools/scripts/rollback.js --create-backup emergency-$(date +%Y%m%d)
```

### Notificar al Equipo

```bash
# 1. Crear issue de emergencia
# Título: "ROLLBACK EN PROGRESO - [Descripción breve]"
# Incluir: razón, alcance, tiempo estimado

# 2. Notificar en canales de comunicación
# Slack, Discord, email, etc.
```

## 📝 Procedimientos Paso a Paso

### Rollback Nivel 1: Código (Git Reset)

**Para:** Problemas de código, bugs críticos

```bash
# 1. Identificar commit objetivo
git log --oneline -20
# Buscar último commit estable

# 2. Crear backup
git checkout -b backup-pre-rollback-$(date +%Y%m%d)
git checkout main

# 3. Ejecutar rollback
COMMIT_HASH="abc123"  # Reemplazar con hash real
node tools/scripts/rollback.js --to-commit=$COMMIT_HASH

# 4. Validar resultado
pnpm validation-complete
```

### Rollback Nivel 2: Dependencias

**Para:** Problemas con node_modules, pnpm-lock.yaml

```bash
# 1. Backup del estado actual
cp pnpm-lock.yaml pnpm-lock.yaml.backup
cp package.json package.json.backup

# 2. Rollback a versión anterior de lock file
git checkout HEAD~1 -- pnpm-lock.yaml
# O restaurar desde backup conocido

# 3. Limpiar e instalar
pnpm clean
rm -rf node_modules
pnpm install

# 4. Reconstruir
pnpm build:packages
pnpm build:apps

# 5. Validar
pnpm test
pnpm dev:credisync
```

### Rollback Nivel 3: Deployment

**Para:** Problemas específicos de deployment

```bash
# 1. Rollback en Vercel (Método 1 - Dashboard)
# - Ir a Vercel Dashboard
# - Seleccionar proyecto (credisync)
# - Ir a "Deployments"
# - Encontrar deployment estable anterior
# - Click "Promote to Production"

# 2. Rollback en Vercel (Método 2 - CLI)
vercel --prod --force
# Seleccionar deployment anterior cuando se solicite

# 3. Rollback de variables de entorno
# - Ir a Project Settings > Environment Variables
# - Restaurar valores anteriores desde backup

# 4. Validar deployment
curl -f https://credisync-green.vercel.app/
curl -f https://credisync-green.vercel.app/api/health
```

### Rollback Nivel 4: Completo (Nuclear)

**Para:** Sistema completamente roto, múltiples problemas

```bash
# 1. Rollback a backup completo
node tools/scripts/rollback.js --to-backup=backup-pre-migration

# 2. Si no hay backup, clonar repositorio limpio
git clone https://github.com/fbetancur/sync.git sync-emergency
cd sync-emergency

# 3. Configurar desde cero
cp ../sync/.env.local apps/credisync/.env.local
pnpm install
pnpm build:packages
pnpm build:apps

# 4. Validar funcionamiento completo
pnpm validation-complete

# 5. Re-deploy si es necesario
pnpm build:credisync
# Deploy manual en Vercel
```

## ✅ Validación Post-Rollback

### Checklist de Validación

```bash
# 1. Verificar que Git está en estado limpio
git status
# Debe mostrar "working tree clean"

# 2. Verificar que builds funcionan
pnpm build:packages
pnpm build:apps
# Todos deben completar sin errores

# 3. Ejecutar tests críticos
pnpm test:packages
pnpm test:apps
# Al menos tests básicos deben pasar

# 4. Verificar aplicación en desarrollo
pnpm dev:credisync
# Abrir http://localhost:5173 y verificar funcionalidad básica

# 5. Verificar deployment (si aplica)
curl -f https://credisync-green.vercel.app/
# Debe retornar 200 OK
```

### Validación Automática

```bash
# Usar script de validación completa
pnpm validation-complete

# Verificar métricas de performance
pnpm performance-monitor:build
pnpm bundle-analyzer:credisync

# Generar reporte de estado
pnpm metrics-dashboard:export
```

### Validación Manual

1. **Funcionalidad Básica**
   - Login/logout funciona
   - Navegación entre páginas
   - Operaciones CRUD básicas

2. **Integración**
   - Conexión a Supabase
   - Sincronización offline
   - PWA funciona correctamente

3. **Performance**
   - Tiempo de carga < 3 segundos
   - Navegación fluida
   - Sin errores en consola

## 🚨 Casos de Emergencia

### Emergencia Nivel 1: Producción Caída

**Síntomas:** Aplicación no carga, errores 500, usuarios no pueden acceder

**Acción Inmediata:**
```bash
# 1. Rollback inmediato en Vercel (< 2 minutos)
# Dashboard > Deployments > Previous stable > Promote

# 2. Verificar restauración
curl -f https://credisync-green.vercel.app/

# 3. Notificar restauración
# "RESUELTO: Servicio restaurado a versión anterior"
```

### Emergencia Nivel 2: Corrupción de Datos

**Síntomas:** Datos perdidos, base de datos corrupta, usuarios reportan pérdida de información

**Acción Inmediata:**
```bash
# 1. Detener todos los deployments
# Pausar CI/CD pipelines

# 2. Rollback completo
node tools/scripts/rollback.js --to-backup=backup-pre-migration

# 3. Investigar causa raíz
git log --oneline -20
git diff HEAD~5 HEAD -- "**/*db*" "**/*migration*"

# 4. Comunicar a usuarios
# "Investigando problema de datos, servicio temporalmente en modo anterior"
```

### Emergencia Nivel 3: Vulnerabilidad de Seguridad

**Síntomas:** Vulnerabilidad crítica detectada, posible compromiso de seguridad

**Acción Inmediata:**
```bash
# 1. Rollback inmediato
node tools/scripts/rollback.js --to-commit=<last-secure-commit>

# 2. Auditar dependencias
pnpm audit
pnpm audit --fix

# 3. Verificar logs de acceso
# Revisar logs de Vercel/Supabase

# 4. Notificar incidente de seguridad
# Seguir protocolo de seguridad de la organización
```

## 📊 Monitoreo Post-Rollback

### Métricas a Monitorear

```bash
# 1. Performance
pnpm performance-monitor:all

# 2. Errores en logs
# Revisar Vercel Function Logs
# Revisar Supabase Logs

# 3. Métricas de usuario
# Tiempo de carga
# Tasa de error
# Usuarios activos
```

### Alertas Automáticas

```bash
# Configurar alertas para:
# - Tiempo de respuesta > 5 segundos
# - Tasa de error > 5%
# - Build failures
# - Test failures
```

## 📝 Documentación Post-Rollback

### Reporte de Incidente

```markdown
# Reporte de Rollback - [Fecha]

## Resumen
- **Fecha/Hora:** [timestamp]
- **Duración:** [tiempo total]
- **Tipo:** [Nivel 1-4]
- **Causa:** [descripción breve]

## Cronología
- [HH:MM] Problema detectado
- [HH:MM] Rollback iniciado
- [HH:MM] Rollback completado
- [HH:MM] Validación completada
- [HH:MM] Servicio restaurado

## Acciones Tomadas
1. [Acción 1]
2. [Acción 2]
3. [Acción 3]

## Impacto
- **Usuarios afectados:** [número/porcentaje]
- **Funcionalidad perdida:** [descripción]
- **Tiempo de inactividad:** [duración]

## Lecciones Aprendidas
- [Lección 1]
- [Lección 2]

## Acciones Preventivas
- [ ] [Acción preventiva 1]
- [ ] [Acción preventiva 2]
```

### Actualizar Documentación

```bash
# 1. Actualizar troubleshooting guide
# Agregar nuevo problema y solución

# 2. Actualizar procedimientos
# Si se encontró mejor método de rollback

# 3. Actualizar scripts
# Mejorar automatización basada en experiencia
```

## 🎯 Mejores Prácticas

### Prevención

1. **Backups Automáticos**
   ```bash
   # Crear backup antes de cada deploy importante
   git checkout -b backup-pre-deploy-$(date +%Y%m%d)
   ```

2. **Testing Riguroso**
   ```bash
   # Siempre ejecutar validación completa antes de deploy
   pnpm validation-complete
   ```

3. **Deployments Graduales**
   ```bash
   # Usar preview deployments para validar
   # Deploy a producción solo después de validación
   ```

### Durante Rollback

1. **Comunicación Clara**
   - Notificar inicio de rollback
   - Actualizaciones cada 15 minutos
   - Confirmar restauración

2. **Documentación en Tiempo Real**
   - Registrar cada paso
   - Capturar errores exactos
   - Medir tiempos

3. **Validación Exhaustiva**
   - No asumir que funciona
   - Probar funcionalidad crítica
   - Verificar métricas

### Post-Rollback

1. **Análisis de Causa Raíz**
   - Identificar qué causó el problema
   - Documentar para prevenir recurrencia
   - Actualizar procedimientos

2. **Mejora Continua**
   - Optimizar scripts de rollback
   - Mejorar monitoreo
   - Actualizar documentación

---

**Recuerda:** Los rollbacks son procedimientos de emergencia. El objetivo es restaurar el servicio rápidamente, no arreglar el problema original. La investigación y fix se hace después de restaurar la estabilidad.