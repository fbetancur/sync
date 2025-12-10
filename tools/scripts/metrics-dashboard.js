#!/usr/bin/env node

/**
 * Metrics Dashboard - Genera dashboard de métricas del monorepo
 * Uso: node tools/scripts/metrics-dashboard.js [--serve] [--export]
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createServer } from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');

// Colores para output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${(ms / 60000).toFixed(1)}m`;
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function collectMetrics() {
  log('cyan', '📊 Recolectando métricas del monorepo...');

  const reportsDir = path.join(rootDir, 'tools', 'reports');
  const metrics = {
    timestamp: new Date().toISOString(),
    performance: {},
    bundles: {},
    dependencies: {},
    tests: {},
    git: {}
  };

  // Métricas de performance
  const perfDir = path.join(reportsDir, 'performance');
  if (fs.existsSync(perfDir)) {
    const perfTypes = ['build', 'test', 'install', 'lint'];

    perfTypes.forEach(type => {
      const latestPath = path.join(perfDir, `performance-${type}-latest.json`);
      if (fs.existsSync(latestPath)) {
        try {
          const data = JSON.parse(fs.readFileSync(latestPath, 'utf8'));
          metrics.performance[type] = {
            duration: data.total.duration,
            success: data.total.success,
            timestamp: data.timestamp,
            details: data
          };
        } catch (error) {
          log('yellow', `⚠️  Error leyendo ${type}: ${error.message}`);
        }
      }
    });
  }

  // Métricas de bundles
  const bundleDir = path.join(reportsDir, 'bundle-analysis');
  if (fs.existsSync(bundleDir)) {
    const bundleFiles = fs
      .readdirSync(bundleDir)
      .filter(f => f.includes('-latest.json'));

    bundleFiles.forEach(file => {
      try {
        const data = JSON.parse(
          fs.readFileSync(path.join(bundleDir, file), 'utf8')
        );
        metrics.bundles[data.app] = {
          total: data.total,
          client: data.client.size,
          server: data.server.size,
          timestamp: data.timestamp,
          assets: data.assets
        };
      } catch (error) {
        log('yellow', `⚠️  Error leyendo bundle ${file}: ${error.message}`);
      }
    });
  }

  // Métricas de dependencias
  try {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(rootDir, 'package.json'), 'utf8')
    );
    const deps = packageJson.dependencies || {};
    const devDeps = packageJson.devDependencies || {};

    metrics.dependencies = {
      production: Object.keys(deps).length,
      development: Object.keys(devDeps).length,
      total: Object.keys(deps).length + Object.keys(devDeps).length,
      packages: getWorkspacePackages(),
      apps: getWorkspaceApps()
    };
  } catch (error) {
    log('yellow', `⚠️  Error leyendo dependencias: ${error.message}`);
  }

  // Métricas de tests
  try {
    const testOutput = execSync('pnpm test --reporter=json', {
      stdio: 'pipe',
      cwd: rootDir
    }).toString();

    // Parsear output de tests (esto puede variar según el runner)
    metrics.tests = {
      total: 0,
      passed: 0,
      failed: 0,
      coverage: 0,
      lastRun: new Date().toISOString()
    };
  } catch (error) {
    // Tests pueden fallar, pero seguimos recolectando otras métricas
    metrics.tests = {
      total: 0,
      passed: 0,
      failed: 0,
      coverage: 0,
      lastRun: new Date().toISOString(),
      error: 'Could not run tests'
    };
  }

  // Métricas de Git
  try {
    const gitStats = {
      branch: execSync('git branch --show-current', {
        stdio: 'pipe',
        cwd: rootDir
      })
        .toString()
        .trim(),
      lastCommit: execSync('git log -1 --format="%H %s %an %ad"', {
        stdio: 'pipe',
        cwd: rootDir
      })
        .toString()
        .trim(),
      uncommittedChanges: execSync('git status --porcelain', {
        stdio: 'pipe',
        cwd: rootDir
      })
        .toString()
        .split('\\n')
        .filter(l => l.trim()).length,
      totalCommits: parseInt(
        execSync('git rev-list --count HEAD', { stdio: 'pipe', cwd: rootDir })
          .toString()
          .trim()
      )
    };

    metrics.git = gitStats;
  } catch (error) {
    log('yellow', `⚠️  Error leyendo Git stats: ${error.message}`);
  }

  return metrics;
}

function getWorkspacePackages() {
  const packagesDir = path.join(rootDir, 'packages/@sync');
  if (!fs.existsSync(packagesDir)) return [];

  return fs
    .readdirSync(packagesDir)
    .filter(name => {
      const packagePath = path.join(packagesDir, name);
      return (
        fs.statSync(packagePath).isDirectory() &&
        fs.existsSync(path.join(packagePath, 'package.json'))
      );
    })
    .map(name => `@sync/${name}`);
}

function getWorkspaceApps() {
  const appsDir = path.join(rootDir, 'apps');
  if (!fs.existsSync(appsDir)) return [];

  return fs.readdirSync(appsDir).filter(name => {
    const appPath = path.join(appsDir, name);
    return (
      fs.statSync(appPath).isDirectory() &&
      fs.existsSync(path.join(appPath, 'package.json'))
    );
  });
}

function generateDashboardHTML(metrics) {
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Platform - Metrics Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #334155;
            line-height: 1.6;
        }
        
        .header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 2rem;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 0.5rem;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 1.1rem;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
            margin-bottom: 3rem;
        }
        
        .metric-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }
        
        .metric-card h3 {
            color: #1e293b;
            margin-bottom: 1rem;
            font-size: 1.25rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        .metric-value {
            font-size: 2rem;
            font-weight: bold;
            color: #3b82f6;
            margin-bottom: 0.5rem;
        }
        
        .metric-label {
            color: #64748b;
            font-size: 0.9rem;
        }
        
        .status-good { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        
        .chart-container {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
            margin-bottom: 2rem;
        }
        
        .chart-container h3 {
            margin-bottom: 1rem;
            color: #1e293b;
        }
        
        .details-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 2rem;
        }
        
        .details-card {
            background: white;
            border-radius: 12px;
            padding: 1.5rem;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            border: 1px solid #e2e8f0;
        }
        
        .details-card h4 {
            color: #1e293b;
            margin-bottom: 1rem;
            padding-bottom: 0.5rem;
            border-bottom: 2px solid #e2e8f0;
        }
        
        .detail-item {
            display: flex;
            justify-content: space-between;
            padding: 0.5rem 0;
            border-bottom: 1px solid #f1f5f9;
        }
        
        .detail-item:last-child {
            border-bottom: none;
        }
        
        .timestamp {
            text-align: center;
            color: #64748b;
            font-size: 0.9rem;
            margin-top: 2rem;
            padding-top: 2rem;
            border-top: 1px solid #e2e8f0;
        }
        
        .refresh-btn {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 50px;
            padding: 1rem 1.5rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .refresh-btn:hover {
            background: #2563eb;
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>🚀 Sync Platform</h1>
        <p>Metrics Dashboard - Monorepo Performance & Analytics</p>
    </div>
    
    <div class="container">
        <!-- Métricas principales -->
        <div class="metrics-grid">
            <div class="metric-card">
                <h3>⏱️ Build Time</h3>
                <div class="metric-value ${getBuildStatus(metrics.performance.build)}">${formatTime(metrics.performance.build?.duration || 0)}</div>
                <div class="metric-label">Last build performance</div>
            </div>
            
            <div class="metric-card">
                <h3>🧪 Test Time</h3>
                <div class="metric-value ${getTestStatus(metrics.performance.test)}">${formatTime(metrics.performance.test?.duration || 0)}</div>
                <div class="metric-label">Test suite execution</div>
            </div>
            
            <div class="metric-card">
                <h3>📦 Bundle Size</h3>
                <div class="metric-value">${getTotalBundleSize(metrics.bundles)}</div>
                <div class="metric-label">Total client bundles</div>
            </div>
            
            <div class="metric-card">
                <h3>🔧 Dependencies</h3>
                <div class="metric-value">${metrics.dependencies.total || 0}</div>
                <div class="metric-label">${metrics.dependencies.production || 0} prod + ${metrics.dependencies.development || 0} dev</div>
            </div>
            
            <div class="metric-card">
                <h3>📱 Apps</h3>
                <div class="metric-value">${metrics.dependencies.apps?.length || 0}</div>
                <div class="metric-label">Active applications</div>
            </div>
            
            <div class="metric-card">
                <h3>📚 Packages</h3>
                <div class="metric-value">${metrics.dependencies.packages?.length || 0}</div>
                <div class="metric-label">Shared packages</div>
            </div>
        </div>
        
        <!-- Gráfico de performance -->
        <div class="chart-container">
            <h3>📊 Performance Trends</h3>
            <canvas id="performanceChart" width="400" height="200"></canvas>
        </div>
        
        <!-- Detalles -->
        <div class="details-grid">
            <div class="details-card">
                <h4>🏗️ Build Details</h4>
                ${generateBuildDetails(metrics.performance)}
            </div>
            
            <div class="details-card">
                <h4>📦 Bundle Analysis</h4>
                ${generateBundleDetails(metrics.bundles)}
            </div>
            
            <div class="details-card">
                <h4>🔍 Git Status</h4>
                ${generateGitDetails(metrics.git)}
            </div>
            
            <div class="details-card">
                <h4>📊 Workspace Info</h4>
                ${generateWorkspaceDetails(metrics.dependencies)}
            </div>
        </div>
        
        <div class="timestamp">
            Last updated: ${new Date(metrics.timestamp).toLocaleString()}
        </div>
    </div>
    
    <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    
    <script>
        // Gráfico de performance
        const ctx = document.getElementById('performanceChart').getContext('2d');
        new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Build', 'Test', 'Install', 'Lint'],
                datasets: [{
                    label: 'Duration (ms)',
                    data: [
                        ${metrics.performance.build?.duration || 0},
                        ${metrics.performance.test?.duration || 0},
                        ${metrics.performance.install?.duration || 0},
                        ${metrics.performance.lint?.duration || 0}
                    ],
                    backgroundColor: [
                        '#3b82f6',
                        '#10b981',
                        '#f59e0b',
                        '#8b5cf6'
                    ],
                    borderRadius: 8
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value < 1000 ? value + 'ms' : 
                                       value < 60000 ? (value/1000).toFixed(1) + 's' :
                                       (value/60000).toFixed(1) + 'm';
                            }
                        }
                    }
                }
            }
        });
        
        // Auto-refresh cada 5 minutos
        setTimeout(() => location.reload(), 5 * 60 * 1000);
    </script>
</body>
</html>`;

  return html;
}

function getBuildStatus(buildMetrics) {
  if (!buildMetrics) return 'status-error';
  if (!buildMetrics.success) return 'status-error';
  if (buildMetrics.duration > 120000) return 'status-warning';
  return 'status-good';
}

function getTestStatus(testMetrics) {
  if (!testMetrics) return 'status-error';
  if (!testMetrics.success) return 'status-error';
  if (testMetrics.duration > 60000) return 'status-warning';
  return 'status-good';
}

function getTotalBundleSize(bundles) {
  const total = Object.values(bundles).reduce(
    (sum, bundle) => sum + (bundle.client || 0),
    0
  );
  return formatBytes(total);
}

function generateBuildDetails(performance) {
  let html = '';

  Object.entries(performance).forEach(([type, data]) => {
    const status = data.success ? '✅' : '❌';
    const statusClass = data.success ? 'status-good' : 'status-error';

    html += `
      <div class="detail-item">
        <span>${status} ${type.charAt(0).toUpperCase() + type.slice(1)}</span>
        <span class="${statusClass}">${formatTime(data.duration)}</span>
      </div>
    `;
  });

  return (
    html ||
    '<div class="detail-item"><span>No build data available</span></div>'
  );
}

function generateBundleDetails(bundles) {
  let html = '';

  Object.entries(bundles).forEach(([app, data]) => {
    html += `
      <div class="detail-item">
        <span>${app}</span>
        <span>${formatBytes(data.client)}</span>
      </div>
    `;
  });

  return (
    html ||
    '<div class="detail-item"><span>No bundle data available</span></div>'
  );
}

function generateGitDetails(git) {
  if (!git.branch) {
    return '<div class="detail-item"><span>No Git data available</span></div>';
  }

  return `
    <div class="detail-item">
      <span>Branch</span>
      <span>${git.branch}</span>
    </div>
    <div class="detail-item">
      <span>Total Commits</span>
      <span>${git.totalCommits}</span>
    </div>
    <div class="detail-item">
      <span>Uncommitted Changes</span>
      <span class="${git.uncommittedChanges > 0 ? 'status-warning' : 'status-good'}">${git.uncommittedChanges}</span>
    </div>
  `;
}

function generateWorkspaceDetails(dependencies) {
  return `
    <div class="detail-item">
      <span>Apps</span>
      <span>${dependencies.apps?.join(', ') || 'None'}</span>
    </div>
    <div class="detail-item">
      <span>Packages</span>
      <span>${dependencies.packages?.join(', ') || 'None'}</span>
    </div>
    <div class="detail-item">
      <span>Prod Dependencies</span>
      <span>${dependencies.production || 0}</span>
    </div>
    <div class="detail-item">
      <span>Dev Dependencies</span>
      <span>${dependencies.development || 0}</span>
    </div>
  `;
}

function saveDashboard(html, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  const dashboardPath = path.join(outputDir, 'dashboard.html');
  fs.writeFileSync(dashboardPath, html);

  log('green', `📊 Dashboard generado: ${dashboardPath}`);
  return dashboardPath;
}

function serveDashboard(html, port = 3001) {
  const server = createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  });

  server.listen(port, () => {
    log('green', `🌐 Dashboard servido en: http://localhost:${port}`);
    log('cyan', '   Presiona Ctrl+C para detener el servidor');
  });

  return server;
}

function exportMetrics(metrics, outputDir) {
  fs.mkdirSync(outputDir, { recursive: true });

  // Exportar JSON
  const jsonPath = path.join(outputDir, 'metrics.json');
  fs.writeFileSync(jsonPath, JSON.stringify(metrics, null, 2));

  // Exportar CSV
  const csvData = generateCSV(metrics);
  const csvPath = path.join(outputDir, 'metrics.csv');
  fs.writeFileSync(csvPath, csvData);

  log('green', `📊 Métricas exportadas:`);
  log('cyan', `   JSON: ${jsonPath}`);
  log('cyan', `   CSV: ${csvPath}`);
}

function generateCSV(metrics) {
  let csv = 'Metric,Value,Unit,Timestamp\\n';

  // Performance metrics
  Object.entries(metrics.performance).forEach(([type, data]) => {
    csv += `${type}_duration,${data.duration},ms,${data.timestamp}\\n`;
    csv += `${type}_success,${data.success ? 1 : 0},boolean,${data.timestamp}\\n`;
  });

  // Bundle metrics
  Object.entries(metrics.bundles).forEach(([app, data]) => {
    csv += `${app}_bundle_size,${data.client},bytes,${data.timestamp}\\n`;
    csv += `${app}_total_size,${data.total},bytes,${data.timestamp}\\n`;
  });

  // Dependency metrics
  csv += `dependencies_total,${metrics.dependencies.total},count,${metrics.timestamp}\\n`;
  csv += `dependencies_production,${metrics.dependencies.production},count,${metrics.timestamp}\\n`;
  csv += `dependencies_development,${metrics.dependencies.development},count,${metrics.timestamp}\\n`;

  return csv;
}

function main() {
  const args = process.argv.slice(2);
  const serve = args.includes('--serve');
  const exportData = args.includes('--export');
  const port =
    parseInt(args.find(arg => arg.startsWith('--port='))?.split('=')[1]) ||
    3001;

  log('blue', '📊 Metrics Dashboard - Sync Platform');

  // Recolectar métricas
  const metrics = collectMetrics();

  // Generar dashboard HTML
  const html = generateDashboardHTML(metrics);

  // Guardar dashboard
  const outputDir = path.join(rootDir, 'tools', 'reports', 'dashboard');
  const dashboardPath = saveDashboard(html, outputDir);

  // Exportar métricas si se solicita
  if (exportData) {
    exportMetrics(metrics, outputDir);
  }

  // Servir dashboard si se solicita
  if (serve) {
    serveDashboard(html, port);
  } else {
    log('blue', '\\n🎯 Próximos pasos:');
    log('yellow', `• Abrir dashboard: open ${dashboardPath}`);
    log(
      'yellow',
      `• Servir dashboard: node tools/scripts/metrics-dashboard.js --serve`
    );
    log('yellow', '• Configurar auto-refresh en CI/CD');
    log('yellow', '• Integrar alertas para métricas críticas');
  }
}

main();
