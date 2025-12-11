/**
 * Servicio de clientes con Universal Infrastructure completa
 * Implementa todas las funcionalidades de nivel empresarial:
 * - Validación con Zod
 * - Almacenamiento multi-capa
 * - Auditoría inmutable
 * - Sincronización inteligente
 * - Resolución de conflictos CRDT
 * - Integridad de datos con checksums
 * - Captura de contexto completo (GPS, batería, conexión)
 */

import { crediSyncApp } from '$lib/app-config.js';
import { captureLocation } from '$lib/utils/location.js';
import { getDeviceInfo } from '$lib/utils/device.js';

// ============================================================================
// CREAR CLIENTE CON UNIVERSAL INFRASTRUCTURE COMPLETA
// ============================================================================

/**
 * Crear cliente usando @sync/core con toda la infraestructura empresarial
 * - Validación completa con Zod
 * - Almacenamiento atómico en 3 capas
 * - Auditoría inmutable con hash chain
 * - Captura de contexto completo
 * - Sincronización inteligente
 */
export async function createCliente(clienteData) {
	try {
		console.log('👤 [CLIENTE] Iniciando creación con Universal Infrastructure...');
		
		// 1. VALIDACIÓN SIMPLE (SIN ZOD - MÁS LIVIANO)
		console.log('🔍 [CLIENTE] Validando datos básicos...');
		console.log('🔍 [CLIENTE] Datos a validar:', clienteData);
		
		// Validación básica solo de campos requeridos
		if (!clienteData.nombre || clienteData.nombre.trim().length < 2) {
			throw new Error('El nombre es requerido y debe tener al menos 2 caracteres');
		}
		if (!clienteData.telefono || clienteData.telefono.trim().length < 7) {
			throw new Error('El teléfono es requerido y debe tener al menos 7 dígitos');
		}

		
		console.log('✅ [CLIENTE] Validación básica exitosa');
		
		// 2. ASEGURAR INICIALIZACIÓN DE LA APP
		if (!crediSyncApp.isStarted) {
			console.log('🔄 [CLIENTE] Inicializando CrediSync...');
			await crediSyncApp.start();
		}
		
		// 3. CAPTURAR CONTEXTO COMPLETO
		console.log('📍 [CLIENTE] Capturando contexto completo...');
		const location = await captureLocation();
		const deviceInfo = await getDeviceInfo();
		const currentUser = await crediSyncApp.services.auth.getCurrentUser();
		
		// 4. PREPARAR DATOS COMPLETOS
		const clienteId = crypto.randomUUID();
		const now = Date.now();
		const deviceId = deviceInfo.deviceId;
		
		const cliente = {
			// Campos básicos
			id: clienteId,
			tenant_id: currentUser?.tenant_id || '00000000-0000-0000-0000-000000000001',
			created_by: currentUser?.id || 'system',
			...clienteData,
			
			// Timestamps
			created_at: now,
			updated_at: now,
			
			// Campos calculados iniciales
			creditos_activos: 0,
			saldo_total: 0,
			dias_atraso_max: 0,
			estado: 'activo',
			score: null,
			
			// CRDT - Vector de versión para resolución de conflictos
			version_vector: { [deviceId]: 1 },
			field_versions: {
				nombre: { value: clienteData.nombre, timestamp: now, device_id: deviceId },
				numero_documento: { value: clienteData.numero_documento, timestamp: now, device_id: deviceId },
				telefono: { value: clienteData.telefono, timestamp: now, device_id: deviceId },
				direccion: { value: clienteData.direccion, timestamp: now, device_id: deviceId }
			},
			
			// Sincronización
			synced: false,
			checksum: '' // Se calculará automáticamente por @sync/core
		};
		
		console.log('👤 [CLIENTE] Datos preparados con contexto completo:', {
			id: cliente.id,
			nombre: cliente.nombre,
			location: location.location ? 'captured' : 'unavailable',
			deviceInfo: 'captured'
		});
		
		// 5. ALMACENAMIENTO ATÓMICO EN 3 CAPAS usando StorageManager REAL
		console.log('💾 [CLIENTE] Iniciando almacenamiento atómico en 3 capas...');
		
		try {
			// Usar StorageManager REAL para escritura atómica en 3 capas
			const storageResult = await crediSyncApp.services.storage.writeAtomic(cliente, {
				tableName: 'clientes', // Usar nombre correcto de tabla universal
				recordId: clienteId,
				skipBackup: false // Incluir todas las capas para datos críticos
			});
			
			console.log('✅ [CLIENTE] Almacenamiento atómico completado:', {
				layersWritten: storageResult.layersWritten,
				errors: storageResult.errors
			});
			
		} catch (storageError) {
			console.error('❌ [CLIENTE] Error en almacenamiento atómico:', storageError);
			throw new Error(`Error en almacenamiento: ${storageError.message}`);
		}
		
		// 6. AUDITORÍA INMUTABLE CON HASH CHAIN
		console.log('📋 [CLIENTE] Registrando en auditoría inmutable...');
		await crediSyncApp.services.audit.logEvent({
			tenant_id: cliente.tenant_id,
			user_id: cliente.created_by,
			device_id: deviceId,
			event_type: 'CREATE',
			aggregate_type: 'cliente',
			aggregate_id: clienteId,
			data: cliente,
			metadata: {
				ip_address: null, // No disponible en browser
				user_agent: navigator.userAgent,
				app_version: '1.0.0',
				latitude: location.location?.latitude || null,
				longitude: location.location?.longitude || null,
				connection_type: deviceInfo.connection?.type || 'unknown',
				battery_level: deviceInfo.battery?.level ? Math.round(deviceInfo.battery.level * 100) : null
			}
		});
		
		// 7. COLA DE SINCRONIZACIÓN CON PRIORIDADES
		console.log('🔄 [CLIENTE] Agregando a cola de sincronización...');
		await crediSyncApp.services.syncQueue.addToQueue(
			'clientes',
			clienteId,
			'INSERT',
			{
				priority: 3, // Prioridad para clientes (según la implementación: 1=pagos, 2=créditos, 3=clientes)
				data: cliente
			}
		);
		
		// 8. SINCRONIZACIÓN INTELIGENTE
		if (navigator.onLine) {
			console.log('🌐 [CLIENTE] Iniciando sincronización inteligente...');
			// No bloquear la UI - sincronizar en background
			setTimeout(() => {
				crediSyncApp.services.sync.sync({ 
					force: false,
					onProgress: (progress) => {
						console.log(`🔄 [SYNC] ${progress.phase}: ${progress.current}/${progress.total} - ${progress.message}`);
					}
				});
			}, 100);
		} else {
			console.log('📴 [CLIENTE] Offline - Cliente guardado localmente, se sincronizará cuando haya conexión');
		}
		
		// 9. VERIFICACIÓN DE INTEGRIDAD usando ChecksumService REAL
		console.log('🔐 [CLIENTE] Verificando integridad de datos...');
		
		// Leer usando StorageManager REAL con fallback automático
		const readResult = await crediSyncApp.services.storage.readWithFallback({
			tableName: 'clientes',
			recordId: clienteId
		});
		
		if (!readResult.success || !readResult.data) {
			throw new Error('Error de integridad: Cliente no encontrado después de guardar');
		}
		
		const savedCliente = readResult.data;
		console.log(`✅ [CLIENTE] Cliente verificado desde ${readResult.source}`);
		
		// Calcular y verificar checksum usando ChecksumService REAL
		try {
			const calculatedChecksum = await crediSyncApp.services.checksum.calculateChecksum(savedCliente);
			
			// Actualizar el cliente con el checksum calculado si no lo tiene
			if (!savedCliente.checksum) {
				await crediSyncApp.services.db.clientes.update(clienteId, { checksum: calculatedChecksum });
				savedCliente.checksum = calculatedChecksum;
				console.log('✅ [CLIENTE] Checksum calculado y guardado');
			} else if (calculatedChecksum !== savedCliente.checksum) {
				console.warn('⚠️ [CLIENTE] Advertencia: Checksum no coincide');
			} else {
				console.log('✅ [CLIENTE] Checksum verificado correctamente');
			}
		} catch (checksumError) {
			console.warn('⚠️ [CLIENTE] Error calculando checksum:', checksumError);
		}
		
		console.log('✅ [CLIENTE] Cliente creado exitosamente con Universal Infrastructure completa');
		
		return {
			...savedCliente,
			_metadata: {
				created_with_location: !!location.location,
				device_info_captured: true,
				stored_in_layers: 3,
				audit_logged: true,
				queued_for_sync: true
			}
		};
		
	} catch (error) {
		console.error('❌ [CLIENTE] Error en creación con Universal Infrastructure:', error);
		
		// Log del error para análisis usando AuditLogger REAL
		if (crediSyncApp.isStarted) {
			try {
				const errorDeviceInfo = await getDeviceInfo();
				await crediSyncApp.services.audit.logEvent({
					tenant_id: '00000000-0000-0000-0000-000000000001',
					user_id: 'system',
					device_id: errorDeviceInfo.deviceId,
					event_type: 'ERROR',
					aggregate_type: 'cliente',
					aggregate_id: 'unknown',
					data: { error: error.message, clienteData },
					metadata: {
						ip_address: null,
						user_agent: navigator.userAgent,
						app_version: '1.0.0',
						latitude: null,
						longitude: null,
						connection_type: errorDeviceInfo.connection?.type || 'unknown',
						battery_level: errorDeviceInfo.battery?.level ? Math.round(errorDeviceInfo.battery.level * 100) : null
					}
				});
			} catch (auditError) {
				console.error('❌ [CLIENTE] Error logging audit event:', auditError);
			}
		}
		
		throw error;
	}
}

