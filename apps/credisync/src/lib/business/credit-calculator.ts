/**
 * Credit Calculator Module
 *
 * This module implements all credit-related calculations including:
 * - Interest calculation
 * - Total amount calculation
 * - Installment (cuota) value calculation
 * - Payment schedule generation with frequency support
 * - Sunday exclusion logic
 *
 * Requirements: 12.2, 12.3, 12.4, 13.2, 13.5
 */

// ============================================================================
// TYPES
// ============================================================================

export type PaymentFrequency = 'diario' | 'semanal' | 'quincenal' | 'mensual';

export interface CreditInput {
  monto_original: number;
  interes_porcentaje: number;
  numero_cuotas: number;
  frecuencia: PaymentFrequency;
  fecha_desembolso: Date;
  excluir_domingos: boolean;
}

export interface CreditCalculation {
  monto_original: number;
  interes_monto: number;
  total_a_pagar: number;
  valor_cuota: number;
  numero_cuotas: number;
  fecha_primera_cuota: Date;
  fecha_ultima_cuota: Date;
}

export interface Cuota {
  numero: number;
  valor: number;
  fecha_programada: Date;
}

// ============================================================================
// CREDIT CALCULATOR CLASS
// ============================================================================

export class CreditCalculator {
  /**
   * Calculate interest amount
   */
  calculateInterest(monto: number, porcentaje: number): number {
    return monto * (porcentaje / 100);
  }

  /**
   * Calculate total amount to pay (principal + interest)
   */
  calculateTotalAmount(monto: number, porcentaje: number): number {
    const interes = this.calculateInterest(monto, porcentaje);
    return monto + interes;
  }

  /**
   * Calculate installment value (cuota)
   */
  calculateInstallmentValue(totalAmount: number, numeroCuotas: number): number {
    return Math.round(totalAmount / numeroCuotas);
  }

  /**
   * Calculate complete credit details
   */
  calculateCredit(input: CreditInput): CreditCalculation {
    const interes_monto = this.calculateInterest(
      input.monto_original,
      input.interes_porcentaje
    );

    const total_a_pagar = this.calculateTotalAmount(
      input.monto_original,
      input.interes_porcentaje
    );

    const valor_cuota = this.calculateInstallmentValue(
      total_a_pagar,
      input.numero_cuotas
    );

    // Generate payment schedule to get first and last dates
    const cuotas = this.generatePaymentSchedule(input);
    const fecha_primera_cuota = cuotas[0].fecha_programada;
    const fecha_ultima_cuota = cuotas[cuotas.length - 1].fecha_programada;

    return {
      monto_original: input.monto_original,
      interes_monto,
      total_a_pagar,
      valor_cuota,
      numero_cuotas: input.numero_cuotas,
      fecha_primera_cuota,
      fecha_ultima_cuota
    };
  }

  /**
   * Generate payment schedule (cuotas)
   */
  generatePaymentSchedule(input: CreditInput): Cuota[] {
    const cuotas: Cuota[] = [];
    const total_a_pagar = this.calculateTotalAmount(
      input.monto_original,
      input.interes_porcentaje
    );
    const valor_cuota = this.calculateInstallmentValue(
      total_a_pagar,
      input.numero_cuotas
    );

    let currentDate = new Date(input.fecha_desembolso);

    for (let i = 1; i <= input.numero_cuotas; i++) {
      // Calculate next payment date based on frequency
      currentDate = this.getNextPaymentDate(
        currentDate,
        input.frecuencia,
        input.excluir_domingos,
        i === 1 // is first cuota
      );

      cuotas.push({
        numero: i,
        valor: valor_cuota,
        fecha_programada: new Date(currentDate)
      });
    }

    return cuotas;
  }

  /**
   * Get next payment date based on frequency
   */
  private getNextPaymentDate(
    currentDate: Date,
    frecuencia: PaymentFrequency,
    excluirDomingos: boolean,
    isFirst: boolean
  ): Date {
    let nextDate = new Date(currentDate);

    // Always add the frequency interval
    nextDate = this.addFrequencyInterval(nextDate, frecuencia);

    // Skip Sundays if required
    if (excluirDomingos) {
      nextDate = this.skipSundays(nextDate);
    }

    return nextDate;
  }

  /**
   * Add frequency interval to date
   */
  private addFrequencyInterval(date: Date, frecuencia: PaymentFrequency): Date {
    const newDate = new Date(date);

    switch (frecuencia) {
      case 'diario':
        newDate.setDate(newDate.getDate() + 1);
        break;
      case 'semanal':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'quincenal':
        newDate.setDate(newDate.getDate() + 15);
        break;
      case 'mensual':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }

    return newDate;
  }

  /**
   * Skip Sundays (move to Monday if date falls on Sunday)
   */
  private skipSundays(date: Date): Date {
    const newDate = new Date(date);

    // 0 = Sunday
    while (newDate.getDay() === 0) {
      newDate.setDate(newDate.getDate() + 1);
    }

    return newDate;
  }

  /**
   * Calculate days between two dates
   */
  calculateDaysBetween(date1: Date, date2: Date): number {
    const oneDay = 24 * 60 * 60 * 1000; // milliseconds in a day
    const diffTime = Math.abs(date2.getTime() - date1.getTime());
    return Math.floor(diffTime / oneDay);
  }

  /**
   * Check if a date is a Sunday
   */
  isSunday(date: Date): boolean {
    return date.getDay() === 0;
  }

  /**
   * Get business days between two dates (excluding Sundays)
   */
  getBusinessDays(
    startDate: Date,
    endDate: Date,
    excluirDomingos: boolean
  ): number {
    if (!excluirDomingos) {
      return this.calculateDaysBetween(startDate, endDate);
    }

    let count = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      if (!this.isSunday(currentDate)) {
        count++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return count;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const creditCalculator = new CreditCalculator();
