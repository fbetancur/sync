#!/usr/bin/env node

/**
 * 🔍 Analizador de Dependencias del Monorepo
 * 
 * Herramienta avanzada para análisis de dependencias, detección de problemas
 * y visualización del grafo de dependencias del monorepo
 * 
 * Uso:
 *   pnpm analyze:deps
 *   pnpm analyze:deps --circular --unused --outdated
 *   pnpm analyze:deps --visualize --export=svg
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'fs';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '../..');

// Configuración
const config = {
  outputDir: join(rootDir, 'tools/reports/dependency-analysis'),
  packages: ['packages/@sync/types', 'packages/@sync/core', 'packages/@sync/ui'],
  apps: ['apps/credisync', 'apps/healthsync', 'apps/surveysync'],
  ignorePatterns: [
    'node_modules',
    'dist',
    'build',
    '.git',
    'coverage',
    '.next',
    '.svelte-kit'
  ],
  fileExtensions: ['.ts', '.js', '.svelte', '.json'],
  maxDepth: 10
};

class DependencyAnalyzer {
  constructor(options = {}) {
    this.options = {
      circular: options.circular || false,
      unused: options.unused || false,
      outdated: options.outdated || false,
      visualize: options.visualize || false,
      export: options.export || 'json',
      verbose: options.verbose || false
    };
    
    this.dependencyGraph = new Map();
    this.packageInfo = new Map();
    this.circularDeps = [];
    this.unusedDeps = [];
    this.outdatedDeps = [];
    this.bundleImpact = new Map();
    
    // Crear directorio de output
    if (!existsSync(config.outputDir)) {
      mkdirSync(config.outputDir, { recursive: true });
    }
  }

  /**
   * Ejecuta el análisis completo
   */
  async analyze() {
    console.log('🔍 Iniciando análisis de dependencias...');
    
    // Cargar información de packages
    await this.loadPackageInfo();
    
    // Construir grafo de dependencias
    await this.buildDependencyGraph();
    
    // Análisis específicos
    if (this.options.circular) {
      await this.detectCircularDependencies();
    }
    
    if (this.options.unused) {
      await this.detectUnusedDependencies();
    }
    
    if (this.options.outdated) {
      await this.detectOutdatedDependencies();
    }
    
    // Análisis de impacto en bundle
    await this.analyzeBundleImpact();
    
    // Generar reportes
    await this.generateReports();
    
    // Visualización
    if (this.options.visualize) {
      await this.generateVisualization();
    }
    
    // Mostrar resumen
    this.showSummary();
    
    console.log(`✅ Análisis completado. Reportes en: ${config.outputDir}`);
  }

  /**
   * Carga información de todos los packages
   */
  async loadPackageInfo() {
    console.log('📦 Cargando información de packages...');
    
    const allPaths = [...config.packages, ...config.apps];
    
    for (const pkgPath of allPaths) {
      const fullPath = join(rootDir, pkgPath);
      const packageJsonPath = join(fullPath, 'package.json');
      
      if (existsSync(packageJsonPath)) {
        try {
          const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
          const info = {
            name: packageJson.name,
            version: packageJson.version,
            path: pkgPath,
            fullPath,
            dependencies: packageJson.dependencies || {},
            devDependencies: packageJson.devDependencies || {},
            peerDependencies: packageJson.peerDependencies || {},
            type: pkgPath.startsWith('packages/') ? 'package' : 'app',
            packageJson
          };
          
          this.packageInfo.set(info.name || pkgPath, info);
          
          if (this.options.verbose) {
            console.log(`  ✅ ${info.name || pkgPath}`);
          }
        } catch (error) {
          console.warn(`⚠️  Error cargando ${packageJsonPath}: ${error.message}`);
        }
      }
    }
    
    console.log(`📦 ${this.packageInfo.size} packages cargados`);
  }

  /**
   * Construye el grafo de dependencias
   */
  async buildDependencyGraph() {
    console.log('🕸️  Construyendo grafo de dependencias...');
    
    for (const [name, info] of this.packageInfo) {
      const node = {
        name,
        info,
        dependencies: new Set(),
        dependents: new Set(),
        fileDependencies: new Map(),
        externalDependencies: new Set()
      };
      
      // Analizar dependencias del package.json
      const allDeps = {
        ...info.dependencies,
        ...info.devDependencies,
        ...info.peerDependencies
      };
      
      for (const depName of Object.keys(allDeps)) {
        if (this.packageInfo.has(depName)) {
          // Dependencia interna
          node.dependencies.add(depName);
          
          // Añadir como dependent en el otro nodo
          if (!this.dependencyGraph.has(depName)) {
            this.dependencyGraph.set(depName, {
              name: depName,
              info: this.packageInfo.get(depName),
              dependencies: new Set(),
              dependents: new Set(),
              fileDependencies: new Map(),
              externalDependencies: new Set()
            });
          }
          this.dependencyGraph.get(depName).dependents.add(name);
        } else {
          // Dependencia externa
          node.externalDependencies.add(depName);
        }
      }
      
      // Analizar dependencias a nivel de archivo
      await this.analyzeFileDependencies(node);
      
      this.dependencyGraph.set(name, node);
    }
    
    console.log(`🕸️  Grafo construido: ${this.dependencyGraph.size} nodos`);
  }

  /**
   * Analiza dependencias a nivel de archivo
   */
  async analyzeFileDependencies(node) {
    const srcPath = join(node.info.fullPath, 'src');
    if (!existsSync(srcPath)) return;
    
    const files = this.getAllFiles(srcPath);
    
    for (const file of files) {
      const deps = this.extractImportsFromFile(file);
      if (deps.length > 0) {
        const relativePath = file.replace(node.info.fullPath, '');
        node.fileDependencies.set(relativePath, deps);
      }
    }
  }

  /**
   * Obtiene todos los archivos de un directorio recursivamente
   */
  getAllFiles(dir, files = []) {
    if (!existsSync(dir)) return files;
    
    const items = readdirSync(dir, { withFileTypes: true });
    
    for (const item of items) {
      const fullPath = join(dir, item.name);
      
      if (item.isDirectory()) {
        if (!config.ignorePatterns.some(pattern => item.name.includes(pattern))) {
          this.getAllFiles(fullPath, files);
        }
      } else if (config.fileExtensions.some(ext => item.name.endsWith(ext))) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  /**
   * Extrae imports de un archivo
   */
  extractImportsFromFile(filePath) {
    try {
      const content = readFileSync(filePath, 'utf8');
      const imports = [];
      
      // Regex para diferentes tipos de imports
      const importPatterns = [
        /import\\s+.*?from\\s+['"]([^'"]+)['"]/g,
        /import\\s*\\(\\s*['"]([^'"]+)['"]\\s*\\)/g,
        /require\\s*\\(\\s*['"]([^'"]+)['"]\\s*\\)/g,
        /from\\s+['"]([^'"]+)['"]/g
      ];
      
      for (const pattern of importPatterns) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const importPath = match[1];
          if (importPath && !importPath.startsWith('.')) {
            // Es una dependencia externa o de package
            imports.push(importPath);
          }
        }
      }
      
      return [...new Set(imports)]; // Remover duplicados
    } catch (error) {
      if (this.options.verbose) {
        console.warn(`⚠️  Error analizando ${filePath}: ${error.message}`);
      }
      return [];
    }
  }

  /**
   * Detecta dependencias circulares
   */
  async detectCircularDependencies() {
    console.log('🔄 Detectando dependencias circulares...');
    
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];
    
    const dfs = (nodeName, path = []) => {
      if (recursionStack.has(nodeName)) {
        // Encontramos un ciclo
        const cycleStart = path.indexOf(nodeName);
        const cycle = path.slice(cycleStart).concat([nodeName]);
        cycles.push(cycle);
        return;
      }
      
      if (visited.has(nodeName)) {
        return;
      }
      
      visited.add(nodeName);
      recursionStack.add(nodeName);
      path.push(nodeName);
      
      const node = this.dependencyGraph.get(nodeName);
      if (node) {
        for (const depName of node.dependencies) {
          dfs(depName, [...path]);
        }
      }
      
      recursionStack.delete(nodeName);
      path.pop();
    };
    
    // Ejecutar DFS desde cada nodo
    for (const nodeName of this.dependencyGraph.keys()) {
      if (!visited.has(nodeName)) {
        dfs(nodeName);
      }
    }
    
    this.circularDeps = cycles;
    
    if (cycles.length > 0) {
      console.log(`⚠️  ${cycles.length} dependencias circulares encontradas`);
      if (this.options.verbose) {
        cycles.forEach((cycle, i) => {
          console.log(`  ${i + 1}. ${cycle.join(' → ')}`);
        });
      }
    } else {
      console.log('✅ No se encontraron dependencias circulares');
    }
  }

  /**
   * Detecta dependencias no utilizadas
   */
  async detectUnusedDependencies() {
    console.log('🗑️  Detectando dependencias no utilizadas...');
    
    for (const [name, node] of this.dependencyGraph) {
      const packageDeps = new Set([
        ...Object.keys(node.info.dependencies || {}),
        ...Object.keys(node.info.devDependencies || {})
      ]);
      
      const usedDeps = new Set();
      
      // Recopilar todas las dependencias usadas en archivos
      for (const fileDeps of node.fileDependencies.values()) {
        fileDeps.forEach(dep => {
          // Extraer el nombre del package principal
          const packageName = dep.split('/')[0];
          if (packageName.startsWith('@')) {
            // Scoped package
            const scopedName = dep.split('/').slice(0, 2).join('/');
            usedDeps.add(scopedName);
          } else {
            usedDeps.add(packageName);
          }
        });
      }
      
      // Encontrar dependencias no utilizadas
      const unused = [];
      for (const dep of packageDeps) {
        if (!usedDeps.has(dep) && !this.isEssentialDependency(dep)) {
          unused.push(dep);
        }
      }
      
      if (unused.length > 0) {
        this.unusedDeps.push({
          package: name,
          unused
        });
      }
    }
    
    if (this.unusedDeps.length > 0) {
      console.log(`🗑️  Dependencias no utilizadas encontradas en ${this.unusedDeps.length} packages`);
    } else {
      console.log('✅ No se encontraron dependencias no utilizadas');
    }
  }

  /**
   * Verifica si una dependencia es esencial (build tools, etc.)
   */
  isEssentialDependency(depName) {
    const essentialDeps = [
      'typescript', 'vite', 'vitest', 'eslint', 'prettier',
      'svelte', '@sveltejs/vite-plugin-svelte', 'tailwindcss',
      'postcss', 'autoprefixer', 'daisyui'
    ];
    
    return essentialDeps.some(essential => 
      depName === essential || depName.startsWith(essential)
    );
  }

  /**
   * Detecta dependencias desactualizadas
   */
  async detectOutdatedDependencies() {
    console.log('📅 Detectando dependencias desactualizadas...');
    
    try {
      // Ejecutar npm outdated para obtener información
      const result = execSync('pnpm outdated --format json', {
        cwd: rootDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      const outdatedData = JSON.parse(result);
      
      for (const [packageName, info] of Object.entries(outdatedData)) {
        this.outdatedDeps.push({
          name: packageName,
          current: info.current,
          wanted: info.wanted,
          latest: info.latest,
          severity: this.getUpdateSeverity(info.current, info.latest)
        });
      }
      
      if (this.outdatedDeps.length > 0) {
        console.log(`📅 ${this.outdatedDeps.length} dependencias desactualizadas encontradas`);
      } else {
        console.log('✅ Todas las dependencias están actualizadas');
      }
    } catch (error) {
      console.warn('⚠️  No se pudo verificar dependencias desactualizadas');
      if (this.options.verbose) {
        console.warn(error.message);
      }
    }
  }

  /**
   * Determina la severidad de una actualización
   */
  getUpdateSeverity(current, latest) {
    try {
      const currentParts = current.split('.').map(Number);
      const latestParts = latest.split('.').map(Number);
      
      if (latestParts[0] > currentParts[0]) return 'major';
      if (latestParts[1] > currentParts[1]) return 'minor';
      if (latestParts[2] > currentParts[2]) return 'patch';
      
      return 'none';
    } catch {
      return 'unknown';
    }
  }

  /**
   * Analiza el impacto en el bundle
   */
  async analyzeBundleImpact() {
    console.log('📦 Analizando impacto en bundle...');
    
    for (const [name, node] of this.dependencyGraph) {
      if (node.info.type === 'package') {
        const impact = await this.calculateBundleImpact(node);
        this.bundleImpact.set(name, impact);
      }
    }
  }

  /**
   * Calcula el impacto en bundle de un package
   */
  async calculateBundleImpact(node) {
    try {
      // Simular análisis de bundle (en implementación real usaría bundler)
      const srcPath = join(node.info.fullPath, 'src');
      const files = this.getAllFiles(srcPath);
      
      let totalSize = 0;
      let fileCount = 0;
      
      for (const file of files) {
        try {
          const stats = require('fs').statSync(file);
          totalSize += stats.size;
          fileCount++;
        } catch (error) {
          // Ignorar errores de archivos individuales
        }
      }
      
      return {
        estimatedSize: totalSize,
        fileCount,
        complexity: this.calculateComplexity(node),
        treeshakeable: this.isTreeshakeable(node)
      };
    } catch (error) {
      return {
        estimatedSize: 0,
        fileCount: 0,
        complexity: 'unknown',
        treeshakeable: false
      };
    }
  }

  /**
   * Calcula la complejidad de un package
   */
  calculateComplexity(node) {
    const depCount = node.dependencies.size + node.externalDependencies.size;
    const fileCount = node.fileDependencies.size;
    
    if (depCount > 20 || fileCount > 50) return 'high';
    if (depCount > 10 || fileCount > 20) return 'medium';
    return 'low';
  }

  /**
   * Verifica si un package es tree-shakeable
   */
  isTreeshakeable(node) {
    // Verificar si tiene exports específicos en package.json
    const packageJson = node.info.packageJson;
    return !!(packageJson.exports || packageJson.module);
  }

  /**
   * Genera reportes de análisis
   */
  async generateReports() {
    console.log('📄 Generando reportes...');
    
    const timestamp = new Date().toISOString();
    
    // Reporte principal
    const mainReport = {
      timestamp,
      summary: {
        totalPackages: this.packageInfo.size,
        internalPackages: Array.from(this.packageInfo.values()).filter(p => p.type === 'package').length,
        apps: Array.from(this.packageInfo.values()).filter(p => p.type === 'app').length,
        circularDependencies: this.circularDeps.length,
        unusedDependencies: this.unusedDeps.length,
        outdatedDependencies: this.outdatedDeps.length
      },
      dependencyGraph: this.serializeDependencyGraph(),
      circularDependencies: this.circularDeps,
      unusedDependencies: this.unusedDeps,
      outdatedDependencies: this.outdatedDeps,
      bundleImpact: Object.fromEntries(this.bundleImpact)
    };
    
    // Escribir reporte principal
    const reportPath = join(config.outputDir, 'dependency-analysis.json');
    writeFileSync(reportPath, JSON.stringify(mainReport, null, 2));
    
    // Generar reporte markdown
    await this.generateMarkdownReport(mainReport);
    
    console.log(`📄 Reportes generados en ${config.outputDir}`);
  }

  /**
   * Serializa el grafo de dependencias para JSON
   */
  serializeDependencyGraph() {
    const serialized = {};
    
    for (const [name, node] of this.dependencyGraph) {
      serialized[name] = {
        name: node.name,
        type: node.info.type,
        dependencies: Array.from(node.dependencies),
        dependents: Array.from(node.dependents),
        externalDependencies: Array.from(node.externalDependencies),
        fileCount: node.fileDependencies.size
      };
    }
    
    return serialized;
  }

  /**
   * Genera reporte en formato Markdown
   */
  async generateMarkdownReport(report) {
    const markdown = `# Análisis de Dependencias - Sync Platform

**Generado:** ${new Date(report.timestamp).toLocaleString()}

## 📊 Resumen

- **Total de packages:** ${report.summary.totalPackages}
- **Packages internos:** ${report.summary.internalPackages}
- **Aplicaciones:** ${report.summary.apps}
- **Dependencias circulares:** ${report.summary.circularDependencies}
- **Dependencias no utilizadas:** ${report.summary.unusedDependencies}
- **Dependencias desactualizadas:** ${report.summary.outdatedDependencies}

## 🔄 Dependencias Circulares

${report.circularDependencies.length > 0 
  ? report.circularDependencies.map((cycle, i) => 
      `${i + 1}. \`${cycle.join(' → ')}\``
    ).join('\\n')
  : '✅ No se encontraron dependencias circulares'
}

## 🗑️ Dependencias No Utilizadas

${report.unusedDependencies.length > 0
  ? report.unusedDependencies.map(item => 
      `### ${item.package}\\n${item.unused.map(dep => `- \`${dep}\``).join('\\n')}`
    ).join('\\n\\n')
  : '✅ No se encontraron dependencias no utilizadas'
}

## 📅 Dependencias Desactualizadas

${report.outdatedDependencies.length > 0
  ? `| Package | Actual | Deseada | Última | Severidad |
|---------|--------|---------|--------|-----------|
${report.outdatedDependencies.map(dep => 
  `| \`${dep.name}\` | ${dep.current} | ${dep.wanted} | ${dep.latest} | ${dep.severity} |`
).join('\\n')}`
  : '✅ Todas las dependencias están actualizadas'
}

## 📦 Impacto en Bundle

| Package | Tamaño Estimado | Archivos | Complejidad | Tree-shakeable |
|---------|-----------------|----------|-------------|----------------|
${Object.entries(report.bundleImpact).map(([name, impact]) => 
  `| \`${name}\` | ${(impact.estimatedSize / 1024).toFixed(1)} KB | ${impact.fileCount} | ${impact.complexity} | ${impact.treeshakeable ? '✅' : '❌'} |`
).join('\\n')}

