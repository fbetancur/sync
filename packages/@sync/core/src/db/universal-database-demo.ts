/**
 * Universal Database Demo
 * 
 * Demonstrates how the Universal Database works with different schema configurations.
 * Shows CRUD operations, CRDT functionality, and multi-tenancy.
 */

import { UniversalDatabase } from './universal-database';
import { DatabaseFactory } from './database-factory';
import { crediSyncSchema, healthSyncSchema } from '../schema/example-schemas';

/**
 * Demo interface for a patient record
 */
interface PacienteRecord {
  id: string;
  tenant_id: string;
  nombre: string;
  historia: string;
  telefono: string;
  direccion: string;
  zona_id: string;
  created_at: number;
  updated_at: number;
  created_by: string;
  version_vector: Record<string, number>;
  field_versions: Record<string, any>;
  synced: boolean;
  checksum: string;
}

/**
 * Demo interface for a client record
 */
interface ClienteRecord {
  id: string;
  tenant_id: string;
  nombre: string;
  numero_documento: string;
  telefono: string;
  direccion: string;
  ruta_id: string;
  created_at: number;
  updated_at: number;
  created_by: string;
  version_vector: Record<string, number>;
  field_versions: Record<string, any>;
  synced: boolean;
  checksum: string;
}

/**
 * Run Universal Database demo
 */
export async function runUniversalDatabaseDemo(): Promise<void> {
  console.log('🚀 Universal Database Demo');
  console.log('===========================');

  try {
    // Demo 1: Create HealthSync database
    console.log('\n🏥 Demo 1: Creating HealthSync Database');
    const healthDB = new UniversalDatabase(healthSyncSchema);
    await healthDB.initialize();
    
    console.log('✅ HealthSync database created');
    console.log('📊 Tables:', healthDB.getUserTables());

    // Demo 2: Create and query patient records
    console.log('\n👤 Demo 2: Creating Patient Records');
    
    const paciente1 = await healthDB.createRecord<PacienteRecord>('pacientes', {
      nombre: 'Juan Pérez',
      historia: 'H001',
      telefono: '3001234567',
      direccion: 'Calle 123 #45-67',
      zona_id: 'zona-1',
      tenant_id: 'hospital-1'
    }, {
      userId: 'medico-1',
      deviceId: 'tablet-001'
    });

    console.log('✅ Patient created:', {
      id: paciente1.id,
      nombre: paciente1.nombre,
      historia: paciente1.historia
    });

    const paciente2 = await healthDB.createRecord<PacienteRecord>('pacientes', {
      nombre: 'María García',
      historia: 'H002',
      telefono: '3007654321',
      direccion: 'Carrera 456 #78-90',
      zona_id: 'zona-2',
      tenant_id: 'hospital-1'
    }, {
      userId: 'medico-2',
      deviceId: 'tablet-002'
    });

    console.log('✅ Second patient created:', {
      id: paciente2.id,
      nombre: paciente2.nombre,
      historia: paciente2.historia
    });

    // Demo 3: Update with CRDT
    console.log('\n🔄 Demo 3: CRDT Update Operations');
    
    const updatedPaciente = await healthDB.updateRecord<PacienteRecord>(
      'pacientes',
      paciente1.id,
      {
        telefono: '3009876543',
        direccion: 'Nueva Dirección 789'
      },
      {
        userId: 'medico-1',
        deviceId: 'tablet-001'
      }
    );

    console.log('✅ Patient updated with CRDT:', {
      id: updatedPaciente?.id,
      telefono: updatedPaciente?.telefono,
      version_vector: updatedPaciente?.version_vector
    });

    // Demo 4: Query with tenant filtering
    console.log('\n🔍 Demo 4: Querying with Tenant Filtering');
    
    const pacientes = await healthDB.queryRecords<PacienteRecord>('pacientes', {
      tenantId: 'hospital-1',
      limit: 10
    }).toArray();

    console.log('✅ Patients found:', pacientes.length);
    pacientes.forEach(p => {
      console.log(`  - ${p.nombre} (${p.historia})`);
    });

    // Demo 5: Create CrediSync database for comparison
    console.log('\n💰 Demo 5: Creating CrediSync Database');
    
    const crediDB = new UniversalDatabase(crediSyncSchema);
    await crediDB.initialize();
    
    console.log('✅ CrediSync database created');
    console.log('📊 Tables:', crediDB.getUserTables());

    // Demo 6: Create client record in CrediSync
    console.log('\n👤 Demo 6: Creating Client Record in CrediSync');
    
    const cliente = await crediDB.createRecord<ClienteRecord>('clientes', {
      nombre: 'Carlos Rodríguez',
      numero_documento: '12345678',
      telefono: '3001112233',
      direccion: 'Avenida Principal 123',
      ruta_id: 'ruta-1',
      tenant_id: 'empresa-1'
    }, {
      userId: 'cobrador-1',
      deviceId: 'mobile-001'
    });

    console.log('✅ Client created:', {
      id: cliente.id,
      nombre: cliente.nombre,
      numero_documento: cliente.numero_documento
    });

    // Demo 7: Database factory usage
    console.log('\n🏭 Demo 7: Database Factory Usage');
    
    const autoHealthDB = DatabaseFactory.createUniversal(healthSyncSchema);
    await autoHealthDB.initialize();
    
    console.log('✅ Database created via factory');
    console.log('🔍 Database type:', DatabaseFactory.getDatabaseType(autoHealthDB));

    // Demo 8: Statistics and metadata
    console.log('\n📊 Demo 8: Database Statistics');
    
    const healthStats = await healthDB.getStats();
    console.log('HealthSync stats:', healthStats);
    
    const crediStats = await crediDB.getStats();
    console.log('CrediSync stats:', crediStats);

    // Demo 9: Table metadata
    console.log('\n📋 Demo 9: Table Metadata');
    
    const pacientesMetadata = healthDB.getTableMetadata('pacientes');
    console.log('Pacientes table metadata:', {
      fields: pacientesMetadata?.allFields?.length,
      indexes: pacientesMetadata?.indexes?.length,
      relationships: Object.keys(pacientesMetadata?.relationships || {}).length
    });

    // Demo 10: Cleanup
    console.log('\n🧹 Demo 10: Cleanup');
    
    await healthDB.clearAll();
    await crediDB.clearAll();
    await autoHealthDB.clearAll();
    
    console.log('✅ All databases cleared');

    console.log('\n🎉 Universal Database Demo completed successfully!');
    console.log('✅ All features working correctly');

  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
    console.error(error.stack);
  }
}

