/**
 * Sistema de Logger de Auditoría
 *
 * Implementa un log de auditoría inmutable con cadena de hash tipo blockchain.
 * Cada operación crítica se registra como un evento con contexto completo.
 * Los eventos están enlazados vía cadena de hash SHA-256 para asegurar inmutabilidad.
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

// ============================================================================
// INTERFACES
// ============================================================================

export interface AuditLogEntry {
  id?: number;
  timestamp: number;
  sequence: number;
  tenant_id: string;
  user_id: string;
  device_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  data: any;
  metadata: {
    ip_address: string | null;
    user_agent: string;
    app_version: string;
    latitude: number | null;
    longitude: number | null;
    connection_type: string;
    battery_level: number | null;
  };
  previous_hash: string;
  hash: string;
}

export interface AuditEventData {
  tenant_id: string;
  user_id: string;
  device_id: string;
  event_type: EventType;
  aggregate_type: AggregateType;
  aggregate_id: string;
  data: any;
  metadata?: Partial<AuditEventMetadata>;
}

export interface AuditEventMetadata {
  ip_address: string | null;
  user_agent: string;
  app_version: string;
  latitude: number | null;
  longitude: number | null;
  connection_type: string;
  battery_level: number | null;
}

export interface FraudPattern {
  type:
    | 'rapid_payments'
    | 'impossible_location'
    | 'duplicate_payment'
    | 'suspicious_amount';
  severity: 'low' | 'medium' | 'high';
  description: string;
  events: AuditLogEntry[];
}

export type EventType =
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'LOGIN'
  | 'LOGOUT'
  | 'SYNC'
  | 'ERROR';

export type AggregateType =
  | 'tenant'
  | 'user'
  | 'cliente'
  | 'credito'
  | 'cuota'
  | 'pago'
  | 'ruta'
  | 'producto';

// ============================================================================
// CLASE AUDIT LOGGER
// ============================================================================

export class AuditLogger {
  private static instance: AuditLogger;
  private sequenceCounter: number = 0;
  private lastHash: string = '0'.repeat(64); // Hash génesis
  private db: any; // Instancia de base de datos inyectada

  private constructor(database?: any) {
    this.db = database;
    this.initializeSequence();
  }

  /**
   * Obtener instancia singleton
   */
  static getInstance(database?: any): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(database);
    }
    return AuditLogger.instance;
  }

  /**
   * Establecer la instancia de base de datos
   */
  setDatabase(database: any): void {
    this.db = database;
    this.initializeSequence();
  }

  /**
   * Inicializar contador de secuencia desde la base de datos
   */
  private async initializeSequence(): Promise<void> {
    if (!this.db) return;

    try {
      const lastEvent = await this.db.audit_log
        .orderBy('sequence')
        .reverse()
        .first();

      if (lastEvent) {
        this.sequenceCounter = lastEvent.sequence;
        this.lastHash = lastEvent.hash;
      }
    } catch (error) {
      console.error('Falló inicializar secuencia de auditoría:', error);
    }
  }

  /**
   * Método simplificado para registrar eventos (wrapper de logEvent)
   */
  async log(eventData: {
    event_type: string;
    aggregate_type: string;
    aggregate_id: string;
    data: any;
    tenant_id: string;
    user_id: string;
    device_id?: string;
    metadata?: Partial<AuditEventMetadata>;
  }): Promise<AuditLogEntry> {
    const fullEventData: AuditEventData = {
      tenant_id: eventData.tenant_id,
      user_id: eventData.user_id,
      device_id: eventData.device_id || 'unknown-device',
      event_type: eventData.event_type as EventType,
      aggregate_type: eventData.aggregate_type as AggregateType,
      aggregate_id: eventData.aggregate_id,
      data: eventData.data,
      metadata: eventData.metadata
    };

    return this.logEvent(fullEventData);
  }

  /**
   * Registrar un evento de auditoría
   * Requirements: 8.1, 8.2, 8.3
   */
  async logEvent(eventData: AuditEventData): Promise<AuditLogEntry> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    // Incrementar secuencia
    this.sequenceCounter++;

    // Obtener metadatos completos
    const metadata = await this.getCompleteMetadata(eventData.metadata);

    // Crear evento
    const event: AuditLogEntry = {
      timestamp: Date.now(),
      sequence: this.sequenceCounter,
      tenant_id: eventData.tenant_id,
      user_id: eventData.user_id,
      device_id: eventData.device_id,
      event_type: eventData.event_type,
      aggregate_type: eventData.aggregate_type,
      aggregate_id: eventData.aggregate_id,
      data: eventData.data,
      metadata,
      previous_hash: this.lastHash,
      hash: '' // Se calculará
    };

    // Calcular hash
    event.hash = await this.calculateHash(event);
    this.lastHash = event.hash;

    // Almacenar evento (solo agregar)
    try {
      await this.db.audit_log.add(event);
      return event;
    } catch (error) {
      console.error('Falló registrar evento de auditoría:', error);
      throw error;
    }
  }

  /**
   * Calcular hash SHA-256 del evento
   * Requirements: 8.3
   */
  private async calculateHash(event: AuditLogEntry): Promise<string> {
    // Crear representación de string determinística
    const eventString = JSON.stringify({
      timestamp: event.timestamp,
      sequence: event.sequence,
      tenant_id: event.tenant_id,
      user_id: event.user_id,
      device_id: event.device_id,
      event_type: event.event_type,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      data: event.data,
      metadata: event.metadata,
      previous_hash: event.previous_hash
    });

    // Calcular hash SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(eventString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    return hashHex;
  }

  /**
   * Obtener metadatos completos con información del dispositivo
   * Requirements: 8.2
   */
  private async getCompleteMetadata(
    partial?: Partial<AuditEventMetadata>
  ): Promise<AuditEventMetadata> {
    // Obtener tipo de conexión
    const connection =
      (navigator as any).connection ||
      (navigator as any).mozConnection ||
      (navigator as any).webkitConnection;
    const connectionType = connection?.effectiveType || 'unknown';

    // Obtener nivel de batería
    let batteryLevel: number | null = null;
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {
      // API de batería no disponible
    }

    return {
      ip_address: partial?.ip_address || null,
      user_agent:
        typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      app_version: '1.0.0', // Se puede configurar externamente
      latitude: partial?.latitude || null,
      longitude: partial?.longitude || null,
      connection_type: connectionType,
      battery_level: batteryLevel
    };
  }

  /**
   * Verificar integridad de la cadena de hash
   * Requirements: 8.3, 8.4
   */
  async verifyHashChain(): Promise<{ valid: boolean; errors: string[] }> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    const errors: string[] = [];
    let previousHash = '0'.repeat(64); // Hash génesis

    // Obtener todos los eventos en orden de secuencia
    const events = await this.db.audit_log.orderBy('sequence').toArray();

    for (const event of events) {
      // Verificar que el hash anterior coincida
      if (event.previous_hash !== previousHash) {
        errors.push(
          `Evento ${event.sequence}: previous_hash no coincide. ` +
            `Esperado ${previousHash}, obtenido ${event.previous_hash}`
        );
      }

      // Recalcular hash
      const calculatedHash = await this.calculateHash(event);
      if (calculatedHash !== event.hash) {
        errors.push(
          `Evento ${event.sequence}: hash no coincide. ` +
            `Esperado ${event.hash}, calculado ${calculatedHash}`
        );
      }

      previousHash = event.hash;
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Reconstruir estado de un agregado en un punto específico en el tiempo
   * Requirements: 8.7
   */
  async reconstructState(
    aggregateType: AggregateType,
    aggregateId: string,
    timestamp?: number
  ): Promise<any> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    // Obtener todos los eventos para este agregado
    const allEvents = await this.db.audit_log
      .where('aggregate_type')
      .equals(aggregateType)
      .toArray();

    // Filtrar por aggregate_id y timestamp
    const targetTimestamp = timestamp || Date.now();
    const events = allEvents
      .filter(
        (e: AuditLogEntry) =>
          e.aggregate_id === aggregateId && e.timestamp <= targetTimestamp
      )
      .sort((a: AuditLogEntry, b: AuditLogEntry) => a.timestamp - b.timestamp);

    // Reconstruir estado aplicando eventos en orden
    let state: any = null;

    for (const event of events) {
      switch (event.event_type) {
        case 'CREATE':
          state = { ...event.data };
          break;

        case 'UPDATE':
          if (state) {
            state = { ...state, ...event.data };
          }
          break;

        case 'DELETE':
          state = null;
          break;
      }
    }

    return state;
  }

  /**
   * Detectar patrones de fraude
   * Requirements: 8.5
   */
  async detectFraudPatterns(
    userId: string,
    timeWindowMs: number = 3600000 // 1 hora
  ): Promise<FraudPattern[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    const patterns: FraudPattern[] = [];
    const now = Date.now();
    const windowStart = now - timeWindowMs;

    // Obtener eventos recientes para el usuario
    const events = await this.db.audit_log
      .where('[user_id+timestamp]')
      .between([userId, windowStart], [userId, now])
      .toArray();

    // Patrón 1: Pagos rápidos (más de 10 pagos en 5 minutos)
    const recentPayments = events.filter(
      (e: AuditLogEntry) =>
        e.event_type === 'CREATE' &&
        e.aggregate_type === 'pago' &&
        e.timestamp > now - 300000
    );

    if (recentPayments.length > 10) {
      patterns.push({
        type: 'rapid_payments',
        severity: 'high',
        description: `${recentPayments.length} pagos en 5 minutos`,
        events: recentPayments
      });
    }

    // Patrón 2: Ubicación imposible (movimiento > 100km en < 10 minutos)
    const paymentsWithLocation = events
      .filter(
        (e: AuditLogEntry) =>
          e.event_type === 'CREATE' &&
          e.aggregate_type === 'pago' &&
          e.metadata.latitude &&
          e.metadata.longitude
      )
      .sort((a: AuditLogEntry, b: AuditLogEntry) => a.timestamp - b.timestamp);

    for (let i = 1; i < paymentsWithLocation.length; i++) {
      const prev = paymentsWithLocation[i - 1];
      const curr = paymentsWithLocation[i];

      const timeDiff = curr.timestamp - prev.timestamp;
      const distance = this.calculateDistance(
        prev.metadata.latitude!,
        prev.metadata.longitude!,
        curr.metadata.latitude!,
        curr.metadata.longitude!
      );

      // Si se movió > 100km en < 10 minutos (imposible)
      if (distance > 100 && timeDiff < 600000) {
        patterns.push({
          type: 'impossible_location',
          severity: 'high',
          description: `Se movió ${distance.toFixed(1)}km en ${(timeDiff / 60000).toFixed(1)} minutos`,
          events: [prev, curr]
        });
      }
    }

    // Patrón 3: Pagos duplicados (mismo monto, mismo cliente, dentro de 1 minuto)
    const paymentEvents = events.filter(
      (e: AuditLogEntry) =>
        e.event_type === 'CREATE' && e.aggregate_type === 'pago'
    );

    for (let i = 0; i < paymentEvents.length; i++) {
      for (let j = i + 1; j < paymentEvents.length; j++) {
        const p1 = paymentEvents[i];
        const p2 = paymentEvents[j];

        if (
          p1.data &&
          p2.data &&
          p1.data.cliente_id === p2.data.cliente_id &&
          p1.data.monto === p2.data.monto &&
          Math.abs(p1.timestamp - p2.timestamp) < 60000
        ) {
          patterns.push({
            type: 'duplicate_payment',
            severity: 'medium',
            description: `Pago duplicado de ${p1.data.monto} para el mismo cliente`,
            events: [p1, p2]
          });
        }
      }
    }

    // Patrón 4: Montos sospechosos (pagos muy grandes)
    const largePayments = paymentEvents.filter(
      (e: AuditLogEntry) => e.data && e.data.monto && e.data.monto > 1000000 // > 1M
    );

    if (largePayments.length > 0) {
      patterns.push({
        type: 'suspicious_amount',
        severity: 'medium',
        description: `${largePayments.length} pago(s) sobre 1M`,
        events: largePayments
      });
    }

    return patterns;
  }

  /**
   * Calcular distancia entre dos coordenadas GPS (fórmula de Haversine)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtener eventos de auditoría para un agregado específico
   */
  async getEventsForAggregate(
    aggregateType: AggregateType,
    aggregateId: string
  ): Promise<AuditLogEntry[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    return this.db.audit_log
      .where('[aggregate_type+aggregate_id+timestamp]')
      .between(
        [aggregateType, aggregateId, 0],
        [aggregateType, aggregateId, Date.now()]
      )
      .toArray();
  }

  /**
   * Obtener eventos de auditoría para un usuario específico
   */
  async getEventsForUser(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    return this.db.audit_log
      .where('user_id')
      .equals(userId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Obtener eventos de auditoría recientes
   */
  async getRecentEvents(limit: number = 100): Promise<AuditLogEntry[]> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    return this.db.audit_log
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Contar eventos por tipo
   */
  async countEventsByType(): Promise<Record<EventType, number>> {
    if (!this.db) {
      throw new Error('Base de datos no configurada en AuditLogger');
    }

    const events = await this.db.audit_log.toArray();

    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    }

    return counts as Record<EventType, number>;
  }
}

// ============================================================================
// FUNCIÓN FACTORY
// ============================================================================

/**
 * Crear una instancia del logger de auditoría
 */
export function createAuditLogger(database?: any): AuditLogger {
  return AuditLogger.getInstance(database);
}
