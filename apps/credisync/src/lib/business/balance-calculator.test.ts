/**
 * Tests for Balance Calculator
 *
 * Requirements: 3.3, 3.4, 12.5, 12.6, 13.1, 13.4
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  BalanceCalculator,
  type Pago,
  type Credito,
  type Cuota
} from './balance-calculator';

describe('BalanceCalculator', () => {
  let calculator: BalanceCalculator;

  beforeEach(() => {
    calculator = new BalanceCalculator();
  });

  describe('calculateSaldoPendiente', () => {
    it('should calculate outstanding balance correctly', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 100000,
          fecha: Date.now()
        },
        {
          id: 'pago-2',
          credito_id: 'credito-1',
          monto: 50000,
          fecha: Date.now()
        }
      ];

      const saldo = calculator.calculateSaldoPendiente(credito, pagos);

      expect(saldo).toBe(950000); // 1100000 - 150000
    });

    it('should return 0 when credit is fully paid', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 1100000,
          fecha: Date.now()
        }
      ];

      const saldo = calculator.calculateSaldoPendiente(credito, pagos);

      expect(saldo).toBe(0);
    });

    it('should return 0 when overpaid (not negative)', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 1200000,
          fecha: Date.now()
        }
      ];

      const saldo = calculator.calculateSaldoPendiente(credito, pagos);

      expect(saldo).toBe(0); // Should not be negative
    });

    it('should filter pagos by credito_id', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 100000,
          fecha: Date.now()
        },
        {
          id: 'pago-2',
          credito_id: 'credito-2',
          monto: 50000,
          fecha: Date.now()
        } // Different credit
      ];

      const saldo = calculator.calculateSaldoPendiente(credito, pagos);

      expect(saldo).toBe(1000000); // Only counts pago-1
    });

    it('should handle empty pagos array', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const saldo = calculator.calculateSaldoPendiente(credito, []);

      expect(saldo).toBe(1100000); // Full amount pending
    });
  });

  describe('calculateCuotasPagadas', () => {
    it('should count paid cuotas from cuotas array', () => {
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 36667,
          fecha_programada: new Date(),
          estado: 'pagada'
        },
        {
          numero: 2,
          valor: 36667,
          fecha_programada: new Date(),
          estado: 'pagada'
        },
        {
          numero: 3,
          valor: 36667,
          fecha_programada: new Date(),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30,
        cuotas
      };

      const pagadas = calculator.calculateCuotasPagadas(credito, []);

      expect(pagadas).toBe(2);
    });

    it('should estimate cuotas pagadas when no cuotas array', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1200000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 40000,
          fecha: Date.now()
        },
        {
          id: 'pago-2',
          credito_id: 'credito-1',
          monto: 40000,
          fecha: Date.now()
        }
      ];

      const pagadas = calculator.calculateCuotasPagadas(credito, pagos);

      // 80000 paid / 40000 per cuota = 2 cuotas
      expect(pagadas).toBe(2);
    });

    it('should return 0 when no payments made', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const pagadas = calculator.calculateCuotasPagadas(credito, []);

      expect(pagadas).toBe(0);
    });
  });

  describe('calculateDiasAtraso', () => {
    it('should calculate days overdue correctly', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 10), // Dec 10 - 10 days overdue
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 15), // Dec 15 - 5 days overdue
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30,
        cuotas
      };

      const diasAtraso = calculator.calculateDiasAtraso(
        credito,
        [],
        currentDate
      );

      expect(diasAtraso).toBe(10); // Oldest overdue cuota
    });

    it('should return 0 when no cuotas are overdue', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 25), // Dec 25 - future
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30,
        cuotas
      };

      const diasAtraso = calculator.calculateDiasAtraso(
        credito,
        [],
        currentDate
      );

      expect(diasAtraso).toBe(0);
    });

    it('should ignore paid cuotas when calculating arrears', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 10), // Dec 10 - but paid
          estado: 'pagada'
        },
        {
          numero: 2,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 15), // Dec 15 - 5 days overdue
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30,
        cuotas
      };

      const diasAtraso = calculator.calculateDiasAtraso(
        credito,
        [],
        currentDate
      );

      expect(diasAtraso).toBe(5); // Only counts unpaid cuota
    });

    it('should return 0 when no cuotas array', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 1100000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 30
      };

      const diasAtraso = calculator.calculateDiasAtraso(credito, []);

      expect(diasAtraso).toBe(0);
    });
  });

  describe('calculateBalance', () => {
    it('should calculate complete balance information', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 10),
          estado: 'pagada'
        },
        {
          numero: 2,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 15),
          estado: 'pendiente'
        },
        {
          numero: 3,
          valor: 36667,
          fecha_programada: new Date(2024, 11, 25),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 110000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 3,
        cuotas
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 36667,
          fecha: Date.now()
        }
      ];

      const balance = calculator.calculateBalance(credito, pagos, currentDate);

      expect(balance.saldo_pendiente).toBe(73333); // 110000 - 36667
      expect(balance.cuotas_pagadas).toBe(1);
      expect(balance.dias_atraso).toBe(5); // Dec 15 to Dec 20
    });
  });

  describe('updateCuotasStatus', () => {
    it('should mark cuotas as paid based on payment amount', () => {
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(),
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 40000,
          fecha_programada: new Date(),
          estado: 'pendiente'
        },
        {
          numero: 3,
          valor: 40000,
          fecha_programada: new Date(),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 120000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 3,
        cuotas
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 80000,
          fecha: Date.now()
        }
      ];

      const updatedCuotas = calculator.updateCuotasStatus(credito, pagos);

      expect(updatedCuotas[0].estado).toBe('pagada');
      expect(updatedCuotas[1].estado).toBe('pagada');
      expect(updatedCuotas[2].estado).toBe('pendiente');
    });

    it('should handle partial payments', () => {
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(),
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 40000,
          fecha_programada: new Date(),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 80000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 2,
        cuotas
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 30000,
          fecha: Date.now()
        }
      ];

      const updatedCuotas = calculator.updateCuotasStatus(credito, pagos);

      // Partial payment - first cuota stays pendiente
      expect(updatedCuotas[0].estado).toBe('pendiente');
      expect(updatedCuotas[1].estado).toBe('pendiente');
    });

    it('should return empty array when no cuotas', () => {
      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 120000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 3
      };

      const updatedCuotas = calculator.updateCuotasStatus(credito, []);

      expect(updatedCuotas).toEqual([]);
    });
  });

  describe('updateCuotasVencidas', () => {
    it('should mark overdue cuotas as vencida', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 10), // Past
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 25), // Future
          estado: 'pendiente'
        }
      ];

      const updatedCuotas = calculator.updateCuotasVencidas(
        cuotas,
        currentDate
      );

      expect(updatedCuotas[0].estado).toBe('vencida');
      expect(updatedCuotas[1].estado).toBe('pendiente');
    });

    it('should not change paid cuotas', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 10), // Past but paid
          estado: 'pagada'
        }
      ];

      const updatedCuotas = calculator.updateCuotasVencidas(
        cuotas,
        currentDate
      );

      expect(updatedCuotas[0].estado).toBe('pagada');
    });
  });

  describe('recalculateAfterPago', () => {
    it('should recalculate all fields after pago registration', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 10),
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 15),
          estado: 'pendiente'
        },
        {
          numero: 3,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 25),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 120000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 3,
        cuotas
      };

      const pagos: Pago[] = [
        {
          id: 'pago-1',
          credito_id: 'credito-1',
          monto: 80000,
          fecha: Date.now()
        }
      ];

      const result = calculator.recalculateAfterPago(
        credito,
        pagos,
        currentDate
      );

      expect(result.saldo_pendiente).toBe(40000); // 120000 - 80000
      expect(result.cuotas_pagadas).toBe(2);
      expect(result.dias_atraso).toBe(0); // First 2 cuotas paid, 3rd is future
      expect(result.cuotas[0].estado).toBe('pagada');
      expect(result.cuotas[1].estado).toBe('pagada');
      expect(result.cuotas[2].estado).toBe('pendiente');
    });

    it('should mark overdue unpaid cuotas as vencida', () => {
      const currentDate = new Date(2024, 11, 20); // Dec 20, 2024
      const cuotas: Cuota[] = [
        {
          numero: 1,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 10),
          estado: 'pendiente'
        },
        {
          numero: 2,
          valor: 40000,
          fecha_programada: new Date(2024, 11, 15),
          estado: 'pendiente'
        }
      ];

      const credito: Credito = {
        id: 'credito-1',
        total_a_pagar: 80000,
        fecha_desembolso: Date.now(),
        numero_cuotas: 2,
        cuotas
      };

      const pagos: Pago[] = []; // No payments

      const result = calculator.recalculateAfterPago(
        credito,
        pagos,
        currentDate
      );

      expect(result.cuotas[0].estado).toBe('vencida');
      expect(result.cuotas[1].estado).toBe('vencida');
      expect(result.dias_atraso).toBe(10); // Dec 10 to Dec 20
    });
  });
});