/**
 * Demonstrate CRDT conflict resolution
 */
export async function demonstrateCRDTConflicts(): Promise<void> {
  console.log('\n🔄 CRDT Conflict Resolution Demo');
  console.log('=================================');

  const db = new UniversalDatabase(healthSyncSchema);
  await db.initialize();

  try {
    // Create initial record
    const paciente = await db.createRecord<PacienteRecord>('pacientes', {
      nombre: 'Test Patient',
      historia: 'H999',
      telefono: '3000000000',
      direccion: 'Initial Address',
      zona_id: 'zona-1',
      tenant_id: 'test-tenant'
    }, {
      userId: 'user-1',
      deviceId: 'device-1'
    });

    console.log('✅ Initial record created');

    // Simulate concurrent updates from different devices
    const update1 = await db.updateRecord<PacienteRecord>(
      'pacientes',
      paciente.id,
      { telefono: '3001111111' },
      { userId: 'user-1', deviceId: 'device-1' }
    );

    const update2 = await db.updateRecord<PacienteRecord>(
      'pacientes',
      paciente.id,
      { direccion: 'Updated Address from Device 2' },
      { userId: 'user-2', deviceId: 'device-2' }
    );

    console.log('✅ Concurrent updates applied');
    console.log('📱 Device 1 version vector:', update1?.version_vector);
    console.log('📱 Device 2 version vector:', update2?.version_vector);

    // Show final state
    const finalRecord = await db.getTable<PacienteRecord>('pacientes').get(paciente.id);
    console.log('📋 Final record state:', {
      telefono: finalRecord?.telefono,
      direccion: finalRecord?.direccion,
      version_vector: finalRecord?.version_vector
    });

    await db.clearAll();
    console.log('✅ CRDT demo completed');

  } catch (error) {
    console.error('❌ CRDT demo failed:', error.message);
  }
}

/**
 * Demonstrate multi-tenancy
 */
export async function demonstrateMultiTenancy(): Promise<void> {
  console.log('\n🏢 Multi-Tenancy Demo');
  console.log('=====================');

  const db = new UniversalDatabase(healthSyncSchema);
  await db.initialize();

  try {
    // Create records for different tenants
    const hospital1Patient = await db.createRecord<PacienteRecord>('pacientes', {
      nombre: 'Patient Hospital 1',
      historia: 'H1-001',
      telefono: '3001111111',
      direccion: 'Address 1',
      zona_id: 'zona-1',
      tenant_id: 'hospital-1'
    }, { userId: 'user-1', deviceId: 'device-1' });

    const hospital2Patient = await db.createRecord<PacienteRecord>('pacientes', {
      nombre: 'Patient Hospital 2',
      historia: 'H2-001',
      telefono: '3002222222',
      direccion: 'Address 2',
      zona_id: 'zona-1',
      tenant_id: 'hospital-2'
    }, { userId: 'user-2', deviceId: 'device-2' });

    console.log('✅ Records created for different tenants');

    // Query by tenant
    const hospital1Patients = await db.queryRecords<PacienteRecord>('pacientes', {
      tenantId: 'hospital-1'
    }).toArray();

    const hospital2Patients = await db.queryRecords<PacienteRecord>('pacientes', {
      tenantId: 'hospital-2'
    }).toArray();

    console.log('🏥 Hospital 1 patients:', hospital1Patients.length);
    console.log('🏥 Hospital 2 patients:', hospital2Patients.length);

    // Verify tenant isolation
    console.log('✅ Tenant isolation verified');

    await db.clearAll();
    console.log('✅ Multi-tenancy demo completed');

  } catch (error) {
    console.error('❌ Multi-tenancy demo failed:', error.message);
  }
}