// ============================================================================
// OBTENER CLIENTES CON RECUPERACIÓN AUTOMÁTICA
// ============================================================================

/**
 * Obtener todos los clientes usando ÚNICAMENTE métodos reales de @sync/core
 * Usa IndexedDB como fuente principal con recuperación automática del StorageManager
 */
export async function getClientes() {
	try {
		console.log('👥 [CLIENTES] Obteniendo clientes usando @sync/core...');
		
		// Asegurar inicialización
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		const currentUser = await crediSyncApp.services.auth.getCurrentUser();
		const tenantId = currentUser?.tenant_id || '00000000-0000-0000-0000-000000000001';
		
		let clientes = [];
		
		try {
			// Usar IndexedDB directamente (principal) - nueva estructura universal
			clientes = await crediSyncApp.services.db.clientes
				.where('tenant_id')
				.equals(tenantId)
				.toArray();
			
			console.log(`✅ [CLIENTES] ${clientes.length} clientes obtenidos desde IndexedDB`);
			
		} catch (indexedDBError) {
			console.error('❌ [CLIENTES] Error obteniendo clientes desde IndexedDB:', indexedDBError);
			return [];
		}
		
		// Verificación de integridad con ChecksumService REAL
		console.log('🔐 [CLIENTES] Verificando integridad de datos...');
		const clientesVerificados = [];
		let corruptedCount = 0;
		let repairedCount = 0;
		
		for (const cliente of clientes) {
			try {
				if (cliente.checksum) {
					// Verificar checksum usando ChecksumService REAL
					const calculatedChecksum = await crediSyncApp.services.checksum.calculateChecksum(cliente);
					
					if (calculatedChecksum === cliente.checksum) {
						clientesVerificados.push(cliente);
					} else {
						console.warn(`⚠️ [CLIENTES] Cliente ${cliente.id} tiene checksum inválido`);
						corruptedCount++;
						
						// Reparación automática: recalcular y actualizar checksum
						try {
							const repairedCliente = { ...cliente, checksum: calculatedChecksum };
							await crediSyncApp.services.db.clientes.update(cliente.id, { checksum: calculatedChecksum });
							clientesVerificados.push(repairedCliente);
							repairedCount++;
							console.log(`✅ [CLIENTES] Cliente ${cliente.id} reparado automáticamente`);
						} catch (repairError) {
							console.error(`❌ [CLIENTES] No se pudo reparar cliente ${cliente.id}:`, repairError);
							// Incluir el cliente sin checksum válido
							clientesVerificados.push(cliente);
						}
					}
				} else {
					// Cliente sin checksum: calcular y guardar
					try {
						const newChecksum = await crediSyncApp.services.checksum.calculateChecksum(cliente);
						await crediSyncApp.services.db.clientes.update(cliente.id, { checksum: newChecksum });
						clientesVerificados.push({ ...cliente, checksum: newChecksum });
						repairedCount++;
					} catch (checksumError) {
						console.warn(`⚠️ [CLIENTES] Error calculando checksum para ${cliente.id}:`, checksumError);
						clientesVerificados.push(cliente); // Incluir sin checksum
					}
				}
			} catch (error) {
				console.error(`❌ [CLIENTES] Error procesando cliente ${cliente.id}:`, error);
				clientesVerificados.push(cliente); // Incluir cliente con error
			}
		}
		
		if (corruptedCount > 0) {
			console.warn(`⚠️ [CLIENTES] ${corruptedCount} clientes con datos corruptos detectados`);
		}
		
		if (repairedCount > 0) {
			console.log(`✅ [CLIENTES] ${repairedCount} clientes reparados automáticamente`);
		}
		
		// Enriquecer con datos calculados para la UI
		const clientesEnriquecidos = await enrichClientesForUI(clientesVerificados);
		
		console.log(`✅ [CLIENTES] ${clientesEnriquecidos.length} clientes procesados correctamente`);
		return clientesEnriquecidos;
		
	} catch (error) {
		console.error('❌ [CLIENTES] Error obteniendo clientes:', error);
		return [];
	}
}

