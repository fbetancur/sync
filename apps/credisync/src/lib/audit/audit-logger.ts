/**
 * Audit Logger System
 * 
 * Implements an immutable audit log with blockchain-like hash chain.
 * Every critical operation is logged as an event with complete context.
 * Events are linked via SHA-256 hash chain to ensure immutability.
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { db } from '../app-config';
import type { AuditLogEntry } from '../db/index';
import type { EventType, AggregateType } from '../db/types';

// ============================================================================
// INTERFACES
// ============================================================================

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
  type: 'rapid_payments' | 'impossible_location' | 'duplicate_payment' | 'suspicious_amount';
  severity: 'low' | 'medium' | 'high';
  description: string;
  events: AuditLogEntry[];
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

export class AuditLogger {
  private static instance: AuditLogger;
  private sequenceCounter: number = 0;
  private lastHash: string = '0'.repeat(64); // Genesis hash

  private constructor() {
    this.initializeSequence();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Initialize sequence counter from database
   */
  private async initializeSequence(): Promise<void> {
    try {
      const lastEvent = await db.audit_log
        .orderBy('sequence')
        .reverse()
        .first();

      if (lastEvent) {
        this.sequenceCounter = lastEvent.sequence;
        this.lastHash = lastEvent.hash;
      }
    } catch (error) {
      console.error('Failed to initialize audit sequence:', error);
    }
  }

  /**
   * Log an audit event
   * Requirements: 8.1, 8.2, 8.3
   */
  async logEvent(eventData: AuditEventData): Promise<AuditLogEntry> {
    // Increment sequence
    this.sequenceCounter++;

    // Get complete metadata
    const metadata = await this.getCompleteMetadata(eventData.metadata);

    // Create event
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
      hash: '', // Will be calculated
    };

    // Calculate hash
    event.hash = await this.calculateHash(event);
    this.lastHash = event.hash;

    // Store event (append-only)
    try {
      await db.audit_log.add(event);
      return event;
    } catch (error) {
      console.error('Failed to log audit event:', error);
      throw error;
    }
  }

  /**
   * Calculate SHA-256 hash of event
   * Requirements: 8.3
   */
  private async calculateHash(event: AuditLogEntry): Promise<string> {
    // Create deterministic string representation
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
      previous_hash: event.previous_hash,
    });

    // Calculate SHA-256 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(eventString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return hashHex;
  }

  /**
   * Get complete metadata with device information
   * Requirements: 8.2
   */
  private async getCompleteMetadata(
    partial?: Partial<AuditEventMetadata>
  ): Promise<AuditEventMetadata> {
    // Get connection type
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    const connectionType = connection?.effectiveType || 'unknown';

    // Get battery level
    let batteryLevel: number | null = null;
    try {
      const battery = await (navigator as any).getBattery?.();
      if (battery) {
        batteryLevel = Math.round(battery.level * 100);
      }
    } catch {
      // Battery API not available
    }

    return {
      ip_address: partial?.ip_address || null,
      user_agent: navigator.userAgent,
      app_version: import.meta.env.VITE_APP_VERSION || '1.0.0',
      latitude: partial?.latitude || null,
      longitude: partial?.longitude || null,
      connection_type: connectionType,
      battery_level: batteryLevel,
    };
  }

  /**
   * Verify hash chain integrity
   * Requirements: 8.3, 8.4
   */
  async verifyHashChain(): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];
    let previousHash = '0'.repeat(64); // Genesis hash

    // Get all events in sequence order
    const events = await db.audit_log.orderBy('sequence').toArray();

    for (const event of events) {
      // Verify previous hash matches
      if (event.previous_hash !== previousHash) {
        errors.push(
          `Event ${event.sequence}: previous_hash mismatch. ` +
          `Expected ${previousHash}, got ${event.previous_hash}`
        );
      }

      // Recalculate hash
      const calculatedHash = await this.calculateHash(event);
      if (calculatedHash !== event.hash) {
        errors.push(
          `Event ${event.sequence}: hash mismatch. ` +
          `Expected ${event.hash}, calculated ${calculatedHash}`
        );
      }

      previousHash = event.hash;
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Reconstruct state of an aggregate at a specific point in time
   * Requirements: 8.7
   */
  async reconstructState(
    aggregateType: AggregateType,
    aggregateId: string,
    timestamp?: number
  ): Promise<any> {
    // Get all events for this aggregate
    const allEvents = await db.audit_log
      .where('aggregate_type')
      .equals(aggregateType)
      .toArray();

    // Filter by aggregate_id and timestamp
    const targetTimestamp = timestamp || Date.now();
    const events = allEvents
      .filter(e => 
        e.aggregate_id === aggregateId && 
        e.timestamp <= targetTimestamp
      )
      .sort((a, b) => a.timestamp - b.timestamp);

    // Reconstruct state by applying events in order
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
   * Detect fraud patterns
   * Requirements: 8.5
   */
  async detectFraudPatterns(
    userId: string,
    timeWindowMs: number = 3600000 // 1 hour
  ): Promise<FraudPattern[]> {
    const patterns: FraudPattern[] = [];
    const now = Date.now();
    const windowStart = now - timeWindowMs;

    // Get recent events for user
    const events = await db.audit_log
      .where('[user_id+timestamp]')
      .between([userId, windowStart], [userId, now])
      .toArray();

    // Pattern 1: Rapid payments (more than 10 payments in 5 minutes)
    const recentPayments = events.filter(
      e => e.event_type === 'CREATE' && 
           e.aggregate_type === 'pago' && 
           e.timestamp > now - 300000
    );

    if (recentPayments.length > 10) {
      patterns.push({
        type: 'rapid_payments',
        severity: 'high',
        description: `${recentPayments.length} payments in 5 minutes`,
        events: recentPayments,
      });
    }

    // Pattern 2: Impossible location (movement > 100km in < 10 minutes)
    const paymentsWithLocation = events
      .filter(e => 
        e.event_type === 'CREATE' && 
        e.aggregate_type === 'pago' &&
        e.metadata.latitude && 
        e.metadata.longitude
      )
      .sort((a, b) => a.timestamp - b.timestamp);

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

      // If moved > 100km in < 10 minutes (impossible)
      if (distance > 100 && timeDiff < 600000) {
        patterns.push({
          type: 'impossible_location',
          severity: 'high',
          description: `Moved ${distance.toFixed(1)}km in ${(timeDiff / 60000).toFixed(1)} minutes`,
          events: [prev, curr],
        });
      }
    }

    // Pattern 3: Duplicate payments (same amount, same client, within 1 minute)
    const paymentEvents = events.filter(
      e => e.event_type === 'CREATE' && e.aggregate_type === 'pago'
    );

    for (let i = 0; i < paymentEvents.length; i++) {
      for (let j = i + 1; j < paymentEvents.length; j++) {
        const p1 = paymentEvents[i];
        const p2 = paymentEvents[j];

        if (
          p1.data && p2.data &&
          p1.data.cliente_id === p2.data.cliente_id &&
          p1.data.monto === p2.data.monto &&
          Math.abs(p1.timestamp - p2.timestamp) < 60000
        ) {
          patterns.push({
            type: 'duplicate_payment',
            severity: 'medium',
            description: `Duplicate payment of ${p1.data.monto} for same client`,
            events: [p1, p2],
          });
        }
      }
    }

    // Pattern 4: Suspicious amounts (very large payments)
    const largePayments = paymentEvents.filter(
      e => e.data && e.data.monto && e.data.monto > 1000000 // > 1M
    );

    if (largePayments.length > 0) {
      patterns.push({
        type: 'suspicious_amount',
        severity: 'medium',
        description: `${largePayments.length} payment(s) over 1M`,
        events: largePayments,
      });
    }

    return patterns;
  }

  /**
   * Calculate distance between two GPS coordinates (Haversine formula)
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth radius in km
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
   * Get audit events for a specific aggregate
   */
  async getEventsForAggregate(
    aggregateType: AggregateType,
    aggregateId: string
  ): Promise<AuditLogEntry[]> {
    return db.audit_log
      .where('[aggregate_type+aggregate_id+timestamp]')
      .between(
        [aggregateType, aggregateId, 0],
        [aggregateType, aggregateId, Date.now()]
      )
      .toArray();
  }

  /**
   * Get audit events for a specific user
   */
  async getEventsForUser(
    userId: string,
    limit: number = 100
  ): Promise<AuditLogEntry[]> {
    return db.audit_log
      .where('user_id')
      .equals(userId)
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Get recent audit events
   */
  async getRecentEvents(limit: number = 100): Promise<AuditLogEntry[]> {
    return db.audit_log
      .orderBy('timestamp')
      .reverse()
      .limit(limit)
      .toArray();
  }

  /**
   * Count events by type
   */
  async countEventsByType(): Promise<Record<EventType, number>> {
    const events = await db.audit_log.toArray();
    
    const counts: Record<string, number> = {};
    for (const event of events) {
      counts[event.event_type] = (counts[event.event_type] || 0) + 1;
    }

    return counts as Record<EventType, number>;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const auditLogger = AuditLogger.getInstance();
