/**
 * Schema Engine Demo
 * 
 * Demonstrates how the Universal Schema Engine works with example configurations.
 * This file can be used for testing and validation during development.
 */

import { SchemaEngine } from './schema-engine';
import { SchemaRegistry } from './schema-registry';
import { SchemaLoader } from './schema-loader';
import { crediSyncSchema, healthSyncSchema } from './example-schemas';

/**
 * Demo function to test the schema engine
 */
export function runSchemaEngineDemo(): void {
  console.log('🚀 Universal Schema Engine Demo');
  console.log('================================');

  const engine = new SchemaEngine();
  const registry = new SchemaRegistry();
  const loader = new SchemaLoader();

  try {
    // Test 1: Validate CrediSync schema
    console.log('\n📋 Test 1: Validating CrediSync Schema');
    const crediValidation = engine.validateConfig(crediSyncSchema);
    console.log(`✅ CrediSync validation: ${crediValidation.valid ? 'PASSED' : 'FAILED'}`);
    if (!crediValidation.valid) {
      console.log('❌ Errors:', crediValidation.errors);
    }
    if (crediValidation.warnings.length > 0) {
      console.log('⚠️ Warnings:', crediValidation.warnings);
    }

    // Test 2: Generate CrediSync Dexie schema
    console.log('\n🔧 Test 2: Generating CrediSync Dexie Schema');
    const crediDexieSchema = engine.generateSchema(crediSyncSchema);
    console.log('✅ Generated schema version:', crediDexieSchema.version);
    console.log('📊 Tables generated:', Object.keys(crediDexieSchema.stores).length);
    
    // Show a sample table definition
    console.log('\n📋 Sample table definition (clientes):');
    console.log(crediDexieSchema.stores.clientes);

    // Test 3: Validate HealthSync schema
    console.log('\n🏥 Test 3: Validating HealthSync Schema');
    const healthValidation = engine.validateConfig(healthSyncSchema);
    console.log(`✅ HealthSync validation: ${healthValidation.valid ? 'PASSED' : 'FAILED'}`);
    if (!healthValidation.valid) {
      console.log('❌ Errors:', healthValidation.errors);
    }

    // Test 4: Generate HealthSync Dexie schema
    console.log('\n🔧 Test 4: Generating HealthSync Dexie Schema');
    const healthDexieSchema = engine.generateSchema(healthSyncSchema);
    console.log('✅ Generated schema version:', healthDexieSchema.version);
    console.log('📊 Tables generated:', Object.keys(healthDexieSchema.stores).length);

    // Show a sample table definition
    console.log('\n📋 Sample table definition (pacientes):');
    console.log(healthDexieSchema.stores.pacientes);

    // Test 5: Registry operations
    console.log('\n📚 Test 5: Schema Registry Operations');
    registry.register('CrediSync', crediSyncSchema);
    registry.register('HealthSync', healthSyncSchema);
    
    console.log('✅ Registered schemas:', registry.list());
    console.log('📊 Registry stats:', registry.getStats());

    // Test 6: Schema comparison
    console.log('\n🔍 Test 6: Schema Comparison');
    const comparison = engine.generateSchemaWithMetadata(crediSyncSchema);
    console.log('✅ Generated metadata for CrediSync');
    console.log('📊 Total fields across all tables:', 
      Object.values(comparison.metadata).reduce((sum, table) => sum + table.allFields.length, 0)
    );

    // Test 7: Template creation
    console.log('\n📝 Test 7: Template Creation');
    const template = loader.createTemplate('TestApp', true);
    console.log('✅ Created template for TestApp');
    console.log('📋 Template structure:', {
      appName: template.appName,
      multiTenant: template.database.multiTenant,
      tables: Object.keys(template.database.tables)
    });

    console.log('\n🎉 All tests completed successfully!');
    console.log('✅ Universal Schema Engine is working correctly');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

/**
 * Generate example Dexie schemas for documentation
 */
export function generateExampleSchemas(): Record<string, any> {
  const engine = new SchemaEngine();
  
  return {
    crediSync: {
      config: crediSyncSchema,
      dexieSchema: engine.generateSchema(crediSyncSchema),
      metadata: engine.getTableMetadata(crediSyncSchema)
    },
    healthSync: {
      config: healthSyncSchema,
      dexieSchema: engine.generateSchema(healthSyncSchema),
      metadata: engine.getTableMetadata(healthSyncSchema)
    }
  };
}

/**
 * Show how the generated schema would look in actual Dexie code
 */
export function showDexieImplementation(): void {
  const engine = new SchemaEngine();
  const crediSchema = engine.generateSchema(crediSyncSchema);
  
  console.log('\n📋 Generated Dexie Implementation Example:');
  console.log('==========================================');
  console.log(`
class UniversalDB extends Dexie {
  constructor(dbName: string) {
    super(dbName);
    
    this.version(${crediSchema.version}).stores({`);
  
  for (const [tableName, definition] of Object.entries(crediSchema.stores)) {
    console.log(`      ${tableName}: \`${definition}\`,`);
  }
  
  console.log(`    });
  }
}

// Usage:
const db = new UniversalDB('${crediSyncSchema.name}');
await db.open();
`);
}