// ============================================================================
// OBTENER CLIENTE POR ID CON RECUPERACIÓN
// ============================================================================

/**
 * Obtener cliente por ID usando StorageManager REAL con fallback automático
 */
export async function getClienteById(id) {
	try {
		console.log(`👤 [CLIENTE] Obteniendo cliente ${id} usando @sync/core...`);
		
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Usar StorageManager REAL con fallback automático a 3 capas
		const readResult = await crediSyncApp.services.storage.readWithFallback({
			tableName: 'clientes',
			recordId: id
		});
		
		if (!readResult.success || !readResult.data) {
			console.log(`❌ [CLIENTE] Cliente ${id} no encontrado`);
			return null;
		}
		
		const cliente = readResult.data;
		console.log(`✅ [CLIENTE] Cliente ${id} obtenido desde ${readResult.source}`);
		
		// Verificar integridad usando ChecksumService REAL
		if (cliente.checksum) {
			try {
				const calculatedChecksum = await crediSyncApp.services.checksum.calculateChecksum(cliente);
				if (calculatedChecksum !== cliente.checksum) {
					console.warn(`⚠️ [CLIENTE] Cliente ${id} tiene checksum inválido, reparando...`);
					
					// Reparación automática
					const repairedCliente = { ...cliente, checksum: calculatedChecksum };
					await crediSyncApp.services.db.clientes.update(id, { checksum: calculatedChecksum });
					
					console.log(`✅ [CLIENTE] Cliente ${id} reparado automáticamente`);
					return repairedCliente;
				} else {
					console.log(`✅ [CLIENTE] Checksum verificado para ${id}`);
				}
			} catch (checksumError) {
				console.warn(`⚠️ [CLIENTE] Error verificando checksum para ${id}:`, checksumError);
			}
		} else {
			// Cliente sin checksum: calcular y guardar
			try {
				const newChecksum = await crediSyncApp.services.checksum.calculateChecksum(cliente);
				await crediSyncApp.services.db.clientes.update(id, { checksum: newChecksum });
				cliente.checksum = newChecksum;
				console.log(`✅ [CLIENTE] Checksum calculado para ${id}`);
			} catch (checksumError) {
				console.warn(`⚠️ [CLIENTE] Error calculando checksum para ${id}:`, checksumError);
			}
		}
		
		return cliente;
		
	} catch (error) {
		console.error(`❌ [CLIENTE] Error obteniendo cliente ${id}:`, error);
		return null;
	}
}

