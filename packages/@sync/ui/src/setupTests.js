/**
 * Configuración de tests para @sync/ui
 */

console.log('Configurando tests de @sync/ui...');

// Mock de navigator si no está disponible
if (typeof global !== 'undefined' && !global.navigator) {
  global.navigator = {
    onLine: true,
    userAgent: 'test-agent',
    serviceWorker: {
      addEventListener: () => {},
      removeEventListener: () => {}
    }
  };
}

// Mock de window si no está disponible
if (typeof global !== 'undefined' && !global.window) {
  global.window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: {
      reload: () => {}
    }
  };
}