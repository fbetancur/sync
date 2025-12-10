/**
 * Property-Based Tests for Balance Calculator
 *
 * Feature: pwa-microcreditos-offline, Property 7: Saldo Calculation Consistency
 * Validates: Requirements 13.1
 *
 * This test verifies that for any credito with any set of pagos,
 * the saldo_pendiente always equals (total_a_pagar - sum of pagos)
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  BalanceCalculator,
  type Pago,
  type Credito
} from './balance-calculator';

describe('BalanceCalculator - Property-Based Tests', () => {
  const calculator = new BalanceCalculator();

  describe('Property 7: Saldo Calculation Consistency', () => {
    it('should always calculate saldo_pendiente as (total_a_pagar - sum of pagos)', () => {
      fc.assert(
        fc.property(
          // Generate random credito
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 10000000 }), // 100k to 10M
            fecha_desembolso: fc
              .date({ min: new Date(2020, 0, 1), max: new Date(2025, 11, 31) })
              .map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 60 })
          }),
          // Generate random array of pagos
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.constant(''), // Will be set to match credito
              monto: fc.integer({ min: 1000, max: 500000 }), // 1k to 500k per pago
              fecha: fc
                .date({
                  min: new Date(2020, 0, 1),
                  max: new Date(2025, 11, 31)
                })
                .map(d => d.getTime())
            }),
            { minLength: 0, maxLength: 20 }
          ),
          (credito, pagos) => {
            // Set all pagos to reference this credito
            const creditoWithPagos = pagos.map(pago => ({
              ...pago,
              credito_id: credito.id
            }));

            // Calculate saldo using the calculator
            const saldoCalculado = calculator.calculateSaldoPendiente(
              credito,
              creditoWithPagos
            );

            // Calculate expected saldo manually
            const totalPagado = creditoWithPagos.reduce(
              (sum, pago) => sum + pago.monto,
              0
            );
            const saldoEsperado = Math.max(
              0,
              credito.total_a_pagar - totalPagado
            );

            // Property: saldo_pendiente must equal (total_a_pagar - sum of pagos)
            expect(saldoCalculado).toBe(saldoEsperado);
          }
        ),
        { numRuns: 100 } // Run 100 iterations as specified in design
      );
    });

    it('should never return negative saldo_pendiente', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 1000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 30 })
          }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.constant(''),
              monto: fc.integer({ min: 50000, max: 2000000 }), // Can exceed total
              fecha: fc.date().map(d => d.getTime())
            }),
            { minLength: 1, maxLength: 10 }
          ),
          (credito, pagos) => {
            const creditoWithPagos = pagos.map(pago => ({
              ...pago,
              credito_id: credito.id
            }));

            const saldo = calculator.calculateSaldoPendiente(
              credito,
              creditoWithPagos
            );

            // Property: saldo must never be negative
            expect(saldo).toBeGreaterThanOrEqual(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only count pagos for the specific credito', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 1000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 30 })
          }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.uuid(), // Random credito_id (might not match)
              monto: fc.integer({ min: 1000, max: 100000 }),
              fecha: fc.date().map(d => d.getTime())
            }),
            { minLength: 5, maxLength: 20 }
          ),
          (credito, pagos) => {
            // Split pagos: some for this credito, some for others
            const pagosForThisCredito = pagos
              .slice(0, Math.floor(pagos.length / 2))
              .map(p => ({
                ...p,
                credito_id: credito.id
              }));
            const pagosForOtherCreditos = pagos.slice(
              Math.floor(pagos.length / 2)
            );

            const allPagos = [...pagosForThisCredito, ...pagosForOtherCreditos];

            const saldo = calculator.calculateSaldoPendiente(credito, allPagos);

            // Calculate expected saldo (only counting pagos for this credito)
            const totalPagadoThisCredito = pagosForThisCredito.reduce(
              (sum, p) => sum + p.monto,
              0
            );
            const expectedSaldo = Math.max(
              0,
              credito.total_a_pagar - totalPagadoThisCredito
            );

            // Property: should only count pagos for this specific credito
            expect(saldo).toBe(expectedSaldo);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle empty pagos array correctly', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 10000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 60 })
          }),
          credito => {
            const saldo = calculator.calculateSaldoPendiente(credito, []);

            // Property: with no pagos, saldo should equal total_a_pagar
            expect(saldo).toBe(credito.total_a_pagar);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be commutative (order of pagos does not matter)', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 1000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 30 })
          }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.constant(''),
              monto: fc.integer({ min: 1000, max: 100000 }),
              fecha: fc.date().map(d => d.getTime())
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (credito, pagos) => {
            const creditoWithPagos = pagos.map(pago => ({
              ...pago,
              credito_id: credito.id
            }));

            // Calculate saldo with original order
            const saldo1 = calculator.calculateSaldoPendiente(
              credito,
              creditoWithPagos
            );

            // Calculate saldo with reversed order
            const saldo2 = calculator.calculateSaldoPendiente(
              credito,
              [...creditoWithPagos].reverse()
            );

            // Property: order of pagos should not affect result
            expect(saldo1).toBe(saldo2);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Property: Cuotas Pagadas Consistency', () => {
    it('should never exceed total number of cuotas', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 1000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 1, max: 30 })
          }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.constant(''),
              monto: fc.integer({ min: 1000, max: 500000 }),
              fecha: fc.date().map(d => d.getTime())
            }),
            { minLength: 0, maxLength: 50 }
          ),
          (credito, pagos) => {
            const creditoWithPagos = pagos.map(pago => ({
              ...pago,
              credito_id: credito.id
            }));

            const cuotasPagadas = calculator.calculateCuotasPagadas(
              credito,
              creditoWithPagos
            );

            // Property: cuotas_pagadas should never exceed numero_cuotas
            expect(cuotasPagadas).toBeLessThanOrEqual(credito.numero_cuotas);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should be monotonic (more payments = more or equal cuotas pagadas)', () => {
      fc.assert(
        fc.property(
          fc.record({
            id: fc.uuid(),
            total_a_pagar: fc.integer({ min: 100000, max: 1000000 }),
            fecha_desembolso: fc.date().map(d => d.getTime()),
            numero_cuotas: fc.integer({ min: 5, max: 30 })
          }),
          fc.array(
            fc.record({
              id: fc.uuid(),
              credito_id: fc.constant(''),
              monto: fc.integer({ min: 10000, max: 50000 }),
              fecha: fc.date().map(d => d.getTime())
            }),
            { minLength: 2, maxLength: 10 }
          ),
          (credito, pagos) => {
            const creditoWithPagos = pagos.map(pago => ({
              ...pago,
              credito_id: credito.id
            }));

            // Calculate with subset of pagos
            const cuotasPagadas1 = calculator.calculateCuotasPagadas(
              credito,
              creditoWithPagos.slice(0, Math.floor(creditoWithPagos.length / 2))
            );

            // Calculate with all pagos
            const cuotasPagadas2 = calculator.calculateCuotasPagadas(
              credito,
              creditoWithPagos
            );

            // Property: more payments should result in more or equal cuotas pagadas
            expect(cuotasPagadas2).toBeGreaterThanOrEqual(cuotasPagadas1);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
