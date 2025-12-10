# Security Module

Este módulo proporciona encriptación a nivel de campo para datos sensibles usando Web Crypto API.

## Características

- **AES-256-GCM**: Encriptación simétrica segura
- **PBKDF2**: Derivación de claves con 100,000 iteraciones por defecto
- **Campos sensibles automáticos**: Encripta automáticamente campos predefinidos
- **Gestión de memoria**: Las claves solo se mantienen en memoria durante la sesión
- **Transparente**: Encriptación/desencriptación automática en objetos

## Uso Básico

### Inicialización

```typescript
import { encryptionService } from './encryption.service';

// Inicializar con PIN del usuario
await encryptionService.initializeWithPin('mi-pin-seguro');
```

### Encriptación Individual

```typescript
// Encriptar un string
const encrypted = await encryptionService.encrypt('datos-sensibles');
console.log(encrypted);
// {
//   data: "base64-encrypted-data",
//   iv: "base64-initialization-vector",
//   salt: "base64-salt"
// }

// Desencriptar
const decrypted = await encryptionService.decrypt(encrypted);
console.log(decrypted); // "datos-sensibles"
```

### Encriptación de Objetos

```typescript
const cliente = {
  id: '123',
  nombre: 'Juan Pérez',
  numero_documento: '12345678', // Campo sensible
  telefono: '+57300123456', // Campo sensible
  direccion: 'Calle 123 #45-67', // Campo sensible
  email: 'juan@example.com' // No sensible
};

// Encriptar campos sensibles automáticamente
const encrypted = await encryptionService.encryptSensitiveFields(cliente);
console.log(encrypted);
// {
//   id: '123',
//   nombre: 'Juan Pérez',
//   numero_documento: { data: "...", iv: "...", salt: "..." },
//   telefono: { data: "...", iv: "...", salt: "..." },
//   direccion: { data: "...", iv: "...", salt: "..." },
//   email: 'juan@example.com'
// }

// Desencriptar campos sensibles
const decrypted = await encryptionService.decryptSensitiveFields(encrypted);
console.log(decrypted); // Objeto original
```

## Uso con Svelte

### Hook useEncryption

```typescript
import { encryption } from '../hooks/useEncryption';

// En un componente Svelte
$: isReady = $encryption.isReady;
$: error = $encryption.error;
$: isLoading = $encryption.isLoading;

// Inicializar
await encryption.initializeWithPin('mi-pin');

// Usar
const encrypted = await encryption.encrypt('datos');
```

### Componente PinEntry

```svelte
<script>
  import PinEntry from '../components/PinEntry.svelte';

  let showPinEntry = true;

  function handlePinSuccess() {
    showPinEntry = false;
    // Encriptación inicializada, continuar con la app
  }
</script>

{#if showPinEntry}
  <PinEntry on:success={handlePinSuccess} on:cancel={() => history.back()} />
{/if}
```

## Campos Sensibles

Los siguientes campos se encriptan automáticamente:

- `numero_documento`
- `telefono`
- `telefono_2`
- `telefono_fiador`
- `direccion`
- `barrio`
- `referencia`
- `nombre_fiador`

## Seguridad

### Gestión de Claves

- Las claves se derivan del PIN del usuario usando PBKDF2
- Las claves solo se mantienen en memoria durante la sesión
- Las claves se limpian automáticamente al cerrar sesión
- Cada encriptación usa un salt e IV únicos

### Algoritmos

- **Encriptación**: AES-256-GCM
- **Derivación de claves**: PBKDF2 con SHA-256
- **Iteraciones**: 100,000 (configurable)
- **IV**: 96 bits aleatorios por encriptación
- **Salt**: 128 bits aleatorios por encriptación

### Validaciones

- PIN mínimo de 4 caracteres
- Verificación de integridad de datos encriptados
- Manejo graceful de errores de encriptación/desencriptación

## Integración con Base de Datos

```typescript
import { db } from '../db';
import { encryptionService } from '../security/encryption.service';

// Guardar cliente con encriptación
async function saveCliente(cliente: Cliente) {
  // Encriptar campos sensibles antes de guardar
  const encryptedCliente = await encryptionService.encryptSensitiveFields(cliente);

  // Guardar en IndexedDB
  await db.clientes.put(encryptedCliente);
}

// Leer cliente con desencriptación
async function getCliente(id: string): Promise<Cliente> {
  // Leer de IndexedDB
  const encryptedCliente = await db.clientes.get(id);

  if (!encryptedCliente) {
    throw new Error('Cliente no encontrado');
  }

  // Desencriptar campos sensibles
  return await encryptionService.decryptSensitiveFields(encryptedCliente);
}
```

## Manejo de Errores

```typescript
try {
  await encryptionService.initializeWithPin('pin');
} catch (error) {
  if (error.message.includes('PIN must be at least')) {
    // PIN muy corto
  }
}

try {
  const decrypted = await encryptionService.decrypt(data);
} catch (error) {
  if (error.message.includes('Decryption failed')) {
    // Datos corruptos o PIN incorrecto
  }
}
```

## Consideraciones de Performance

- La encriptación es asíncrona y puede tomar tiempo con datos grandes
- Use encriptación por lotes para múltiples registros
- Las claves se cachean en memoria para evitar re-derivación
- La derivación PBKDF2 es intencionalmente lenta (100k iteraciones)

## Cumplimiento de Requirements

- **17.1**: ✅ Web Crypto API con AES-256-GCM
- **17.2**: ✅ Encriptación automática de campos sensibles
- **17.3**: ✅ PBKDF2 con 100,000 iteraciones
- **17.4**: ✅ Claves solo en memoria durante sesión
- **17.5**: ✅ Limpieza automática de claves al cerrar sesión
