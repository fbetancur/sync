# Monitoreo y Métricas - Sync Platform

Esta guía describe el sistema de monitoreo y métricas implementado en el monorepo de Sync Platform.

## 📊 Visión General

El sistema de monitoreo recolecta y analiza métricas clave del desarrollo y performance del
monorepo:

- **Performance Metrics**: Tiempos de build, test, instalación y linting
- **Bundle Analysis**: Tamaño de bundles y análisis de assets
- **Dependency Tracking**: Gestión y análisis de dependencias
- **Git Metrics**: Estadísticas del repositorio
- **Dashboard**: Visualización centralizada de métricas

## 🛠️ Herramientas Disponibles

### 1. Bundle Analyzer

Analiza el tamaño y composición de los bundles de las aplicaciones.

```bash
# Analizar app específica
pnpm bundle-analyzer credisync

# Analizar todas las apps
pnpm bundle-analyzer:all

# Usar directamente
node tools/scripts/bundle-analyzer.js [app-name]
```

#### Características

- **Análisis detallado**: Tamaño de client, server y assets
- **Comparación temporal**: Compara con análisis previos
- **Recomendaciones**: Sugiere optimizaciones automáticamente
- **Reportes JSON**: Guarda análisis para tracking histórico

#### Output de Ejemplo

```
📦 Bundle Analysis - credisync
⏰ 12/10/2024, 10:30:00 AM

📊 Tamaños Generales:
   Client:      245.6 KB
   Server:      89.2 KB
   Prerendered: 12.4 KB
   Total:       347.2 KB

🟨 JavaScript Files (Top 10):
   1. app-[hash].js - 156.8 KB
   2. chunk-[hash].js - 45.2 KB
   3. vendor-[hash].js - 43.6 KB

⚠️  Análisis y Recomendaciones:
   ✅ Tamaño de bundle optimizado
```

### 2. Performance Monitor

Mide tiempos de ejecución de operaciones críticas del desarrollo.

```bash
# Monitorear todo (build, test, install, lint)
pnpm performance-monitor:all

# Monitorear solo builds
pnpm performance-monitor:build

# Monitorear solo tests
pnpm performance-monitor:test

# Usar directamente
node tools/scripts/performance-monitor.js [--build] [--test] [--all]
```

#### Métricas Recolectadas

- **Build Time**: Tiempo de construcción de packages y apps
- **Test Time**: Tiempo de ejecución de test suites
- **Install Time**: Tiempo de instalación de dependencias
- **Lint Time**: Tiempo de linting y formatting

#### Output de Ejemplo

```
📊 Resultados de Performance - BUILD
⏰ 12/10/2024, 10:30:00 AM

📦 Packages:
   ✅ @sync/types: 2.3s
   ✅ @sync/core: 8.7s
   ✅ @sync/ui: 4.1s

🚀 Apps:
   ✅ credisync: 12.4s

✅ Total: 27.5s

📈 Análisis:
   ✅ Build time optimizado
```

### 3. Metrics Dashboard

Genera un dashboard web interactivo con todas las métricas del monorepo.

```bash
# Generar dashboard estático
pnpm metrics-dashboard

# Servir dashboard en vivo
pnpm metrics-dashboard:serve

# Exportar métricas (JSON + CSV)
pnpm metrics-dashboard:export

# Usar directamente
node tools/scripts/metrics-dashboard.js [--serve] [--export] [--port=3001]
```

#### Características del Dashboard

- **Métricas en tiempo real**: Auto-refresh cada 5 minutos
- **Visualizaciones**: Gráficos interactivos con Chart.js
- **Responsive**: Funciona en desktop y mobile
- **Exportación**: JSON y CSV para análisis externos
- **Comparaciones**: Trends y comparaciones históricas

#### Métricas Mostradas

1. **Performance Overview**
   - Build Time con status (good/warning/error)
   - Test Time con indicadores de performance
   - Bundle Size total y por app
   - Dependency count (prod/dev)

2. **Workspace Info**
   - Número de apps activas
   - Número de packages compartidos
   - Git status y commits

3. **Detailed Analysis**
   - Build details por workspace
   - Bundle breakdown por app
   - Git statistics
   - Dependency analysis

## 📁 Estructura de Reportes

Los reportes se guardan en `tools/reports/`:

```
tools/reports/
├── bundle-analysis/
│   ├── bundle-analysis-credisync-latest.json
│   ├── bundle-analysis-credisync-2024-12-10T10-30-00.json
│   └── ...
├── performance/
│   ├── performance-build-latest.json
│   ├── performance-test-latest.json
│   ├── performance-report.json
│   ├── performance-report.md
│   └── ...
└── dashboard/
    ├── dashboard.html
    ├── metrics.json
    ├── metrics.csv
    └── ...
```

## 🔄 Integración en Workflow

### 1. Desarrollo Local

```bash
# Antes de commit
pnpm performance-monitor:all
pnpm bundle-analyzer:all

# Ver dashboard
pnpm metrics-dashboard:serve
# Abrir http://localhost:3001
```

### 2. CI/CD Integration

Agregar a GitHub Actions:

