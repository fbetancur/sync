# ANÁLISIS EXHAUSTIVO: FUNCIONALIDAD OFFLINE Y ALMACENAMIENTO PERSISTENTE EN ENKETO EXPRESS

## ÍNDICE

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Arquitectura General](#arquitectura-general)
3. [Almacenamiento Persistente (IndexedDB)](#almacenamiento-persistente)
4. [Service Workers y Caché de Aplicación](#service-workers)
5. [Caché de Formularios](#cache-formularios)
6. [Gestión de Registros Offline](#gestion-registros)
7. [Sincronización y Envío de Datos](#sincronizacion)
8. [Flujo Completo de Operación](#flujo-completo)
9. [Gestión de Archivos Multimedia](#archivos-multimedia)
10. [Encriptación Offline](#encriptacion)

---

## 1. RESUMEN EJECUTIVO {#resumen-ejecutivo}

Enketo Express implementa una **estrategia offline completa y robusta** que permite:

- **Lanzamiento offline**: La aplicación puede iniciarse sin conexión a internet
- **Almacenamiento persistente**: Formularios, datos y archivos multimedia se guardan localmente
- **Sincronización automática**: Los datos se envían al servidor cuando hay conexión
- **Recuperación ante fallos**: Auto-guardado y recuperación de sesiones interrumpidas

### Tecnologías Clave Utilizadas:

- **IndexedDB**: Base de datos del navegador para almacenamiento estructurado
- **Service Workers**: Para cachear recursos de la aplicación y permitir lanzamiento offline
- **Blob Storage**: Para archivos multimedia (imágenes, audio, video)
- **Fetch API**: Para comunicación con el servidor

---

## 2. ARQUITECTURA GENERAL {#arquitectura-general}

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────────┐
│                    ENKETO EXPRESS OFFLINE                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Service    │  │   IndexedDB  │  │  Connection  │      │
│  │   Worker     │  │    Store     │  │   Manager    │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                           │                                  │
│         ┌─────────────────┴─────────────────┐               │
│         │                                     │               │
│  ┌──────▼──────┐                    ┌───────▼──────┐        │
│  │ Form Cache  │                    │   Records    │        │
│  │   Module    │                    │    Queue     │        │
│  └─────────────┘                    └──────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Detección de Modo Offline

**Archivo**: `public/js/src/module/settings.js`

```javascript
// Determina si la vista es offline-capable
settings.offline = window.location.pathname.includes('/x/');
settings.offlinePath = settings.offline ? '/x' : '';
```

**Rutas offline**: Cualquier URL que contenga `/x/` activa el modo offline.

---

## 3. ALMACENAMIENTO PERSISTENTE (IndexedDB) {#almacenamiento-persistente}

### 3.1 Estructura de la Base de Datos

**Archivo**: `public/js/src/module/store.js`

**Nombre de la BD**: `enketo`  
**Versión actual**: `4`

#### Tablas (Object Stores) de IndexedDB:

```javascript
{
    // 1. SURVEYS - Formularios completos
    surveys: {
        key: { keyPath: 'enketoId' },
        indexes: { enketoId: { unique: true } }
    },

    // 2. RESOURCES - Recursos multimedia del formulario (CSS, imágenes, etc.)
    resources: {
        key: { autoIncrement: false },
        indexes: { key: { unique: true } }
    },

    // 3. RECORDS - Registros de datos enviados/guardados
    records: {
        key: { keyPath: 'instanceId' },
        indexes: {
            recordName: { keyPath: ['enketoId', 'name'], unique: true },
            instanceId: { unique: true },
            enketoId: { unique: false }
        }
    },

    // 4. LAST_SAVED_RECORDS - Último registro guardado (para función "last-saved")
    lastSavedRecords: {
        key: { keyPath: '_enketoId' }
    },

    // 5. FILES - Archivos multimedia adjuntos a registros
    files: {
        key: { autoIncrement: false },
        indexes: { key: { unique: true } }
    },

    // 6. PROPERTIES - Configuraciones y estadísticas globales
    properties: {
        key: { keyPath: 'name' },
        indexes: { key: { unique: true } }
    },

    // 7. DATA - Datos dinámicos pasados por querystring
    data: {
        key: { keyPath: 'enketoId' },
        indexes: { enketoId: { unique: true } }
    }
}
```

### 3.2 Inicialización del Store

**Proceso de inicialización** (`store.init()`):

```javascript
function init({ failSilently } = {}) {
  return _checkSupport() // 1. Verifica soporte de IndexedDB
    .then(() => {
      // 2. Maneja migración de versión 3 a 4
      // (elimina índice 'name' único, crea índice compuesto)
      return Promise.resolve();
    })
    .then(() =>
      db.open({
        // 3. Abre la base de datos
        server: 'enketo',
        version: 4,
        schema: {
          /* ... */
        }
      })
    )
    .then(s => {
      server = s;
    }) // 4. Guarda referencia al servidor
    .then(_isWriteable) // 5. Verifica permisos de escritura
    .then(_setBlobStorageEncoding) // 6. Detecta soporte de Blobs
    .then(() => {
      available = true;
    })
    .catch(error => {
      /* manejo de errores */
    });
}
```

### 3.3 Almacenamiento de Blobs

**Detección de capacidad de almacenar Blobs**:

```javascript
function _setBlobStorageEncoding() {
  return _canStoreBlobs()
    .then(() => {
      blobEncoding = false; // Almacenamiento directo de Blobs
    })
    .catch(() => {
      console.log('Blobs will be Base64 encoded');
      blobEncoding = true; // Conversión a Base64 (Safari 7-8)
    });
}
```

**Navegadores antiguos** (Safari 7-8) requieren conversión Base64 de Blobs antes de almacenar.

### 3.4 API del Store

#### 3.4.1 Survey Store (Formularios)

```javascript
surveyStore = {
  // Obtener formulario
  get(enketoId) {
    return server.surveys.get(enketoId).then(_firstItemOnly).then(_deserializeSurvey);
  },

  // Guardar nuevo formulario
  set(survey) {
    return server.surveys
      .add(_serializeSurvey(survey))
      .then(/* guardar recursos multimedia */)
      .then(_deserializeSurvey);
  },

  // Actualizar formulario existente
  update(survey) {
    return server.surveys
      .update(_serializeSurvey(survey))
      .then(/* actualizar recursos */)
      .then(_deserializeSurvey);
  },

  // Eliminar formulario
  remove(enketoId) {
    return surveyStore
      .get(enketoId)
      .then(/* eliminar recursos asociados */)
      .then(() => server.surveys.remove(enketoId));
  },

  // Gestión de recursos multimedia del formulario
  resource: {
    get(enketoId, url) {
      /* ... */
    },
    update(enketoId, resource) {
      /* ... */
    },
    remove(enketoId, url) {
      /* ... */
    }
  }
};
```

#### 3.4.2 Record Store (Registros de datos)

```javascript
recordStore = {
  // Obtener registro con archivos
  get(instanceId) {
    return server.records.get(instanceId).then(record => {
      // Cargar archivos adjuntos
      const fileTasks = record.files.map(fileKey =>
        recordStore.file.get(record.instanceId, fileKey)
      );
      return Promise.all(fileTasks).then(files => {
        record.files = files.filter(f => f);
        return record;
      });
    });
  },

  // Obtener todos los registros de un formulario
  getAll(enketoId, finalOnly) {
    return server.records
      .query('enketoId')
      .only(enketoId)
      .execute()
      .then(records => {
        if (finalOnly) {
          records = records.filter(r => !r.draft);
        }
        return records.sort((a, b) => a.updated - b.updated);
      });
  },

  // Crear nuevo registro
  set(record) {
    return server.records
      .add({
        instanceId: record.instanceId,
        enketoId: record.enketoId,
        name: record.name,
        xml: record.xml,
        files: record.files.map(f => f.name),
        created: new Date().getTime(),
        updated: new Date().getTime(),
        draft: record.draft
      })
      .then(/* guardar archivos adjuntos */);
  },

  // Actualizar registro existente
  update(record) {
    /* similar a set */
  },

  // Eliminar registro
  remove(instanceId) {
    return server.records
      .get(instanceId)
      .then(/* eliminar archivos asociados */)
      .then(() => server.records.remove(instanceId));
  },

  // Gestión de archivos adjuntos
  file: {
    get(instanceId, fileKey) {
      /* ... */
    },
    update(instanceId, file) {
      /* ... */
    },
    remove(instanceId, fileKey) {
      /* ... */
    }
  }
};
```

#### 3.4.3 Property Store (Propiedades y estadísticas)

```javascript
propertyStore = {
  get(name) {
    /* ... */
  },
  update(property) {
    /* ... */
  },
  removeAll() {
    /* ... */
  },

  // Estadísticas del formulario
  getSurveyStats(enketoId) {
    return server.properties.get(`${enketoId}:stats`);
  },

  // Incrementar contador de registros
  incrementRecordCount(record) {
    return propertyStore.getSurveyStats(record.enketoId).then(stats => {
      stats.recordCount = (stats.recordCount || 0) + 1;
      return propertyStore.update(stats);
    });
  },

  // Registrar envío exitoso
  addSubmittedInstanceId(record) {
    return propertyStore.getSurveyStats(record.enketoId).then(stats => {
      stats.submitted = stats.submitted || [];
      stats.submitted.push(record.instanceId);
      return propertyStore.update(stats);
    });
  }
};
```

---

## 4. SERVICE WORKERS Y CACHÉ DE APLICACIÓN {#service-workers}

### 4.1 Arquitectura del Service Worker

**Archivos clave**:

- `app/controllers/offline-controller.js` - Genera el script del service worker
- `public/js/src/module/offline-app-worker-partial.js` - Lógica del service worker
- `public/js/src/module/application-cache.js` - Inicialización y gestión

### 4.2 Generación Dinámica del Service Worker

**Archivo**: `app/controllers/offline-controller.js`

El service worker se genera **dinámicamente** en cada solicitud:

```javascript
router.get('/x/offline-app-worker.js', (req, res, next) => {
  if (config['offline enabled'] === false) {
    // Offline deshabilitado
    next(new Error('Offline functionality not enabled'));
  } else {
    res.set('Content-Type', 'text/javascript').send(getScriptContent());
  }
});

function getScriptContent() {
  // 1. Leer el script parcial
  const partialScript = fs.readFileSync(
    'public/js/src/module/offline-app-worker-partial.js',
    'utf8'
  );

  // 2. Calcular hashes para versionado
  const partialScriptHash = crypto
    .createHash('md5')
    .update(partialScript)
    .digest('hex')
    .substring(0, 7);

  const configurationHash = crypto
    .createHash('md5')
    .update(JSON.stringify(config))
    .digest('hex')
    .substring(0, 7);

  // 3. Versión compuesta
  const version = [config.version, configurationHash, partialScriptHash].join('-');

  // 4. Lista de recursos a cachear
  const resources = config['themes supported']
    .reduce((acc, theme) => {
      acc.push(`/x/css/theme-${theme}.css`);
      acc.push(`/x/css/theme-${theme}.print.css`);
      return acc;
    }, [])
    .concat(['/x/images/icon_180x180.png']);

  // 5. Inyectar variables y retornar script completo
  return `
const version = '${version}';
const resources = ['${resources.join("',\n    '")}'];

${partialScript}`;
}
```

**Ventajas de generación dinámica**:

- Versionado automático basado en cambios de configuración
- Lista de recursos adaptada a temas habilitados
- Invalidación de caché automática al actualizar

### 4.3 Lógica del Service Worker

**Archivo**: `public/js/src/module/offline-app-worker-partial.js`

#### 4.3.1 Instalación

```javascript
self.addEventListener('install', event => {
  self.skipWaiting(); // Activar inmediatamente

  event.waitUntil(
    caches
      .open(`enketo-common_${version}`)
      .then(cache => {
        console.log('Opened cache');
        // Cachear recursos con cache: 'reload' para evitar HTTP cache
        return cache.addAll(resources.map(resource => new Request(resource, { cache: 'reload' })));
      })
      .catch(e => console.log('Service worker install error', e))
  );
});
```

#### 4.3.2 Activación

```javascript
self.addEventListener('activate', event => {
  console.log('activated!');

  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(
          keys.map(key => {
            // Eliminar cachés antiguos
            if (!CACHES.includes(key)) {
              console.log('deleting cache', key);
              return caches.delete(key);
            }
          })
        )
      )
      .then(() => {
        console.log(`${version} now ready to handle fetches!`);
      })
  );
});
```

#### 4.3.3 Intercepción de Peticiones (Fetch)

```javascript
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      if (response) {
        // Recurso encontrado en caché
        console.log('returning cached response for', event.request.url);
        return response;
      }

      // Recurso no en caché, obtener de red
      return fetch(event.request, {
        credentials: 'same-origin',
        cache: 'reload'
      })
        .then(response => {
          const isScopedResource = event.request.url.includes('/x/');
          const isTranslation = event.request.url.includes('/locales/build/');
          const isServiceWorkerScript = event.request.url === self.location.href;

          // Validar respuesta
          if (
            !response ||
            response.status !== 200 ||
            response.type !== 'basic' ||
            !isScopedResource ||
            isServiceWorkerScript
          ) {
            return response;
          }

          // Cachear dinámicamente recursos adicionales
          const responseToCache = response.clone();
          caches.open(CACHES[0]).then(cache => {
            console.log('Dynamically adding resource to cache', event.request.url);
            cache.put(event.request, responseToCache);
          });

          return response;
        })
        .catch(e => {
          console.log('Failed to fetch resource', event.request, e);
        });
    })
  );
});
```

**Estrategia de caché**:

1. **Cache First**: Buscar primero en caché
2. **Network Fallback**: Si no está en caché, obtener de red
3. **Dynamic Caching**: Cachear automáticamente recursos adicionales (traducciones)
4. **Auto-healing**: Si el caché no se construyó correctamente, cachear dinámicamente

### 4.4 Inicialización del Application Cache

**Archivo**: `public/js/src/module/application-cache.js`

```javascript
function init(survey) {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register(`${settings.basePath}/x/offline-app-worker.js`)
        .then(registration => {
          console.log('Service worker registration successful', registration.scope);

          // Verificar actualizaciones cada hora
          setInterval(
            () => {
              console.log('Checking for service worker update');
              registration.update();
            },
            60 * 60 * 1000
          );

          if (registration.active) {
            _reportOfflineLaunchCapable(true);
          }

          // Escuchar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                console.log('New service worker activated!');
                document.dispatchEvent(events.ApplicationUpdated());
              }
            });
          });
        })
        .catch(err => {
          console.error('Service worker registration failed:', err);
          _reportOfflineLaunchCapable(false);
        });
    });
  } else {
    console.error('Service workers not supported');
    _reportOfflineLaunchCapable(false);
  }

  return Promise.resolve(survey);
}
```

**Eventos disparados**:

- `offlinelaunchcapable`: Indica si la app puede lanzarse offline
- `applicationupdated`: Notifica cuando hay nueva versión del service worker

---

## 5. CACHÉ DE FORMULARIOS {#cache-formularios}

### 5.1 Módulo Form Cache

**Archivo**: `public/js/src/module/form-cache.js`

Este módulo gestiona el almacenamiento y actualización de formularios completos.

#### 5.1.1 Inicialización

```javascript
function init(survey) {
  return store
    .init()
    .then(() => get(survey)) // Intentar obtener del caché
    .then(result => {
      if (result) {
        return result; // Formulario en caché
      }
      return set(survey); // Descargar y cachear
    })
    .then(_processDynamicData) // Procesar datos dinámicos
    .then(_setUpdateIntervals); // Configurar actualizaciones
}
```

#### 5.1.2 Obtención de Formulario

```javascript
function get({ enketoId }) {
  return store.survey
    .get(enketoId)
    .then(survey => Promise.all([survey, getLastSavedRecord(enketoId)]))
    .then(([survey, lastSavedRecord]) =>
      survey == null ? survey : populateLastSavedInstances(survey, lastSavedRecord)
    );
}
```

#### 5.1.3 Almacenamiento de Formulario

```javascript
function set(survey) {
  return connection
    .getFormParts(survey) // Descargar del servidor
    .then(prepareOfflineSurvey) // Preparar para offline
    .then(store.survey.set); // Guardar en IndexedDB
}

function prepareOfflineSurvey(survey) {
  return Promise.resolve(_swapMediaSrc(survey)).then(_addBinaryDefaultsAndUpdateModel);
}
```

**Preparación para offline**:

1. **Intercambio de atributos src**:

```javascript
function _swapMediaSrc(survey) {
  // Cambiar src="url" por data-offline-src="url" src=""
  survey.form = survey.form.replace(/(src="[^"]*")/g, 'data-offline-$1 src=""');
  return survey;
}
```

2. **Carga de valores binarios por defecto**:

```javascript
function _addBinaryDefaultsAndUpdateModel(survey) {
  const model = new DOMParser().parseFromString(survey.model, 'text/xml');
  const binaryDefaultElements = [...model.querySelectorAll('instance:first-child > * *[src]')];

  survey.binaryDefaults = [];
  const tasks = binaryDefaultElements.map(el =>
    connection.getMediaFile(el.getAttribute('src')).then(result => {
      // Usar jr://images/img.png como clave
      result.url = el.textContent;
      survey.binaryDefaults.push(result);
      // Eliminar atributo src del modelo
      el.removeAttribute('src');
    })
  );

  return Promise.all(tasks).then(() => {
    survey.model = new XMLSerializer().serializeToString(model);
    return survey;
  });
}
```

### 5.2 Actualización Automática de Formularios

#### 5.2.1 Intervalos de Actualización

```javascript
const CACHE_UPDATE_INITIAL_DELAY = 3 * 1000; // 3 segundos
const CACHE_UPDATE_INTERVAL = 20 * 60 * 1000; // 20 minutos

function _setUpdateIntervals(survey) {
  hash = survey.hash;

  // Primera verificación después de 3 segundos
  setTimeout(() => {
    _updateCache(survey);
  }, CACHE_UPDATE_INITIAL_DELAY);

  // Verificaciones periódicas cada 20 minutos
  setInterval(() => {
    _updateCache(survey);
  }, CACHE_UPDATE_INTERVAL);

  return Promise.resolve(survey);
}
```

#### 5.2.2 Proceso de Actualización

```javascript
function _updateCache(survey) {
  console.log('Checking for survey update...');

  return connection
    .getFormPartsHash(survey)
    .then(version => {
      if (hash === version) {
        console.log('Cached survey is up to date!', hash);
      } else {
        console.log('Cached survey is outdated!', 'old:', hash, 'new:', version);

        return connection
          .getFormParts(survey)
          .then(formParts => {
            // No actualizar recursos multimedia aún
            formParts.resources = undefined;
            return formParts;
          })
          .then(prepareOfflineSurvey)
          .then(updateSurveyCache)
          .then(result => {
            hash = result.hash;

            if (!isLastSaveEnabled(result)) {
              return removeLastSavedRecord(result.enketoId);
            }
          })
          .then(() => {
            console.log('Survey updated. Need to refresh.');
            document.dispatchEvent(events.FormUpdated());
          });
      }
    })
    .catch(error => {
      // Formulario eliminado o desactivado (404/401)
      if (error.status === 404 || error.status === 401) {
        remove(survey).then(() => {
          console.log(`Survey ${survey.enketoId} removed`);
        });
      } else {
        console.log('Could not obtain latest survey. Probably offline.');
      }
    });
}
```

### 5.3 Actualización de Recursos Multimedia

```javascript
function updateMedia(survey) {
  const formElement = document.querySelector('form.or');

  // Reemplazar fuentes de medios
  replaceMediaSources(formElement, survey.media, {
    isOffline: true
  });

  const containers = [formElement];
  const formHeader = document.querySelector('.form-header');
  if (formHeader) {
    containers.push(formHeader);
  }

  return _loadMedia(survey, containers)
    .then(resources => {
      if (resources) {
        // Filtrar recursos fallidos
        survey.resources = resources.filter(r => !!r);
        console.log('Survey media updated. Updating cache.');
        return updateSurveyCache(survey);
      }
      return survey;
    })
    .then(_setRepeatListener)
    .catch(error => {
      console.error('updateMedia failed', error);
      return survey;
    });
}
```

#### 5.3.1 Carga de Recursos Multimedia

```javascript
function _loadMedia(survey, targetContainers) {
  let updated = false;
  const requests = [];

  _getElementsGroupedBySrc(targetContainers).forEach(elements => {
    const src = elements[0].dataset.offlineSrc;

    const request = store.survey.resource
      .get(survey.enketoId, src)
      .then(async resource => {
        if (!resource || !resource.item) {
          // No en caché, descargar
          const downloaded = await connection.getMediaFile(src);
          updated = true;
          return downloaded;
        }
        return resource;
      })
      .then(resource => {
        if (resource.item) {
          // Crear URL de objeto
          const resourceUrl = URL.createObjectURL(resource.item);
          // Asignar a todos los elementos del grupo
          elements.forEach(element => {
            element.src = resourceUrl;
          });
        }
        return resource;
      })
      .catch(error => console.error(error));

    requests.push(request);
  });

  return Promise.all(requests.map(_reflect)).then(resources => {
    if (updated) {
      return resources;
    }
  });
}
```

**Optimización**: Agrupa elementos por URL para evitar descargas duplicadas.

---

## 6. GESTIÓN DE REGISTROS OFFLINE {#gestion-registros}

### 6.1 Módulo Records Queue

**Archivo**: `public/js/src/module/records-queue.js`

Este módulo gestiona la cola de registros guardados localmente.

#### 6.1.1 Estructura de un Registro

```javascript
{
    instanceId: string,      // ID único del registro
    enketoId: string,        // ID del formulario
    name: string,            // Nombre del registro
    xml: string,             // Datos XML del formulario
    files: Array<{           // Archivos adjuntos
        name: string,
        item: Blob
    }>,
    created: number,         // Timestamp de creación
    updated: number,         // Timestamp de última actualización
    draft: boolean,          // Si es borrador o final
    deprecatedId: string     // ID deprecado (compatibilidad)
}
```

#### 6.1.2 Guardado de Registros

```javascript
function save(action, record) {
  let promise;
  let result;

  if (action === 'set') {
    promise = set(record); // Nuevo registro
  } else {
    promise = store.record.update(record); // Actualizar existente
  }

  return promise
    .then(record => {
      result = record;
      return result;
    })
    .then(({ enketoId }) => formCache.get({ enketoId }))
    .then(survey => setLastSavedRecord(survey, record))
    .then(_updateRecordList)
    .then(() => result);
}
```

#### 6.1.3 Auto-guardado

**Archivo**: `public/js/src/module/controller-webform.js`

```javascript
let autoSavePromise = Promise.resolve();

function _autoSaveRecord() {
  // No auto-guardar si:
  // - El registro fue cargado desde almacenamiento
  // - El formulario tiene encriptación habilitada
  if (form.recordName || form.encryptionKey) {
    return autoSavePromise;
  }

  autoSavePromise = autoSavePromise
    .then(() => fileManager.getCurrentFiles())
    .then(files => {
      const record = {
        xml: form.getDataStr(),
        files: files.map(file =>
          typeof file === 'string' ? { name: file } : { name: file.name, item: file }
        )
      };

      return records.updateAutoSavedRecord(record);
    })
    .then(() => {
      console.log('autosave successful');
    })
    .catch(error => {
      console.error('autosave error', error);
    });

  return autoSavePromise;
}

// Activar auto-guardado en cada cambio
if (settings.offline) {
  document.addEventListener(events.XFormsValueChanged().type, async () => {
    await _autoSaveRecord();
  });
}
```

**Clave del auto-guardado**:

```javascript
function getAutoSavedKey() {
  return `__autoSave_${settings.enketoId}`;
}
```

#### 6.1.4 Recuperación de Auto-guardado

```javascript
function _checkAutoSavedRecord() {
  let rec;
  if (!settings.offline) {
    return Promise.resolve();
  }

  return records
    .getAutoSavedRecord()
    .then(record => {
      if (record) {
        rec = record;
        return gui.confirm(
          {
            heading: t('confirm.autosaveload.heading'),
            msg: t('confirm.autosaveload.msg')
          },
          {
            posButton: t('confirm.autosaveload.posButton'),
            negButton: t('confirm.autosaveload.negButton'),
            allowAlternativeClose: false
          }
        );
      }
    })
    .then(confirmed => {
      if (confirmed) {
        return rec;
      }
      if (rec) {
        records.removeAutoSavedRecord();
      }
    });
}
```

### 6.2 Gestión de Borradores

```javascript
function _saveRecord(survey, draft, recordName, confirmed) {
  const include = { irrelevant: draft };

  // Disparar evento "before-save"
  form.view.html.dispatchEvent(events.BeforeSave());

  // Verificar nombre del registro
  if (!recordName) {
    return _getRecordName().then(name => _saveRecord(survey, draft, name, false));
  }

  // Confirmar nombre si es borrador
  if (draft && !confirmed) {
    return _confirmRecordName(recordName, draft)
      .then(name => _saveRecord(survey, draft, name, true))
      .catch(() => {});
  }

  return autoSavePromise
    .then(() => fileManager.getCurrentFiles())
    .then(files => {
      const record = {
        draft,
        xml: form.getDataStr(include),
        name: recordName,
        instanceId: form.instanceID,
        deprecateId: form.deprecatedID,
        enketoId: settings.enketoId,
        files
      };

      // Encriptar si es necesario
      if (form.encryptionKey && !draft) {
        const formProps = {
          encryptionKey: form.encryptionKey,
          id: form.id,
          version: form.version
        };
        return encryptor.encryptRecord(formProps, record);
      }
      return record;
    })
    .then(record => {
      // Convertir archivos para la base de datos
      record.files = record.files.map(file =>
        typeof file === 'string' ? { name: file } : { name: file.name, item: file }
      );

      // Determinar método de guardado
      const saveMethod = form.recordName ? 'update' : 'set';
      return records.save(saveMethod, record);
    })
    .then(() => {
      records.removeAutoSavedRecord();
      _resetForm(survey, { isOffline: true });

      if (draft) {
        gui.alert(
          t('alert.recordsavesuccess.draftmsg'),
          t('alert.savedraftinfo.heading'),
          'info',
          5
        );
        return true;
      }

      return records.uploadQueue({ isUserTriggered: !draft });
    })
    .catch(error => {
      console.error('save error', error);
      // Manejar error de nombre duplicado
      if (error.target?.error?.name?.toLowerCase() === 'constrainterror') {
        return _confirmRecordName(recordName, draft, t('confirm.save.existingerror')).then(name =>
          _saveRecord(survey, draft, name, true)
        );
      }
      gui.alert(error.message || t('confirm.save.unkownerror'), 'Save Error');
    });
}
```

---

## 7. SINCRONIZACIÓN Y ENVÍO DE DATOS {#sincronizacion}

### 7.1 Cola de Envío

**Archivo**: `public/js/src/module/records-queue.js`

#### 7.1.1 Proceso de Envío

```javascript
const uploadQueue = async (options = { isRetry: false, isUserTriggered: false }) => {
  const { isRetry, isUserTriggered } = options;
  const successes = [];
  let errorMsg = null;
  let authError = null;

  // Verificar si ya hay envío en curso
  if (uploadOngoing || (!finalRecordPresent && !isUserTriggered && !isRetry)) {
    return false;
  }

  // Cancelar backoff si es disparado por usuario
  if (isUserTriggered) {
    cancelBackoff();
  }

  // Verificar estado de conexión
  const appearsOnline = await connection.getOnlineStatus();

  if (appearsOnline && backoffReason === 'offline') {
    cancelBackoff();
    backoffReason = null;
  }

  if (!appearsOnline) {
    backoff(uploadQueue);
    backoffReason = 'offline';
    $uploadButton.btnBusyState(false);

    if (isUserTriggered) {
      gui.alert(t('record-list.msg2'), t('alert.recordsavesuccess.finalmsg'), 'info', 10);
    }
    return false;
  }

  uploadOngoing = true;
  $uploadButton.btnBusyState(true);

  // Obtener registros finales (no borradores)
  const displayableRecords = await getDisplayableRecordList(settings.enketoId, { finalOnly: true });

  if (!displayableRecords || displayableRecords.length === 0) {
    uploadOngoing = false;
    return;
  }

  console.debug(`Uploading queue of ${displayableRecords.length} records.`);

  // Obtener registros completos con archivos
  const records = await Promise.all(
    displayableRecords.map(({ instanceId }) => store.record.get(instanceId))
  );

  // Enviar registros secuencialmente
  for await (const record of records) {
    try {
      // Convertir archivos a formato simple
      record.files = record.files.map(object => {
        if (typeof object.item.name === 'undefined') {
          object.item.name = object.name;
        }
        return object.item;
      });

      uploadProgress.update(record.instanceId, 'ongoing');

      await connection.uploadQueuedRecord(record);

      successes.push(record.name);
      uploadProgress.update(record.instanceId, 'success');

      await store.record.remove(record.instanceId);
      await store.property.addSubmittedInstanceId(record);
    } catch (error) {
      // Capturar errores 401 (autenticación)
      if (error.status === 401) {
        authError = error;
      }

      errorMsg = error.message || gui.getErrorResponseMsg(error.status);
      uploadProgress.update(record.instanceId, 'error', errorMsg);
    }
  }

  uploadOngoing = false;
  $uploadButton.btnBusyState(false);

  const success = authError == null && successes.length === records.length;

  if (success) {
    // Cancelar backoff si el envío es exitoso
    cancelBackoff();

    gui.feedback(
      t('alert.queuesubmissionsuccess.msg', {
        count: successes.length,
        recordNames: successes.join(', ')
      }),
      7
    );
  } else if (authError == null) {
    // Reintentar con backoff exponencial
    uploadOngoing = false;
    backoffReason = 'failure';
    backoff(uploadQueue);

    if (isUserTriggered) {
      gui.alert(t('record-list.msg2'), t('alert.recordsavesuccess.finalmsg'), 'info', 10);
    }
  } else {
    gui.confirmLogin(t('confirm.login.queuedMsg'));
  }

  // Actualizar lista de registros
  _updateRecordList();

  return success;
};
```

### 7.2 Backoff Exponencial

**Archivo**: `public/js/src/module/exponential-backoff.js`

```javascript
// Implementación de backoff exponencial para reintentos
let backoffTimeout = null;
let backoffAttempts = 0;
const MAX_BACKOFF_DELAY = 5 * 60 * 1000; // 5 minutos

function backoff(callback) {
  cancelBackoff();

  const delay = Math.min(Math.pow(2, backoffAttempts) * 1000, MAX_BACKOFF_DELAY);

  backoffAttempts++;

  console.log(`Scheduling retry in ${delay}ms (attempt ${backoffAttempts})`);

  backoffTimeout = setTimeout(() => {
    callback({ isRetry: true, isUserTriggered: false });
  }, delay);
}

function cancelBackoff() {
  if (backoffTimeout) {
    clearTimeout(backoffTimeout);
    backoffTimeout = null;
  }
  backoffAttempts = 0;
}
```

### 7.3 Verificación de Estado de Conexión

**Archivo**: `public/js/src/module/connection.js`

```javascript
const CONNECTION_URL = `${settings.basePath}/connection`;

function getOnlineStatus() {
  return (
    fetch(CONNECTION_URL, {
      cache: 'no-cache',
      headers: { 'Content-Type': 'text/plain' }
    })
      .then(response => response.text())
      // Verificar contenido de la respuesta
      // (importante para detectar página de fallback del service worker)
      .then(text => /connected/.test(text))
      .catch(() => false)
  );
}
```

### 7.4 Envío de Registros al Servidor

**Archivo**: `public/js/src/module/connection.js`

#### 7.4.1 Preparación de Datos

```javascript
function _prepareFormDataArray(record) {
  const recordDoc = parser.parseFromString(record.xml, 'text/xml');

  // Eliminar atributo type="file" de elementos
  const fileElements = Array.prototype.slice
    .call(recordDoc.querySelectorAll('[type="file"]'))
    .map(el => {
      el.removeAttribute('type');
      return el;
    });

  const xmlData = xmlSerializer.serializeToString(recordDoc.documentElement);
  const xmlSubmissionBlob = new Blob([xmlData], {
    type: 'text/xml'
  });

  const availableFiles = record.files || [];
  const sizes = [];
  const failedFiles = [];
  const submissionFiles = [];

  // Procesar archivos adjuntos
  fileElements.forEach(el => {
    const fileName = el.textContent;
    const file = availableFiles.find(f => f.name === fileName);

    if (file) {
      submissionFiles.push({
        nodeName: el.nodeName,
        file
      });
      sizes.push(file.size);
    } else {
      failedFiles.push(fileName);
      console.error(`Error retrieving ${fileName}`);
    }
  });

  // Dividir en lotes según tamaño máximo
  let batches = [[]];
  if (submissionFiles.length > 0) {
    batches = _divideIntoBatches(sizes, settings.maxSize);
  }

  console.log(`Splitting record into ${batches.length} batches`, batches);

  // Crear FormData para cada lote
  const batchesPrepped = batches.map(batch => {
    const fd = new FormData();

    fd.append('xml_submission_file', xmlSubmissionBlob, 'xml_submission_file');

    // Agregar token CSRF
    const csrfToken = (
      document.cookie.split('; ').find(c => c.startsWith(settings.csrfCookieName)) || ''
    ).split('=')[1];
    if (csrfToken) {
      fd.append(settings.csrfCookieName, csrfToken);
    }

    const batchPrepped = {
      instanceId: record.instanceId,
      deprecatedId: record.deprecatedId,
      formData: fd,
      failedFiles
    };

    // Agregar archivos del lote
    batch.forEach(fileIndex => {
      const file = submissionFiles[fileIndex].file;
      batchPrepped.formData.append(file.name, file, file.name);
    });

    return batchPrepped;
  });

  return batchesPrepped;
}
```

#### 7.4.2 División en Lotes

```javascript
function _divideIntoBatches(fileSizes, limit) {
  const sizes = fileSizes.map((size, index) => ({ index, size }));
  const batches = [];

  while (sizes.length > 0) {
    let batch = [sizes[0].index];
    let batchSize = sizes[0].size;

    if (sizes[0].size < limit) {
      for (let i = 1; i < sizes.length; i++) {
        if (batchSize + sizes[i].size < limit) {
          batch.push(sizes[i].index);
          batchSize += sizes[i].size;
        }
      }
    }

    batches.push(batch);

    // Eliminar archivos procesados
    for (let i = 0; i < sizes.length; i++) {
      for (let j = 0; j < batch.length; j++) {
        if (sizes[i].index === batch[j]) {
          sizes.splice(i, 1);
        }
      }
    }
  }

  return batches;
}
```

**Razón de división en lotes**:

- Evitar exceder el tamaño máximo de envío del servidor
- Compatibilidad con ODK Aggregate (issue #400)

#### 7.4.3 Envío de Lote

```javascript
function _uploadBatch(recordBatch) {
  const submissionUrl = settings.enketoId
    ? `${settings.basePath}/submission/${settings.enketoId}${_getQuery()}`
    : null;

  const controller = new AbortController();

  // Timeout de envío
  setTimeout(() => {
    controller.abort();
  }, settings.timeout);

  return fetch(submissionUrl, {
    method: 'POST',
    cache: 'no-cache',
    headers: {
      'X-OpenRosa-Version': '1.0',
      'X-OpenRosa-Deprecated-Id': recordBatch.deprecatedId,
      'X-OpenRosa-Instance-Id': recordBatch.instanceId
    },
    signal: controller.signal,
    body: recordBatch.formData
  })
    .then(response => {
      const result = {
        status: response.status,
        failedFiles: recordBatch.failedFiles || undefined
      };

      if (response.status === 400) {
        // Extraer mensaje de error del servidor
        return response.text().then(text => {
          const xmlResponse = parser.parseFromString(text, 'text/xml');
          const messageEl = xmlResponse.querySelector('OpenRosaResponse > message');
          if (messageEl) {
            result.message = messageEl.textContent;
          }
          throw result;
        });
      }

      if (response.status !== 201 && response.status !== 202) {
        throw result;
      }

      return result;
    })
    .catch(error => {
      if (error.name === 'AbortError' && typeof error.status === 'undefined') {
        error.status = 408; // Request Timeout
      }
      throw error;
    });
}
```

---

## 8. FLUJO COMPLETO DE OPERACIÓN {#flujo-completo}

### 8.1 Flujo de Inicialización (Modo Offline)

```
┌─────────────────────────────────────────────────────────────┐
│ 1. CARGA DE PÁGINA (/x/...)                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. REGISTRO DE SERVICE WORKER                                │
│    - navigator.serviceWorker.register()                      │
│    - Cachea recursos estáticos (CSS, JS, imágenes)          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. INICIALIZACIÓN DE STORE (IndexedDB)                      │
│    - store.init()                                            │
│    - Verifica soporte de IndexedDB                           │
│    - Abre base de datos 'enketo' versión 4                  │
│    - Verifica permisos de escritura                          │
│    - Detecta soporte de Blobs                                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. INICIALIZACIÓN DE FORM CACHE                             │
│    - formCache.init(survey)                                  │
│    ├─ Intenta obtener formulario de IndexedDB               │
│    │  └─ Si existe: Cargar desde caché                      │
│    │  └─ Si no existe:                                       │
│    │     ├─ Descargar del servidor                           │
│    │     ├─ Preparar para offline                            │
│    │     │  ├─ Intercambiar src por data-offline-src        │
│    │     │  └─ Descargar valores binarios por defecto       │
│    │     └─ Guardar en IndexedDB                             │
│    └─ Configurar actualizaciones automáticas                 │
│       ├─ Primera verificación: 3 segundos                    │
│       └─ Verificaciones periódicas: cada 20 minutos          │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ACTUALIZACIÓN DE RECURSOS MULTIMEDIA                     │
│    - formCache.updateMedia(survey)                           │
│    ├─ Reemplazar data-offline-src por src                   │
│    ├─ Para cada recurso:                                     │
│    │  ├─ Buscar en IndexedDB                                 │
│    │  ├─ Si no existe: Descargar y cachear                  │
│    │  └─ Crear Object URL y asignar a elemento              │
│    └─ Configurar listener para nuevos repeats               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. INICIALIZACIÓN DE RECORDS QUEUE                          │
│    - records.init()                                          │
│    ├─ Actualizar lista de registros guardados               │
│    └─ Intentar envío automático de cola                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. VERIFICACIÓN DE AUTO-GUARDADO                            │
│    - _checkAutoSavedRecord()                                 │
│    ├─ Buscar registro auto-guardado                         │
│    ├─ Si existe: Preguntar al usuario si desea cargar       │
│    └─ Si confirma: Cargar datos                             │
│       Si rechaza: Eliminar auto-guardado                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. INICIALIZACIÓN DEL FORMULARIO                            │
│    - controller.init(formEl, data)                           │
│    ├─ Crear instancia de Form (enketo-core)                 │
│    ├─ Inicializar widgets                                    │
│    ├─ Configurar event handlers                              │
│    │  ├─ Submit button                                       │
│    │  ├─ Save draft button                                   │
│    │  ├─ Upload queue button                                 │
│    │  └─ Auto-save en cada cambio (XFormsValueChanged)      │
│    └─ Mostrar formulario                                     │
└─────────────────────────────────────────────────────────────┘
```

### 8.2 Flujo de Guardado de Registro

```
┌─────────────────────────────────────────────────────────────┐
│ USUARIO HACE CLIC EN "SUBMIT" O "SAVE DRAFT"                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VALIDACIÓN (solo para submit)                            │
│    - form.validate()                                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. DISPARAR EVENTO "BEFORE-SAVE"                            │
│    - Actualiza metadatos (timeEnd, etc.)                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. OBTENER NOMBRE DEL REGISTRO                              │
│    - Si es borrador: Solicitar confirmación de nombre       │
│    - Si no: Generar nombre automático                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. RECOPILAR DATOS                                           │
│    ├─ XML: form.getDataStr(include)                         │
│    └─ Archivos: fileManager.getCurrentFiles()               │
│       ├─ Archivos de inputs type="file"                     │
│       └─ Imágenes de canvas (dibujos)                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ENCRIPTACIÓN (si está habilitada)                        │
│    - encryptor.encryptRecord(formProps, record)              │
│    ├─ Generar clave simétrica                               │
│    ├─ Encriptar clave con RSA                               │
│    ├─ Encriptar XML con AES                                 │
│    ├─ Encriptar archivos con AES                            │
│    └─ Crear manifest XML                                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. GUARDAR EN INDEXEDDB                                     │
│    - records.save(saveMethod, record)                        │
│    ├─ Guardar registro en tabla 'records'                   │
│    ├─ Guardar archivos en tabla 'files'                     │
│    ├─ Incrementar contador de registros                     │
│    └─ Actualizar last-saved (si aplica)                     │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. ELIMINAR AUTO-GUARDADO                                   │
│    - records.removeAutoSavedRecord()                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 8. RESETEAR FORMULARIO                                      │
│    - _resetForm(survey, { isOffline: true })                │
│    ├─ Crear nueva instancia de Form                         │
│    └─ Actualizar recursos multimedia                        │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 9. INTENTAR ENVÍO (solo si no es borrador)                  │
│    - records.uploadQueue({ isUserTriggered: false })        │
└─────────────────────────────────────────────────────────────┘
```

### 8.3 Flujo de Sincronización

```
┌─────────────────────────────────────────────────────────────┐
│ TRIGGER: Auto, Usuario, o Después de Guardar                │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VERIFICAR CONDICIONES                                    │
│    ├─ ¿Hay envío en curso? → Cancelar                       │
│    ├─ ¿Hay registros finales? → Continuar                   │
│    └─ ¿Es disparado por usuario? → Cancelar backoff         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. VERIFICAR CONEXIÓN                                       │
│    - connection.getOnlineStatus()                            │
│    ├─ Fetch a /connection                                    │
│    └─ Verificar respuesta contiene "connected"              │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ OFFLINE ──────────────────────────────────┐
                 │                                             │
                 │  ┌──────────────────────────────────────┐  │
                 │  │ Iniciar backoff exponencial          │  │
                 │  │ Mostrar mensaje al usuario           │  │
                 │  │ Reintentar más tarde                 │  │
                 │  └──────────────────────────────────────┘  │
                 │                                             │
                 ▼                                             │
┌─────────────────────────────────────────────────────────────┤
│ 3. OBTENER REGISTROS FINALES                                │
│    - getDisplayableRecordList(enketoId, { finalOnly: true })│
│    ├─ Excluir borradores                                    │
│    └─ Excluir auto-guardado                                 │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. CARGAR REGISTROS COMPLETOS                               │
│    - Para cada registro:                                     │
│      └─ store.record.get(instanceId)                        │
│         ├─ Cargar XML                                        │
│         └─ Cargar archivos adjuntos                         │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ENVIAR REGISTROS SECUENCIALMENTE                         │
│    - Para cada registro:                                     │
│      ├─ Preparar FormData                                    │
│      │  ├─ Dividir en lotes según tamaño                    │
│      │  └─ Agregar token CSRF                               │
│      ├─ Enviar cada lote                                     │
│      │  ├─ POST a /submission/{enketoId}                    │
│      │  ├─ Headers: X-OpenRosa-*                            │
│      │  └─ Timeout configurable                             │
│      ├─ Actualizar progreso en UI                           │
│      └─ Manejar respuesta                                    │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ├─ ÉXITO ────────────────────────────────────┐
                 │                                             │
                 │  ┌──────────────────────────────────────┐  │
                 │  │ Eliminar de IndexedDB                │  │
                 │  │ Registrar en submitted               │  │
                 │  │ Actualizar UI                        │  │
                 │  │ Cancelar backoff                     │  │
                 │  └──────────────────────────────────────┘  │
                 │                                             │
                 ├─ ERROR 401 ─────────────────────────────────┤
                 │                                             │
                 │  ┌──────────────────────────────────────┐  │
                 │  │ Solicitar login                      │  │
                 │  │ Detener envío                        │  │
                 │  └──────────────────────────────────────┘  │
                 │                                             │
                 └─ OTRO ERROR ────────────────────────────────┤
                                                               │
                    ┌──────────────────────────────────────┐  │
                    │ Registrar error                      │  │
                    │ Iniciar backoff exponencial          │  │
                    │ Reintentar más tarde                 │  │
                    └──────────────────────────────────────┘  │
                                                               │
                 ┌─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. ACTUALIZAR LISTA DE REGISTROS                            │
│    - _updateRecordList()                                     │
│    ├─ Actualizar contador de cola                           │
│    ├─ Eliminar registros enviados de UI                     │
│    └─ Habilitar/deshabilitar botones                        │
└─────────────────────────────────────────────────────────────┘
```

### 8.4 Flujo de Auto-guardado

```
┌─────────────────────────────────────────────────────────────┐
│ EVENTO: XFormsValueChanged (cualquier cambio en formulario) │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. VERIFICAR CONDICIONES                                    │
│    ├─ ¿Es registro cargado? → Cancelar                      │
│    ├─ ¿Tiene encriptación? → Cancelar                       │
│    └─ ¿Modo offline? → Continuar                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. ESPERAR AUTO-GUARDADO ANTERIOR                           │
│    - await autoSavePromise                                   │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. RECOPILAR DATOS ACTUALES                                 │
│    ├─ XML: form.getDataStr()                                │
│    └─ Archivos: fileManager.getCurrentFiles()               │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. PREPARAR REGISTRO AUTO-GUARDADO                          │
│    - instanceId: __autoSave_{enketoId}                      │
│    - name: __autoSave_{timestamp}                           │
│    - draft: true                                             │
│    - enketoId: settings.enketoId                            │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. ACTUALIZAR EN INDEXEDDB                                  │
│    - store.record.update(record)                             │
│    ├─ Sobrescribe registro anterior                         │
│    └─ No actualiza lista de registros                       │
└────────────────┬────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. COMPLETAR                                                 │
│    - console.log('autosave successful')                      │
└─────────────────────────────────────────────────────────────┘
```

**Frecuencia**: En cada cambio de valor en el formulario (puede ser muy frecuente).

**Optimización**: Usa una Promise encadenada para evitar múltiples auto-guardados simultáneos.

---

## 9. GESTIÓN DE ARCHIVOS MULTIMEDIA {#archivos-multimedia}

### 9.1 File Manager

**Archivo**: `public/js/src/module/file-manager.js`

#### 9.1.1 Obtención de URL de Archivo

```javascript
function getFileUrl(subject) {
  return new Promise((resolve, reject) => {
    if (!subject) {
      resolve(null);
    } else if (typeof subject === 'string') {
      const escapedSubject = encodeURIComponent(subject);

      // 1. URLs absolutas o data URIs
      if (subject.startsWith('/') || subject.startsWith('data:')) {
        resolve(subject);
      }
      // 2. Archivos adjuntos de instancia cargada
      else if (instanceAttachments && instanceAttachments[escapedSubject]) {
        resolve(instanceAttachments[escapedSubject]);
      }
      // 3. Recursos del formulario (valores por defecto)
      else if (URL_RE.test(subject)) {
        store.survey.resource
          .get(settings.enketoId, subject)
          .then(file => {
            if (file.item) {
              resolve(URL.createObjectURL(file.item));
            } else {
              reject(new Error('File Retrieval Error'));
            }
          })
          .catch(reject);
      }
      // 4. Archivos del registro actual
      else {
        store.record.file
          .get(_getInstanceId(), subject)
          .then(file => {
            if (file.item) {
              if (isTooLarge(file.item)) {
                reject(_getMaxSizeError());
              } else {
                resolve(URL.createObjectURL(file.item));
              }
            } else {
              reject(new Error('File Retrieval Error'));
            }
          })
          .catch(reject);
      }
    }
    // 5. Objeto File/Blob directo
    else if (typeof subject === 'object') {
      if (isTooLarge(subject)) {
        reject(_getMaxSizeError());
      } else {
        resolve(URL.createObjectURL(subject));
      }
    } else {
      reject(new Error('Unknown error occurred'));
    }
  });
}
```

**Jerarquía de búsqueda**:

1. URLs absolutas o data URIs → Usar directamente
2. Archivos adjuntos de instancia → Desde `instanceAttachments`
3. Recursos del formulario → Desde `store.survey.resource`
4. Archivos del registro → Desde `store.record.file`
5. Objetos File/Blob → Crear Object URL

#### 9.1.2 Recopilación de Archivos Actuales

```javascript
function getCurrentFiles() {
  const fileInputs = [
    ...document.querySelectorAll(
      'form.or input[type="file"], ' + 'form.or input[type="text"][data-drawing="true"]'
    )
  ];
  const fileTasks = [];

  const _processNameAndSize = function (input, file) {
    if (file && file.name) {
      // Agregar postfix único al nombre
      const newFilename = getFilename(file, input.dataset.filenamePostfix);

      // Si está redimensionado, obtener Blob de data URI
      if (input.dataset.resized && input.dataset.resizedDataURI) {
        file = utils.dataUriToBlobSync(input.dataset.resizedDataURI);
      }

      file = new Blob([file], { type: file.type });
      file.name = newFilename;
    }
    return file;
  };

  fileInputs.forEach(input => {
    if (input.type === 'file') {
      // Archivos de inputs type="file"
      if (input.files[0]) {
        fileTasks.push(Promise.resolve(_processNameAndSize(input, input.files[0])));
      }
    } else if (input.value) {
      // Imágenes de canvas (dibujos)
      const canvas = input.closest('.question').querySelector('.draw-widget canvas');
      if (canvas && !URL_RE.test(input.value)) {
        fileTasks.push(
          new Promise(resolve =>
            canvas.toBlob(blob => {
              blob.name = input.value;
              resolve(_processNameAndSize(input, blob));
            })
          )
        );
      }
    }
  });

  return Promise.all(fileTasks).then(files => {
    // Agregar nombres de archivos cargados sin cambios
    fileInputs
      .filter(input => input.matches('[data-loaded-file-name]'))
      .forEach(input => files.push(input.getAttribute('data-loaded-file-name')));

    return files;
  });
}
```

**Tipos de archivos manejados**:

1. **Archivos subidos**: De inputs `type="file"`
2. **Dibujos**: De canvas (widget de dibujo)
3. **Archivos sin cambios**: Cargados de almacenamiento y no modificados

### 9.2 Almacenamiento de Archivos

#### 9.2.1 Estructura en IndexedDB

```javascript
// Tabla 'files'
{
    key: `${instanceId}:${fileName}`,
    item: Blob | string  // Blob directo o Base64 (navegadores antiguos)
}
```

#### 9.2.2 Guardado de Archivo

```javascript
function _updateFile(table, id, file) {
  if (id && file && file.item instanceof Blob && file[prop]) {
    const propValue = file[prop];
    file.key = `${id}:${file[prop]}`;
    delete file[prop];

    if (blobEncoding) {
      // Navegadores antiguos: convertir a Base64
      return utils
        .blobToDataUri(file.item)
        .then(convertedBlob => {
          file.item = convertedBlob;
          return server[table].update(file);
        })
        .then(() => {
          file[prop] = propValue;
          delete file.key;
          return file;
        });
    }

    // Navegadores modernos: almacenar Blob directamente
    return server[table].update(file).then(() => {
      file[prop] = propValue;
      delete file.key;
      return file;
    });
  }

  return Promise.reject(new Error('DataError. File not complete or ID not provided.'));
}
```

### 9.3 Reemplazo de Fuentes de Medios

**Archivo**: `public/js/src/module/media.js`

```javascript
function replaceMediaSources(container, media, options = {}) {
  const { isOffline } = options;

  if (!media || typeof media !== 'object') {
    return;
  }

  const elements = [...container.querySelectorAll('[src], [href]')];

  elements.forEach(el => {
    const attr = el.hasAttribute('src') ? 'src' : 'href';
    const original = el.getAttribute(attr);

    if (isOffline) {
      // Modo offline: usar data-offline-src
      const offlineSrc = el.getAttribute('data-offline-src');
      if (offlineSrc && media[offlineSrc]) {
        el.setAttribute(attr, media[offlineSrc]);
      }
    } else {
      // Modo online: reemplazar directamente
      if (original && media[original]) {
        el.setAttribute(attr, media[original]);
      }
    }
  });
}
```

---

## 10. ENCRIPTACIÓN OFFLINE {#encriptacion}

### 10.1 Módulo Encryptor

**Archivo**: `public/js/src/module/encryptor.js`

Enketo soporta encriptación de extremo a extremo compatible con ODK.

#### 10.1.1 Algoritmos Utilizados

```javascript
const SYMMETRIC_ALGORITHM = 'AES-CFB'; // AES/CFB/PKCS5Padding
const ASYMMETRIC_ALGORITHM = 'RSA-OAEP'; // RSA/NONE/OAEPWithSHA256AndMGF1Padding
const ASYMMETRIC_OPTIONS = {
  md: forge.md.sha256.create(),
  mgf: forge.mgf.mgf1.create(forge.md.sha1.create())
};
```

**Biblioteca**: `node-forge` para operaciones criptográficas en el navegador.

#### 10.1.2 Proceso de Encriptación

```javascript
function encryptRecord(form, record) {
  // 1. Generar clave simétrica (256 bits)
  const symmetricKey = _generateSymmetricKey();

  // 2. Cargar clave pública RSA
  const publicKeyPem = `-----BEGIN PUBLIC KEY-----${form.encryptionKey}-----END PUBLIC KEY-----`;
  const forgePublicKey = forge.pki.publicKeyFromPem(publicKeyPem);

  // 3. Encriptar clave simétrica con RSA
  const base64EncryptedSymmetricKey = _rsaEncrypt(symmetricKey, forgePublicKey);

  // 4. Crear seed para IV (vector de inicialización)
  const seed = new Seed(record.instanceId, symmetricKey);

  // 5. Crear manifest
  const manifest = new Manifest(form.id, form.version);
  manifest.addElement('base64EncryptedKey', base64EncryptedSymmetricKey);
  manifest.addMetaElement('instanceID', record.instanceId);

  // 6. Encriptar archivos multimedia
  return _encryptMediaFiles(record.files, symmetricKey, seed)
    .then(manifest.addMediaFiles)
    .then(blobs => {
      // 7. Encriptar XML de envío
      const submissionXmlEnc = _encryptSubmissionXml(record.xml, symmetricKey, seed);
      manifest.addXmlSubmissionFile(submissionXmlEnc);
      blobs.push(submissionXmlEnc);

      return blobs;
    })
    .then(blobs => {
      // 8. Calcular firma de elementos
      const fileMd5s = blobs.map(
        blob => `${blob.name.substring(0, blob.name.length - 4)}::${blob.md5}`
      );
      const elements = [
        form.id,
        form.version,
        base64EncryptedSymmetricKey,
        record.instanceId
      ].concat(fileMd5s);

      manifest.addElement(
        'base64EncryptedElementSignature',
        _getBase64EncryptedElementSignature(elements, forgePublicKey)
      );

      // 9. Sobrescribir propiedades del registro
      record.xml = manifest.getXmlStr();
      record.files = blobs;

      return record;
    });
}
```

#### 10.1.3 Encriptación de Contenido

```javascript
function _encryptContent(content, symmetricKey, seed) {
  const cipher = forge.cipher.createCipher(SYMMETRIC_ALGORITHM, symmetricKey);
  const iv = seed.getIncrementedSeedByteString();

  // Configurar padding PKCS5
  cipher.mode.pad = forge.cipher.modes.cbc.prototype.pad.bind(cipher.mode);

  cipher.start({ iv });
  cipher.update(content);

  const pass = cipher.finish();
  if (!pass) {
    throw new Error('Encryption failed.');
  }

  const byteString = cipher.output.getBytes();

  // Convertir a ArrayBuffer
  const buffer = new ArrayBuffer(byteString.length);
  const array = new Uint8Array(buffer);

  for (let i = 0; i < byteString.length; i++) {
    array[i] = byteString.charCodeAt(i);
  }

  // Retornar como Blob
  return new Blob([array]);
}
```

#### 10.1.4 Seed para Vector de Inicialización

```javascript
function Seed(instanceId, symmetricKey) {
  // IV es el hash MD5 de 16 bytes del instanceID + clave simétrica
  const messageDigest = _md5Digest(instanceId + symmetricKey).getBytes();
  const ivSeedArray = messageDigest.split('').map(item => item.charCodeAt(0));
  let ivCounter = 0;

  this.getIncrementedSeedByteString = () => {
    // Incrementar byte en posición rotativa
    ++ivSeedArray[ivCounter % ivSeedArray.length];
    ++ivCounter;

    return ivSeedArray.map(code => String.fromCharCode(code)).join('');
  };
}
```

**Propósito**: Generar un IV único para cada archivo encriptado, basado en un seed común.

#### 10.1.5 Manifest XML

```javascript
function Manifest(formId, formVersion) {
  const ODK_SUBMISSION_NS = 'http://opendatakit.org/submissions';
  const OPENROSA_XFORMS_NS = 'http://openrosa.org/xforms';
  const manifestEl = document.createElementNS(ODK_SUBMISSION_NS, 'data');

  manifestEl.setAttribute('encrypted', 'yes');
  manifestEl.setAttribute('id', formId);
  if (formVersion) {
    manifestEl.setAttribute('version', formVersion);
  }

  this.getXmlStr = () => new XMLSerializer().serializeToString(manifestEl);

  this.addElement = (nodeName, content) => {
    const el = document.createElementNS(ODK_SUBMISSION_NS, nodeName);
    el.textContent = content;
    manifestEl.appendChild(el);
  };

  this.addMetaElement = (nodeName, content) => {
    const metaPresent = manifestEl.querySelector('meta');
    const metaEl = metaPresent || document.createElementNS(OPENROSA_XFORMS_NS, 'meta');
    const childEl = document.createElementNS(OPENROSA_XFORMS_NS, nodeName);
    childEl.textContent = content;
    metaEl.appendChild(childEl);
    if (!metaPresent) {
      manifestEl.appendChild(metaEl);
    }
  };

  this.addXmlSubmissionFile = blob => {
    const xmlFileEl = document.createElementNS(ODK_SUBMISSION_NS, 'encryptedXmlFile');
    xmlFileEl.setAttribute('type', 'file');
    xmlFileEl.textContent = blob.name;
    manifestEl.appendChild(xmlFileEl);
  };
}
```

**Estructura del manifest**:

```xml
<data xmlns="http://opendatakit.org/submissions"
      encrypted="yes"
      id="formId"
      version="formVersion">
    <base64EncryptedKey>...</base64EncryptedKey>
    <meta xmlns="http://openrosa.org/xforms">
        <instanceID>...</instanceID>
    </meta>
    <encryptedXmlFile type="file">submission.xml.enc</encryptedXmlFile>
    <media>
        <file type="file">image.jpg.enc</file>
    </media>
    <base64EncryptedElementSignature>...</base64EncryptedElementSignature>
</data>
```

### 10.2 Restricciones de Encriptación

```javascript
// En controller-webform.js
if (form.encryptionKey) {
  // Eliminar botón "Save Draft"
  const saveDraftButton = document.querySelector('.form-footer#save-draft');
  if (saveDraftButton) {
    saveDraftButton.remove();
  }

  // Verificar soporte
  if (!encryptor.isSupported()) {
    loadErrors.unshift(t('error.encryptionnotsupported'));
  }
}

// En _autoSaveRecord
if (form.recordName || form.encryptionKey) {
  return autoSavePromise; // No auto-guardar
}
```

**Limitaciones con encriptación**:

- No se permite guardar borradores
- No se permite auto-guardado
- Requiere soporte de ArrayBuffer y Uint8Array

---

## 11. FUNCIONALIDAD "LAST-SAVED"

### 11.1 Concepto

**Archivo**: `public/js/src/module/last-saved.js`

La funcionalidad "last-saved" permite que un formulario acceda a los datos del último registro
guardado, útil para:

- Pre-llenar campos con valores anteriores
- Comparar con envío anterior
- Flujos de trabajo que requieren datos históricos

### 11.2 Implementación

#### 11.2.1 Detección de Soporte

```javascript
const LAST_SAVED_VIRTUAL_ENDPOINT = 'jr://instance/last-saved';

function hasLastSavedInstance(survey) {
  return (
    Array.isArray(survey.externalData) &&
    survey.externalData.some(item => item?.src === LAST_SAVED_VIRTUAL_ENDPOINT)
  );
}

function isLastSaveEnabled(survey) {
  return (
    settings.type === 'other' &&
    store.available &&
    hasLastSavedInstance(survey) &&
    !encryptor.isEncryptionEnabled(survey)
  );
}
```

**Condiciones para habilitar**:

1. Tipo de formulario: `other` (no single, edit, view, preview)
2. Store disponible (IndexedDB funcional)
3. Formulario tiene instancia externa `jr://instance/last-saved`
4. Encriptación NO habilitada

#### 11.2.2 Almacenamiento

```javascript
function setLastSavedRecord(survey, record) {
  if (!store.available || settings.type !== 'other') {
    return Promise.resolve({
      survey: populateLastSavedInstances(survey)
    });
  }

  const lastSavedRecord = isLastSaveEnabled(survey)
    ? { ...record, _enketoId: record.enketoId }
    : null;

  return (
    lastSavedRecord == null
      ? removeLastSavedRecord(survey.enketoId)
      : store.lastSavedRecords.update(lastSavedRecord)
  ).then(([lastSavedRecord] = []) => ({
    survey: populateLastSavedInstances(survey, lastSavedRecord),
    lastSavedRecord
  }));
}
```

**Tabla en IndexedDB**: `lastSavedRecords`

- Clave: `_enketoId`
- Valor: Registro completo (XML + metadatos)

#### 11.2.3 Población de Instancia

```javascript
function populateLastSavedInstances(survey, lastSavedRecord) {
  if (!hasLastSavedInstance(survey)) {
    return survey;
  }

  const lastSavedInstance = getLastSavedInstanceDocument(survey, lastSavedRecord);

  const externalData = survey.externalData.map(item => {
    if (item?.src === LAST_SAVED_VIRTUAL_ENDPOINT) {
      return { ...item, xml: lastSavedInstance };
    }
    return item;
  });

  return { ...survey, externalData };
}

function getLastSavedInstanceDocument(survey, lastSavedRecord) {
  if (lastSavedRecord == null || !isLastSaveEnabled(survey)) {
    // Sin registro previo: usar instancia vacía del modelo
    const model = domParser.parseFromString(survey.model, 'text/xml');
    const modelDefault = model.querySelector('model > instance > *').cloneNode(true);

    const doc = document.implementation.createDocument(null, '', null);
    doc.appendChild(modelDefault);

    return doc;
  }

  // Con registro previo: parsear XML guardado
  return domParser.parseFromString(lastSavedRecord.xml, 'text/xml');
}
```

**Flujo**:

1. Verificar si formulario tiene instancia `jr://instance/last-saved`
2. Obtener último registro guardado de IndexedDB
3. Si existe: Parsear XML y usar como instancia externa
4. Si no existe: Usar instancia vacía del modelo
5. Reemplazar en `survey.externalData`

---

## 12. EXPORTACIÓN DE DATOS

### 12.1 Módulo Exporter

**Archivo**: `public/js/src/module/exporter.js`

Permite exportar todos los registros guardados localmente como archivo ZIP.

#### 12.1.1 Proceso de Exportación

```javascript
function recordsToZip(enketoId, formTitle) {
  const failures = [];
  const tasks = [];
  const meta = [];
  const name = formTitle || enketoId;
  const zip = new JSZip();

  return store.record
    .getAll(enketoId)
    .then(records =>
      // Procesar secuencialmente
      records.reduce(
        (prevPromise, record) =>
          prevPromise.then(() =>
            store.record.get(record.instanceId).then(record => {
              const failedFiles = [];
              const folderName = `${name}_${_formatDate(record.created)}`;

              // Crear carpeta para el registro
              const folder = zip.folder(folderName);

              // Agregar XML
              folder.file('submission.xml', `<?xml version="1.0" ?>\n${record.xml}`, {
                date: new Date(record.updated)
              });

              // Metadatos del registro
              const folderMeta = {
                folder: folderName,
                draft: record.draft,
                'local name': record.name,
                instanceID: record.instanceId
              };

              // Agregar archivos multimedia
              record.files.forEach(file => {
                tasks.push(
                  utils
                    .blobToArrayBuffer(file.item)
                    .then(arrayBuffer => {
                      folder.file(file.name, arrayBuffer);
                    })
                    .catch(error => {
                      console.error(error);
                      failedFiles.push(file.name);
                      failures.push(
                        `Failed to retrieve ${file.name} ` + `for record "${record.name}".`
                      );
                    })
                );
              });

              return Promise.all(tasks).then(() => {
                if (failedFiles.length > 0) {
                  folderMeta['failed files'] = failedFiles;
                }
                meta.push(folderMeta);
              });
            })
          ),
        Promise.resolve()
      )
    )
    .then(() => {
      // Agregar archivo de metadatos
      zip.file('meta.json', JSON.stringify(meta, null, 4));

      // Generar ZIP
      return zip.generateAsync({ type: 'blob' });
    })
    .then(blob => {
      blob.name = `${name}_${_formatDate(new Date())}.zip`;

      if (failures.length > 0) {
        const error = new Error(
          `<ul class="error-list"><li>${failures.join('</li><li>')}</li></ul>`
        );
        error.exportFile = blob;
        throw error;
      }

      return blob;
    });
}
```

#### 12.1.2 Estructura del ZIP

```
formName_2024-12-09_14-30-00.zip
├── meta.json
├── formName_2024-12-09_14-25-00/
│   ├── submission.xml
│   ├── image1.jpg
│   └── audio1.mp3
├── formName_2024-12-09_14-26-00/
│   ├── submission.xml
│   └── image2.jpg
└── ...
```

**meta.json**:

```json
[
    {
        "folder": "formName_2024-12-09_14-25-00",
        "draft": false,
        "local name": "Record 1",
        "instanceID": "uuid:12345...",
        "failed files": ["missing.jpg"]
    },
    ...
]
```

---

## 13. MANEJO DE ERRORES Y RECUPERACIÓN

### 13.1 Estrategias de Recuperación

#### 13.1.1 Errores de Conexión

```javascript
// Backoff exponencial para reintentos
let backoffAttempts = 0;
const MAX_BACKOFF_DELAY = 5 * 60 * 1000; // 5 minutos

function backoff(callback) {
  const delay = Math.min(Math.pow(2, backoffAttempts) * 1000, MAX_BACKOFF_DELAY);
  backoffAttempts++;

  setTimeout(() => {
    callback({ isRetry: true, isUserTriggered: false });
  }, delay);
}
```

**Progresión de reintentos**:

- Intento 1: 1 segundo
- Intento 2: 2 segundos
- Intento 3: 4 segundos
- Intento 4: 8 segundos
- ...
- Máximo: 5 minutos

#### 13.1.2 Errores de Almacenamiento

```javascript
// Verificación de permisos de escritura
function _isWriteable() {
  return propertyStore.update({
    name: 'testWrite',
    value: new Date().getTime()
  });
}

// Detección de soporte de Blobs
function _canStoreBlobs() {
  const aBlob = new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: 'text/xml' });

  return propertyStore.update({
    name: 'testBlobWrite',
    value: aBlob
  });
}
```

#### 13.1.3 Errores de Validación

```javascript
// Validación antes de envío
form
  .validate()
  .then(valid => {
    if (valid) {
      return _submitRecord(survey);
    }
    gui.alert(t('alert.validationerror.msg'));
  })
  .catch(e => {
    gui.alert(e.message);
  });
```

### 13.2 Mensajes de Error al Usuario

```javascript
// Errores de carga
function _showErrorOrAuthenticate(error) {
  error = typeof error === 'string' ? new Error(error) : error;
  loader.classList.add('fail');

  if (error.status === 401) {
    // Redirigir a login
    window.location.href = `${settings.loginUrl}?return_url=${encodeURIComponent(
      window.location.href
    )}`;
  } else if (error.status === 404) {
    // Formulario no encontrado
    gui.alertLoadErrors([error.message], null, {
      omitIntro: true,
      omitSupportContact: true
    });
  } else {
    // Error genérico
    if (!Array.isArray(error)) {
      error = [error.message || t('error.unknown')];
    }
    gui.alertLoadErrors(error, t('alert.loaderror.entryadvice'));
  }
}
```

### 13.3 Limpieza de Datos

```javascript
// Botón de emergencia para limpiar todo
const flushBtn = document.querySelector('.side-slider__advanced__button.flush-db');

if (flushBtn) {
  flushBtn.addEventListener('click', () => {
    gui
      .confirm(
        {
          msg: t('confirm.deleteall.msg'),
          heading: t('confirm.deleteall.heading')
        },
        {
          posButton: t('confirm.deleteall.posButton')
        }
      )
      .then(confirmed => {
        if (!confirmed) {
          throw new Error('Cancelled by user');
        }
        return store.flush();
      })
      .then(() => {
        location.reload();
      })
      .catch(() => {});
  });
}

// Función de limpieza completa
function flush() {
  return new Promise((resolve, reject) => {
    try {
      server.close(databaseName);
    } catch (e) {
      console.log('Database already removed', e);
      resolve();
    }

    const request = indexedDB.deleteDatabase(databaseName);

    request.onsuccess = () => {
      console.log('Deleted database successfully');
      resolve();
    };
    request.onerror = reject;
    request.onblocked = reject;
  });
}
```

---

## 14. OPTIMIZACIONES Y CONSIDERACIONES DE RENDIMIENTO

### 14.1 Caché de Data URIs

```javascript
const dataUriCache = {};

function blobToDataUri(blob, filename) {
  const cacheKey = filename || (blob?.name ? blob.name : null);
  const cacheResult = cacheKey ? dataUriCache[cacheKey] : null;

  return new Promise((resolve, reject) => {
    if (cacheResult) {
      // Usar caché para evitar conversiones repetidas
      resolve(cacheResult);
    } else {
      // Convertir y cachear
      reader = new FileReader();
      reader.onloadend = () => {
        const base64data = reader.result;
        if (cacheKey) {
          dataUriCache[cacheKey] = base64data;
        }
        resolve(base64data);
      };
      reader.readAsDataURL(blob);
    }
  });
}
```

**Beneficios**:

- Evita conversiones repetidas de Blobs a Data URIs
- Reduce degradación de rendimiento con múltiples imágenes
- Previene excepciones en iOS

### 14.2 Agrupación de Elementos por Fuente

```javascript
function _getElementsGroupedBySrc(containers) {
  const groupedElements = [];
  const urls = {};
  let els = [];

  containers.forEach(
    container => (els = els.concat([...container.querySelectorAll('[data-offline-src]')]))
  );

  els.forEach(el => {
    if (!urls[el.dataset.offlineSrc]) {
      const src = el.dataset.offlineSrc;
      const group = els.filter(e => e.dataset.offlineSrc === src);

      urls[src] = true;
      groupedElements.push(group);
    }
  });

  return groupedElements;
}
```

**Optimización**: Evita descargar el mismo recurso múltiples veces.

### 14.3 Procesamiento Secuencial

```javascript
// Encriptación de archivos secuencialmente
return funcs.reduce(
  (prevPromise, func) =>
    prevPromise.then(result =>
      func().then(blob => {
        result.push(blob);
        return result;
      })
    ),
  Promise.resolve([])
);
```

**Razón**: Necesario para incrementación correcta del seed en encriptación.

### 14.4 Envío Secuencial de Registros

```javascript
// Enviar registros uno por uno
for await (const record of records) {
  try {
    await connection.uploadQueuedRecord(record);
    // Procesar resultado...
  } catch (error) {
    // Manejar error...
  }
}
```

**Razones**:

- Mejor feedback al usuario
- Evita problemas con conexiones muy pobres
- Compatibilidad con ODK Aggregate (issue #400)

---

## 15. COMPATIBILIDAD Y LIMITACIONES

### 15.1 Requisitos del Navegador

#### 15.1.1 Funcionalidades Requeridas

```javascript
// Verificación de soporte de IndexedDB
function _checkSupport() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'object') {
      resolve();
    } else {
      if (sniffer.os.ios) {
        error = new Error(t('store.error.iosusesafari'));
      } else {
        error = new Error(t('store.error.notsupported'));
      }
      error.status = 500;
      reject(error);
    }
  });
}

// Verificación de soporte de encriptación
function isSupported() {
  return (
    typeof ArrayBuffer !== 'undefined' &&
    new ArrayBuffer(8).byteLength === 8 &&
    typeof Uint8Array !== 'undefined' &&
    new Uint8Array(8).length === 8
  );
}

// Verificación de Service Workers
if ('serviceWorker' in navigator) {
  // Registrar service worker
} else {
  if (location.protocol.startsWith('http:')) {
    console.error('Service workers not supported on http (insecure)');
  } else {
    console.error('Service workers not supported on this browser');
  }
}
```

#### 15.1.2 Navegadores Soportados

**Completamente soportados**:

- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+
- Opera 67+

**Parcialmente soportados**:

- Safari 7-8: Requiere codificación Base64 de Blobs
- iOS Safari: Debe usar Safari (no otros navegadores)

**No soportados**:

- Internet Explorer (cualquier versión)
- Navegadores sin IndexedDB
- Navegadores sin Service Workers (para lanzamiento offline)

### 15.2 Limitaciones Conocidas

#### 15.2.1 Tamaño de Almacenamiento

```javascript
// Tamaño máximo de envío por defecto
const DEFAULT_MAX_SIZE = 5 * 1000 * 1000; // 5 MB

// Verificación de tamaño de archivo
function isTooLarge(file) {
  return file && file.size > _getMaxSize();
}
```

**Límites de IndexedDB**:

- Chrome: ~60% del espacio disponible en disco
- Firefox: ~50% del espacio disponible en disco
- Safari: 1 GB (puede solicitar más)
- Móviles: Generalmente más restrictivo

#### 15.2.2 Restricciones de Encriptación

```javascript
// No permitir borradores con encriptación
if (form.encryptionKey) {
  const saveDraftButton = document.querySelector('.form-footer#save-draft');
  if (saveDraftButton) {
    saveDraftButton.remove();
  }
}

// No auto-guardar con encriptación
if (form.recordName || form.encryptionKey) {
  return autoSavePromise;
}
```

**Limitaciones**:

- No se pueden guardar borradores
- No hay auto-guardado
- Requiere navegador moderno con soporte de ArrayBuffer

#### 15.2.3 Limitaciones de iOS

```javascript
// Advertencia específica para iOS
if (sniffer.os.ios) {
  error = new Error(t('store.error.iosusesafari'));
}
```

**Problemas conocidos**:

- Debe usar Safari (no Chrome, Firefox, etc.)
- Límites de almacenamiento más restrictivos
- Posibles problemas con FileReader (resuelto con caché)

### 15.3 Consideraciones de Seguridad

#### 15.3.1 HTTPS Requerido

```javascript
if (location.protocol.startsWith('http:')) {
  console.error('Service workers not supported on http (insecure)');
}
```

**Service Workers requieren HTTPS** (excepto localhost para desarrollo).

#### 15.3.2 CSRF Protection

```javascript
// Agregar token CSRF a envíos
const csrfToken = (
  document.cookie.split('; ').find(c => c.startsWith(settings.csrfCookieName)) || ''
).split('=')[1];

if (csrfToken) {
  fd.append(settings.csrfCookieName, csrfToken);
}
```

#### 15.3.3 Same-Origin Policy

```javascript
// Fetch con credenciales same-origin
return fetch(event.request, {
  credentials: 'same-origin',
  cache: 'reload'
});
```

---

## 16. CONFIGURACIÓN Y PERSONALIZACIÓN

### 16.1 Configuración del Servidor

**Archivo**: `config/default-config.json`

```json
{
  "offline enabled": true,
  "themes supported": ["grid", "formhub", "kobo"],
  "timeout": 300000,
  "max size": 5000000,
  "base path": "",
  "offline path": "/x"
}
```

**Parámetros clave**:

- `offline enabled`: Habilitar/deshabilitar funcionalidad offline
- `themes supported`: Temas a cachear en service worker
- `timeout`: Timeout de envío en milisegundos
- `max size`: Tamaño máximo de envío en bytes
- `offline path`: Prefijo de ruta para vistas offline

### 16.2 Configuración del Cliente

**Archivo**: `public/js/src/module/settings.js`

```javascript
// Detección automática de modo offline
settings.offline = window.location.pathname.includes('/x/');

// Extracción de Enketo ID
settings.enketoId = utils.getEnketoId(window.location.pathname);

// Tipo de vista
if (window.location.pathname.includes('/preview/')) {
  settings.type = 'preview';
} else if (window.location.pathname.includes('/single/')) {
  settings.type = 'single';
} else if (window.location.pathname.includes('/edit/')) {
  settings.type = 'edit';
} else if (window.location.pathname.includes('/view/')) {
  settings.type = 'view';
} else {
  settings.type = 'other';
}

// Tamaño máximo por defecto
settings.maxSize = DEFAULT_MAX_SIZE;
```

### 16.3 Intervalos de Actualización

```javascript
// Configurables en form-cache.js
const CACHE_UPDATE_INITIAL_DELAY = 3 * 1000; // 3 segundos
const CACHE_UPDATE_INTERVAL = 20 * 60 * 1000; // 20 minutos

// Verificación de service worker
setInterval(
  () => {
    registration.update();
  },
  60 * 60 * 1000
); // 1 hora
```

---

## 17. DEBUGGING Y HERRAMIENTAS DE DESARROLLO

### 17.1 Funciones de Debugging

```javascript
// Volcado de contenido de tablas
const dump = {
  resources() {
    server.resources
      .query()
      .all()
      .execute()
      .done(results => {
        console.log(`${results.length} resources found`);
        results.forEach(item => {
          if (item instanceof Blob) {
            console.log(item.type, item.size, URL.createObjectURL(item));
          } else {
            console.log('resource string with length', item.length);
          }
        });
      });
  },

  surveys() {
    server.surveys
      .query()
      .all()
      .execute()
      .done(results => {
        console.log(`${results.length} surveys found`);
        results.forEach(item => console.log('survey', item));
      });
  },

  records() {
    server.records
      .query()
      .all()
      .execute()
      .done(results => {
        console.log(`${results.length} records found`);
        results.forEach(item => console.log('record', item));
      });
  },

  files() {
    server.files
      .query()
      .all()
      .execute()
      .done(results => {
        console.log(`${results.length} files found`);
        results.forEach(item => {
          if (item instanceof Blob) {
            console.log(item.type, item.size, URL.createObjectURL(item));
          } else {
            console.log('file string with length', item.length);
          }
        });
      });
  }
};

// Uso en consola del navegador
// store.dump.surveys()
// store.dump.records()
```

### 17.2 Herramientas del Navegador

**Chrome DevTools**:

1. Application → Storage → IndexedDB → enketo
2. Application → Service Workers
3. Application → Cache Storage → enketo-common\_\*

**Firefox DevTools**:

1. Storage → Indexed DB → enketo
2. Application → Service Workers
3. Storage → Cache

### 17.3 Logs Útiles

```javascript
// Logs de inicialización
console.log('App in offline-capable mode.');
console.log('Service worker registration successful', registration.scope);
console.log('Opened cache');

// Logs de actualización
console.log('Checking for survey update...');
console.log('Cached survey is up to date!', hash);
console.log('Cached survey is outdated!', 'old:', hash, 'new:', version);

// Logs de sincronización
console.debug(`Uploading queue of ${displayableRecords.length} records.`);
console.log(`Splitting record into ${batches.length} batches`, batches);

// Logs de auto-guardado
console.log('autosave successful');
```

---

## 18. RESUMEN DE ARCHIVOS CLAVE

### 18.1 Módulos del Cliente (JavaScript)

| Archivo                         | Propósito                 | Funciones Principales                                             |
| ------------------------------- | ------------------------- | ----------------------------------------------------------------- |
| `store.js`                      | Gestión de IndexedDB      | `init()`, `surveyStore`, `recordStore`, `propertyStore`           |
| `form-cache.js`                 | Caché de formularios      | `init()`, `get()`, `set()`, `updateMedia()`, `_updateCache()`     |
| `records-queue.js`              | Cola de registros         | `init()`, `save()`, `uploadQueue()`, `getAutoSavedRecord()`       |
| `connection.js`                 | Comunicación con servidor | `getOnlineStatus()`, `getFormParts()`, `uploadQueuedRecord()`     |
| `application-cache.js`          | Service Worker            | `init()`, gestión de eventos                                      |
| `offline-app-worker-partial.js` | Lógica del SW             | Event listeners: install, activate, fetch                         |
| `controller-webform.js`         | Control del formulario    | `init()`, `_saveRecord()`, `_autoSaveRecord()`, `_submitRecord()` |
| `file-manager.js`               | Gestión de archivos       | `getFileUrl()`, `getCurrentFiles()`                               |
| `encryptor.js`                  | Encriptación              | `encryptRecord()`, `_encryptContent()`                            |
| `last-saved.js`                 | Último guardado           | `setLastSavedRecord()`, `populateLastSavedInstances()`            |
| `exporter.js`                   | Exportación ZIP           | `recordsToZip()`                                                  |
| `settings.js`                   | Configuración             | Detección de modo offline, parámetros                             |
| `utils.js`                      | Utilidades                | `blobToDataUri()`, `csvToXml()`, `getEnketoId()`                  |
| `event.js`                      | Eventos personalizados    | Definiciones de eventos                                           |

### 18.2 Controladores del Servidor (Node.js)

| Archivo                    | Propósito              | Endpoints                      |
| -------------------------- | ---------------------- | ------------------------------ |
| `offline-controller.js`    | Generación de SW       | `GET /x/offline-app-worker.js` |
| `survey-controller.js`     | Gestión de formularios | `GET /x/:enketoId`, etc.       |
| `submission-controller.js` | Envío de datos         | `POST /submission/:enketoId`   |

### 18.3 Archivos de Configuración

| Archivo                      | Propósito                  |
| ---------------------------- | -------------------------- |
| `config/default-config.json` | Configuración del servidor |
| `package.json`               | Dependencias y scripts     |

---

## 19. DIAGRAMA DE ARQUITECTURA COMPLETO

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR DEL USUARIO                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    SERVICE WORKER                           │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ Cache Storage: enketo-common_{version}               │  │    │
│  │  │  - CSS (themes)                                       │  │    │
│  │  │  - JavaScript                                         │  │    │
│  │  │  - Imágenes                                           │  │    │
│  │  │  - Traducciones (dinámico)                           │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  │                                                              │    │
│  │  Estrategia: Cache First → Network Fallback                │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    INDEXEDDB: enketo                        │    │
│  │  ┌──────────────────────────────────────────────────────┐  │    │
│  │  │ surveys         - Formularios completos              │  │    │
│  │  │ resources       - Recursos multimedia del formulario │  │    │
│  │  │ records         - Registros de datos                 │  │    │
│  │  │ files           - Archivos adjuntos                  │  │    │
│  │  │ lastSavedRecords- Último registro guardado           │  │    │
│  │  │ properties      - Configuración y estadísticas       │  │    │
│  │  │ data            - Datos dinámicos                    │  │    │
│  │  └──────────────────────────────────────────────────────┘  │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                  MÓDULOS JAVASCRIPT                         │    │
│  │                                                              │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │    │
│  │  │   Store     │  │ Form Cache  │  │  Records    │        │    │
│  │  │   Module    │  │   Module    │  │   Queue     │        │    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │    │
│  │         │                 │                 │                │    │
│  │         └─────────────────┴─────────────────┘                │    │
│  │                           │                                   │    │
│  │         ┌─────────────────┴─────────────────┐               │    │
│  │         │                                     │               │    │
│  │  ┌──────▼──────┐                    ┌───────▼──────┐        │    │
│  │  │ Connection  │                    │ Controller   │        │    │
│  │  │   Module    │                    │   Webform    │        │    │
│  │  └──────┬──────┘                    └───────┬──────┘        │    │
│  │         │                                     │               │    │
│  │         │  ┌─────────────┐  ┌──────────────┐│               │    │
│  │         │  │File Manager │  │  Encryptor   ││               │    │
│  │         │  └─────────────┘  └──────────────┘│               │    │
│  │         │                                     │               │    │
│  └─────────┼─────────────────────────────────────┼──────────────┘    │
│            │                                     │                    │
└────────────┼─────────────────────────────────────┼────────────────────┘
             │                                     │
             │ HTTP/HTTPS                          │ Eventos UI
             │                                     │
┌────────────▼─────────────────────────────────────▼────────────────────┐
│                      SERVIDOR ENKETO EXPRESS                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                    CONTROLADORES                            │    │
│  │                                                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐               │    │
│  │  │ Offline          │  │ Survey           │               │    │
│  │  │ Controller       │  │ Controller       │               │    │
│  │  │                  │  │                  │               │    │
│  │  │ GET /x/offline-  │  │ GET /x/:id       │               │    │
│  │  │ app-worker.js    │  │                  │               │    │
│  │  └──────────────────┘  └──────────────────┘               │    │
│  │                                                              │    │
│  │  ┌──────────────────┐  ┌──────────────────┐               │    │
│  │  │ Submission       │  │ Media            │               │    │
│  │  │ Controller       │  │ Controller       │               │    │
│  │  │                  │  │                  │               │    │
│  │  │ POST /submission │  │ GET /media/*     │               │    │
│  │  │ /:id             │  │                  │               │    │
│  │  └──────────────────┘  └──────────────────┘               │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────┐    │
│  │                       MODELOS                               │    │
│  │                                                              │    │
│  │  - survey-model.js    - Gestión de formularios             │    │
│  │  - submission-model.js- Gestión de envíos                  │    │
│  │  - cache-model.js     - Caché de Redis                     │    │
│  │  - config-model.js    - Configuración                      │    │
│  └────────────────────────────────────────────────────────────┘    │
│                                                                       │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                │ HTTP/HTTPS
                                │
┌───────────────────────────────▼───────────────────────────────────────┐
│                    SERVIDOR ODK / BACKEND                              │
│                                                                         │
│  - Almacenamiento de formularios XForm                                │
│  - Recepción de envíos                                                │
│  - Gestión de usuarios y permisos                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 20. CONCLUSIONES Y MEJORES PRÁCTICAS

### 20.1 Fortalezas del Sistema

1. **Robustez**: Múltiples capas de almacenamiento y recuperación
2. **Escalabilidad**: Maneja múltiples formularios y registros
3. **Compatibilidad**: Funciona con estándares ODK
4. **Seguridad**: Soporte de encriptación de extremo a extremo
5. **Experiencia de usuario**: Auto-guardado, recuperación automática
6. **Sincronización inteligente**: Backoff exponencial, reintentos automáticos

### 20.2 Mejores Prácticas para Desarrolladores

#### 20.2.1 Al Modificar el Código

1. **Siempre probar offline**: Usar DevTools para simular offline
2. **Verificar compatibilidad**: Probar en Safari, Chrome, Firefox
3. **Manejar errores**: Todos los Promises deben tener `.catch()`
4. **Logging apropiado**: Usar `console.log/error` para debugging
5. **Versionado**: Cambios en SW requieren actualizar versión

#### 20.2.2 Al Implementar Nuevas Funcionalidades

1. **Considerar modo offline**: ¿Funciona sin conexión?
2. **Almacenamiento**: ¿Qué datos necesitan persistir?
3. **Sincronización**: ¿Cómo se sincroniza con el servidor?
4. **Tamaño**: ¿Impacta el tamaño de almacenamiento?
5. **Encriptación**: ¿Es compatible con encriptación?

#### 20.2.3 Al Depurar Problemas

1. **Verificar IndexedDB**: Usar DevTools → Application → IndexedDB
2. **Verificar Service Worker**: Application → Service Workers
3. **Verificar Cache**: Application → Cache Storage
4. **Logs de consola**: Buscar errores y advertencias
5. **Network tab**: Verificar peticiones fallidas

### 20.3 Limitaciones a Considerar

1. **Tamaño de almacenamiento**: Limitado por el navegador
2. **Encriptación**: No permite borradores ni auto-guardado
3. **iOS**: Requiere Safari, límites más restrictivos
4. **HTTPS**: Requerido para Service Workers
5. **Navegadores antiguos**: Soporte limitado o nulo

### 20.4 Recomendaciones para Usuarios Finales

1. **Usar navegadores modernos**: Chrome, Firefox, Safari recientes
2. **Permitir almacenamiento**: No bloquear cookies/almacenamiento
3. **Conexión periódica**: Sincronizar regularmente
4. **No limpiar datos**: Evitar limpiar caché del navegador
5. **Exportar datos**: Usar función de exportación como respaldo

---

## 21. GLOSARIO DE TÉRMINOS

| Término                 | Definición                                                                |
| ----------------------- | ------------------------------------------------------------------------- |
| **IndexedDB**           | Base de datos NoSQL del navegador para almacenamiento estructurado        |
| **Service Worker**      | Script que se ejecuta en segundo plano para interceptar peticiones de red |
| **Blob**                | Binary Large Object - objeto que representa datos binarios                |
| **Object URL**          | URL temporal que apunta a un objeto Blob en memoria                       |
| **Data URI**            | URL que contiene datos codificados en Base64                              |
| **Backoff Exponencial** | Estrategia de reintentos con delays crecientes                            |
| **FormData**            | Objeto para construir pares clave/valor para envío multipart              |
| **CSRF**                | Cross-Site Request Forgery - ataque de falsificación de peticiones        |
| **XForm**               | Formato XML para definición de formularios (estándar ODK)                 |
| **Enketo ID**           | Identificador único de un formulario en Enketo                            |
| **Instance ID**         | Identificador único de un registro/envío                                  |
| **Draft**               | Borrador - registro guardado pero no enviado                              |
| **Auto-save**           | Guardado automático temporal                                              |
| **Last-saved**          | Funcionalidad para acceder al último registro guardado                    |
| **Manifest**            | Documento XML que describe un envío encriptado                            |
| **Seed**                | Valor inicial para generación de IVs en encriptación                      |
| **IV**                  | Initialization Vector - vector de inicialización para encriptación        |

---

## APÉNDICE A: EVENTOS PERSONALIZADOS

```javascript
// Eventos de formulario
events.XFormsValueChanged(); // Cambio de valor en formulario
events.AddRepeat(); // Agregar repetición
events.ProgressUpdate(); // Actualización de progreso
events.BeforeSave(); // Antes de guardar
events.FormReset(); // Formulario reseteado
events.Edited(); // Formulario editado

// Eventos de envío
events.SubmissionSuccess(); // Envío exitoso
events.QueueSubmissionSuccess(); // Envío de cola exitoso
events.Close(); // Cerrar formulario

// Eventos de aplicación
events.OfflineLaunchCapable(); // Capacidad de lanzamiento offline
events.ApplicationUpdated(); // Aplicación actualizada
events.FormUpdated(); // Formulario actualizado
```

---

**FIN DEL DOCUMENTO**

---

_Este documento fue generado mediante análisis exhaustivo del código fuente de Enketo Express._  
_Fecha: Diciembre 2024_  
_Versión analizada: Basada en estructura de archivos proporcionada_