## 🕸️ Grafo de Dependencias

${Object.entries(report.dependencyGraph).map(([name, node]) => 
  `### ${name} (${node.type})
- **Dependencias:** ${node.dependencies.length > 0 ? node.dependencies.map(d => `\`${d}\``).join(', ') : 'Ninguna'}
- **Dependientes:** ${node.dependents.length > 0 ? node.dependents.map(d => `\`${d}\``).join(', ') : 'Ninguno'}
- **Deps externas:** ${node.externalDependencies.length}
- **Archivos:** ${node.fileCount}`
).join('\\n\\n')}

## 🔧 Recomendaciones

${this.generateRecommendations(report)}

---

*Reporte generado automáticamente por el Analizador de Dependencias de Sync Platform*
`;

    const markdownPath = join(config.outputDir, 'dependency-analysis.md');
    writeFileSync(markdownPath, markdown);
  }

  /**
   * Genera recomendaciones basadas en el análisis
   */
  generateRecommendations(report) {
    const recommendations = [];
    
    if (report.circularDependencies.length > 0) {
      recommendations.push('🔄 **Resolver dependencias circulares:** Las dependencias circulares pueden causar problemas de build y runtime. Considera refactorizar para eliminarlas.');
    }
    
    if (report.unusedDependencies.length > 0) {
      recommendations.push('🗑️ **Limpiar dependencias no utilizadas:** Remover dependencias no utilizadas reduce el tamaño del bundle y mejora los tiempos de instalación.');
    }
    
    if (report.outdatedDependencies.length > 0) {
      const majorUpdates = report.outdatedDependencies.filter(d => d.severity === 'major').length;
      if (majorUpdates > 0) {
        recommendations.push(`📅 **Actualizar dependencias:** ${majorUpdates} dependencias tienen actualizaciones major disponibles. Revisar breaking changes antes de actualizar.`);
      } else {
        recommendations.push('📅 **Actualizar dependencias:** Mantener dependencias actualizadas mejora la seguridad y performance.');
      }
    }
    
    const highComplexityPackages = Object.entries(report.bundleImpact)
      .filter(([_, impact]) => impact.complexity === 'high').length;
    
    if (highComplexityPackages > 0) {
      recommendations.push(`📦 **Optimizar packages complejos:** ${highComplexityPackages} packages tienen alta complejidad. Considera dividirlos en módulos más pequeños.`);
    }
    
    const nonTreeshakeablePackages = Object.entries(report.bundleImpact)
      .filter(([_, impact]) => !impact.treeshakeable).length;
    
    if (nonTreeshakeablePackages > 0) {
      recommendations.push(`🌳 **Mejorar tree-shaking:** ${nonTreeshakeablePackages} packages no son tree-shakeable. Añadir exports específicos en package.json.`);
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ **Excelente:** No se encontraron problemas significativos en las dependencias.');
    }
    
    return recommendations.map((rec, i) => `${i + 1}. ${rec}`).join('\\n');
  }

  /**
   * Genera visualización del grafo
   */
  async generateVisualization() {
    console.log('🎨 Generando visualización...');
    
    // Generar formato DOT para Graphviz
    const dotContent = this.generateDotGraph();
    const dotPath = join(config.outputDir, 'dependency-graph.dot');
    writeFileSync(dotPath, dotContent);
    
    // Generar formato Mermaid
    const mermaidContent = this.generateMermaidGraph();
    const mermaidPath = join(config.outputDir, 'dependency-graph.mmd');
    writeFileSync(mermaidPath, mermaidContent);
    
    console.log('🎨 Visualizaciones generadas (DOT y Mermaid)');
  }

  /**
   * Genera grafo en formato DOT
   */
  generateDotGraph() {
    let dot = 'digraph DependencyGraph {\\n';
    dot += '  rankdir=TB;\\n';
    dot += '  node [shape=box, style=rounded];\\n\\n';
    
    // Definir nodos
    for (const [name, node] of this.dependencyGraph) {
      const color = node.info.type === 'package' ? 'lightblue' : 'lightgreen';
      dot += `  "${name}" [fillcolor=${color}, style=filled];\\n`;
    }
    
    dot += '\\n';
    
    // Definir edges
    for (const [name, node] of this.dependencyGraph) {
      for (const dep of node.dependencies) {
        dot += `  "${name}" -> "${dep}";\\n`;
      }
    }
    
    dot += '}\\n';
    return dot;
  }

  /**
   * Genera grafo en formato Mermaid
   */
  generateMermaidGraph() {
    let mermaid = 'graph TD\\n';
    
    // Definir nodos con estilos
    for (const [name, node] of this.dependencyGraph) {
      const nodeId = name.replace(/[^a-zA-Z0-9]/g, '_');
      const displayName = name.replace('@sync/', '');
      
      if (node.info.type === 'package') {
        mermaid += `  ${nodeId}[${displayName}]:::package\\n`;
      } else {
        mermaid += `  ${nodeId}[${displayName}]:::app\\n`;
      }
    }
    
    mermaid += '\\n';
    
    // Definir conexiones
    for (const [name, node] of this.dependencyGraph) {
      const nodeId = name.replace(/[^a-zA-Z0-9]/g, '_');
      for (const dep of node.dependencies) {
        const depId = dep.replace(/[^a-zA-Z0-9]/g, '_');
        mermaid += `  ${nodeId} --> ${depId}\\n`;
      }
    }
    
    // Definir estilos
    mermaid += '\\n';
    mermaid += '  classDef package fill:#e1f5fe,stroke:#01579b,stroke-width:2px\\n';
    mermaid += '  classDef app fill:#f3e5f5,stroke:#4a148c,stroke-width:2px\\n';
    
    return mermaid;
  }

  /**
   * Muestra resumen en consola
   */
  showSummary() {
    console.log('\\n📊 RESUMEN DEL ANÁLISIS');
    console.log('========================');
    console.log(`📦 Total packages: ${this.packageInfo.size}`);
    console.log(`🔄 Dependencias circulares: ${this.circularDeps.length}`);
    console.log(`🗑️  Dependencias no utilizadas: ${this.unusedDeps.length}`);
    console.log(`📅 Dependencias desactualizadas: ${this.outdatedDeps.length}`);
    
    if (this.circularDeps.length > 0) {
      console.log('\\n⚠️  DEPENDENCIAS CIRCULARES:');
      this.circularDeps.forEach((cycle, i) => {
        console.log(`  ${i + 1}. ${cycle.join(' → ')}`);
      });
    }
    
    if (this.unusedDeps.length > 0) {
      console.log('\\n🗑️  DEPENDENCIAS NO UTILIZADAS:');
      this.unusedDeps.forEach(item => {
        console.log(`  ${item.package}: ${item.unused.join(', ')}`);
      });
    }
    
    console.log(`\\n📁 Reportes guardados en: ${config.outputDir}`);
  }
}

