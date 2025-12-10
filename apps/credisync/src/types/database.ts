/**
 * Database types for CrediSync
 * 
 * Re-exports from @sync/types for backward compatibility
 * and app-specific extensions
 */

// Re-export all database types from @sync/types
export type {
  Tenant,
  User,
  Ruta,
  ProductoCredito,
  Cliente,
  Credito,
  Cuota,
  Pago,
  TableName,
  DatabaseRecord,
  BaseEntity,
  SyncableEntity,
  FieldVersion
} from '@sync/types/database';

// Re-export common types
export type {
  ApiResponse,
  ApiError,
  SyncRequest,
  SyncResponse,
  AuthUser,
  AuthSession
} from '@sync/types/api';

export type {
  CreditCalculation,
  BalanceCalculation,
  PaymentSchedule,
  ScheduledPayment,
  GpsLocation,
  AuditEvent,
  ValidationResult
} from '@sync/types/business';
