/**
 * Entity Service Base - Servicio base para entidades con funcionalidad completa
 * Parte de @sync/core - Reutilizable en todas las apps
 */

import type { ContextService, OperationContext } from '../context/context-service';

export interface ValidationResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: string[];
}

export interface EntityBase {
  id: string;
  tenant_id: string;
  created_by: string;
  created_at: number;
  updated_at: number;
  synced: boolean;
  checksum?: string;
  version_vector?: Record<string, number>;
  field_versions?: Record<string, {
    value: any;
    timestamp: number;
    device_id: string;
  }>;
}

export interface CreateEntityOptions {
  skipValidation?: boolean;
  skipAudit?: boolean;
  skipSync?: boolean;
  priority?: number;
}

export interface UpdateEntityOptions extends CreateEntityOptions {
  allowPartialUpdate?: boolean;
}

export interface EntityServiceConfig {
  tableName: string;
  syncPriority?: number;
  enableAudit?: boolean;
  enableSync?: boolean;
  enableCRDT?: boolean;
}

/**
 * Servicio base abstracto para entidades
 * Proporciona funcionalidad completa de CRUD con:
 * - Validación automática
 * - Captura de contexto
 * - Auditoría inmutable
 * - Sincronización inteligente
 * - Resolución de conflictos CRDT
 * - Integridad de datos
 */
export abstract class EntityService<T extends EntityBase> {
  protected abstract config: EntityServiceConfig;

  constructor(
    protected syncApp: any, // SyncApp instance
    protected contextService: ContextService
  ) {}

  /**
   * Validar datos de la entidad (debe ser implementado por cada servicio)
   */
  protected abstract validateData(data: Partial<T>): ValidationResult<T>;

  /**
   * Enriquecer datos para la UI (opcional, puede ser sobrescrito)
   */
  protected async enrichForUI(entities: T[]): Promise<T[]> {
    return entities;
  }