// CLI
function main() {
  const args = process.argv.slice(2);
  
  const options = {
    circular: args.includes('--circular'),
    unused: args.includes('--unused'),
    outdated: args.includes('--outdated'),
    visualize: args.includes('--visualize'),
    export: args.find(arg => arg.startsWith('--export='))?.split('=')[1] || 'json',
    verbose: args.includes('--verbose') || args.includes('-v')
  };
  
  // Si no se especifica ningún análisis, hacer todos
  if (!options.circular && !options.unused && !options.outdated) {
    options.circular = true;
    options.unused = true;
    options.outdated = true;
  }
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
🔍 Analizador de Dependencias - Sync Platform

Herramienta avanzada para análisis de dependencias, detección de problemas
y visualización del grafo de dependencias del monorepo.

Uso:
  pnpm analyze:deps [opciones]

Opciones:
  --circular          Detectar dependencias circulares
  --unused            Detectar dependencias no utilizadas
  --outdated          Detectar dependencias desactualizadas
  --visualize         Generar visualización del grafo
  --export=<formato>  Formato de export (json, svg, png)
  --verbose, -v       Output detallado
  --help, -h          Mostrar esta ayuda

Ejemplos:
  pnpm analyze:deps                    # Análisis completo
  pnpm analyze:deps --circular         # Solo dependencias circulares
  pnpm analyze:deps --unused           # Solo dependencias no utilizadas
  pnpm analyze:deps --visualize        # Con visualización
  pnpm analyze:deps --verbose          # Con output detallado

Características:
  ✅ Detección de dependencias circulares
  ✅ Identificación de dependencias no utilizadas
  ✅ Análisis de dependencias desactualizadas
  ✅ Cálculo de impacto en bundle
  ✅ Visualización del grafo de dependencias
  ✅ Reportes en JSON y Markdown
  ✅ Recomendaciones automáticas
  ✅ Análisis a nivel de archivo

Outputs:
  📄 dependency-analysis.json    # Reporte completo
  📄 dependency-analysis.md      # Reporte legible
  🎨 dependency-graph.dot        # Grafo para Graphviz
  🎨 dependency-graph.mmd        # Grafo para Mermaid
`);
    process.exit(0);
  }
  
  const analyzer = new DependencyAnalyzer(options);
  analyzer.analyze().catch(error => {
    console.error('❌ Error en análisis de dependencias:');
    console.error(error.message);
    process.exit(1);
  });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { DependencyAnalyzer };