/**
 * Checksum and Integrity Verification Module
 * 
 * This module implements checksum calculation and verification using Web Crypto API (SHA-256).
 * It provides integrity verification for critical records (pagos, creditos) and periodic
 * integrity checks with automatic recovery procedures.
 * 
 * Requirements: 2.6, 7.6
 */

import { db } from '../db';
import type { Pago, Credito, Cliente, ChecksumEntry } from '../db';

// ============================================================================
// TYPES
// ============================================================================

export interface ChecksumResult {
  valid: boolean;
  expected: string;
  actual: string;
  corrupted: boolean;
}

export interface IntegrityCheckResult {
  total: number;
  valid: number;
  corrupted: number;
  missing: number;
  repaired: number;
  errors: IntegrityError[];
}

export interface IntegrityError {
  recordType: string;
  recordId: string;
  error: string;
  timestamp: number;
}

// ============================================================================
// CHECKSUM UTILITY CLASS
// ============================================================================

export class ChecksumService {
  /**
   * Calculate SHA-256 checksum for any data
   */
  async calculateChecksum(data: any): Promise<string> {
    try {
      // Convert data to canonical JSON string
      const jsonString = JSON.stringify(this.canonicalize(data));
      
      // Convert string to Uint8Array
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);
      
      // Calculate SHA-256 hash
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
      
      // Convert hash to hex string
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      
      return hashHex;
    } catch (error) {
      console.error('Error calculating checksum:', error);
      throw new Error(`Failed to calculate checksum: ${error}`);
    }
  }

  /**
   * Canonicalize object for consistent hashing
   * Sorts keys alphabetically and removes checksum field
   */
  private canonicalize(obj: any): any {
    if (obj === null || typeof obj !== 'object') {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.canonicalize(item));
    }

    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    
    for (const key of keys) {
      // Skip checksum field itself
      if (key === 'checksum') {
        continue;
      }
      sorted[key] = this.canonicalize(obj[key]);
    }
    
    return sorted;
  }

  /**
   * Calculate checksum for a Pago record
   */
  async calculatePagoChecksum(pago: Omit<Pago, 'checksum'>): Promise<string> {
    // Include only immutable fields for pagos
    const checksumData = {
      id: pago.id,
      tenant_id: pago.tenant_id,
      credito_id: pago.credito_id,
      cliente_id: pago.cliente_id,
      cobrador_id: pago.cobrador_id,
      monto: pago.monto,
      fecha: pago.fecha,
      latitud: pago.latitud,
      longitud: pago.longitud,
      observaciones: pago.observaciones,
      created_at: pago.created_at,
      created_by: pago.created_by,
      device_id: pago.device_id,
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Calculate checksum for a Credito record
   */
  async calculateCreditoChecksum(credito: Omit<Credito, 'checksum'>): Promise<string> {
    // Include critical fields that shouldn't change
    const checksumData = {
      id: credito.id,
      tenant_id: credito.tenant_id,
      cliente_id: credito.cliente_id,
      producto_id: credito.producto_id,
      monto_original: credito.monto_original,
      interes_porcentaje: credito.interes_porcentaje,
      total_a_pagar: credito.total_a_pagar,
      numero_cuotas: credito.numero_cuotas,
      fecha_desembolso: credito.fecha_desembolso,
      created_at: credito.created_at,
      created_by: credito.created_by,
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Calculate checksum for a Cliente record
   */
  async calculateClienteChecksum(cliente: Omit<Cliente, 'checksum'>): Promise<string> {
    // Include identifying fields
    const checksumData = {
      id: cliente.id,
      tenant_id: cliente.tenant_id,
      numero_documento: cliente.numero_documento,
      nombre: cliente.nombre,
      created_at: cliente.created_at,
      created_by: cliente.created_by,
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Verify checksum for a Pago record
   */
  async verifyPagoChecksum(pago: Pago): Promise<ChecksumResult> {
    const expected = pago.checksum;
    const actual = await this.calculatePagoChecksum(pago);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual,
    };
  }

  /**
   * Verify checksum for a Credito record
   */
  async verifyCreditoChecksum(credito: Credito): Promise<ChecksumResult> {
    const expected = credito.checksum;
    const actual = await this.calculateCreditoChecksum(credito);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual,
    };
  }

  /**
   * Verify checksum for a Cliente record
   */
  async verifyClienteChecksum(cliente: Cliente): Promise<ChecksumResult> {
    const expected = cliente.checksum;
    const actual = await this.calculateClienteChecksum(cliente);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual,
    };
  }

  /**
   * Store checksum in checksums table
   */
  async storeChecksum(recordType: string, recordId: string, checksum: string): Promise<void> {
    const entry: ChecksumEntry = {
      record_key: `${recordType}:${recordId}`,
      checksum,
      timestamp: Date.now(),
    };

    await db.checksums.put(entry);
  }

  /**
   * Retrieve stored checksum
   */
  async getStoredChecksum(recordType: string, recordId: string): Promise<string | null> {
    const entry = await db.checksums.get(`${recordType}:${recordId}`);
    return entry?.checksum || null;
  }

  /**
   * Perform periodic integrity check on all critical records
   */
  async performIntegrityCheck(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: [],
    };

    try {
      // Check pagos
      const pagosResult = await this.checkPagosIntegrity();
      result.total += pagosResult.total;
      result.valid += pagosResult.valid;
      result.corrupted += pagosResult.corrupted;
      result.missing += pagosResult.missing;
      result.repaired += pagosResult.repaired;
      result.errors.push(...pagosResult.errors);

      // Check creditos
      const creditosResult = await this.checkCreditosIntegrity();
      result.total += creditosResult.total;
      result.valid += creditosResult.valid;
      result.corrupted += creditosResult.corrupted;
      result.missing += creditosResult.missing;
      result.repaired += creditosResult.repaired;
      result.errors.push(...creditosResult.errors);

      // Check clientes
      const clientesResult = await this.checkClientesIntegrity();
      result.total += clientesResult.total;
      result.valid += clientesResult.valid;
      result.corrupted += clientesResult.corrupted;
      result.missing += clientesResult.missing;
      result.repaired += clientesResult.repaired;
      result.errors.push(...clientesResult.errors);

      console.log('✅ Integrity check completed:', result);
    } catch (error) {
      console.error('❌ Integrity check failed:', error);
      result.errors.push({
        recordType: 'system',
        recordId: 'integrity_check',
        error: `Integrity check failed: ${error}`,
        timestamp: Date.now(),
      });
    }

    return result;
  }

  /**
   * Check integrity of all pagos
   */
  private async checkPagosIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: [],
    };

    const pagos = await db.pagos.toArray();
    result.total = pagos.length;

    for (const pago of pagos) {
      try {
        if (!pago.checksum) {
          result.missing++;
          // Attempt to repair by calculating checksum
          const checksum = await this.calculatePagoChecksum(pago);
          await db.pagos.update(pago.id, { checksum });
          result.repaired++;
          continue;
        }

        const verification = await this.verifyPagoChecksum(pago);
        
        if (verification.valid) {
          result.valid++;
        } else {
          result.corrupted++;
          result.errors.push({
            recordType: 'pago',
            recordId: pago.id,
            error: `Checksum mismatch: expected ${verification.expected}, got ${verification.actual}`,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'pago',
          recordId: pago.id,
          error: `Verification failed: ${error}`,
          timestamp: Date.now(),
        });
      }
    }

    return result;
  }

  /**
   * Check integrity of all creditos
   */
  private async checkCreditosIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: [],
    };

    const creditos = await db.creditos.toArray();
    result.total = creditos.length;

    for (const credito of creditos) {
      try {
        if (!credito.checksum) {
          result.missing++;
          // Attempt to repair by calculating checksum
          const checksum = await this.calculateCreditoChecksum(credito);
          await db.creditos.update(credito.id, { checksum });
          result.repaired++;
          continue;
        }

        const verification = await this.verifyCreditoChecksum(credito);
        
        if (verification.valid) {
          result.valid++;
        } else {
          result.corrupted++;
          result.errors.push({
            recordType: 'credito',
            recordId: credito.id,
            error: `Checksum mismatch: expected ${verification.expected}, got ${verification.actual}`,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'credito',
          recordId: credito.id,
          error: `Verification failed: ${error}`,
          timestamp: Date.now(),
        });
      }
    }

    return result;
  }

  /**
   * Check integrity of all clientes
   */
  private async checkClientesIntegrity(): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: [],
    };

    const clientes = await db.clientes.toArray();
    result.total = clientes.length;

    for (const cliente of clientes) {
      try {
        if (!cliente.checksum) {
          result.missing++;
          // Attempt to repair by calculating checksum
          const checksum = await this.calculateClienteChecksum(cliente);
          await db.clientes.update(cliente.id, { checksum });
          result.repaired++;
          continue;
        }

        const verification = await this.verifyClienteChecksum(cliente);
        
        if (verification.valid) {
          result.valid++;
        } else {
          result.corrupted++;
          result.errors.push({
            recordType: 'cliente',
            recordId: cliente.id,
            error: `Checksum mismatch: expected ${verification.expected}, got ${verification.actual}`,
            timestamp: Date.now(),
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'cliente',
          recordId: cliente.id,
          error: `Verification failed: ${error}`,
          timestamp: Date.now(),
        });
      }
    }

    return result;
  }

  /**
   * Start periodic integrity checks (every 5 minutes)
   */
  startPeriodicChecks(intervalMs: number = 5 * 60 * 1000): NodeJS.Timeout {
    console.log(`🔍 Starting periodic integrity checks every ${intervalMs / 1000} seconds`);
    
    return setInterval(async () => {
      console.log('🔍 Running periodic integrity check...');
      const result = await this.performIntegrityCheck();
      
      if (result.corrupted > 0) {
        console.warn(`⚠️ Found ${result.corrupted} corrupted records`);
      }
      
      if (result.repaired > 0) {
        console.log(`✅ Repaired ${result.repaired} records`);
      }
    }, intervalMs);
  }

  /**
   * Stop periodic integrity checks
   */
  stopPeriodicChecks(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('🛑 Stopped periodic integrity checks');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const checksumService = new ChecksumService();
