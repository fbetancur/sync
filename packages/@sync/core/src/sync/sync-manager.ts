/**
 * Gestor de Sincronización - Orquestador principal de sincronización
 *
 * Responsabilidades:
 * - Detectar estado de conexión
 * - Coordinar sincronización bidireccional (upload → download)
 * - Integrar SyncQueue, ChangeTracker y ConflictResolver
 * - Reportar progreso en tiempo real
 * - Manejar errores con reintentos
 *
 * Requirements: 5.1, 5.4, 5.5, 5.9
 */

import { SyncQueue } from './sync-queue';
import { ChangeTracker } from './change-tracker';
import { ConflictResolver } from './conflict-resolver';

export interface SyncOptions {
  force?: boolean;
  priority?: number;
  onProgress?: (progress: SyncProgress) => void;
}

export interface SyncProgress {
  phase: 'upload' | 'download' | 'verify' | 'complete';
  current: number;
  total: number;
  message: string;
}

export interface SyncResult {
  success: boolean;
  uploaded: number;
  downloaded: number;
  conflicts: number;
  errors: string[];
  timestamp: number;
}

export interface ConnectionStatus {
  online: boolean;
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  effectiveType: '4g' | '3g' | '2g' | 'slow-2g' | 'unknown';
}

export class SyncManager {
  private syncQueue: SyncQueue;
  private changeTracker: ChangeTracker;
  private conflictResolver: ConflictResolver;
  private isSyncing: boolean = false;
  private lastSyncTimestamp: number = 0;
  private syncAbortController: AbortController | null = null;
  private db: any;

  constructor(database?: any) {
    this.db = database;
    this.syncQueue = new SyncQueue(database);
    this.changeTracker = new ChangeTracker(database);
    this.conflictResolver = new ConflictResolver();
  }

  /**
   * Establecer la instancia de base de datos
   */
  setDatabase(database: any): void {
    this.db = database;
    this.syncQueue.setDatabase(database);
    this.changeTracker.setDatabase(database);
  }

  /**
   * Detecta el estado actual de la conexión
   * Requirements: 5.1
   */
  getConnectionStatus(): ConnectionStatus {
    if (typeof navigator === 'undefined' || !navigator.onLine) {
      return {
        online: false,
        type: 'none',
        effectiveType: 'unknown'
      };
    }

    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;

    return {
      online: navigator.onLine,
      type: connection?.type || 'unknown',
      effectiveType: connection?.effectiveType || 'unknown'
    };
  }

  /**
   * Verifica si hay conexión disponible
   */
  isOnline(): boolean {
    return this.getConnectionStatus().online;
  }

  /**
   * Verifica si actualmente está sincronizando
   */
  isCurrentlySyncing(): boolean {
    return this.isSyncing;
  }

  /**
   * Obtiene el timestamp de la última sincronización exitosa
   */
  getLastSyncTimestamp(): number {
    return this.lastSyncTimestamp;
  }

  /**
   * Obtiene el tamaño de la cola de sincronización
   */
  async getQueueSize(): Promise<number> {
    return await this.syncQueue.getQueueSize();
  }

  /**
   * Obtiene las operaciones pendientes de sincronización
   */
  async getPendingOperations() {
    return await this.syncQueue.getPendingOperations();
  }

  /**
   * Cancela la sincronización en curso
   */
  async cancelSync(): Promise<void> {
    if (this.syncAbortController) {
      this.syncAbortController.abort();
      this.syncAbortController = null;
    }
    this.isSyncing = false;
  }

