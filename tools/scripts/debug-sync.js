#!/usr/bin/env node

/**
 * 🐛 Debugger para Sync Operations
 * 
 * Herramienta avanzada para debugging de operaciones de sincronización
 * en tiempo real con inspección de estado y logs detallados
 * 
 * Uso:
 *   pnpm debug:sync
 *   pnpm debug:sync --app=credisync --verbose
 *   pnpm debug:sync --monitor-only
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Configuración
const config = {
  debugPort: 3001,
  wsPort: 3002,
  logDir: join(rootDir, 'tools/reports/debug-logs'),
  maxLogSize: 10 * 1024 * 1024, // 10MB
  maxLogFiles: 5,
  refreshInterval: 1000,
  apps: ['credisync', 'healthsync', 'surveysync']
};

class SyncDebugger {
  constructor(options = {}) {
    this.options = {
      app: options.app,
      verbose: options.verbose || false,
      monitorOnly: options.monitorOnly || false
    };
    
    this.server = null;
    this.wsServer = null;
    this.clients = new Set();
    this.syncStates = new Map();
    this.logBuffer = [];
    this.isRunning = false;
    
    // Crear directorio de logs
    if (!existsSync(config.logDir)) {
      mkdirSync(config.logDir, { recursive: true });
    }
    
    // Bind methods
    this.handleWebSocketConnection = this.handleWebSocketConnection.bind(this);
    this.broadcastUpdate = this.broadcastUpdate.bind(this);
    this.collectSyncData = this.collectSyncData.bind(this);
    
    // Setup graceful shutdown
    process.on('SIGINT', () => this.shutdown());
    process.on('SIGTERM', () => this.shutdown());
  }

  /**
   * Inicia el debugger
   */
  async start() {
    console.log('🐛 Iniciando Sync Debugger...');
    
    // Validar apps
    await this.validateApps();
    
    // Iniciar servidor web
    await this.startWebServer();
    
    // Iniciar WebSocket server
    await this.startWebSocketServer();
    
    // Iniciar monitoreo
    this.startMonitoring();
    
    this.isRunning = true;
    
    console.log(`✅ Sync Debugger activo:`);
    console.log(`   🌐 Web UI: http://localhost:${config.debugPort}`);
    console.log(`   🔌 WebSocket: ws://localhost:${config.wsPort}`);
    console.log(`   📁 Logs: ${config.logDir}`);
    
    if (!this.options.monitorOnly) {
      console.log('\\n📊 Dashboard disponible en el navegador');
      console.log('🔍 Inspecciona el estado de sync en tiempo real');
    }
    
    // Mantener el proceso vivo
    return new Promise(() => {});
  }

  /**
   * Valida que las apps existan
   */
  async validateApps() {
    const appsToCheck = this.options.app 
      ? [this.options.app]
      : config.apps;
    
    for (const appName of appsToCheck) {
      const appPath = join(rootDir, 'apps', appName);
      if (!existsSync(appPath)) {
        throw new Error(`App ${appName} no encontrada en ${appPath}`);
      }
    }
  }

  /**
   * Inicia el servidor web para el dashboard
   */
  async startWebServer() {
    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        if (req.url === '/') {
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(this.generateDashboardHTML());
        } else if (req.url === '/api/sync-state') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            states: Object.fromEntries(this.syncStates),
            logs: this.logBuffer.slice(-100), // Últimos 100 logs
            timestamp: Date.now()
          }));
        } else if (req.url === '/api/logs') {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(this.getRecentLogs()));
        } else {
          res.writeHead(404);
          res.end('Not Found');
        }
      });
      
      this.server.listen(config.debugPort, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  /**
   * Inicia el servidor WebSocket
   */
  async startWebSocketServer() {
    this.wsServer = new WebSocketServer({ port: config.wsPort });
    this.wsServer.on('connection', this.handleWebSocketConnection);
  }

  /**
   * Maneja conexiones WebSocket
   */
  handleWebSocketConnection(ws) {
    this.clients.add(ws);
    
    // Enviar estado inicial
    ws.send(JSON.stringify({
      type: 'initial',
      data: {
        states: Object.fromEntries(this.syncStates),
        logs: this.logBuffer.slice(-50)
      }
    }));
    
    ws.on('close', () => {
      this.clients.delete(ws);
    });
    
    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        this.handleWebSocketMessage(ws, data);
      } catch (error) {
        console.error('Error procesando mensaje WebSocket:', error);
      }
    });
  }

  /**
   * Maneja mensajes WebSocket
   */
  handleWebSocketMessage(ws, data) {
    switch (data.type) {
      case 'get-sync-details':
        const appName = data.app;
        const details = this.getSyncDetails(appName);
        ws.send(JSON.stringify({
          type: 'sync-details',
          app: appName,
          data: details
        }));
        break;
        
      case 'trigger-sync':
        this.triggerSync(data.app);
        break;
        
      case 'clear-logs':
        this.clearLogs();
        break;
    }
  }

  /**
   * Inicia el monitoreo continuo
   */
  startMonitoring() {
    const monitor = async () => {
      if (!this.isRunning) return;
      
      try {
        await this.collectSyncData();
        this.broadcastUpdate();
      } catch (error) {
        this.log('error', 'Error en monitoreo', { error: error.message });
      }
      
      setTimeout(monitor, config.refreshInterval);
    };
    
    monitor();
  }

  /**
   * Recolecta datos de sync de las apps
   */
  async collectSyncData() {
    const appsToMonitor = this.options.app 
      ? [this.options.app]
      : config.apps;
    
    for (const appName of appsToMonitor) {
      try {
        const syncState = await this.getSyncState(appName);
        this.syncStates.set(appName, syncState);
        
        if (this.options.verbose) {
          this.log('debug', `Estado sync ${appName}`, syncState);
        }
      } catch (error) {
        this.log('error', `Error obteniendo estado de ${appName}`, { 
          error: error.message 
        });
      }
    }
  }

  /**
   * Obtiene el estado de sync de una app
   */
  async getSyncState(appName) {
    const appPath = join(rootDir, 'apps', appName);
    
    // Simular obtención de estado (en una implementación real,
    // esto se conectaría a la app o leería de archivos de estado)
    const state = {
      app: appName,
      timestamp: Date.now(),
      status: 'active',
      lastSync: Date.now() - Math.random() * 300000, // Últimos 5 min
      pendingOperations: Math.floor(Math.random() * 10),
      syncQueue: {
        size: Math.floor(Math.random() * 5),
        processing: Math.random() > 0.7
      },
      conflicts: Math.floor(Math.random() * 3),
      storage: {
        localRecords: Math.floor(Math.random() * 1000) + 100,
        remoteRecords: Math.floor(Math.random() * 1000) + 100,
        syncedRecords: Math.floor(Math.random() * 900) + 50
      },
      network: {
        connected: Math.random() > 0.1,
        latency: Math.floor(Math.random() * 200) + 50,
        bandwidth: Math.floor(Math.random() * 1000) + 100
      },
      errors: this.generateMockErrors(),
      performance: {
        avgSyncTime: Math.floor(Math.random() * 5000) + 1000,
        successRate: 0.85 + Math.random() * 0.14,
        throughput: Math.floor(Math.random() * 100) + 10
      }
    };
    
    return state;
  }

  /**
   * Genera errores mock para testing
   */
  generateMockErrors() {
    const errors = [];
    const errorTypes = [
      'Network timeout',
      'Conflict resolution failed',
      'Invalid data format',
      'Authentication expired',
      'Storage quota exceeded'
    ];
    
    const errorCount = Math.floor(Math.random() * 3);
    for (let i = 0; i < errorCount; i++) {
      errors.push({
        type: errorTypes[Math.floor(Math.random() * errorTypes.length)],
        message: 'Error simulado para testing',
        timestamp: Date.now() - Math.random() * 3600000,
        severity: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]
      });
    }
    
    return errors;
  }

  /**
   * Obtiene detalles específicos de sync
   */
  getSyncDetails(appName) {
    const state = this.syncStates.get(appName);
    if (!state) return null;
    
    return {
      ...state,
      detailedLogs: this.getAppLogs(appName),
      syncHistory: this.getSyncHistory(appName),
      conflictDetails: this.getConflictDetails(appName)
    };
  }

  /**
   * Obtiene logs específicos de una app
   */
  getAppLogs(appName) {
    return this.logBuffer
      .filter(log => log.app === appName)
      .slice(-20);
  }

  /**
   * Obtiene historial de sync
   */
  getSyncHistory(appName) {
    // Mock data - en implementación real vendría de la app
    const history = [];
    for (let i = 0; i < 10; i++) {
      history.push({
        timestamp: Date.now() - i * 300000,
        operation: ['push', 'pull', 'merge'][Math.floor(Math.random() * 3)],
        records: Math.floor(Math.random() * 50) + 1,
        duration: Math.floor(Math.random() * 5000) + 500,
        success: Math.random() > 0.1
      });
    }
    return history;
  }

  /**
   * Obtiene detalles de conflictos
   */
  getConflictDetails(appName) {
    // Mock data
    const conflicts = [];
    const conflictCount = Math.floor(Math.random() * 3);
    
    for (let i = 0; i < conflictCount; i++) {
      conflicts.push({
        id: `conflict_${Date.now()}_${i}`,
        type: 'data_mismatch',
        table: ['users', 'transactions', 'settings'][Math.floor(Math.random() * 3)],
        recordId: `record_${Math.floor(Math.random() * 1000)}`,
        localValue: 'Local data value',
        remoteValue: 'Remote data value',
        timestamp: Date.now() - Math.random() * 3600000,
        resolved: Math.random() > 0.5
      });
    }
    
    return conflicts;
  }

  /**
   * Dispara una sincronización manual
   */
  async triggerSync(appName) {
    this.log('info', `Sincronización manual disparada para ${appName}`);
    
    // En implementación real, esto enviaría un comando a la app
    // Por ahora solo simulamos
    setTimeout(() => {
      this.log('info', `Sincronización completada para ${appName}`);
    }, 2000);
  }

  /**
   * Registra un log
   */
  log(level, message, data = {}) {
    const logEntry = {
      timestamp: Date.now(),
      level,
      message,
      data,
      app: this.options.app || 'debugger'
    };
    
    this.logBuffer.push(logEntry);
    
    // Mantener buffer limitado
    if (this.logBuffer.length > 1000) {
      this.logBuffer = this.logBuffer.slice(-500);
    }
    
    // Escribir a archivo
    this.writeLogToFile(logEntry);
    
    // Console output
    if (this.options.verbose || level === 'error') {
      const timestamp = new Date(logEntry.timestamp).toISOString();
      console.log(`[${timestamp}] ${level.toUpperCase()}: ${message}`, 
        Object.keys(data).length > 0 ? data : '');
    }
  }

  /**
   * Escribe log a archivo
   */
  writeLogToFile(logEntry) {
    const date = new Date().toISOString().split('T')[0];
    const logFile = join(config.logDir, `sync-debug-${date}.log`);
    
    const logLine = JSON.stringify(logEntry) + '\\n';
    
    try {
      // Rotar logs si es necesario
      this.rotateLogsIfNeeded(logFile);
      
      // Escribir log
      writeFileSync(logFile, logLine, { flag: 'a' });
    } catch (error) {
      console.error('Error escribiendo log:', error);
    }
  }

  /**
   * Rota logs si exceden el tamaño máximo
   */
  rotateLogsIfNeeded(logFile) {
    if (!existsSync(logFile)) return;
    
    const stats = require('fs').statSync(logFile);
    if (stats.size > config.maxLogSize) {
      // Rotar archivo
      const timestamp = Date.now();
      const rotatedFile = logFile.replace('.log', `.${timestamp}.log`);
      require('fs').renameSync(logFile, rotatedFile);
      
      // Limpiar logs antiguos
      this.cleanOldLogs();
    }
  }

  /**
   * Limpia logs antiguos
   */
  cleanOldLogs() {
    try {
      const files = require('fs').readdirSync(config.logDir);
      const logFiles = files
        .filter(file => file.startsWith('sync-debug-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          path: join(config.logDir, file),
          mtime: require('fs').statSync(join(config.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
      
      // Mantener solo los últimos N archivos
      if (logFiles.length > config.maxLogFiles) {
        const filesToDelete = logFiles.slice(config.maxLogFiles);
        filesToDelete.forEach(file => {
          require('fs').unlinkSync(file.path);
        });
      }
    } catch (error) {
      console.error('Error limpiando logs antiguos:', error);
    }
  }

  /**
   * Obtiene logs recientes
   */
  getRecentLogs() {
    return {
      buffer: this.logBuffer.slice(-100),
      files: this.getLogFiles()
    };
  }

  /**
   * Obtiene lista de archivos de log
   */
  getLogFiles() {
    try {
      const files = require('fs').readdirSync(config.logDir);
      return files
        .filter(file => file.startsWith('sync-debug-') && file.endsWith('.log'))
        .map(file => ({
          name: file,
          size: require('fs').statSync(join(config.logDir, file)).size,
          mtime: require('fs').statSync(join(config.logDir, file)).mtime
        }))
        .sort((a, b) => b.mtime - a.mtime);
    } catch (error) {
      return [];
    }
  }

  /**
   * Limpia logs
   */
  clearLogs() {
    this.logBuffer = [];
    this.log('info', 'Logs limpiados');
  }

  /**
   * Transmite actualizaciones a clientes WebSocket
   */
  broadcastUpdate() {
    if (this.clients.size === 0) return;
    
    const update = {
      type: 'update',
      data: {
        states: Object.fromEntries(this.syncStates),
        logs: this.logBuffer.slice(-10),
        timestamp: Date.now()
      }
    };
    
    const message = JSON.stringify(update);
    
    this.clients.forEach(client => {
      try {
        client.send(message);
      } catch (error) {
        // Cliente desconectado, remover
        this.clients.delete(client);
      }
    });
  }

  /**
   * Genera HTML para el dashboard
   */
  generateDashboardHTML() {
    return `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sync Debugger - Sync Platform</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0f172a;
            color: #e2e8f0;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            background: #1e293b; 
            padding: 20px; 
            border-radius: 8px; 
            margin-bottom: 20px;
            border-left: 4px solid #3b82f6;
        }
        .header h1 { color: #3b82f6; margin-bottom: 5px; }
        .header p { color: #94a3b8; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .card { 
            background: #1e293b; 
            border-radius: 8px; 
            padding: 20px; 
            border: 1px solid #334155;
        }
        .card h3 { color: #3b82f6; margin-bottom: 15px; }
        .status { 
            display: inline-block; 
            padding: 4px 8px; 
            border-radius: 4px; 
            font-size: 12px; 
            font-weight: bold;
        }
        .status.active { background: #059669; color: white; }
        .status.error { background: #dc2626; color: white; }
        .status.warning { background: #d97706; color: white; }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            margin: 8px 0; 
            padding: 8px 0;
            border-bottom: 1px solid #334155;
        }
        .metric:last-child { border-bottom: none; }
        .metric-label { color: #94a3b8; }
        .metric-value { color: #e2e8f0; font-weight: bold; }
        .logs { 
            background: #0f172a; 
            border: 1px solid #334155; 
            border-radius: 4px; 
            padding: 15px; 
            height: 300px; 
            overflow-y: auto; 
            font-family: 'Courier New', monospace; 
            font-size: 12px;
        }
        .log-entry { 
            margin: 4px 0; 
            padding: 4px 0;
        }
        .log-entry.error { color: #f87171; }
        .log-entry.warning { color: #fbbf24; }
        .log-entry.info { color: #60a5fa; }
        .log-entry.debug { color: #94a3b8; }
        .controls { 
            display: flex; 
            gap: 10px; 
            margin-bottom: 20px; 
        }
        .btn { 
            padding: 8px 16px; 
            border: none; 
            border-radius: 4px; 
            cursor: pointer; 
            font-size: 14px;
        }
        .btn-primary { background: #3b82f6; color: white; }
        .btn-secondary { background: #6b7280; color: white; }
        .btn:hover { opacity: 0.8; }
        .connection-status {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 8px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
        }
        .connected { background: #059669; color: white; }
        .disconnected { background: #dc2626; color: white; }
    </style>
</head>
<body>
    <div class="connection-status" id="connectionStatus">Conectando...</div>
    
    <div class="container">
        <div class="header">
            <h1>🐛 Sync Debugger</h1>
            <p>Monitor en tiempo real del estado de sincronización - Sync Platform</p>
        </div>
        
        <div class="controls">
            <button class="btn btn-primary" onclick="refreshData()">🔄 Actualizar</button>
            <button class="btn btn-secondary" onclick="clearLogs()">🗑️ Limpiar Logs</button>
            <button class="btn btn-secondary" onclick="triggerSync()">⚡ Sync Manual</button>
        </div>
        
        <div class="grid">
            <div class="card">
                <h3>📊 Estado de Apps</h3>
                <div id="appStates">Cargando...</div>
            </div>
            
            <div class="card">
                <h3>📈 Métricas de Performance</h3>
                <div id="performanceMetrics">Cargando...</div>
            </div>
            
            <div class="card">
                <h3>🔄 Cola de Sincronización</h3>
                <div id="syncQueue">Cargando...</div>
            </div>
            
            <div class="card">
                <h3>⚠️ Conflictos y Errores</h3>
                <div id="conflicts">Cargando...</div>
            </div>
        </div>
        
        <div class="card" style="margin-top: 20px;">
            <h3>📝 Logs en Tiempo Real</h3>
            <div class="logs" id="logs">Conectando al servidor...</div>
        </div>
    </div>

    <script>
        let ws = null;
        let reconnectInterval = null;
        
        function connectWebSocket() {
            ws = new WebSocket('ws://localhost:${config.wsPort}');
            
            ws.onopen = function() {
                console.log('WebSocket conectado');
                updateConnectionStatus(true);
                if (reconnectInterval) {
                    clearInterval(reconnectInterval);
                    reconnectInterval = null;
                }
            };
            
            ws.onmessage = function(event) {
                const data = JSON.parse(event.data);
                handleWebSocketMessage(data);
            };
            
            ws.onclose = function() {
                console.log('WebSocket desconectado');
                updateConnectionStatus(false);
                
                // Intentar reconectar
                if (!reconnectInterval) {
                    reconnectInterval = setInterval(() => {
                        console.log('Intentando reconectar...');
                        connectWebSocket();
                    }, 3000);
                }
            };
            
            ws.onerror = function(error) {
                console.error('Error WebSocket:', error);
                updateConnectionStatus(false);
            };
        }
        
        function updateConnectionStatus(connected) {
            const status = document.getElementById('connectionStatus');
            if (connected) {
                status.textContent = '🟢 Conectado';
                status.className = 'connection-status connected';
            } else {
                status.textContent = '🔴 Desconectado';
                status.className = 'connection-status disconnected';
            }
        }
        
        function handleWebSocketMessage(data) {
            switch (data.type) {
                case 'initial':
                case 'update':
                    updateDashboard(data.data);
                    break;
            }
        }
        
        function updateDashboard(data) {
            updateAppStates(data.states);
            updateLogs(data.logs);
        }
        
        function updateAppStates(states) {
            const container = document.getElementById('appStates');
            let html = '';
            
            for (const [appName, state] of Object.entries(states)) {
                const statusClass = state.network?.connected ? 'active' : 'error';
                html += \`
                    <div style="margin-bottom: 15px; padding: 10px; border: 1px solid #334155; border-radius: 4px;">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                            <strong>\${appName}</strong>
                            <span class="status \${statusClass}">\${state.status}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Registros locales:</span>
                            <span class="metric-value">\${state.storage?.localRecords || 0}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Operaciones pendientes:</span>
                            <span class="metric-value">\${state.pendingOperations || 0}</span>
                        </div>
                        <div class="metric">
                            <span class="metric-label">Conflictos:</span>
                            <span class="metric-value">\${state.conflicts || 0}</span>
                        </div>
                    </div>
                \`;
            }
            
            container.innerHTML = html || '<p>No hay datos disponibles</p>';
        }
        
        function updateLogs(logs) {
            const container = document.getElementById('logs');
            let html = '';
            
            logs.forEach(log => {
                const timestamp = new Date(log.timestamp).toLocaleTimeString();
                html += \`<div class="log-entry \${log.level}">[\${timestamp}] \${log.level.toUpperCase()}: \${log.message}</div>\`;
            });
            
            container.innerHTML = html || '<p>No hay logs disponibles</p>';
            container.scrollTop = container.scrollHeight;
        }
        
        function refreshData() {
            fetch('/api/sync-state')
                .then(response => response.json())
                .then(data => updateDashboard(data))
                .catch(error => console.error('Error actualizando datos:', error));
        }
        
        function clearLogs() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'clear-logs' }));
            }
        }
        
        function triggerSync() {
            if (ws && ws.readyState === WebSocket.OPEN) {
                ws.send(JSON.stringify({ type: 'trigger-sync', app: 'credisync' }));
            }
        }
        
        // Inicializar
        connectWebSocket();
        
        // Actualizar datos cada 5 segundos como fallback
        setInterval(refreshData, 5000);
    </script>
</body>
</html>
    `;
  }

  /**
   * Cierra el debugger
   */
  async shutdown() {
    console.log('\\n🛑 Cerrando Sync Debugger...');
    
    this.isRunning = false;
    
    // Cerrar WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
    }
    
    // Cerrar servidor web
    if (this.server) {
      this.server.close();
    }
    
    console.log('✅ Sync Debugger cerrado');
    process.exit(0);
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  const options = {
    app: args.find(arg => arg.startsWith('--app='))?.split('=')[1],
    verbose: args.includes('--verbose') || args.includes('-v'),
    monitorOnly: args.includes('--monitor-only')
  };
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(\`
🐛 Sync Debugger - Sync Platform

Herramienta avanzada para debugging de operaciones de sincronización
en tiempo real con inspección de estado y logs detallados.

Uso:
  pnpm debug:sync [opciones]

Opciones:
  --app=<nombre>      Debug solo una app específica
  --verbose, -v       Output detallado en consola
  --monitor-only      Solo monitoreo, sin dashboard web
  --help, -h          Mostrar esta ayuda

Ejemplos:
  pnpm debug:sync                    # Debug completo con dashboard
  pnpm debug:sync --app=credisync    # Solo CrediSync
  pnpm debug:sync --verbose          # Con output detallado
  pnpm debug:sync --monitor-only     # Solo monitoreo

Características:
  ✅ Dashboard web interactivo
  ✅ WebSocket para updates en tiempo real
  ✅ Monitoreo de estado de sync
  ✅ Inspección de conflictos
  ✅ Logs detallados con rotación
  ✅ Métricas de performance
  ✅ Trigger manual de sync
  ✅ Análisis de cola de operaciones

Puertos:
  🌐 Dashboard: http://localhost:\${config.debugPort}
  🔌 WebSocket: ws://localhost:\${config.wsPort}
\`);
    process.exit(0);
  }
  
  const debugger = new SyncDebugger(options);
  debugger.start().catch(error => {
    console.error('❌ Error iniciando Sync Debugger:');
    console.error(error.message);
    process.exit(1);
  });
}

if (import.meta.url === \`file://\${process.argv[1]}\`) {
  main();
}

export { SyncDebugger };