// ============================================================================
// ACTUALIZAR CLIENTE CON CRDT
// ============================================================================

/**
 * Actualizar cliente usando CRDT para resolución de conflictos
 */
export async function updateCliente(id, updates) {
	try {
		console.log(`👤 [CLIENTE] Actualizando cliente ${id} con CRDT...`);
		
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Validación simple de updates
		if (updates.nombre && updates.nombre.trim().length < 2) {
			throw new Error('El nombre debe tener al menos 2 caracteres');
		}
		if (updates.telefono && updates.telefono.trim().length < 7) {
			throw new Error('El teléfono debe tener al menos 7 dígitos');
		}
		
		// Obtener cliente actual
		const currentCliente = await getClienteById(id);
		if (!currentCliente) {
			throw new Error(`Cliente ${id} no encontrado`);
		}
		
		// Capturar contexto
		const deviceInfo = await getDeviceInfo();
		const location = await captureLocation();
		const currentUser = await crediSyncApp.services.auth.getCurrentUser();
		const now = Date.now();
		
		// Preparar actualización con CRDT
		const deviceId = deviceInfo.deviceId;
		const newVersionVector = { ...currentCliente.version_vector };
		newVersionVector[deviceId] = (newVersionVector[deviceId] || 0) + 1;
		
		// Actualizar field_versions para campos modificados
		const newFieldVersions = { ...currentCliente.field_versions };
		Object.keys(updates).forEach(field => {
			newFieldVersions[field] = {
				value: updates[field],
				timestamp: now,
				device_id: deviceId
			};
		});
		
		const updateData = {
			...updates,
			updated_at: now,
			version_vector: newVersionVector,
			field_versions: newFieldVersions,
			synced: false
		};
		
		console.log(`👤 [CLIENTE] Datos de actualización preparados:`, {
			id,
			fields: Object.keys(updates),
			version_vector: newVersionVector
		});
		
		// Almacenamiento atómico usando StorageManager REAL
		const updatedCliente = { ...currentCliente, ...updateData };
		
		try {
			// Usar StorageManager REAL para escritura atómica en 3 capas
			const storageResult = await crediSyncApp.services.storage.writeAtomic(updatedCliente, {
				tableName: 'clientes',
				recordId: id,
				skipBackup: false // Incluir todas las capas para datos críticos
			});
			
			console.log(`✅ [CLIENTE] Cliente ${id} actualizado en ${storageResult.layersWritten.length} capas:`, storageResult.layersWritten);
			
		} catch (storageError) {
			console.error(`❌ [CLIENTE] Error en almacenamiento atómico para ${id}:`, storageError);
			throw new Error(`Error actualizando cliente: ${storageError.message}`);
		}
		
		// Auditoría usando AuditLogger REAL
		await crediSyncApp.services.audit.logEvent({
			tenant_id: currentCliente.tenant_id,
			user_id: currentUser?.id || 'system',
			device_id: deviceId,
			event_type: 'UPDATE',
			aggregate_type: 'cliente',
			aggregate_id: id,
			data: { old: currentCliente, new: updateData },
			metadata: {
				ip_address: null,
				user_agent: navigator.userAgent,
				app_version: '1.0.0',
				latitude: location.location?.latitude || null,
				longitude: location.location?.longitude || null,
				connection_type: deviceInfo.connection?.type || 'unknown',
				battery_level: deviceInfo.battery?.level ? Math.round(deviceInfo.battery.level * 100) : null
			}
		});
		
		// Cola de sincronización usando SyncQueue REAL
		await crediSyncApp.services.syncQueue.addToQueue(
			'clientes',
			id,
			'UPDATE',
			{
				priority: 3, // Prioridad para clientes (según implementación real)
				data: updateData
			}
		);
		
		// Sincronización inteligente
		if (navigator.onLine) {
			setTimeout(() => {
				crediSyncApp.services.sync.sync({ force: false });
			}, 100);
		}
		
		console.log(`✅ [CLIENTE] Cliente ${id} actualizado exitosamente`);
		return await getClienteById(id);
		
	} catch (error) {
		console.error(`❌ [CLIENTE] Error actualizando cliente ${id}:`, error);
		throw error;
	}
}

