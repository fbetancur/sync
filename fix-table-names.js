/**
 * Script para corregir todos los nombres de tabla en CrediSync
 * Ejecutar en la consola del navegador después de recargar la página
 */

console.log('🔧 === CORRECCIÓN DE NOMBRES DE TABLA ===');

// Verificar las tablas disponibles
console.log('📊 Tablas disponibles en UniversalDatabase:');
const availableTables = Object.keys(window.crediSyncApp.services.db.tables || {});
console.log(availableTables);

// Verificar acceso directo a las tablas principales
const tablesToTest = ['clientes', 'creditos', 'cuotas', 'pagos', 'rutas', 'productos_credito', 'tenants', 'users'];

console.log('\n🔍 Verificando acceso a tablas:');
tablesToTest.forEach(tableName => {
  const table = window.crediSyncApp.services.db[tableName];
  if (table) {
    console.log(`✅ ${tableName}: accesible`);
  } else {
    console.log(`❌ ${tableName}: NO accesible`);
  }
});

// Intentar crear un cliente de prueba directamente
console.log('\n🧪 Probando creación directa de cliente:');
try {
  const testCliente = {
    nombre: 'Cliente Prueba Directo',
    numero_documento: 'TEST-DIRECT-' + Date.now(),
    telefono: '3001234567',
    direccion: 'Dirección de prueba directa',
    tenant_id: '00000000-0000-0000-0000-000000000001'
  };
  
  window.crediSyncApp.services.db.clientes.add(testCliente).then(id => {
    console.log('✅ Cliente creado directamente con ID:', id);
    return window.crediSyncApp.services.db.clientes.get(id);
  }).then(cliente => {
    console.log('📖 Cliente leído:', cliente);
    console.log('🔧 Campos técnicos:', Object.keys(cliente).filter(k => 
      ['id', 'tenant_id', 'created_at', 'updated_at', 'synced', 'checksum', 'version_vector'].includes(k)
    ));
  }).catch(error => {
    console.error('❌ Error en creación directa:', error);
  });
} catch (error) {
  console.error('❌ Error en prueba directa:', error);
}

console.log('\n💡 Si la creación directa funciona, el problema está en el StorageManager.');
console.log('💡 Si no funciona, hay un problema con la inicialización de las tablas.');