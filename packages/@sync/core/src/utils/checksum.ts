/**
 * Módulo de Verificación de Checksums e Integridad
 *
 * Este módulo implementa el cálculo y verificación de checksums usando Web Crypto API (SHA-256).
 * Proporciona verificación de integridad para registros críticos (pagos, créditos) y verificaciones
 * periódicas de integridad con procedimientos automáticos de recuperación.
 *
 * Requirements: 2.6, 7.6
 */

// ============================================================================
// TIPOS
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
// CLASE DE SERVICIO DE CHECKSUM
// ============================================================================

export class ChecksumService {
  /**
   * Calcular checksum SHA-256 para cualquier dato
   */
  async calculateChecksum(data: any): Promise<string> {
    try {
      // Convertir datos a string JSON canónico
      const jsonString = JSON.stringify(this.canonicalize(data));

      // Convertir string a Uint8Array
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(jsonString);

      // Calcular hash SHA-256
      const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);

      // Convertir hash a string hexadecimal
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');

      return hashHex;
    } catch (error) {
      console.error('Error calculando checksum:', error);
      throw new Error(`Falló el cálculo de checksum: ${error}`);
    }
  }

  /**
   * Canonicalizar objeto para hashing consistente
   * Ordena las claves alfabéticamente y remueve el campo checksum
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
      // Omitir el campo checksum
      if (key === 'checksum') {
        continue;
      }
      sorted[key] = this.canonicalize(obj[key]);
    }

    return sorted;
  }

  /**
   * Calcular checksum para un registro de Pago
   */
  async calculatePagoChecksum(pago: any): Promise<string> {
    // Incluir solo campos inmutables para pagos
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
      device_id: pago.device_id
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Calcular checksum para un registro de Crédito
   */
  async calculateCreditoChecksum(credito: any): Promise<string> {
    // Incluir campos críticos que no deberían cambiar
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
      created_by: credito.created_by
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Calcular checksum para un registro de Cliente
   */
  async calculateClienteChecksum(cliente: any): Promise<string> {
    // Incluir campos identificadores
    const checksumData = {
      id: cliente.id,
      tenant_id: cliente.tenant_id,
      numero_documento: cliente.numero_documento,
      nombre: cliente.nombre,
      created_at: cliente.created_at,
      created_by: cliente.created_by
    };

    return this.calculateChecksum(checksumData);
  }

  /**
   * Verificar checksum para un registro de Pago
   */
  async verifyPagoChecksum(pago: any): Promise<ChecksumResult> {
    const expected = pago.checksum;
    const actual = await this.calculatePagoChecksum(pago);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual
    };
  }

  /**
   * Verificar checksum para un registro de Crédito
   */
  async verifyCreditoChecksum(credito: any): Promise<ChecksumResult> {
    const expected = credito.checksum;
    const actual = await this.calculateCreditoChecksum(credito);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual
    };
  }

  /**
   * Verificar checksum para un registro de Cliente
   */
  async verifyClienteChecksum(cliente: any): Promise<ChecksumResult> {
    const expected = cliente.checksum;
    const actual = await this.calculateClienteChecksum(cliente);

    return {
      valid: expected === actual,
      expected,
      actual,
      corrupted: expected !== actual
    };
  }

  /**
   * Almacenar checksum en tabla de checksums
   */
  async storeChecksum(
    recordType: string,
    recordId: string,
    checksum: string,
    db?: any
  ): Promise<void> {
    if (!db) {
      throw new Error('Base de datos requerida para almacenar checksum');
    }

    const entry = {
      record_key: `${recordType}:${recordId}`,
      checksum,
      timestamp: Date.now()
    };

    await db.checksums.put(entry);
  }

  /**
   * Recuperar checksum almacenado
   */
  async getStoredChecksum(
    recordType: string,
    recordId: string,
    db?: any
  ): Promise<string | null> {
    if (!db) {
      throw new Error('Base de datos requerida para recuperar checksum');
    }

    const entry = await db.checksums.get(`${recordType}:${recordId}`);
    return entry?.checksum || null;
  }

  /**
   * Realizar verificación periódica de integridad en todos los registros críticos
   */
  async performIntegrityCheck(db?: any): Promise<IntegrityCheckResult> {
    if (!db) {
      throw new Error(
        'Base de datos requerida para verificación de integridad'
      );
    }

    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: []
    };

    try {
      // Verificar pagos
      const pagosResult = await this.checkPagosIntegrity(db);
      result.total += pagosResult.total;
      result.valid += pagosResult.valid;
      result.corrupted += pagosResult.corrupted;
      result.missing += pagosResult.missing;
      result.repaired += pagosResult.repaired;
      result.errors.push(...pagosResult.errors);

      // Verificar créditos
      const creditosResult = await this.checkCreditosIntegrity(db);
      result.total += creditosResult.total;
      result.valid += creditosResult.valid;
      result.corrupted += creditosResult.corrupted;
      result.missing += creditosResult.missing;
      result.repaired += creditosResult.repaired;
      result.errors.push(...creditosResult.errors);

      // Verificar clientes
      const clientesResult = await this.checkClientesIntegrity(db);
      result.total += clientesResult.total;
      result.valid += clientesResult.valid;
      result.corrupted += clientesResult.corrupted;
      result.missing += clientesResult.missing;
      result.repaired += clientesResult.repaired;
      result.errors.push(...clientesResult.errors);

      console.log('✅ Verificación de integridad completada:', result);
    } catch (error) {
      console.error('❌ Verificación de integridad falló:', error);
      result.errors.push({
        recordType: 'system',
        recordId: 'integrity_check',
        error: `Verificación de integridad falló: ${error}`,
        timestamp: Date.now()
      });
    }

    return result;
  }

  /**
   * Verificar integridad de todos los pagos
   */
  private async checkPagosIntegrity(db: any): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: []
    };

    const pagos = await db.pagos.toArray();
    result.total = pagos.length;

    for (const pago of pagos) {
      try {
        if (!pago.checksum) {
          result.missing++;
          // Intentar reparar calculando checksum
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
            error: `Checksum no coincide: esperado ${verification.expected}, obtenido ${verification.actual}`,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'pago',
          recordId: pago.id,
          error: `Verificación falló: ${error}`,
          timestamp: Date.now()
        });
      }
    }

    return result;
  }

  /**
   * Verificar integridad de todos los créditos
   */
  private async checkCreditosIntegrity(db: any): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: []
    };

    const creditos = await db.creditos.toArray();
    result.total = creditos.length;

    for (const credito of creditos) {
      try {
        if (!credito.checksum) {
          result.missing++;
          // Intentar reparar calculando checksum
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
            error: `Checksum no coincide: esperado ${verification.expected}, obtenido ${verification.actual}`,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'credito',
          recordId: credito.id,
          error: `Verificación falló: ${error}`,
          timestamp: Date.now()
        });
      }
    }

    return result;
  }

  /**
   * Verificar integridad de todos los clientes
   */
  private async checkClientesIntegrity(db: any): Promise<IntegrityCheckResult> {
    const result: IntegrityCheckResult = {
      total: 0,
      valid: 0,
      corrupted: 0,
      missing: 0,
      repaired: 0,
      errors: []
    };

    const clientes = await db.clientes.toArray();
    result.total = clientes.length;

    for (const cliente of clientes) {
      try {
        if (!cliente.checksum) {
          result.missing++;
          // Intentar reparar calculando checksum
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
            error: `Checksum no coincide: esperado ${verification.expected}, obtenido ${verification.actual}`,
            timestamp: Date.now()
          });
        }
      } catch (error) {
        result.errors.push({
          recordType: 'cliente',
          recordId: cliente.id,
          error: `Verificación falló: ${error}`,
          timestamp: Date.now()
        });
      }
    }

    return result;
  }

  /**
   * Iniciar verificaciones periódicas de integridad (cada 5 minutos)
   */
  startPeriodicChecks(
    db: any,
    intervalMs: number = 5 * 60 * 1000
  ): NodeJS.Timeout {
    console.log(
      `🔍 Iniciando verificaciones periódicas de integridad cada ${intervalMs / 1000} segundos`
    );

    return setInterval(async () => {
      console.log('🔍 Ejecutando verificación periódica de integridad...');
      const result = await this.performIntegrityCheck(db);

      if (result.corrupted > 0) {
        console.warn(
          `⚠️ Se encontraron ${result.corrupted} registros corruptos`
        );
      }

      if (result.repaired > 0) {
        console.log(`✅ Se repararon ${result.repaired} registros`);
      }
    }, intervalMs);
  }

  /**
   * Detener verificaciones periódicas de integridad
   */
  stopPeriodicChecks(intervalId: NodeJS.Timeout): void {
    clearInterval(intervalId);
    console.log('🛑 Se detuvieron las verificaciones periódicas de integridad');
  }
}

// ============================================================================
// INSTANCIA SINGLETON
// ============================================================================

export const checksumService = new ChecksumService();