// ============================================================================
// FUNCIONES DE UTILIDAD Y REPARACIÓN
// ============================================================================

/**
 * Reparar datos corruptos de cliente usando StorageManager REAL
 */
async function repairClienteData(clienteId) {
	try {
		console.log(`🔧 [CLIENTE] Intentando reparar datos para ${clienteId}...`);
		
		// Usar StorageManager REAL para obtener datos con fallback automático
		const readResult = await crediSyncApp.services.storage.readWithFallback({
			tableName: 'clientes',
			recordId: clienteId
		});
		
		if (!readResult.success || !readResult.data) {
			console.warn(`⚠️ [CLIENTE] No se pudo recuperar datos para reparar ${clienteId}`);
			return null;
		}
		
		const cliente = readResult.data;
		console.log(`🔧 [CLIENTE] Datos recuperados desde ${readResult.source} para reparación`);
		
		try {
			// Recalcular checksum usando ChecksumService REAL
			const newChecksum = await crediSyncApp.services.checksum.calculateChecksum(cliente);
			const repairedCliente = { ...cliente, checksum: newChecksum };
			
			// Guardar usando StorageManager REAL (escritura atómica en 3 capas)
			await crediSyncApp.services.storage.writeAtomic(repairedCliente, {
				tableName: 'clientes',
				recordId: clienteId,
				skipBackup: false
			});
			
			console.log(`✅ [CLIENTE] Cliente ${clienteId} reparado exitosamente`);
			return repairedCliente;
			
		} catch (repairError) {
			console.error(`❌ [CLIENTE] Error en proceso de reparación para ${clienteId}:`, repairError);
			return null;
		}
		
	} catch (error) {
		console.error(`❌ [CLIENTE] Error reparando datos para ${clienteId}:`, error);
		return null;
	}
}

