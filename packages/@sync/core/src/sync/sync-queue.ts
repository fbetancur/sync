/**
 * Gestor de Cola de Sincronización
 *
 * Gestiona la cola de operaciones de sincronización pendientes con:
 * - Ordenamiento basado en prioridad
 * - Lógica de reintentos con backoff exponencial
 * - Monitoreo del tamaño de la cola
 * - Operaciones por lotes
 *
 * Requirements: 5.2, 5.8
 */

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface SyncQueueItem {
  id?: number;
  timestamp: number;
  table_name: string;
  record_id: string;
  operation: 'INSERT' | 'UPDATE' | 'DELETE';
  data: any;
  synced: boolean;
  priority: number;
  attempts: number;
  last_attempt: number | null;
  error: string | null;
}

export interface AddToQueueOptions {
  priority?: number;
  data?: any;
}

export interface QueueStats {
  total: number;
  pending: number;
  synced: number;
  failed: number;
  oldestPending: number | null;
}

// ============================================================================
// CLASE SYNC QUEUE
// ============================================================================

export class SyncQueue {
  private readonly MAX_ATTEMPTS = 10;
  private readonly INITIAL_BACKOFF_MS = 1000; // 1 segundo
  private readonly MAX_BACKOFF_MS = 300000; // 5 minutos
  private db: any; // Se inyectará la instancia de base de datos

  constructor(database?: any) {
    this.db = database;
  }

  /**
   * Establecer la instancia de base de datos
   */
  setDatabase(database: any): void {
    this.db = database;
  }

  /**
   * Agregar operación a la cola de sincronización
   * Prioridad: 1 (más alta) para pagos, 2 para créditos, 3 para clientes, 4 para otros
   */
  async addToQueue(
    tableName: string,
    recordId: string,
    operation: 'INSERT' | 'UPDATE' | 'DELETE',
    options: AddToQueueOptions = {}
  ): Promise<number> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    const { priority = this.getDefaultPriority(tableName), data = null } =
      options;

    const item: SyncQueueItem = {
      timestamp: Date.now(),
      table_name: tableName,
      record_id: recordId,
      operation,
      data,
      synced: false,
      priority,
      attempts: 0,
      last_attempt: null,
      error: null
    };

