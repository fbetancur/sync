/**
 * Business logic types and interfaces
 */

// Credit calculation types
export interface CreditCalculation {
  monto_original: number;
  interes_porcentaje: number;
  numero_cuotas: number;
  frecuencia: 'diario' | 'semanal' | 'quincenal' | 'mensual';
  total_a_pagar: number;
  valor_cuota: number;
  fecha_desembolso: Date;
  fecha_primera_cuota: Date;
  fecha_ultima_cuota: Date;
  excluir_domingos: boolean;
}

// Balance calculation types
export interface BalanceCalculation {
  cliente_id: string;
  creditos_activos: number;
  saldo_total: number;
  dias_atraso_max: number;
  score: number | null;
  ultimo_pago: Date | null;
}

// Payment schedule types
export interface PaymentSchedule {
  credito_id: string;
  cuotas: ScheduledPayment[];
  total_programado: number;
  total_pagado: number;
  saldo_pendiente: number;
}

export interface ScheduledPayment {
  numero: number;
  fecha_programada: Date;
  valor: number;
  estado: 'pendiente' | 'pagada' | 'vencida';
  fecha_pago?: Date;
  monto_pagado: number;
  dias_atraso: number;
}

// GPS and location types
export interface GpsLocation {
  latitude: number;
  longitude: number;
  accuracy?: number;
  timestamp: number;
}

export interface LocationCapture {
  location: GpsLocation;
  address?: string;
  error?: string;
}

// Audit and tracking types
export interface AuditEvent {
  id: string;
  tenant_id: string;
  user_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  timestamp: number;
  device_id: string;
  app_version: string;
}

// Validation result types
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}