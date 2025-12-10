/**
 * API-related types and interfaces
 */

// Generic API response wrapper
export interface ApiResponse<T = any> {
  data: T | null;
  error: ApiError | null;
  success: boolean;
  message?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// Supabase configuration
export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceRoleKey?: string;
}

// Sync-related API types
export interface SyncRequest {
  table: string;
  lastSync: number;
  changes: SyncChange[];
}

export interface SyncResponse {
  changes: SyncChange[];
  lastSync: number;
  conflicts: SyncConflict[];
}

export interface SyncChange {
  id: string;
  table: string;
  operation: 'insert' | 'update' | 'delete';
  data: any;
  timestamp: number;
  version_vector: Record<string, number>;
}

export interface SyncConflict {
  id: string;
  table: string;
  local: any;
  remote: any;
  resolution?: 'local' | 'remote' | 'merge';
}

// Authentication types
export interface AuthUser {
  id: string;
  email: string;
  tenant_id: string;
  rol: 'admin' | 'cobrador' | 'supervisor';
}

export interface AuthSession {
  user: AuthUser;
  access_token: string;
  refresh_token: string;
  expires_at: number;
}