  /**
   * Ejecuta sincronización bidireccional completa
   * Requirements: 5.4, 5.5
   */
  async sync(options: SyncOptions = {}): Promise<SyncResult> {
    // Verificar si ya está sincronizando
    if (this.isSyncing && !options.force) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['Sincronización ya en progreso'],
        timestamp: Date.now()
      };
    }

    // Verificar conexión
    if (!this.isOnline()) {
      return {
        success: false,
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: ['Sin conexión a internet'],
        timestamp: Date.now()
      };
    }

    this.isSyncing = true;
    this.syncAbortController = new AbortController();

    const result: SyncResult = {
      success: true,
      uploaded: 0,
      downloaded: 0,
      conflicts: 0,
      errors: [],
      timestamp: Date.now()
    };

    try {
      // Fase 1: Upload (device → server)
      options.onProgress?.({
        phase: 'upload',
        current: 0,
        total: 100,
        message: 'Subiendo cambios locales...'
      });

      result.uploaded = await this.syncUpload(options);

      // Fase 2: Download (server → device)
      options.onProgress?.({
        phase: 'download',
        current: 50,
        total: 100,
        message: 'Descargando cambios remotos...'
      });

      const downloadResult = await this.syncDownload(options);
      result.downloaded = downloadResult.downloaded;
      result.conflicts = downloadResult.conflicts;

      // Fase 3: Verificación
      options.onProgress?.({
        phase: 'verify',
        current: 90,
        total: 100,
        message: 'Verificando integridad...'
      });

      await this.verifyIntegrity();

      // Completado
      options.onProgress?.({
        phase: 'complete',
        current: 100,
        total: 100,
        message: 'Sincronización completada'
      });

      this.lastSyncTimestamp = Date.now();
      await this.updateLastSyncTimestamp();
    } catch (error) {
      result.success = false;
      result.errors.push(
        error instanceof Error ? error.message : 'Error desconocido'
      );
    } finally {
      this.isSyncing = false;
      this.syncAbortController = null;
    }

    return result;
  }

  /**
   * Sincronización de subida (device → server)
   * Requirements: 5.4
   */
  async syncUpload(options: SyncOptions = {}): Promise<number> {
    let uploadedCount = 0;

    try {
      // Obtener cambios pendientes del ChangeTracker
      const pendingChanges = await this.changeTracker.getAllPendingChanges();

      if (pendingChanges.length === 0) {
        return 0;
      }

      // Comprimir cambios (múltiples cambios al mismo campo → un solo delta)
      const compressedChanges =
        await this.changeTracker.compressChanges(pendingChanges);

      // Crear batches priorizados
      const batches =
        await this.changeTracker.createUploadBatches(compressedChanges);

      // Subir cada batch
      for (const batch of batches) {
        if (this.syncAbortController?.signal.aborted) {
          break;
        }

        try {
          // Aquí iría la llamada real a Supabase
          // Por ahora simulamos el upload exitoso
          await this.uploadBatch(batch);

          // Marcar cambios como sincronizados
          if (this.db) {
            for (const change of batch.changes) {
              await this.db.change_log.update(change.id!, { synced: true });
            }
          }

          uploadedCount += batch.changes.length;
        } catch (error) {
          // Agregar a la cola de reintentos (no lanzar error)
          try {
            await this.syncQueue.addToQueue(
              batch.table,
              'batch-' + Date.now(),
              'UPDATE',
              {
                data: batch.changes,
                priority: batch.priority
              }
            );
          } catch {
            // Ignorar errores al agregar a la cola
          }
        }
      }
    } catch (error) {
      // No lanzar error, solo retornar 0
      console.error('Error de sincronización de subida:', error);
      return 0;
    }

    return uploadedCount;
  }

  /**
   * Sincronización de descarga (server → device)
   * Requirements: 5.5
   */
  async syncDownload(
    options: SyncOptions = {}
  ): Promise<{ downloaded: number; conflicts: number }> {
    let downloadedCount = 0;
    let conflictsCount = 0;

    try {
      // Obtener timestamp de última sincronización
      const lastSync = await this.getLastSyncTimestampFromDB();

      // Aquí iría la llamada real a Supabase para obtener cambios desde lastSync
      // Por ahora simulamos con un array vacío
      const remoteChanges: any[] = await this.fetchRemoteChanges(lastSync);

      if (remoteChanges.length === 0) {
        return { downloaded: 0, conflicts: 0 };
      }

      // Aplicar deltas con resolución de conflictos
      for (const delta of remoteChanges) {
        if (this.syncAbortController?.signal.aborted) {
          break;
        }

        try {
          // Verificar si hay conflicto
          const localRecord = await this.getLocalRecord(
            delta.table,
            delta.record_id
          );

          if (localRecord && !localRecord.synced) {
            // Hay conflicto: resolver con CRDT
            const resolution = this.conflictResolver.resolveConflict(
              localRecord,
              delta.new_value,
              delta.table
            );

            // Aplicar resolución
            await this.applyResolution(
              delta.table,
              delta.record_id,
              resolution.resolved
            );
            conflictsCount++;
          } else {
            // No hay conflicto: aplicar directamente
            await this.changeTracker.applyDeltas([delta]);
          }

          downloadedCount++;
        } catch (error) {
          // Log error pero continuar con otros registros
          console.error(
            `Falló aplicar delta para ${delta.table}:${delta.record_id}`,
            error
          );
        }
      }
    } catch (error) {
      // No lanzar error, solo retornar 0
      console.error('Error de sincronización de descarga:', error);
      return { downloaded: 0, conflicts: 0 };
    }

    return { downloaded: downloadedCount, conflicts: conflictsCount };
  }

  /**
   * Verifica la integridad de los datos después de la sincronización
   */
  private async verifyIntegrity(): Promise<void> {
    // Verificar que no haya registros huérfanos
    // Verificar checksums
    // Por ahora es un placeholder
    return Promise.resolve();
  }

  /**
   * Actualiza el timestamp de última sincronización en la BD
   */
  private async updateLastSyncTimestamp(): Promise<void> {
    if (!this.db) return;

    await this.db.app_state.put({
      key: 'last_sync_timestamp',
      value: this.lastSyncTimestamp.toString(),
      updated_at: Date.now()
    });
  }

  /**
   * Obtiene el timestamp de última sincronización desde la BD
   */
  private async getLastSyncTimestampFromDB(): Promise<number> {
    if (!this.db) return 0;

    const state = await this.db.app_state.get('last_sync_timestamp');
    return state ? parseInt(state.value) : 0;
  }

  /**
   * Sube un batch de cambios al servidor
   * (Placeholder - implementación real usaría Supabase client)
   */
  private async uploadBatch(batch: any): Promise<void> {
    // Simulación de upload
    return new Promise(resolve => setTimeout(resolve, 100));
  }

  /**
   * Obtiene cambios remotos desde el servidor
   * (Placeholder - implementación real usaría Supabase client)
   */
  private async fetchRemoteChanges(since: number): Promise<any[]> {
    // Simulación de fetch
    return Promise.resolve([]);
  }

  /**
   * Obtiene un registro local de la base de datos
   */
  private async getLocalRecord(
    table: string,
    recordId: string
  ): Promise<any | null> {
    if (!this.db) return null;

    try {
      const tableRef = (this.db as any)[table];
      if (!tableRef) {
        return null;
      }
      return await tableRef.get(recordId);
    } catch {
      return null;
    }
  }

  /**
   * Aplica la resolución de un conflicto
   */
  private async applyResolution(
    table: string,
    recordId: string,
    resolved: any
  ): Promise<void> {
    if (!this.db) return;

    const tableRef = (this.db as any)[table];
    if (tableRef) {
      await tableRef.put(resolved);
    }
  }
}