    const id = await this.db.sync_queue.add(item);
    return id as number;
  }

  /**
   * Obtener operaciones pendientes ordenadas por prioridad (ASC) y timestamp (ASC)
   * Números de prioridad menores = mayor prioridad (1 es la más alta)
   */
  async getPendingOperations(limit?: number): Promise<SyncQueueItem[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    const allItems = await this.db.sync_queue.toArray();

    const items = allItems.filter((item: SyncQueueItem) => {
      // Solo incluir elementos no sincronizados
      if (item.synced) return false;

      // Solo incluir elementos que están listos para reintentar
      if (item.attempts === 0) return true;
      if (item.attempts >= this.MAX_ATTEMPTS) return false;

      const backoffMs = this.calculateBackoff(item.attempts);
      const nextRetryTime = (item.last_attempt || 0) + backoffMs;
      return Date.now() >= nextRetryTime;
    });

    // Ordenar por prioridad ASC (número menor = mayor prioridad), luego timestamp ASC
    items.sort((a: SyncQueueItem, b: SyncQueueItem) => {
      if (a.priority !== b.priority) {
        return a.priority - b.priority; // Número menor = mayor prioridad
      }
      return a.timestamp - b.timestamp; // Más antiguo primero
    });

    return limit ? items.slice(0, limit) : items;
  }

  /**
   * Marcar operación como sincronizada exitosamente
   */
  async markAsSynced(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    await this.db.sync_queue.update(id, {
      synced: true,
      error: null
    });
  }

  /**
   * Marcar operación como fallida e incrementar contador de reintentos
   */
  async markAsFailed(id: number, error: string): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    const item = await this.db.sync_queue.get(id);
    if (!item) return;

    await this.db.sync_queue.update(id, {
      attempts: item.attempts + 1,
      last_attempt: Date.now(),
      error
    });
  }

  /**
   * Obtener estadísticas de la cola
   */
  async getStats(): Promise<QueueStats> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    const all = await this.db.sync_queue.toArray();
    const pending = all.filter(
      (item: SyncQueueItem) => !item.synced && item.attempts < this.MAX_ATTEMPTS
    );
    const synced = all.filter((item: SyncQueueItem) => item.synced);
    const failed = all.filter(
      (item: SyncQueueItem) =>
        !item.synced && item.attempts >= this.MAX_ATTEMPTS
    );

    const oldestPending =
      pending.length > 0
        ? Math.min(...pending.map((item: SyncQueueItem) => item.timestamp))
        : null;

    return {
      total: all.length,
      pending: pending.length,
      synced: synced.length,
      failed: failed.length,
      oldestPending
    };
  }

  /**
   * Obtener tamaño de la cola (solo operaciones pendientes)
   */
  async getQueueSize(): Promise<number> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    return await this.db.sync_queue
      .filter(
        (item: SyncQueueItem) =>
          !item.synced && item.attempts < this.MAX_ATTEMPTS
      )
      .count();
  }

  /**
   * Obtener operaciones fallidas (excedieron intentos máximos)
   */
  async getFailedOperations(): Promise<SyncQueueItem[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    return await this.db.sync_queue
      .filter(
        (item: SyncQueueItem) =>
          !item.synced && item.attempts >= this.MAX_ATTEMPTS
      )
      .toArray();
  }

  /**
   * Reintentar operación fallida (resetear intentos)
   */
  async retryFailedOperation(id: number): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    await this.db.sync_queue.update(id, {
      attempts: 0,
      last_attempt: null,
      error: null
    });
  }

  /**
   * Limpiar operaciones sincronizadas más antiguas que los días especificados
   */
  async clearOldSyncedOperations(daysOld: number = 7): Promise<number> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    const cutoffTime = Date.now() - daysOld * 24 * 60 * 60 * 1000;

    const oldItems = await this.db.sync_queue
      .filter(
        (item: SyncQueueItem) => item.synced && item.timestamp < cutoffTime
      )
      .toArray();

    const ids = oldItems.map((item: SyncQueueItem) => item.id!);
    await this.db.sync_queue.bulkDelete(ids);

    return ids.length;
  }

  /**
   * Limpiar todos los elementos de la cola (¡usar con precaución!)
   */
  async clearAll(): Promise<void> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en SyncQueue');
    }

    await this.db.sync_queue.clear();
  }

  /**
   * Calcular retraso de backoff exponencial
   */
  private calculateBackoff(attempts: number): number {
    const backoff = this.INITIAL_BACKOFF_MS * Math.pow(2, attempts - 1);
    return Math.min(backoff, this.MAX_BACKOFF_MS);
  }

  /**
   * Obtener prioridad por defecto basada en el nombre de la tabla
   * Prioridad: 1 (más alta) para pagos, 2 para créditos, 3 para clientes, 4 para otros
   */
  private getDefaultPriority(tableName: string): number {
    switch (tableName) {
      case 'pagos':
        return 1; // Prioridad más alta
      case 'creditos':
      case 'cuotas':
        return 2;
      case 'clientes':
        return 3;
      default:
        return 4; // Prioridad más baja
    }
  }

  /**
   * Obtener próximo tiempo de reintento para una operación
   */
  getNextRetryTime(item: SyncQueueItem): number | null {
    if (item.attempts === 0) return Date.now();
    if (item.attempts >= this.MAX_ATTEMPTS) return null;

    const backoffMs = this.calculateBackoff(item.attempts);
    return (item.last_attempt || 0) + backoffMs;
  }

  /**
   * Verificar si la operación está lista para reintentar
   */
  isReadyToRetry(item: SyncQueueItem): boolean {
    if (item.synced) return false;
    if (item.attempts >= this.MAX_ATTEMPTS) return false;
    if (item.attempts === 0) return true;

    const nextRetryTime = this.getNextRetryTime(item);
    return nextRetryTime !== null && Date.now() >= nextRetryTime;
  }
}