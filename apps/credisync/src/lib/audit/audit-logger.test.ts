/**
 * Tests for Audit Logger System
 * 
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuditLogger, type AuditEventData } from './audit-logger';
import { db } from '../app-config';

describe('AuditLogger', () => {
  let logger: AuditLogger;

  beforeEach(async () => {
    // Clear database
    await db.audit_log.clear();
    
    // Reset the singleton instance for testing
    // @ts-ignore - accessing private static for testing
    AuditLogger.instance = undefined;
    
    // Get fresh instance
    logger = AuditLogger.getInstance();
  });

  describe('Event Creation', () => {
    it('should create audit event with all required fields', async () => {
      const eventData: AuditEventData = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto: 1000, cliente_id: 'cliente-1' },
      };

      const event = await logger.logEvent(eventData);

      expect(event).toBeDefined();
      expect(event.timestamp).toBeGreaterThan(0);
      expect(event.sequence).toBeGreaterThan(0);
      expect(event.tenant_id).toBe('tenant-1');
      expect(event.user_id).toBe('user-1');
      expect(event.device_id).toBe('device-1');
      expect(event.event_type).toBe('CREATE');
      expect(event.aggregate_type).toBe('pago');
      expect(event.aggregate_id).toBe('pago-1');
      expect(event.data).toEqual({ monto: 1000, cliente_id: 'cliente-1' });
      expect(event.metadata).toBeDefined();
      expect(event.previous_hash).toBeDefined();
      expect(event.hash).toBeDefined();
      expect(event.hash).toHaveLength(64); // SHA-256 hex
    });

    it('should include complete metadata', async () => {
      const eventData: AuditEventData = {
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
        metadata: {
          latitude: 4.6097,
          longitude: -74.0817,
        },
      };

      const event = await logger.logEvent(eventData);

      expect(event.metadata.user_agent).toBeDefined();
      expect(event.metadata.app_version).toBeDefined();
      expect(event.metadata.connection_type).toBeDefined();
      expect(event.metadata.latitude).toBe(4.6097);
      expect(event.metadata.longitude).toBe(-74.0817);
    });

    it('should increment sequence for each event', async () => {
      const event1 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
      });

      const event2 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: {},
      });

      expect(event2.sequence).toBe(event1.sequence + 1);
    });
  });

  describe('Hash Chain', () => {
    it('should create valid hash chain', async () => {
      const event1 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
      });

      const event2 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: {},
      });

      // Event 2's previous_hash should equal event 1's hash
      expect(event2.previous_hash).toBe(event1.hash);
    });

    it('should verify valid hash chain', async () => {
      // Create multiple events
      for (let i = 0; i < 5; i++) {
        await logger.logEvent({
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          device_id: 'device-1',
          event_type: 'CREATE',
          aggregate_type: 'pago',
          aggregate_id: `pago-${i}`,
          data: { index: i },
        });
      }

      const result = await logger.verifyHashChain();

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect tampered event', async () => {
      // Create events
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto: 1000 },
      });

      const event2 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: { monto: 2000 },
      });

      // Tamper with event (this would require direct DB access in real scenario)
      // For testing, we'll modify the data
      await db.audit_log.update(event2.id!, {
        data: { monto: 9999 }, // Changed amount
      });

      const result = await logger.verifyHashChain();

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should detect broken chain', async () => {
      const event1 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
      });

      // Manually insert event with wrong previous_hash
      await db.audit_log.add({
        timestamp: Date.now(),
        sequence: 2,
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: {},
        metadata: {
          ip_address: null,
          user_agent: 'test',
          app_version: '1.0.0',
          latitude: null,
          longitude: null,
          connection_type: 'test',
          battery_level: null,
        },
        previous_hash: 'wrong-hash',
        hash: 'some-hash',
      });

      const result = await logger.verifyHashChain();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('previous_hash mismatch'))).toBe(true);
    });
  });

  describe('State Reconstruction', () => {
    it('should reconstruct state from CREATE event', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {
          nombre: 'Juan Pérez',
          documento: '12345678',
          telefono: '3001234567',
        },
      });

      const state = await logger.reconstructState('cliente', 'cliente-1');

      expect(state).toEqual({
        nombre: 'Juan Pérez',
        documento: '12345678',
        telefono: '3001234567',
      });
    });

    it('should reconstruct state from CREATE and UPDATE events', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {
          nombre: 'Juan Pérez',
          telefono: '3001234567',
        },
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'UPDATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {
          telefono: '3009876543', // Updated phone
        },
      });

      const state = await logger.reconstructState('cliente', 'cliente-1');

      expect(state.nombre).toBe('Juan Pérez');
      expect(state.telefono).toBe('3009876543'); // Updated value
    });

    it('should return null for deleted aggregate', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: { nombre: 'Juan Pérez' },
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'DELETE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {},
      });

      const state = await logger.reconstructState('cliente', 'cliente-1');

      expect(state).toBeNull();
    });

    it('should reconstruct state at specific timestamp', async () => {
      const event1 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: { nombre: 'Juan Pérez', version: 1 },
      });

      // Wait to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 50));

      const event2 = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'UPDATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: { version: 2 },
      });

      // Reconstruct at timestamp between event1 and event2
      const timestampBetween = event1.timestamp + 1;
      const state = await logger.reconstructState('cliente', 'cliente-1', timestampBetween);

      expect(state.version).toBe(1); // Should have first version only
    });
  });

  describe('Fraud Detection', () => {
    it('should detect rapid payments pattern', async () => {
      const userId = 'user-1';
      const now = Date.now();

      // Create 15 payments in quick succession
      for (let i = 0; i < 15; i++) {
        await logger.logEvent({
          tenant_id: 'tenant-1',
          user_id: userId,
          device_id: 'device-1',
          event_type: 'CREATE',
          aggregate_type: 'pago',
          aggregate_id: `pago-${i}`,
          data: { monto: 1000 },
        });
      }

      const patterns = await logger.detectFraudPatterns(userId);

      const rapidPayments = patterns.find(p => p.type === 'rapid_payments');
      expect(rapidPayments).toBeDefined();
      expect(rapidPayments?.severity).toBe('high');
    });

    it('should detect impossible location pattern', async () => {
      const userId = 'user-1';

      // Payment in Bogotá
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: userId,
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto: 1000 },
        metadata: {
          latitude: 4.6097,
          longitude: -74.0817,
        },
      });

      // Payment in Medellín 5 minutes later (impossible - 240km away)
      await new Promise(resolve => setTimeout(resolve, 10));
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: userId,
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: { monto: 1000 },
        metadata: {
          latitude: 6.2442,
          longitude: -75.5812,
        },
      });

      const patterns = await logger.detectFraudPatterns(userId);

      const impossibleLocation = patterns.find(p => p.type === 'impossible_location');
      expect(impossibleLocation).toBeDefined();
      expect(impossibleLocation?.severity).toBe('high');
    });

    it('should detect duplicate payment pattern', async () => {
      const userId = 'user-1';
      const clienteId = 'cliente-1';
      const monto = 50000;

      // Two identical payments within 1 minute
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: userId,
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto, cliente_id: clienteId },
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: userId,
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: { monto, cliente_id: clienteId },
      });

      const patterns = await logger.detectFraudPatterns(userId);

      const duplicate = patterns.find(p => p.type === 'duplicate_payment');
      expect(duplicate).toBeDefined();
      expect(duplicate?.severity).toBe('medium');
    });

    it('should detect suspicious amount pattern', async () => {
      const userId = 'user-1';

      // Very large payment
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: userId,
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto: 5000000 }, // 5M
      });

      const patterns = await logger.detectFraudPatterns(userId);

      const suspicious = patterns.find(p => p.type === 'suspicious_amount');
      expect(suspicious).toBeDefined();
      expect(suspicious?.severity).toBe('medium');
    });
  });

  describe('Query Methods', () => {
    it('should get events for specific aggregate', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {},
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'UPDATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {},
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-2',
        data: {},
      });

      const events = await logger.getEventsForAggregate('cliente', 'cliente-1');

      expect(events).toHaveLength(2);
      expect(events.every(e => e.aggregate_id === 'cliente-1')).toBe(true);
    });

    it('should get events for specific user', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-2',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: {},
      });

      const events = await logger.getEventsForUser('user-1');

      expect(events).toHaveLength(1);
      expect(events[0].user_id).toBe('user-1');
    });

    it('should get recent events with limit', async () => {
      for (let i = 0; i < 10; i++) {
        await logger.logEvent({
          tenant_id: 'tenant-1',
          user_id: 'user-1',
          device_id: 'device-1',
          event_type: 'CREATE',
          aggregate_type: 'pago',
          aggregate_id: `pago-${i}`,
          data: {},
        });
      }

      const events = await logger.getRecentEvents(5);

      expect(events).toHaveLength(5);
      // Should be in reverse chronological order
      expect(events[0].timestamp).toBeGreaterThanOrEqual(events[1].timestamp);
    });

    it('should count events by type', async () => {
      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: {},
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-2',
        data: {},
      });

      await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'UPDATE',
        aggregate_type: 'cliente',
        aggregate_id: 'cliente-1',
        data: {},
      });

      const counts = await logger.countEventsByType();

      expect(counts.CREATE).toBe(2);
      expect(counts.UPDATE).toBe(1);
    });
  });

  describe('Append-Only Enforcement', () => {
    it('should not allow modification of existing events', async () => {
      const event = await logger.logEvent({
        tenant_id: 'tenant-1',
        user_id: 'user-1',
        device_id: 'device-1',
        event_type: 'CREATE',
        aggregate_type: 'pago',
        aggregate_id: 'pago-1',
        data: { monto: 1000 },
      });

      // Try to modify (this would be caught by hash verification)
      await db.audit_log.update(event.id!, {
        data: { monto: 9999 },
      });

      const result = await logger.verifyHashChain();

      // Should detect tampering
      expect(result.valid).toBe(false);
    });
  });
});
