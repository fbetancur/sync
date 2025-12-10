/**
 * Property-Based Tests for Audit Logger Immutability
 * 
 * Feature: pwa-microcreditos-offline, Property 5: Audit Log Immutability
 * Validates: Requirements 8.3, 8.4
 * 
 * These tests verify that the audit log maintains immutability through
 * the hash chain mechanism, regardless of the sequence of events.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { fc } from '@fast-check/vitest';
import { AuditLogger, type AuditEventData } from './audit-logger';
import { db } from '../db/index';
import type { EventType, AggregateType } from '../db/types';

describe('AuditLogger - Property-Based Tests', () => {
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

  /**
   * Property 5: Audit Log Immutability
   * For any sequence of events, the hash chain must be valid
   */
  describe('Property 5: Hash Chain Immutability', () => {
    // Arbitrary for EventType
    const eventTypeArb = fc.constantFrom<EventType>(
      'CREATE',
      'UPDATE',
      'DELETE',
      'LOGIN',
      'LOGOUT',
      'SYNC',
      'ERROR'
    );

    // Arbitrary for AggregateType
    const aggregateTypeArb = fc.constantFrom<AggregateType>(
      'tenant',
      'user',
      'cliente',
      'credito',
      'cuota',
      'pago',
      'ruta',
      'producto'
    );

    // Arbitrary for AuditEventData
    const auditEventArb = fc.record({
      tenant_id: fc.uuid(),
      user_id: fc.uuid(),
      device_id: fc.uuid(),
      event_type: eventTypeArb,
      aggregate_type: aggregateTypeArb,
      aggregate_id: fc.uuid(),
      data: fc.object(),
    }) as fc.Arbitrary<AuditEventData>;

    it('should maintain valid hash chain for any sequence of events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 1, maxLength: 20 }),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            for (const eventData of events) {
              await testLogger.logEvent(eventData);
            }

            // Verify hash chain
            const result = await testLogger.verifyHashChain();

            // Property: Hash chain must always be valid
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect tampering in any position of the chain', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }), // Position to tamper
          async (events, tamperPosition) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            const loggedEvents = [];
            for (const eventData of events) {
              const event = await testLogger.logEvent(eventData);
              loggedEvents.push(event);
            }

            // Tamper with an event (if position is valid)
            const actualPosition = tamperPosition % loggedEvents.length;
            const eventToTamper = loggedEvents[actualPosition];
            
            if (eventToTamper.id) {
              await db.audit_log.update(eventToTamper.id, {
                data: { tampered: true },
              });

              // Verify hash chain
              const result = await testLogger.verifyHashChain();

              // Property: Tampering must always be detected
              expect(result.valid).toBe(false);
              expect(result.errors.length).toBeGreaterThan(0);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain sequential ordering regardless of event content', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 2, maxLength: 15 }),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            const loggedEvents = [];
            for (const eventData of events) {
              const event = await testLogger.logEvent(eventData);
              loggedEvents.push(event);
            }

            // Get all events from database
            const storedEvents = await db.audit_log
              .orderBy('sequence')
              .toArray();

            // Property: Sequences must be consecutive
            for (let i = 0; i < storedEvents.length; i++) {
              expect(storedEvents[i].sequence).toBe(i + 1);
            }

            // Property: Each event's previous_hash must match previous event's hash
            for (let i = 1; i < storedEvents.length; i++) {
              expect(storedEvents[i].previous_hash).toBe(storedEvents[i - 1].hash);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should produce unique hashes for different events', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 2, maxLength: 20 }),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            const hashes = new Set<string>();
            for (const eventData of events) {
              const event = await testLogger.logEvent(eventData);
              hashes.add(event.hash);
            }

            // Property: All hashes must be unique
            expect(hashes.size).toBe(events.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should maintain hash chain integrity after reconstruction', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 0, max: 9 }), // Position to reconstruct from
          async (events, reconstructPosition) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            for (const eventData of events) {
              await testLogger.logEvent(eventData);
            }

            // Get events up to reconstruction point
            const actualPosition = reconstructPosition % events.length;
            const allEvents = await db.audit_log
              .orderBy('sequence')
              .toArray();
            
            const eventsUpToPoint = allEvents.slice(0, actualPosition + 1);

            // Verify partial chain
            let previousHash = '0'.repeat(64);
            for (const event of eventsUpToPoint) {
              // Property: Each event's previous_hash must match
              expect(event.previous_hash).toBe(previousHash);
              previousHash = event.hash;
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain immutability with concurrent-like event creation', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 5, maxLength: 15 }),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log events in batches (simulating concurrent operations)
            const batchSize = 3;
            for (let i = 0; i < events.length; i += batchSize) {
              const batch = events.slice(i, i + batchSize);
              
              // Log batch sequentially (actual concurrent logging would need proper locking)
              for (const eventData of batch) {
                await testLogger.logEvent(eventData);
              }
            }

            // Verify hash chain
            const result = await testLogger.verifyHashChain();

            // Property: Hash chain must remain valid even with batched operations
            expect(result.valid).toBe(true);
            expect(result.errors).toHaveLength(0);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain hash chain with various data types', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              tenant_id: fc.uuid(),
              user_id: fc.uuid(),
              device_id: fc.uuid(),
              event_type: eventTypeArb,
              aggregate_type: aggregateTypeArb,
              aggregate_id: fc.uuid(),
              data: fc.oneof(
                fc.object(),
                fc.array(fc.anything()),
                fc.string(),
                fc.integer(),
                fc.boolean(),
                fc.constant(null)
              ),
            }) as fc.Arbitrary<AuditEventData>,
            { minLength: 2, maxLength: 10 }
          ),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            for (const eventData of events) {
              await testLogger.logEvent(eventData);
            }

            // Verify hash chain
            const result = await testLogger.verifyHashChain();

            // Property: Hash chain must be valid regardless of data types
            expect(result.valid).toBe(true);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should detect broken chain at any position', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 3, maxLength: 10 }),
          fc.integer({ min: 1, max: 9 }), // Position to break (not first)
          async (events, breakPosition) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            const loggedEvents = [];
            for (const eventData of events) {
              const event = await testLogger.logEvent(eventData);
              loggedEvents.push(event);
            }

            // Break the chain at a specific position
            const actualPosition = (breakPosition % (loggedEvents.length - 1)) + 1;
            const eventToBreak = loggedEvents[actualPosition];
            
            if (eventToBreak.id) {
              // Change previous_hash to break the chain
              await db.audit_log.update(eventToBreak.id, {
                previous_hash: 'broken_hash_' + Math.random(),
              });

              // Verify hash chain
              const result = await testLogger.verifyHashChain();

              // Property: Broken chain must always be detected
              expect(result.valid).toBe(false);
              expect(result.errors.some(e => e.includes('previous_hash mismatch'))).toBe(true);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 5: Event Immutability', () => {
    const eventTypeArb = fc.constantFrom<EventType>(
      'CREATE',
      'UPDATE',
      'DELETE'
    );

    const aggregateTypeArb = fc.constantFrom<AggregateType>(
      'cliente',
      'credito',
      'pago'
    );

    const auditEventArb = fc.record({
      tenant_id: fc.uuid(),
      user_id: fc.uuid(),
      device_id: fc.uuid(),
      event_type: eventTypeArb,
      aggregate_type: aggregateTypeArb,
      aggregate_id: fc.uuid(),
      data: fc.object(),
    }) as fc.Arbitrary<AuditEventData>;

    it('should detect any modification to event data', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 2, maxLength: 8 }),
          fc.integer({ min: 0, max: 7 }),
          fc.string({ minLength: 1 }), // Random string modification
          async (events, modifyPosition, modificationValue) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            const loggedEvents = [];
            for (const eventData of events) {
              const event = await testLogger.logEvent(eventData);
              loggedEvents.push(event);
            }

            // Modify an event's data with a guaranteed different value
            const actualPosition = modifyPosition % loggedEvents.length;
            const eventToModify = loggedEvents[actualPosition];
            
            if (eventToModify.id) {
              const modification = {
                ...eventToModify.data,
                __tampered: modificationValue, // Add a field that wasn't there
              };
              
              await db.audit_log.update(eventToModify.id, {
                data: modification,
              });

              // Verify hash chain
              const result = await testLogger.verifyHashChain();

              // Property: Any data modification must be detected
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain append-only property - no deletions', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(auditEventArb, { minLength: 3, maxLength: 10 }),
          async (events) => {
            // Clear database for each property test iteration
            await db.audit_log.clear();
            // @ts-ignore
            AuditLogger.instance = undefined;
            const testLogger = AuditLogger.getInstance();

            // Log all events
            for (const eventData of events) {
              await testLogger.logEvent(eventData);
            }

            const countBefore = await db.audit_log.count();

            // Try to delete an event (this violates append-only)
            const firstEvent = await db.audit_log.orderBy('sequence').first();
            if (firstEvent?.id) {
              await db.audit_log.delete(firstEvent.id);
            }

            const countAfter = await db.audit_log.count();

            // If deletion happened, verify chain should fail
            if (countAfter < countBefore) {
              const result = await testLogger.verifyHashChain();
              
              // Property: Deletion breaks the chain
              // (In production, deletions should be prevented at DB level)
              expect(result.valid).toBe(false);
            }
          }
        ),
        { numRuns: 30 }
      );
    });
  });
});