```yaml
# .github/workflows/metrics.yml
name: Collect Metrics

on:
  push:
    branches: [main]
  pull_request:

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: 18
          cache: 'pnpm'

      - run: pnpm install
      - run: pnpm build

      # Recolectar métricas
      - run: pnpm performance-monitor:all
      - run: pnpm bundle-analyzer:all
      - run: pnpm metrics-dashboard:export

      # Subir reportes como artifacts
      - uses: actions/upload-artifact@v3
        with:
          name: metrics-reports
          path: tools/reports/
```

### 3. Pre-commit Hook

El sistema se integra automáticamente con pre-commit hooks:

```javascript
// tools/scripts/pre-commit.js incluye validaciones de performance
// - Verifica que builds no sean excesivamente lentos
// - Alerta sobre bundles muy grandes
// - Valida métricas críticas
```

## 📈 Análisis y Alertas

### Umbrales de Performance

El sistema define umbrales automáticos:

| Métrica      | Bueno   | Warning   | Error |
| ------------ | ------- | --------- | ----- |
| Build Time   | < 30s   | 30s-2m    | > 2m  |
| Test Time    | < 15s   | 15s-1m    | > 1m  |
| Install Time | < 1m    | 1m-3m     | > 3m  |
| Bundle Size  | < 500KB | 500KB-1MB | > 1MB |

### Recomendaciones Automáticas

El sistema proporciona recomendaciones basadas en métricas:

**Build Performance:**

- Paralelización de builds
- Optimización de TypeScript config
- Cache de dependencias

**Bundle Size:**

- Code splitting
- Tree shaking
- Lazy loading
- Dependency analysis

**Test Performance:**

- Paralelización de tests
- Test filtering
- Mock optimization

## 🎯 Casos de Uso

### 1. Optimización de Performance

```bash
# 1. Medir estado actual
pnpm performance-monitor:all

# 2. Hacer cambios de optimización
# ... modificar código ...

# 3. Medir impacto
pnpm performance-monitor:all

# 4. Comparar resultados automáticamente
```

### 2. Análisis de Bundle Size

```bash
# 1. Analizar bundles actuales
pnpm bundle-analyzer:all

# 2. Identificar archivos grandes
# 3. Implementar code splitting
# 4. Re-analizar y comparar
pnpm bundle-analyzer:all
```

### 3. Monitoreo Continuo

```bash
# Dashboard en vivo para monitoreo
pnpm metrics-dashboard:serve

# Exportar métricas para análisis externo
pnpm metrics-dashboard:export
```

### 4. Debugging de Performance

```bash
# Análisis detallado de builds lentos
pnpm performance-monitor:build

# Identificar cuellos de botella
pnpm bundle-analyzer credisync

# Ver tendencias en dashboard
pnpm metrics-dashboard:serve
```

## 🔧 Configuración Avanzada

### Personalizar Umbrales

Editar `tools/scripts/performance-monitor.js`:

```javascript
// Personalizar umbrales de warning
const THRESHOLDS = {
  build: {
    warning: 60000, // 1 minuto
    error: 180000 // 3 minutos
  },
  test: {
    warning: 30000, // 30 segundos
    error: 120000 // 2 minutos
  }
};
```

### Agregar Métricas Personalizadas

```javascript
// En metrics-dashboard.js
function collectCustomMetrics() {
  return {
    // Agregar métricas específicas del proyecto
    codeComplexity: calculateComplexity(),
    testCoverage: getTestCoverage(),
    dependencyVulnerabilities: scanVulnerabilities()
  };
}
```

### Integrar con Herramientas Externas

```bash
# Exportar a sistemas de monitoreo
pnpm metrics-dashboard:export
# Procesar metrics.json con herramientas como:
# - Grafana
# - DataDog
# - New Relic
# - Custom dashboards
```

## 📊 Interpretación de Métricas

### Build Time Analysis

- **< 30s**: Excelente para desarrollo rápido
- **30s-2m**: Aceptable, considerar optimizaciones
- **> 2m**: Requiere optimización urgente

### Bundle Size Analysis

- **< 500KB**: Óptimo para web performance
- **500KB-1MB**: Considerar code splitting
- **> 1MB**: Impacto significativo en UX

### Test Performance

- **< 15s**: Permite TDD efectivo
- **15s-1m**: Aceptable para CI/CD
- **> 1m**: Puede ralentizar desarrollo

## 🚨 Troubleshooting

### Problemas Comunes

**Error: "No build directory found"**

```bash
# Construir antes de analizar
pnpm build:credisync
pnpm bundle-analyzer credisync
```

**Dashboard no carga métricas**

```bash
# Generar métricas primero
pnpm performance-monitor:all
pnpm bundle-analyzer:all
pnpm metrics-dashboard
```

**Métricas inconsistentes**

```bash
# Limpiar y regenerar
pnpm clean
pnpm install
pnpm build
pnpm performance-monitor:all
```

## 🎯 Próximos Pasos

1. **Automatización**: Integrar en CI/CD pipeline
2. **Alertas**: Configurar notificaciones automáticas
3. **Trends**: Implementar análisis de tendencias
4. **Benchmarking**: Comparar con proyectos similares
5. **Optimización**: Usar métricas para guiar optimizaciones

El sistema de monitoreo te ayudará a mantener el monorepo optimizado y detectar problemas de
performance temprano. ¡Úsalo regularmente para mantener la calidad del código! 🚀
