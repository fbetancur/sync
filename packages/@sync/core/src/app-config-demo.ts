/**
 * App Configuration Demo
 * 
 * Demonstrates how to use the new universal configuration system
 * with both legacy and universal database options.
 */

import { 
  createSyncApp, 
  createDefaultConfig, 
  createUniversalConfig, 
  createConfigFromSchema,
  getDatabaseInfo,
  type SyncAppConfig 
} from './app';

import { crediSyncSchema, healthSyncSchema, crediSyncAppConfig, healthSyncAppConfig } from './schema/example-schemas';

/**
 * Demo function showing different configuration approaches
 */
export function runAppConfigDemo(): void {
  console.log('🚀 App Configuration Demo');
  console.log('=========================');

  // Demo 1: Legacy CrediSync configuration (backward compatibility)
  console.log('\n💰 Demo 1: Legacy CrediSync Configuration');
  const legacyCrediConfig: SyncAppConfig = {
    appName: 'CrediSync',
    supabase: {
      url: 'https://example.supabase.co',
      anonKey: 'example-key'
    }
    // No databaseSchema = uses legacy MicrocreditosDB
  };

  const dbInfo1 = getDatabaseInfo(legacyCrediConfig);
  console.log('📊 Database info:', dbInfo1);

  // Demo 2: Universal CrediSync configuration (with schema)
  console.log('\n💰 Demo 2: Universal CrediSync Configuration');
  const universalCrediConfig = createUniversalConfig('CrediSync', crediSyncSchema, {
    supabaseUrl: 'https://example.supabase.co',
    supabaseKey: 'example-key'
  });

  const dbInfo2 = getDatabaseInfo(universalCrediConfig);
  console.log('📊 Database info:', dbInfo2);

  // Demo 3: HealthSync configuration from schema file
  console.log('\n🏥 Demo 3: HealthSync from Schema File');
  const healthConfig = createConfigFromSchema(healthSyncAppConfig, {
    supabaseUrl: 'https://health.supabase.co',
    supabaseKey: 'health-key'
  });

  const dbInfo3 = getDatabaseInfo(healthConfig);
  console.log('📊 Database info:', dbInfo3);

  // Demo 4: Show configuration differences
  console.log('\n🔍 Demo 4: Configuration Comparison');
  console.log('Legacy CrediSync:', {
    appName: legacyCrediConfig.appName,
    hasSchema: !!legacyCrediConfig.databaseSchema,
    dbType: dbInfo1.type,
    dbName: dbInfo1.name
  });

  console.log('Universal CrediSync:', {
    appName: universalCrediConfig.appName,
    hasSchema: !!universalCrediConfig.databaseSchema,
    dbType: dbInfo2.type,
    dbName: dbInfo2.name
  });

  console.log('HealthSync:', {
    appName: healthConfig.appName,
    hasSchema: !!healthConfig.databaseSchema,
    dbType: dbInfo3.type,
    dbName: dbInfo3.name
  });

  console.log('\n✅ Configuration demo completed!');
}

/**
 * Demonstrate creating apps with different configurations
 */
export async function demonstrateAppCreation(): Promise<void> {
  console.log('\n🏭 App Creation Demo');
  console.log('===================');

  try {
    // Create legacy CrediSync app
    console.log('\n💰 Creating Legacy CrediSync App');
    const legacyApp = createSyncApp({
      appName: 'CrediSync',
      supabase: {
        url: 'https://hmnlriywocnpiktflehr.supabase.co',
        anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDE4MzIsImV4cCI6MjA4MDg3NzgzMn0.P4ZZdWAPgby89Rc8yYAZB9f2bwRrRuLEsS_6peobkf4'
      }
    });

    console.log('✅ Legacy app created');
    console.log('📊 App config:', {
      name: legacyApp.config.appName,
      isStarted: legacyApp.isStarted,
      dbType: getDatabaseInfo(legacyApp.config).type
    });

    // Create universal HealthSync app
    console.log('\n🏥 Creating Universal HealthSync App');
    const healthApp = createSyncApp(createConfigFromSchema(healthSyncAppConfig, {
      supabaseUrl: 'https://hmnlriywocnpiktflehr.supabase.co',
      supabaseKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhtbmxyaXl3b2NucGlrdGZsZWhyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzMDE4MzIsImV4cCI6MjA4MDg3NzgzMn0.P4ZZdWAPgby89Rc8yYAZB9f2bwRrRuLEsS_6peobkf4'
    }));

    console.log('✅ Universal app created');
    console.log('📊 App config:', {
      name: healthApp.config.appName,
      isStarted: healthApp.isStarted,
      dbType: getDatabaseInfo(healthApp.config).type,
      tables: healthApp.config.databaseSchema ? Object.keys(healthApp.config.databaseSchema.tables) : []
    });

    console.log('\n✅ App creation demo completed!');

  } catch (error) {
    console.error('❌ App creation demo failed:', error.message);
  }
}

/**
 * Show migration path from legacy to universal
 */
export function showMigrationPath(): void {
  console.log('\n🔄 Migration Path Demo');
  console.log('=====================');

  console.log('\n📋 Step 1: Current CrediSync (Legacy)');
  console.log('```typescript');
  console.log('const crediSyncApp = createSyncApp({');
  console.log('  appName: "CrediSync",');
  console.log('  supabase: { url: "...", anonKey: "..." }');
  console.log('  // No databaseSchema → Uses MicrocreditosDB');
  console.log('});');
  console.log('// Result: microcreditos_db with fixed tables');
  console.log('```');

  console.log('\n📋 Step 2: Add Schema Configuration');
  console.log('```json');
  console.log('// apps/credisync/credisync-schema.json');
  console.log('{');
  console.log('  "appName": "CrediSync",');
  console.log('  "database": {');
  console.log('    "name": "credisync_db",  // ← New name!');
  console.log('    "tables": {');
  console.log('      "clientes": { "fields": [...] },');
  console.log('      "creditos": { "fields": [...] }');
  console.log('    }');
  console.log('  }');
  console.log('}');
  console.log('```');

  console.log('\n📋 Step 3: Update CrediSync Configuration');
  console.log('```typescript');
  console.log('import crediSyncSchema from "./credisync-schema.json";');
  console.log('');
  console.log('const crediSyncApp = createSyncApp({');
  console.log('  appName: "CrediSync",');
  console.log('  databaseSchema: crediSyncSchema.database,  // ← Add this!');
  console.log('  supabase: { url: "...", anonKey: "..." }');
  console.log('});');
  console.log('// Result: credisync_db with dynamic tables');
  console.log('```');

  console.log('\n📋 Step 4: Benefits After Migration');
  console.log('✅ Database name: microcreditos_db → credisync_db');
  console.log('✅ Schema flexibility: Can modify tables via JSON');
  console.log('✅ Same functionality: All existing code works');
  console.log('✅ Future ready: Easy to add new tables');

  console.log('\n✅ Migration path demo completed!');
}

/**
 * Run all demos
 */
export function runAllAppConfigDemos(): void {
  runAppConfigDemo();
  showMigrationPath();
  // Note: demonstrateAppCreation() requires async and actual Supabase connection
}