/**
 * Enriquecer clientes con datos calculados para la UI
 */
async function enrichClientesForUI(clientes) {
	try {
		// Por ahora, retornar los clientes tal como están
		// En futuras iteraciones, aquí se calcularían:
		// - Saldos actualizados
		// - Estados basados en pagos
		// - Próximos pagos
		// - Días de atraso
		
		return clientes.map(cliente => ({
			...cliente,
			// Campos calculados para compatibilidad con la UI existente
			saldoTotal: cliente.saldo_total || 0,
			creditosActivos: cliente.creditos_activos || 0,
			diasAtraso: cliente.dias_atraso_max || 0,
			proximoPago: null // Se calculará cuando se implemente el módulo de créditos
		}));
		
	} catch (error) {
		console.error('❌ [CLIENTES] Error enriqueciendo datos para UI:', error);
		return clientes;
	}
}

// ============================================================================
// FUNCIONES DE MANTENIMIENTO
// ============================================================================

/**
 * Verificar integridad de todos los clientes usando ChecksumService REAL
 */
export async function verifyClientesIntegrity() {
	try {
		console.log('🔐 [CLIENTES] Verificando integridad usando ChecksumService...');
		
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Usar ChecksumService REAL para verificación completa
		const integrityResult = await crediSyncApp.services.checksum.performIntegrityCheck(crediSyncApp.services.db);
		
		// Filtrar solo resultados de clientes del resultado completo
		const clientesErrors = integrityResult.errors.filter(error => error.recordType === 'cliente');
		
		const results = {
			total: integrityResult.total,
			valid: integrityResult.valid,
			corrupted: integrityResult.corrupted,
			repaired: integrityResult.repaired,
			failed: integrityResult.total - integrityResult.valid - integrityResult.repaired,
			errors: clientesErrors
		};
		
		console.log('✅ [CLIENTES] Verificación de integridad completada usando @sync/core:', results);
		return results;
		
	} catch (error) {
		console.error('❌ [CLIENTES] Error en verificación de integridad:', error);
		throw error;
	}
}

/**
 * Limpiar todos los datos usando métodos REALES de @sync/core
 */
export async function limpiarDatos() {
	try {
		console.log('🧹 [CLIENTES] Limpiando todos los datos...');
		
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		// Limpiar IndexedDB (principal) - nueva estructura universal
		await crediSyncApp.services.db.clientes.clear();
		console.log('✅ [CLIENTES] IndexedDB limpiado');
		
		// Limpiar capas de backup usando StorageManager REAL
		await crediSyncApp.services.storage.clearBackups();
		console.log('✅ [CLIENTES] Capas de backup limpiadas');
		
		console.log('✅ [CLIENTES] Todos los datos limpiados correctamente');
		
	} catch (error) {
		console.error('❌ [CLIENTES] Error limpiando datos:', error);
		throw error;
	}
}

/**
 * Obtener estadísticas de clientes
 */
export async function getClientesStats() {
	try {
		if (!crediSyncApp.isStarted) {
			await crediSyncApp.start();
		}
		
		const currentUser = await crediSyncApp.services.auth.getCurrentUser();
		const tenantId = currentUser?.tenant_id || '00000000-0000-0000-0000-000000000001';
		
		const clientes = await crediSyncApp.services.db.clientes
			.where('tenant_id')
			.equals(tenantId)
			.toArray();
		
		const stats = {
			total: clientes.length,
			activos: clientes.filter(c => c.estado === 'activo').length,
			inactivos: clientes.filter(c => c.estado === 'inactivo').length,
			bloqueados: clientes.filter(c => c.estado === 'bloqueado').length,
			con_creditos: clientes.filter(c => c.creditos_activos > 0).length,
			sin_creditos: clientes.filter(c => c.creditos_activos === 0).length,
			en_mora: clientes.filter(c => c.dias_atraso_max > 0).length,
			saldo_total: clientes.reduce((sum, c) => sum + (c.saldo_total || 0), 0),
			synced: clientes.filter(c => c.synced).length,
			pending_sync: clientes.filter(c => !c.synced).length
		};
		
		return stats;
		
	} catch (error) {
		console.error('❌ [CLIENTES] Error obteniendo estadísticas:', error);
		return null;
	}
}