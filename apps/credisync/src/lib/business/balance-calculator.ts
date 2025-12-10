/**
 * Balance Calculator Module
 *
 * This module implements balance and arrears calculations including:
 * - Saldo pendiente (outstanding balance) calculation from pagos
 * - Días de atraso (days overdue) calculation
 * - Cuotas pagadas (paid installments) counter
 * - Automatic recalculation on pago registration
 *
 * Requirements: 3.3, 3.4, 12.5, 12.6, 13.1, 13.4
 */

// ============================================================================
// TYPES
// ============================================================================

export interface Pago {
  id: string;
  credito_id: string;
  monto: number;
  fecha: number; // timestamp
}

export interface Cuota {
  numero: number;
  valor: number;
  fecha_programada: Date;
  estado: 'pendiente' | 'pagada' | 'vencida';
}

export interface Credito {
  id: string;
  total_a_pagar: number;
  fecha_desembolso: number; // timestamp
  numero_cuotas: number;
  cuotas?: Cuota[];
}

export interface BalanceResult {
  saldo_pendiente: number;
  cuotas_pagadas: number;
  dias_atraso: number;
}

// ============================================================================
// BALANCE CALCULATOR CLASS
// ============================================================================

export class BalanceCalculator {
  /**
   * Calculate saldo_pendiente (outstanding balance) from pagos
   * Formula: total_a_pagar - sum(pagos)
   */
  calculateSaldoPendiente(credito: Credito, pagos: Pago[]): number {
    const totalPagado = pagos
      .filter(pago => pago.credito_id === credito.id)
      .reduce((sum, pago) => sum + pago.monto, 0);

    const saldoPendiente = credito.total_a_pagar - totalPagado;

    // Ensure saldo is never negative
    return Math.max(0, saldoPendiente);
  }

  /**
   * Calculate cuotas_pagadas (number of paid installments)
   */
  calculateCuotasPagadas(credito: Credito, pagos: Pago[]): number {
    if (!credito.cuotas || credito.cuotas.length === 0) {
      // If no cuotas array, estimate based on payment amount
      const totalPagado = pagos
        .filter(pago => pago.credito_id === credito.id)
        .reduce((sum, pago) => sum + pago.monto, 0);

      const valorCuota = credito.total_a_pagar / credito.numero_cuotas;
      const cuotasEstimadas = Math.floor(totalPagado / valorCuota);

      // Never exceed total number of cuotas
      return Math.min(cuotasEstimadas, credito.numero_cuotas);
    }

    // Count cuotas marked as 'pagada'
    return credito.cuotas.filter(cuota => cuota.estado === 'pagada').length;
  }

  /**
   * Calculate dias_atraso (days overdue)
   * Compares current date with scheduled payment dates
   */
  calculateDiasAtraso(
    credito: Credito,
    pagos: Pago[],
    currentDate: Date = new Date()
  ): number {
    if (!credito.cuotas || credito.cuotas.length === 0) {
      return 0;
    }

    // Find the oldest unpaid cuota that is past due
    const cuotasVencidas = credito.cuotas
      .filter(cuota => cuota.estado !== 'pagada')
      .filter(cuota => cuota.fecha_programada < currentDate)
      .sort(
        (a, b) => a.fecha_programada.getTime() - b.fecha_programada.getTime()
      );

    if (cuotasVencidas.length === 0) {
      return 0;
    }

    // Calculate days between oldest overdue cuota and current date
    const oldestVencida = cuotasVencidas[0];
    const diffTime =
      currentDate.getTime() - oldestVencida.fecha_programada.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Calculate complete balance information
   */
  calculateBalance(
    credito: Credito,
    pagos: Pago[],
    currentDate: Date = new Date()
  ): BalanceResult {
    return {
      saldo_pendiente: this.calculateSaldoPendiente(credito, pagos),
      cuotas_pagadas: this.calculateCuotasPagadas(credito, pagos),
      dias_atraso: this.calculateDiasAtraso(credito, pagos, currentDate)
    };
  }

  /**
   * Update cuotas status based on pagos
   * Marks cuotas as 'pagada' based on payment amounts
   */
  updateCuotasStatus(credito: Credito, pagos: Pago[]): Cuota[] {
    if (!credito.cuotas || credito.cuotas.length === 0) {
      return [];
    }

    const totalPagado = pagos
      .filter(pago => pago.credito_id === credito.id)
      .reduce((sum, pago) => sum + pago.monto, 0);

    let remainingAmount = totalPagado;
    const updatedCuotas = [...credito.cuotas];

    // Mark cuotas as paid in order
    for (let i = 0; i < updatedCuotas.length; i++) {
      if (remainingAmount >= updatedCuotas[i].valor) {
        updatedCuotas[i] = { ...updatedCuotas[i], estado: 'pagada' };
        remainingAmount -= updatedCuotas[i].valor;
      } else if (remainingAmount > 0) {
        // Partial payment - keep as pendiente
        break;
      }
    }

    return updatedCuotas;
  }

  /**
   * Update cuotas status to mark overdue ones
   */
  updateCuotasVencidas(
    cuotas: Cuota[],
    currentDate: Date = new Date()
  ): Cuota[] {
    return cuotas.map(cuota => {
      if (
        cuota.estado === 'pendiente' &&
        cuota.fecha_programada < currentDate
      ) {
        return { ...cuota, estado: 'vencida' };
      }
      return cuota;
    });
  }

  /**
   * Recalculate all balance fields after pago registration
   * This is the main method to call when a new pago is registered
   */
  recalculateAfterPago(
    credito: Credito,
    pagos: Pago[],
    currentDate: Date = new Date()
  ): {
    saldo_pendiente: number;
    cuotas_pagadas: number;
    dias_atraso: number;
    cuotas: Cuota[];
  } {
    // Update cuotas status based on payments
    let updatedCuotas = this.updateCuotasStatus(credito, pagos);

    // Mark overdue cuotas
    updatedCuotas = this.updateCuotasVencidas(updatedCuotas, currentDate);

    // Create updated credito with new cuotas
    const updatedCredito = { ...credito, cuotas: updatedCuotas };

    // Calculate balance
    const balance = this.calculateBalance(updatedCredito, pagos, currentDate);

    return {
      ...balance,
      cuotas: updatedCuotas
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const balanceCalculator = new BalanceCalculator();
