# 🛠️ Herramientas Avanzadas - Sync Platform

Esta guía documenta las herramientas avanzadas disponibles en el monorepo para mejorar la productividad del desarrollo, debugging y mantenimiento.

## 📋 Índice

1. [Generadores Automáticos](#generadores-automáticos)
2. [Hot Reload Inteligente](#hot-reload-inteligente)
3. [Debugger de Sync](#debugger-de-sync)
4. [Analizador de Dependencias](#analizador-de-dependencias)
5. [Mejores Prácticas](#mejores-prácticas)

## 🎨 Generadores Automáticos

### Generador de Componentes UI

Genera componentes Svelte completos con TypeScript, tests, documentación y Storybook.

```bash
# Uso básico
pnpm generate:component Button

# Con props avanzadas
pnpm generate:component forms/InputField --with-props

# Con store y actions
pnpm generate:component Modal --with-store --with-actions

# Con descripción personalizada
pnpm generate:component Card --with-props --description="Componente de tarjeta reutilizable"
```

#### Opciones Disponibles

| Opción | Descripción |
|--------|-------------|
| `--with-props` | Incluye props de variante, tamaño y disabled |
| `--with-store` | Genera store de Svelte para manejo de estado |
| `--with-actions` | Genera actions de Svelte |
| `--description` | Descripción personalizada para documentación |

#### Archivos Generados

- ✅ `packages/@sync/ui/src/components/{Name}.svelte` - Componente principal
- ✅ `packages/@sync/ui/src/components/{Name}.test.ts` - Tests con Vitest
- ✅ `packages/@sync/ui/src/stories/{Name}.stories.ts` - Story para Storybook
- ✅ `packages/@sync/ui/docs/components/{name}.md` - Documentación
- ✅ `packages/@sync/ui/src/stores/{name}.store.ts` - Store (opcional)
- ✅ `packages/@sync/ui/src/actions/{name}.action.ts` - Actions (opcional)

### Generador de Services

Genera services para @sync/core con arquitectura robusta, tests y documentación.

```bash
# Uso básico
pnpm generate:service UserManager

# Con interfaces TypeScript
pnpm generate:service data/CacheService --with-interface

# Con eventos y configuración avanzada
pnpm generate:service NotificationService --with-events --with-cache --with-queue
```

#### Opciones Disponibles

| Opción | Descripción |
|--------|-------------|
| `--with-interface` | Genera interfaces TypeScript en @sync/types |
| `--with-events` | Incluye EventEmitter para manejo de eventos |
| `--with-cache` | Incluye sistema de cache interno |
| `--with-queue` | Incluye cola de tareas secuenciales |
| `--description` | Descripción personalizada |

#### Archivos Generados

- ✅ `packages/@sync/core/src/services/{name}.service.ts` - Service principal
- ✅ `packages/@sync/core/src/services/{name}.service.test.ts` - Tests completos
- ✅ `packages/@sync/core/docs/services/{name}.md` - Documentación
- ✅ `packages/@sync/types/src/{name}.ts` - Interfaces (opcional)

#### Características de los Services

- 🔧 Inicialización/destrucción segura
- ⚙️ Configuración flexible
- 🛡️ Manejo robusto de errores
- ✅ Validaciones de estado
- 📡 Sistema de eventos (opcional)
- 💾 Cache interno (opcional)
- 📋 Cola de tareas (opcional)

## 🔥 Hot Reload Inteligente

Sistema avanzado de hot reload que detecta cambios en packages y reconstruye automáticamente las dependencias afectadas.

```bash
# Hot reload completo
pnpm hot-reload

# Solo una app específica
pnpm hot-reload --app=credisync

# Solo packages (sin iniciar apps)
pnpm hot-reload:packages

# Con output detallado
pnpm hot-reload --verbose
```

### Características

- 🔍 **Detección Inteligente**: Detecta cambios en packages y determina qué necesita rebuild
- 🏗️ **Orden Correcto**: Respeta el orden de dependencias para builds
- ⚡ **Debouncing**: Evita builds múltiples con cambios rápidos
- 🔄 **Restart Automático**: Reinicia apps afectadas automáticamente
- 🛡️ **Manejo de Errores**: Continúa funcionando aunque fallen algunos builds
- 🎯 **Shutdown Graceful**: Cierra procesos limpiamente

### Flujo de Trabajo

1. **Detecta cambio** en archivo de package
2. **Identifica dependientes** que necesitan rebuild
3. **Ordena builds** según dependencias
4. **Reconstruye packages** en orden correcto
5. **Reinicia apps** afectadas automáticamente

### Configuración

El sistema monitorea automáticamente:

- **Packages**: `src/**/*.{ts,js,svelte}`, `package.json`
- **Apps**: `src/**/*.{ts,js,svelte}`, `package.json`, `vite.config.ts`

## 🐛 Debugger de Sync

Herramienta avanzada para debugging de operaciones de sincronización en tiempo real.

```bash
# Debugger completo con dashboard
pnpm debug:sync

# Solo una app específica
pnpm debug:sync --app=credisync

# Con output detallado en consola
pnpm debug:sync:verbose

# Solo monitoreo (sin dashboard web)
pnpm debug:sync --monitor-only
```

### Dashboard Web

Accede al dashboard interactivo en `http://localhost:3001`

#### Características del Dashboard

- 📊 **Estado en Tiempo Real**: Monitoreo continuo del estado de sync
- 🔍 **Inspección Detallada**: Detalles de operaciones, conflictos y errores
- 📈 **Métricas de Performance**: Tiempos de sync, throughput, success rate
- 🔄 **Trigger Manual**: Disparar sincronizaciones manualmente
- 📝 **Logs en Vivo**: Stream de logs con filtrado por nivel
- 🌐 **WebSocket**: Updates en tiempo real sin refresh

#### Métricas Monitoreadas

- **Estado de Conexión**: Online/offline, latencia, bandwidth
- **Cola de Sync**: Tamaño, operaciones en proceso
- **Storage**: Registros locales, remotos, sincronizados
- **Conflictos**: Número y detalles de conflictos
- **Performance**: Tiempo promedio, tasa de éxito
- **Errores**: Tipos, frecuencia, severidad

### Logs Avanzados

- 📁 **Rotación Automática**: Logs rotan al alcanzar 10MB
- 🗂️ **Retención**: Mantiene últimos 5 archivos de log
- 🔍 **Búsqueda**: Filtrado por app, nivel, timestamp
- 📊 **Análisis**: Estadísticas de errores y performance

## 🔍 Analizador de Dependencias

Herramienta completa para análisis del grafo de dependencias del monorepo.

```bash
# Análisis completo
pnpm analyze:deps

# Solo dependencias circulares
pnpm analyze:deps:circular

# Solo dependencias no utilizadas
pnpm analyze:deps:unused

# Análisis completo con visualización
pnpm analyze:deps:full
```

### Tipos de Análisis

#### 🔄 Dependencias Circulares

Detecta ciclos en el grafo de dependencias que pueden causar problemas de build.

```bash
pnpm analyze:deps --circular
```

**Ejemplo de output:**
```
⚠️  2 dependencias circulares encontradas:
  1. @sync/core → @sync/ui → @sync/core
  2. credisync → @sync/core → credisync
```

#### 🗑️ Dependencias No Utilizadas

Identifica dependencias declaradas en package.json pero no utilizadas en el código.

```bash
pnpm analyze:deps --unused
```

**Beneficios:**
- Reduce tamaño de node_modules
- Mejora tiempos de instalación
- Limpia package.json

#### 📅 Dependencias Desactualizadas

Encuentra packages con versiones más recientes disponibles.

```bash
pnpm analyze:deps --outdated
```

**Categorías:**
- **Major**: Cambios breaking
- **Minor**: Nuevas features
- **Patch**: Bug fixes

#### 📦 Impacto en Bundle

Analiza el impacto de cada package en el bundle final.

**Métricas:**
- **Tamaño estimado**: Bytes que añade al bundle
- **Complejidad**: Basada en número de dependencias y archivos
- **Tree-shakeable**: Si soporta eliminación de código no usado

### Reportes Generados

#### 📄 JSON Report (`dependency-analysis.json`)

Reporte completo en formato JSON para procesamiento automático.

#### 📄 Markdown Report (`dependency-analysis.md`)

Reporte legible con tablas, gráficos y recomendaciones.

#### 🎨 Visualizaciones

- **DOT Format** (`dependency-graph.dot`): Para Graphviz
- **Mermaid Format** (`dependency-graph.mmd`): Para diagramas web

### Recomendaciones Automáticas

El analizador genera recomendaciones específicas:

- 🔄 Resolver dependencias circulares
- 🗑️ Limpiar dependencias no utilizadas
- 📅 Actualizar dependencias críticas
- 📦 Optimizar packages complejos
- 🌳 Mejorar tree-shaking

## 🎯 Mejores Prácticas

### Generadores

1. **Usa nombres descriptivos**: `UserProfileCard` mejor que `Card`
2. **Organiza por funcionalidad**: `forms/InputField`, `navigation/Menu`
3. **Incluye props cuando sea apropiado**: `--with-props` para componentes reutilizables
4. **Documenta bien**: Usa `--description` para contexto específico

### Hot Reload

1. **Mantén builds rápidos**: Optimiza configuración de TypeScript y Vite
2. **Usa filtros específicos**: `--app=credisync` para desarrollo enfocado
3. **Monitorea logs**: `--verbose` para debugging de problemas de build
4. **Cierra limpiamente**: Ctrl+C para shutdown graceful

### Debugger de Sync

1. **Usa el dashboard**: Más eficiente que logs en consola
2. **Monitorea métricas**: Identifica patrones de performance
3. **Analiza conflictos**: Resuelve problemas de sincronización temprano
4. **Guarda logs importantes**: Para análisis posterior

### Analizador de Dependencias

1. **Ejecuta regularmente**: Integra en CI/CD para monitoreo continuo
2. **Prioriza circulares**: Resuelve dependencias circulares primero
3. **Limpia incrementalmente**: Remueve dependencias no utilizadas gradualmente
4. **Actualiza con cuidado**: Revisa breaking changes en updates major

## 🔧 Configuración Avanzada

### Variables de Entorno

```bash
# Hot Reload
HOT_RELOAD_DEBOUNCE=300          # Debounce en ms
HOT_RELOAD_TIMEOUT=30000         # Timeout de build en ms

# Debugger
DEBUG_PORT=3001                  # Puerto del dashboard
DEBUG_WS_PORT=3002              # Puerto WebSocket
DEBUG_LOG_LEVEL=info            # Nivel de logs

# Dependency Analyzer
ANALYZE_MAX_DEPTH=10            # Profundidad máxima de análisis
ANALYZE_IGNORE_PATTERNS="test,spec"  # Patrones a ignorar
```

### Integración con CI/CD

```yaml
# .github/workflows/dependency-check.yml
name: Dependency Analysis
on: [push, pull_request]

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: pnpm install
      - run: pnpm analyze:deps:full
      - uses: actions/upload-artifact@v3
        with:
          name: dependency-reports
          path: tools/reports/dependency-analysis/
```

## 🚀 Próximas Mejoras

### En Desarrollo

- 🔍 **Inspector de Performance**: Profiling detallado de builds
- 🧪 **Test Generator**: Generación automática de tests
- 📊 **Metrics Dashboard**: Dashboard centralizado de métricas
- 🤖 **Auto-fixer**: Corrección automática de problemas comunes

### Roadmap

- **Q1 2025**: Inspector de Performance y Test Generator
- **Q2 2025**: Metrics Dashboard y Auto-fixer
- **Q3 2025**: Integración con herramientas externas
- **Q4 2025**: AI-powered code analysis

## 📞 Soporte

- 🐛 **Issues**: [GitHub Issues](https://github.com/fbetancur/sync/issues)
- 💬 **Discusiones**: [GitHub Discussions](https://github.com/fbetancur/sync/discussions)
- 📚 **Docs**: [Documentación completa](../README.md)

---

*Herramientas desarrolladas para maximizar la productividad en Sync Platform* 🚀