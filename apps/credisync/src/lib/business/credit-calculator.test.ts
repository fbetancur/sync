/**
 * Tests for Credit Calculator
 *
 * Requirements: 12.2, 12.3, 12.4, 13.2, 13.5
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CreditCalculator, type CreditInput } from './credit-calculator';

describe('CreditCalculator', () => {
  let calculator: CreditCalculator;

  beforeEach(() => {
    calculator = new CreditCalculator();
  });

  describe('calculateInterest', () => {
    it('should calculate interest correctly', () => {
      const monto = 1000000;
      const porcentaje = 10;

      const interes = calculator.calculateInterest(monto, porcentaje);

      expect(interes).toBe(100000);
    });

    it('should handle zero interest', () => {
      const monto = 1000000;
      const porcentaje = 0;

      const interes = calculator.calculateInterest(monto, porcentaje);

      expect(interes).toBe(0);
    });

    it('should handle decimal interest rates', () => {
      const monto = 1000000;
      const porcentaje = 5.5;

      const interes = calculator.calculateInterest(monto, porcentaje);

      expect(interes).toBe(55000);
    });
  });

  describe('calculateTotalAmount', () => {
    it('should calculate total amount correctly', () => {
      const monto = 1000000;
      const porcentaje = 10;

      const total = calculator.calculateTotalAmount(monto, porcentaje);

      expect(total).toBe(1100000);
    });

    it('should return original amount when interest is zero', () => {
      const monto = 1000000;
      const porcentaje = 0;

      const total = calculator.calculateTotalAmount(monto, porcentaje);

      expect(total).toBe(1000000);
    });
  });

  describe('calculateInstallmentValue', () => {
    it('should calculate installment value correctly', () => {
      const totalAmount = 1100000;
      const numeroCuotas = 30;

      const valorCuota = calculator.calculateInstallmentValue(
        totalAmount,
        numeroCuotas
      );

      expect(valorCuota).toBe(36667); // Rounded
    });

    it('should handle exact division', () => {
      const totalAmount = 1200000;
      const numeroCuotas = 30;

      const valorCuota = calculator.calculateInstallmentValue(
        totalAmount,
        numeroCuotas
      );

      expect(valorCuota).toBe(40000);
    });

    it('should round to nearest integer', () => {
      const totalAmount = 1000000;
      const numeroCuotas = 3;

      const valorCuota = calculator.calculateInstallmentValue(
        totalAmount,
        numeroCuotas
      );

      expect(valorCuota).toBe(333333); // 333333.33 rounded
    });
  });

  describe('calculateCredit', () => {
    it('should calculate complete credit details', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 30,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const result = calculator.calculateCredit(input);

      expect(result.monto_original).toBe(1000000);
      expect(result.interes_monto).toBe(100000);
      expect(result.total_a_pagar).toBe(1100000);
      expect(result.valor_cuota).toBe(36667);
      expect(result.numero_cuotas).toBe(30);
      expect(result.fecha_primera_cuota).toBeInstanceOf(Date);
      expect(result.fecha_ultima_cuota).toBeInstanceOf(Date);
    });
  });

  describe('generatePaymentSchedule', () => {
    it('should generate daily payment schedule', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 5,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(5);
      expect(cuotas[0].numero).toBe(1);
      expect(cuotas[0].valor).toBe(220000); // 1100000 / 5
      expect(cuotas[0].fecha_programada.getDate()).toBe(11); // Dec 11
      expect(cuotas[1].fecha_programada.getDate()).toBe(12); // Dec 12
      expect(cuotas[2].fecha_programada.getDate()).toBe(13); // Dec 13
    });

    it('should generate weekly payment schedule', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 4,
        frecuencia: 'semanal',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(4);
      expect(cuotas[0].fecha_programada.getDate()).toBe(17); // Dec 17 (7 days later)
      expect(cuotas[1].fecha_programada.getDate()).toBe(24); // Dec 24 (14 days later)
    });

    it('should generate biweekly payment schedule', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 3,
        frecuencia: 'quincenal',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(3);
      expect(cuotas[0].fecha_programada.getDate()).toBe(25); // Dec 25 (15 days later)
    });

    it('should generate monthly payment schedule', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 3,
        frecuencia: 'mensual',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(3);
      expect(cuotas[0].fecha_programada.getMonth()).toBe(0); // January (next month)
      expect(cuotas[1].fecha_programada.getMonth()).toBe(1); // February
      expect(cuotas[2].fecha_programada.getMonth()).toBe(2); // March
    });

    it('should skip Sundays when excluir_domingos is true', () => {
      // Dec 15, 2024 is a Sunday
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 10,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: true
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      // Check that no cuota falls on Sunday
      for (const cuota of cuotas) {
        expect(cuota.fecha_programada.getDay()).not.toBe(0); // 0 = Sunday
      }
    });

    it('should not skip Sundays when excluir_domingos is false', () => {
      // Dec 15, 2024 is a Sunday
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 10,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      // Check that at least one cuota falls on Sunday (Dec 15)
      const hasSunday = cuotas.some(
        cuota => cuota.fecha_programada.getDay() === 0
      );
      expect(hasSunday).toBe(true);
    });
  });

  describe('isSunday', () => {
    it('should identify Sunday correctly', () => {
      const sunday = new Date(2024, 11, 15); // Dec 15, 2024 (Sunday)
      expect(calculator.isSunday(sunday)).toBe(true);
    });

    it('should identify non-Sunday correctly', () => {
      const monday = new Date(2024, 11, 16); // Dec 16, 2024 (Monday)
      expect(calculator.isSunday(monday)).toBe(false);
    });
  });

  describe('calculateDaysBetween', () => {
    it('should calculate days between dates', () => {
      const date1 = new Date(2024, 11, 10); // Dec 10, 2024
      const date2 = new Date(2024, 11, 15); // Dec 15, 2024

      const days = calculator.calculateDaysBetween(date1, date2);

      expect(days).toBe(5);
    });

    it('should handle same date', () => {
      const date1 = new Date(2024, 11, 10); // Dec 10, 2024
      const date2 = new Date(2024, 11, 10); // Dec 10, 2024

      const days = calculator.calculateDaysBetween(date1, date2);

      expect(days).toBe(0);
    });

    it('should handle dates in reverse order', () => {
      const date1 = new Date(2024, 11, 15); // Dec 15, 2024
      const date2 = new Date(2024, 11, 10); // Dec 10, 2024

      const days = calculator.calculateDaysBetween(date1, date2);

      expect(days).toBe(5);
    });
  });

  describe('getBusinessDays', () => {
    it('should count all days when not excluding Sundays', () => {
      const startDate = new Date(2024, 11, 10); // Dec 10, 2024 (Tuesday)
      const endDate = new Date(2024, 11, 16); // Dec 16, 2024 (Monday)

      const days = calculator.getBusinessDays(startDate, endDate, false);

      expect(days).toBe(6); // 7 days total
    });

    it('should exclude Sundays when excluir_domingos is true', () => {
      const startDate = new Date(2024, 11, 10); // Dec 10, 2024 (Tuesday)
      const endDate = new Date(2024, 11, 16); // Dec 16, 2024 (Monday, includes Sunday Dec 15)

      const days = calculator.getBusinessDays(startDate, endDate, true);

      expect(days).toBe(6); // 7 days - 1 Sunday = 6 business days
    });

    it('should handle range with multiple Sundays', () => {
      const startDate = new Date(2024, 11, 10); // Dec 10, 2024 (Tuesday)
      const endDate = new Date(2024, 11, 23); // Dec 23, 2024 (Monday, includes 2 Sundays: Dec 15, 22)

      const days = calculator.getBusinessDays(startDate, endDate, true);

      expect(days).toBe(12); // 14 days - 2 Sundays = 12 business days
    });
  });

  describe('Edge cases', () => {
    it('should handle leap year in monthly schedule', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 3,
        frecuencia: 'mensual',
        fecha_desembolso: new Date(2024, 0, 31), // Jan 31, 2024 (Leap year)
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(3);
      // When adding 1 month to Jan 31, JavaScript adjusts to Mar 2 or Mar 3 (Feb doesn't have 31 days)
      // Then adding 1 month to Mar 2/3 gives Apr 2/3, and so on
      // This is expected behavior for monthly schedules with end-of-month dates
      expect(cuotas[0].fecha_programada.getMonth()).toBe(2); // March (adjusted from Feb 31)
      expect(cuotas[1].fecha_programada.getMonth()).toBe(3); // April (1 month after March)
      expect(cuotas[2].fecha_programada.getMonth()).toBe(4); // May (1 month after April)
    });

    it('should handle month boundaries correctly', () => {
      const input: CreditInput = {
        monto_original: 1000000,
        interes_porcentaje: 10,
        numero_cuotas: 5,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 28), // Dec 28, 2024
        excluir_domingos: false
      };

      const cuotas = calculator.generatePaymentSchedule(input);

      expect(cuotas).toHaveLength(5);
      // Should cross into January
      expect(cuotas[cuotas.length - 1].fecha_programada.getMonth()).toBe(0); // January
    });

    it('should handle very small amounts', () => {
      const input: CreditInput = {
        monto_original: 100,
        interes_porcentaje: 10,
        numero_cuotas: 3,
        frecuencia: 'diario',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const result = calculator.calculateCredit(input);

      expect(result.monto_original).toBe(100);
      expect(result.interes_monto).toBe(10);
      expect(result.total_a_pagar).toBe(110);
      expect(result.valor_cuota).toBe(37); // 110 / 3 = 36.67 rounded to 37
    });

    it('should handle large amounts', () => {
      const input: CreditInput = {
        monto_original: 100000000, // 100 million
        interes_porcentaje: 15,
        numero_cuotas: 12,
        frecuencia: 'mensual',
        fecha_desembolso: new Date(2024, 11, 10), // Dec 10, 2024
        excluir_domingos: false
      };

      const result = calculator.calculateCredit(input);

      expect(result.monto_original).toBe(100000000);
      expect(result.interes_monto).toBe(15000000);
      expect(result.total_a_pagar).toBe(115000000);
      expect(result.valor_cuota).toBe(9583333); // Rounded
    });
  });
});
