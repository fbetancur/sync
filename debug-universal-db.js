/**
 * Script de debug para verificar por qué no se está usando la base de datos universal
 */

console.log('🔍 === DEBUG: MOTOR UNIVERSAL ===');

// 1. Verificar configuración
console.log('\n📋 1. CONFIGURACIÓN:');
const config = window.crediSyncApp?.config;
console.log('- App Name:', config?.appName);
console.log('- Database Schema definido:', !!config?.databaseSchema);
console.log('- Schema name:', config?.databaseSchema?.name);
console.log('- Schema multiTenant:', config?.databaseSchema?.multiTenant);
console.log('- Tablas en schema:', Object.keys(config?.databaseSchema?.tables || {}));

// 2. Verificar base de datos actual
console.log('\n🗄️ 2. BASE DE DATOS ACTUAL:');
const db = window.crediSyncApp?.services?.db;
console.log('- Tipo de DB:', db?.constructor?.name);
console.log('- Nombre de DB:', db?.name);
console.log('- Tablas disponibles:', Object.keys(db?.tables || {}));

// 3. Verificar lógica de detección
console.log('\n🔍 3. LÓGICA DE DETECCIÓN:');
console.log('- ¿Es CrediSync?:', config?.appName === 'CrediSync');
console.log('- ¿Tiene esquema?:', !!config?.databaseSchema);
console.log('- Debería usar Universal:', config?.appName === 'CrediSync' && !!config?.databaseSchema);

// 4. Verificar IndexedDB
console.log('\n💾 4. INDEXEDDB:');
if (typeof indexedDB !== 'undefined' && indexedDB.databases) {
  indexedDB.databases().then(databases => {
    console.log('- Bases de datos:', databases.map(db => db.name));
    const hasCrediSync = databases.some(db => db.name === 'credisync_db');
    const hasMicrocreditos = databases.some(db => db.name === 'microcreditos_db');
    console.log('- ¿Tiene credisync_db?:', hasCrediSync);
    console.log('- ¿Tiene microcreditos_db?:', hasMicrocreditos);
  });
}

// 5. Intentar acceder a una tabla
console.log('\n📊 5. ACCESO A TABLAS:');
try {
  if (db?.clientes) {
    console.log('✅ Tabla clientes accesible');
    console.log('- Tipo de tabla:', typeof db.clientes);
  } else {
    console.log('❌ Tabla clientes NO accesible');
  }
} catch (error) {
  console.log('❌ Error accediendo a tabla clientes:', error.message);
}

console.log('\n🎯 === CONCLUSIÓN ===');
if (db?.constructor?.name === 'UniversalDatabase') {
  console.log('✅ Motor universal ACTIVO');
} else if (db?.constructor?.name === 'MicrocreditosDB') {
  console.log('⚠️ Usando base de datos LEGACY');
  console.log('💡 Posibles causas:');
  console.log('   - El esquema no se está detectando correctamente');
  console.log('   - Hay un problema en la lógica de DatabaseFactory');
  console.log('   - El tipo del esquema no coincide con la interfaz esperada');
} else {
  console.log('❓ Tipo de base de datos desconocido:', db?.constructor?.name);
}