  /**
   * Crear nueva entidad con funcionalidad completa
   */
  async create(data: Partial<T>, options: CreateEntityOptions = {}): Promise<T> {
    try {
      console.log(`👤 [${this.config.tableName.toUpperCase()}] Iniciando creación con Universal Infrastructure...`);

      // 1. Validación
      if (!options.skipValidation) {
        console.log(`🔍 [${this.config.tableName.toUpperCase()}] Validando datos...`);
        const validation = this.validateData(data);
        if (!validation.success) {
          throw new Error(validation.error || 'Datos inválidos');
        }
        if (validation.data) {
          data = validation.data;
        }
      }

      // 2. Asegurar inicialización de la app
      if (!this.syncApp.isStarted) {
        console.log(`🔄 [${this.config.tableName.toUpperCase()}] Inicializando SyncApp...`);
        await this.syncApp.start();
      }

      // 3. Capturar contexto completo
      console.log(`📍 [${this.config.tableName.toUpperCase()}] Capturando contexto completo...`);
      const context = await this.contextService.captureFullContext();

      // 4. Preparar datos completos
      const entityId = crypto.randomUUID();
      const now = Date.now();
      const deviceId = context.device.deviceId;

      const entity: T = {
        // Campos básicos
        id: entityId,
        tenant_id: context.user?.tenant_id || '00000000-0000-0000-0000-000000000001',
        created_by: context.user?.id || 'system',
        ...data,

        // Timestamps
        created_at: now,
        updated_at: now,

        // Sincronización
        synced: false,
        checksum: '', // Se calculará automáticamente

        // CRDT - Vector de versión para resolución de conflictos
        ...(this.config.enableCRDT && {
          version_vector: { [deviceId]: 1 },
          field_versions: this.createFieldVersions(data as any, now, deviceId)
        })
      } as T;

      console.log(`👤 [${this.config.tableName.toUpperCase()}] Datos preparados con contexto completo:`, {
        id: entity.id,
        tenant_id: entity.tenant_id,
        location: context.location.location ? 'captured' : 'unavailable'
      });

      // 5. Almacenamiento atómico en 3 capas
      console.log(`💾 [${this.config.tableName.toUpperCase()}] Iniciando almacenamiento atómico...`);
      
      try {
        const storageResult = await this.syncApp.services.storage.writeAtomic(entity, {
          tableName: this.config.tableName,
          recordId: entityId,
          skipBackup: false
        });

        console.log(`✅ [${this.config.tableName.toUpperCase()}] Almacenamiento atómico completado:`, {
          layersWritten: storageResult.layersWritten?.length || 0
        });

      } catch (storageError: any) {
        console.error(`❌ [${this.config.tableName.toUpperCase()}] Error en almacenamiento:`, storageError);
        throw new Error(`Error en almacenamiento: ${storageError.message}`);
      }

      // 6. Auditoría inmutable
      if (this.config.enableAudit !== false && !options.skipAudit) {
        console.log(`📋 [${this.config.tableName.toUpperCase()}] Registrando en auditoría...`);
        await this.syncApp.services.audit.logEvent({
          tenant_id: entity.tenant_id,
          user_id: entity.created_by,
          device_id: deviceId,
          event_type: 'CREATE',
          aggregate_type: this.config.tableName,
          aggregate_id: entityId,
          data: entity,
          metadata: {
            ip_address: null,
            user_agent: context.device.userAgent,
            app_version: '1.0.0',
            latitude: context.location.location?.latitude || null,
            longitude: context.location.location?.longitude || null,
            connection_type: context.device.connection.type,
            battery_level: context.device.battery.level ? Math.round(context.device.battery.level * 100) : null
          }
        });
      }

      // 7. Cola de sincronización
      if (this.config.enableSync !== false && !options.skipSync) {
        console.log(`🔄 [${this.config.tableName.toUpperCase()}] Agregando a cola de sincronización...`);
        await this.syncApp.services.syncQueue.addToQueue(
          this.config.tableName,
          entityId,
          'INSERT',
          {
            priority: options.priority || this.config.syncPriority || 5,
            data: entity
          }
        );
      }

      // 8. Sincronización inteligente
      if (navigator.onLine && this.config.enableSync !== false && !options.skipSync) {
        console.log(`🌐 [${this.config.tableName.toUpperCase()}] Iniciando sincronización inteligente...`);
        setTimeout(() => {
          this.syncApp.services.sync.sync({ 
            force: false,
            onProgress: (progress: any) => {
              console.log(`🔄 [SYNC] ${progress.phase}: ${progress.current}/${progress.total}`);
            }
          });
        }, 100);
      }

      // 9. Verificación de integridad
      console.log(`🔐 [${this.config.tableName.toUpperCase()}] Verificando integridad...`);
      const readResult = await this.syncApp.services.storage.readWithFallback({
        tableName: this.config.tableName,
        recordId: entityId
      });

      if (!readResult.success || !readResult.data) {
        throw new Error('Error de integridad: Entidad no encontrada después de guardar');
      }

      const savedEntity = readResult.data;

      // Calcular checksum si no lo tiene
      if (!savedEntity.checksum) {
        try {
          const calculatedChecksum = await this.syncApp.services.checksum.calculateChecksum(savedEntity);
          await this.syncApp.services.db[this.config.tableName].update(entityId, { checksum: calculatedChecksum });
          savedEntity.checksum = calculatedChecksum;
          console.log(`✅ [${this.config.tableName.toUpperCase()}] Checksum calculado y guardado`);
        } catch (checksumError) {
          console.warn(`⚠️ [${this.config.tableName.toUpperCase()}] Error calculando checksum:`, checksumError);
        }
      }

      console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad creada exitosamente`);

      return {
        ...savedEntity,
        _metadata: {
          created_with_location: !!context.location.location,
          device_info_captured: true,
          stored_in_layers: 3,
          audit_logged: this.config.enableAudit !== false && !options.skipAudit,
          queued_for_sync: this.config.enableSync !== false && !options.skipSync
        }
      } as T;

    } catch (error: any) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error en creación:`, error);

      // Log del error para análisis
      if (this.syncApp.isStarted && this.config.enableAudit !== false) {
        try {
          const errorContext = await this.contextService.captureFullContext();
          await this.syncApp.services.audit.logEvent({
            tenant_id: '00000000-0000-0000-0000-000000000001',
            user_id: 'system',
            device_id: errorContext.device.deviceId,
            event_type: 'ERROR',
            aggregate_type: this.config.tableName,
            aggregate_id: 'unknown',
            data: { error: error.message, data },
            metadata: {
              ip_address: null,
              user_agent: errorContext.device.userAgent,
              app_version: '1.0.0',
              latitude: null,
              longitude: null,
              connection_type: errorContext.device.connection.type,
              battery_level: errorContext.device.battery.level ? Math.round(errorContext.device.battery.level * 100) : null
            }
          });
        } catch (auditError) {
          console.error(`❌ [${this.config.tableName.toUpperCase()}] Error logging audit event:`, auditError);
        }
      }

      throw error;
    }
  }

  /**
   * Obtener todas las entidades del tenant actual
   */
  async getAll(): Promise<T[]> {
    try {
      console.log(`👥 [${this.config.tableName.toUpperCase()}] Obteniendo entidades...`);

      if (!this.syncApp.isStarted) {
        await this.syncApp.start();
      }

      const context = await this.contextService.captureFullContext();
      const tenantId = context.user?.tenant_id || '00000000-0000-0000-0000-000000000001';

      let entities: T[] = [];

      try {
        entities = await this.syncApp.services.db[this.config.tableName]
          .where('tenant_id')
          .equals(tenantId)
          .toArray();

        console.log(`✅ [${this.config.tableName.toUpperCase()}] ${entities.length} entidades obtenidas`);

      } catch (dbError) {
        console.error(`❌ [${this.config.tableName.toUpperCase()}] Error obteniendo entidades:`, dbError);
        return [];
      }

      // Verificación de integridad
      const verifiedEntities = await this.verifyEntitiesIntegrity(entities);

      // Enriquecer para UI
      const enrichedEntities = await this.enrichForUI(verifiedEntities);

      console.log(`✅ [${this.config.tableName.toUpperCase()}] ${enrichedEntities.length} entidades procesadas`);
      return enrichedEntities;

    } catch (error) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error obteniendo entidades:`, error);
      return [];
    }
  }

  /**
   * Obtener entidad por ID
   */
  async getById(id: string): Promise<T | null> {
    try {
      console.log(`👤 [${this.config.tableName.toUpperCase()}] Obteniendo entidad ${id}...`);

      if (!this.syncApp.isStarted) {
        await this.syncApp.start();
      }

      const readResult = await this.syncApp.services.storage.readWithFallback({
        tableName: this.config.tableName,
        recordId: id
      });

      if (!readResult.success || !readResult.data) {
        console.log(`❌ [${this.config.tableName.toUpperCase()}] Entidad ${id} no encontrada`);
        return null;
      }

      const entity = readResult.data;
      console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad ${id} obtenida desde ${readResult.source}`);

      // Verificar integridad
      const verifiedEntity = await this.verifyEntityIntegrity(entity);

      return verifiedEntity;

    } catch (error) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error obteniendo entidad ${id}:`, error);
      return null;
    }
  }

  /**
   * Actualizar entidad con CRDT
   */
  async update(id: string, updates: Partial<T>, options: UpdateEntityOptions = {}): Promise<T | null> {
    try {
      console.log(`👤 [${this.config.tableName.toUpperCase()}] Actualizando entidad ${id}...`);

      if (!this.syncApp.isStarted) {
        await this.syncApp.start();
      }

      // Validación
      if (!options.skipValidation) {
        const validation = this.validateData(updates);
        if (!validation.success) {
          throw new Error(validation.error || 'Datos de actualización inválidos');
        }
        if (validation.data) {
          updates = validation.data;
        }
      }

      // Obtener entidad actual
      const currentEntity = await this.getById(id);
      if (!currentEntity) {
        throw new Error(`Entidad ${id} no encontrada`);
      }

      // Capturar contexto
      const context = await this.contextService.captureFullContext();
      const now = Date.now();
      const deviceId = context.device.deviceId;

      // Preparar actualización con CRDT
      const updateData: Partial<T> = {
        ...updates,
        updated_at: now,
        synced: false
      };

      if (this.config.enableCRDT) {
        const newVersionVector = { ...currentEntity.version_vector };
        newVersionVector[deviceId] = (newVersionVector[deviceId] || 0) + 1;

        const newFieldVersions = { ...currentEntity.field_versions };
        Object.keys(updates).forEach(field => {
          newFieldVersions[field] = {
            value: (updates as any)[field],
            timestamp: now,
            device_id: deviceId
          };
        });

        updateData.version_vector = newVersionVector;
        updateData.field_versions = newFieldVersions;
      }

      // Almacenamiento atómico
      const updatedEntity = { ...currentEntity, ...updateData };

      try {
        const storageResult = await this.syncApp.services.storage.writeAtomic(updatedEntity, {
          tableName: this.config.tableName,
          recordId: id,
          skipBackup: false
        });

        console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad ${id} actualizada en ${storageResult.layersWritten?.length || 0} capas`);

      } catch (storageError: any) {
        console.error(`❌ [${this.config.tableName.toUpperCase()}] Error en almacenamiento:`, storageError);
        throw new Error(`Error actualizando entidad: ${storageError.message}`);
      }

      // Auditoría
      if (this.config.enableAudit !== false && !options.skipAudit) {
        await this.syncApp.services.audit.logEvent({
          tenant_id: currentEntity.tenant_id,
          user_id: context.user?.id || 'system',
          device_id: deviceId,
          event_type: 'UPDATE',
          aggregate_type: this.config.tableName,
          aggregate_id: id,
          data: { old: currentEntity, new: updateData },
          metadata: {
            ip_address: null,
            user_agent: context.device.userAgent,
            app_version: '1.0.0',
            latitude: context.location.location?.latitude || null,
            longitude: context.location.location?.longitude || null,
            connection_type: context.device.connection.type,
            battery_level: context.device.battery.level ? Math.round(context.device.battery.level * 100) : null
          }
        });
      }

      // Cola de sincronización
      if (this.config.enableSync !== false && !options.skipSync) {
        await this.syncApp.services.syncQueue.addToQueue(
          this.config.tableName,
          id,
          'UPDATE',
          {
            priority: options.priority || this.config.syncPriority || 5,
            data: updateData
          }
        );
      }

      // Sincronización inteligente
      if (navigator.onLine && this.config.enableSync !== false && !options.skipSync) {
        setTimeout(() => {
          this.syncApp.services.sync.sync({ force: false });
        }, 100);
      }

      console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad ${id} actualizada exitosamente`);
      return await this.getById(id);

    } catch (error) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error actualizando entidad ${id}:`, error);
      throw error;
    }
  }

  /**
   * Eliminar entidad (soft delete)
   */
  async delete(id: string, options: { hard?: boolean } = {}): Promise<void> {
    try {
      console.log(`🗑️ [${this.config.tableName.toUpperCase()}] Eliminando entidad ${id}...`);

      if (!this.syncApp.isStarted) {
        await this.syncApp.start();
      }

      const entity = await this.getById(id);
      if (!entity) {
        throw new Error(`Entidad ${id} no encontrada`);
      }

      if (options.hard) {
        // Hard delete - eliminar completamente
        await this.syncApp.services.db[this.config.tableName].delete(id);
      } else {
        // Soft delete - marcar como eliminado
        await this.update(id, { 
          deleted_at: Date.now(),
          synced: false 
        } as any);
      }

      // Auditoría
      if (this.config.enableAudit !== false) {
        const context = await this.contextService.captureFullContext();
        await this.syncApp.services.audit.logEvent({
          tenant_id: entity.tenant_id,
          user_id: context.user?.id || 'system',
          device_id: context.device.deviceId,
          event_type: 'DELETE',
          aggregate_type: this.config.tableName,
          aggregate_id: id,
          data: { entity, hard: options.hard },
          metadata: {
            ip_address: null,
            user_agent: context.device.userAgent,
            app_version: '1.0.0',
            latitude: context.location.location?.latitude || null,
            longitude: context.location.location?.longitude || null,
            connection_type: context.device.connection.type,
            battery_level: context.device.battery.level ? Math.round(context.device.battery.level * 100) : null
          }
        });
      }

      console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad ${id} eliminada`);

    } catch (error) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error eliminando entidad ${id}:`, error);
      throw error;
    }
  }

  /**
   * Crear field_versions para CRDT
   */
  private createFieldVersions(data: any, timestamp: number, deviceId: string): Record<string, any> {
    const fieldVersions: Record<string, any> = {};
    
    Object.keys(data).forEach(field => {
      fieldVersions[field] = {
        value: data[field],
        timestamp,
        device_id: deviceId
      };
    });

    return fieldVersions;
  }

  /**
   * Verificar integridad de múltiples entidades
   */
  private async verifyEntitiesIntegrity(entities: T[]): Promise<T[]> {
    const verifiedEntities: T[] = [];
    let corruptedCount = 0;
    let repairedCount = 0;

    for (const entity of entities) {
      try {
        const verified = await this.verifyEntityIntegrity(entity);
        if (verified) {
          verifiedEntities.push(verified);
          if (verified.checksum !== entity.checksum) {
            repairedCount++;
          }
        } else {
          corruptedCount++;
        }
      } catch (error) {
        console.error(`❌ [${this.config.tableName.toUpperCase()}] Error verificando entidad ${entity.id}:`, error);
        verifiedEntities.push(entity); // Incluir entidad con error
      }
    }

    if (corruptedCount > 0) {
      console.warn(`⚠️ [${this.config.tableName.toUpperCase()}] ${corruptedCount} entidades con datos corruptos`);
    }

    if (repairedCount > 0) {
      console.log(`✅ [${this.config.tableName.toUpperCase()}] ${repairedCount} entidades reparadas automáticamente`);
    }

    return verifiedEntities;
  }

  /**
   * Verificar integridad de una entidad
   */
  private async verifyEntityIntegrity(entity: T): Promise<T | null> {
    try {
      if (entity.checksum) {
        const calculatedChecksum = await this.syncApp.services.checksum.calculateChecksum(entity);
        
        if (calculatedChecksum === entity.checksum) {
          return entity;
        } else {
          console.warn(`⚠️ [${this.config.tableName.toUpperCase()}] Entidad ${entity.id} tiene checksum inválido`);
          
          // Reparación automática
          try {
            const repairedEntity = { ...entity, checksum: calculatedChecksum };
            await this.syncApp.services.db[this.config.tableName].update(entity.id, { checksum: calculatedChecksum });
            console.log(`✅ [${this.config.tableName.toUpperCase()}] Entidad ${entity.id} reparada automáticamente`);
            return repairedEntity;
          } catch (repairError) {
            console.error(`❌ [${this.config.tableName.toUpperCase()}] No se pudo reparar entidad ${entity.id}:`, repairError);
            return entity;
          }
        }
      } else {
        // Entidad sin checksum: calcular y guardar
        try {
          const newChecksum = await this.syncApp.services.checksum.calculateChecksum(entity);
          await this.syncApp.services.db[this.config.tableName].update(entity.id, { checksum: newChecksum });
          return { ...entity, checksum: newChecksum };
        } catch (checksumError) {
          console.warn(`⚠️ [${this.config.tableName.toUpperCase()}] Error calculando checksum para ${entity.id}:`, checksumError);
          return entity;
        }
      }
    } catch (error) {
      console.error(`❌ [${this.config.tableName.toUpperCase()}] Error procesando entidad ${entity.id}:`, error);
      return entity;
    }
  }
}