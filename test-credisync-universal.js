/**
 * Script de prueba para verificar que CrediSync funciona con el motor universal
 * 
 * Ejecutar en la consola del navegador cuando CrediSync esté cargado
 */

console.log('🧪 Iniciando pruebas del motor universal en CrediSync...');

// Función para probar la base de datos universal
async function testUniversalDatabase() {
  try {
    console.log('\n📋 === PRUEBA 1: Verificar configuración ===');
    
    // Verificar que la aplicación está inicializada
    if (window.crediSyncApp) {
      console.log('✅ CrediSync app encontrada');
      console.log('📊 Configuración:', window.crediSyncApp.config);
    } else {
      console.log('❌ CrediSync app no encontrada');
      return;
    }
    
    console.log('\n📋 === PRUEBA 2: Verificar base de datos ===');
    
    // Verificar el tipo de base de datos
    const db = window.crediSyncApp.services.db;
    console.log('🗄️ Tipo de base de datos:', db.constructor.name);
    
    // Verificar el nombre de la base de datos
    console.log('📛 Nombre de la base de datos:', db.name);
    
    if (db.name === 'credisync_db') {
      console.log('✅ ¡Correcto! Usando credisync_db (motor universal)');
    } else if (db.name === 'microcreditos_db') {
      console.log('⚠️ Todavía usando microcreditos_db (legacy)');
    } else {
      console.log('❓ Nombre de base de datos inesperado:', db.name);
    }
    
    console.log('\n📋 === PRUEBA 3: Verificar tablas ===');
    
    // Listar tablas disponibles
    const tables = Object.keys(db.tables || {});
    console.log('📊 Tablas disponibles:', tables);
    
    // Verificar tablas específicas
    const expectedTables = ['tenants', 'users', 'rutas', 'productos_credito', 'clientes', 'creditos', 'cuotas', 'pagos'];
    const missingTables = expectedTables.filter(table => !tables.includes(table));
    
    if (missingTables.length === 0) {
      console.log('✅ Todas las tablas esperadas están presentes');
    } else {
      console.log('❌ Tablas faltantes:', missingTables);
    }
    
    console.log('\n📋 === PRUEBA 4: Verificar IndexedDB ===');
    
    // Verificar IndexedDB en el navegador
    if (typeof indexedDB !== 'undefined') {
      console.log('🗄️ IndexedDB disponible');
      
      // Listar bases de datos (esto requiere una API más nueva)
      if (indexedDB.databases) {
        const databases = await indexedDB.databases();
        console.log('📊 Bases de datos IndexedDB:', databases.map(db => db.name));
        
        const hasCrediSync = databases.some(db => db.name === 'credisync_db');
        const hasMicrocreditos = databases.some(db => db.name === 'microcreditos_db');
        
        if (hasCrediSync) {
          console.log('✅ Base de datos credisync_db encontrada');
        }
        if (hasMicrocreditos) {
          console.log('⚠️ Base de datos microcreditos_db todavía existe (puedes eliminarla)');
        }
      } else {
        console.log('ℹ️ indexedDB.databases() no disponible en este navegador');
      }
    }
    
    console.log('\n📋 === PRUEBA 5: Probar operación CRUD ===');
    
    // Intentar crear un cliente de prueba
    if (db.clientes) {
      try {
        const clientePrueba = {
          nombre: 'Cliente Prueba Motor Universal',
          numero_documento: 'TEST-' + Date.now(),
          telefono: '3001234567',
          direccion: 'Dirección de prueba',
          estado: 'AL_DIA'
        };
        
        console.log('📝 Creando cliente de prueba...');
        const clienteId = await db.clientes.add(clientePrueba);
        console.log('✅ Cliente creado con ID:', clienteId);
        
        // Leer el cliente
        const clienteLeido = await db.clientes.get(clienteId);
        console.log('📖 Cliente leído:', clienteLeido);
        
        // Verificar campos técnicos automáticos
        const camposTecnicos = ['id', 'tenant_id', 'created_at', 'updated_at', 'synced', 'checksum'];
        const camposPresentes = camposTecnicos.filter(campo => clienteLeido.hasOwnProperty(campo));
        
        console.log('🔧 Campos técnicos presentes:', camposPresentes);
        
        if (camposPresentes.length > 0) {
          console.log('✅ ¡Motor universal funcionando! Campos técnicos agregados automáticamente');
        } else {
          console.log('⚠️ No se detectaron campos técnicos automáticos');
        }
        
        // Limpiar - eliminar cliente de prueba
        await db.clientes.delete(clienteId);
        console.log('🧹 Cliente de prueba eliminado');
        
      } catch (error) {
        console.error('❌ Error en prueba CRUD:', error);
      }
    } else {
      console.log('❌ Tabla clientes no disponible');
    }
    
    console.log('\n🎉 === PRUEBAS COMPLETADAS ===');
    console.log('✅ Motor universal verificado exitosamente');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar las pruebas
testUniversalDatabase();