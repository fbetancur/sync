/**
 * Servicio de clientes refactorizado usando EntityService de @sync/core
 * Implementa el patrón de herencia para reutilizar funcionalidad común
 */

import { EntityService, ContextService, PhoneService } from '@sync/core';
import type { 
  ValidationResult, 
  EntityBase, 
  EntityServiceConfig 
} from '@sync/core';
import { crediSyncApp } from '$lib/app-config.js';
// ============================================================================
// TIPOS Y ESQUEMAS
// ============================================================================

export interface Cliente extends EntityBase {
  nombre: string;
  numero_documento: string;
  telefono: string;
  direccion: string;
  email?: string;
  fecha_nacimiento?: string;
  
  // Campos calculados
  creditos_activos: number;
  saldo_total: number;
  dias_atraso_max: number;
  estado: 'activo' | 'inactivo' | 'bloqueado';
  score?: number;
  
  // Campos de ubicación
  pais?: string;
  ciudad?: string;
  coordenadas?: {
    latitude: number;
    longitude: number;
  };
}

// ============================================================================
// SERVICIO DE CLIENTES
// ============================================================================

/**
 * Servicio de clientes que hereda de EntityService
 * Proporciona funcionalidad específica de clientes sobre la base común
 */
class ClienteService extends EntityService<Cliente> {
  protected config: EntityServiceConfig = {
    tableName: 'clientes',
    syncPriority: 3, // Prioridad media para clientes
    enableAudit: true,
    enableSync: true,
    enableCRDT: true
  };

  private phoneService: PhoneService;

  constructor(syncApp: any, contextService: ContextService) {
    super(syncApp, contextService);
    this.phoneService = PhoneService.getInstance();
  }

  /**
   * Validar datos del cliente - Validación simple sin Zod
   */
  protected validateData(data: Partial<Cliente>): ValidationResult<Cliente> {
    try {
      console.log('🔍 [CLIENTE] Validando datos con validación simple...');
      
      // Validación simple de campos requeridos
      if (!data.nombre || data.nombre.trim().length < 2) {
        return {
          success: false,
          error: 'El nombre es requerido y debe tener al menos 2 caracteres'
        };
      }

      if (!data.numero_documento || data.numero_documento.trim().length < 5) {
        return {
          success: false,
          error: 'El número de documento es requerido y debe tener al menos 5 caracteres'
        };
      }

      if (!data.telefono || data.telefono.trim().length < 7) {
        return {
          success: false,
          error: 'El teléfono es requerido y debe tener al menos 7 dígitos'
        };
      }

      if (!data.direccion || data.direccion.trim().length < 5) {
        return {
          success: false,
          error: 'La dirección es requerida y debe tener al menos 5 caracteres'
        };
      }

      // Validación adicional de teléfono si hay país
      let telefonoFormateado = data.telefono.trim();
      if (data.telefono && data.pais) {
        const phoneValidation = this.phoneService.validatePhone(data.telefono, data.pais);
        if (!phoneValidation.valid) {
          return {
            success: false,
            error: `Teléfono inválido: ${phoneValidation.error}`
          };
        }
        telefonoFormateado = phoneValidation.formatted!;
      }

      console.log('✅ [CLIENTE] Validación exitosa');
      
      // Preparar datos limpios
      const cleanData: Cliente = {
        nombre: data.nombre.trim(),
        numero_documento: data.numero_documento.trim(),
        telefono: telefonoFormateado,
        direccion: data.direccion.trim(),
        email: data.email?.trim() || '',
        fecha_nacimiento: data.fecha_nacimiento?.trim() || '',
        pais: data.pais || 'MX',
        ciudad: data.ciudad?.trim() || '',
        coordenadas: data.coordenadas || undefined,
        
        // Campos calculados iniciales
        creditos_activos: 0,
        saldo_total: 0,
        dias_atraso_max: 0,
        estado: 'activo' as const
      } as Cliente;
      
      return {
        success: true,
        data: cleanData
      };

    } catch (error: any) {
      console.error('❌ [CLIENTE] Error en validación:', error);
      return {
        success: false,
        error: `Error de validación: ${error.message}`
      };
    }
  }

  /**
   * Enriquecer clientes para la UI
   */
  protected async enrichForUI(clientes: Cliente[]): Promise<Cliente[]> {
    try {
      console.log(`🎨 [CLIENTE] Enriqueciendo ${clientes.length} clientes para UI...`);

      return clientes.map(cliente => ({
        ...cliente,
        // Campos calculados para compatibilidad con UI existente
        saldoTotal: cliente.saldo_total || 0,
        creditosActivos: cliente.creditos_activos || 0,
        diasAtraso: cliente.dias_atraso_max || 0,
        proximoPago: null, // Se calculará cuando se implemente módulo de créditos
        
        // Formatear teléfono para mostrar
        telefonoFormateado: cliente.pais 
          ? this.phoneService.formatPhone(cliente.telefono, cliente.pais)
          : cliente.telefono,
        
        // URLs de contacto
        whatsappUrl: cliente.pais 
          ? this.phoneService.generateWhatsAppURL(cliente.telefono, cliente.pais, 'Hola, me comunico desde CrediSync')
          : null,
        
        callUrl: cliente.pais 
          ? this.phoneService.generateCallURL(cliente.telefono, cliente.pais)
          : `tel:${cliente.telefono}`
      }));

    } catch (error) {
      console.error('❌ [CLIENTE] Error enriqueciendo para UI:', error);
      return clientes;
    }
  }

  /**
   * Crear cliente con detección automática de país
   */
  async createWithAutoCountry(clienteData: Partial<Cliente>) {
    try {
      console.log('🌍 [CLIENTE] Creando cliente con detección automática de país...');

      // Detectar país automáticamente si no se proporciona
      if (!clienteData.pais) {
        const countryDetection = await this.phoneService.detectCountry();
        clienteData.pais = countryDetection.country;
        
        console.log(`🌍 [CLIENTE] País detectado: ${countryDetection.country} (${countryDetection.method})`);
      }

      // Capturar coordenadas si están disponibles
      const context = await this.contextService.captureFullContext();
      if (context.location.location) {
        clienteData.coordenadas = {
          latitude: context.location.location.latitude,
          longitude: context.location.location.longitude
        };
        
        console.log('📍 [CLIENTE] Coordenadas capturadas para el cliente');
      }

      return await this.create(clienteData);

    } catch (error) {
      console.error('❌ [CLIENTE] Error creando cliente con auto-país:', error);
      throw error;
    }
  }

  /**
   * Buscar clientes por texto
   */
  async searchClientes(query: string): Promise<Cliente[]> {
    try {
      console.log(`🔍 [CLIENTE] Buscando clientes: "${query}"`);

      if (!this.syncApp.isStarted) {
        await this.syncApp.start();
      }

      const context = await this.contextService.captureFullContext();
      const tenantId = context.user?.tenant_id || '00000000-0000-0000-0000-000000000001';

      const searchTerm = query.toLowerCase().trim();
      
      const clientes = await this.syncApp.services.db.clientes
        .where('tenant_id')
        .equals(tenantId)
        .filter((cliente: Cliente) => {
          return (
            cliente.nombre.toLowerCase().includes(searchTerm) ||
            cliente.numero_documento.toLowerCase().includes(searchTerm) ||
            cliente.telefono.includes(searchTerm) ||
            cliente.direccion.toLowerCase().includes(searchTerm) ||
            (cliente.email && cliente.email.toLowerCase().includes(searchTerm))
          );
        })
        .toArray();

      console.log(`✅ [CLIENTE] ${clientes.length} clientes encontrados`);
      
      return await this.enrichForUI(clientes);

    } catch (error) {
      console.error('❌ [CLIENTE] Error buscando clientes:', error);
      return [];
    }
  }

  /**
   * Obtener estadísticas de clientes
   */
  async getStats() {
    try {
      console.log('📊 [CLIENTE] Calculando estadísticas...');

      const clientes = await this.getAll();

      const stats = {
        total: clientes.length,
        activos: clientes.filter(c => c.estado === 'activo').length,
        inactivos: clientes.filter(c => c.estado === 'inactivo').length,
        bloqueados: clientes.filter(c => c.estado === 'bloqueado').length,
        con_creditos: clientes.filter(c => c.creditos_activos > 0).length,
        sin_creditos: clientes.filter(c => c.creditos_activos === 0).length,
        en_mora: clientes.filter(c => c.dias_atraso_max > 0).length,
        saldo_total: clientes.reduce((sum, c) => sum + (c.saldo_total || 0), 0),
        synced: clientes.filter(c => c.synced).length,
        pending_sync: clientes.filter(c => !c.synced).length,
        
        // Estadísticas por país
        por_pais: clientes.reduce((acc, cliente) => {
          const pais = cliente.pais || 'Sin especificar';
          acc[pais] = (acc[pais] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      };

      console.log('✅ [CLIENTE] Estadísticas calculadas:', stats);
      return stats;

    } catch (error) {
      console.error('❌ [CLIENTE] Error calculando estadísticas:', error);
      return null;
    }
  }

  /**
   * Actualizar estado de cliente
   */
  async updateEstado(id: string, nuevoEstado: 'activo' | 'inactivo' | 'bloqueado') {
    try {
      console.log(`👤 [CLIENTE] Actualizando estado de ${id} a ${nuevoEstado}...`);

      return await this.update(id, { estado: nuevoEstado });

    } catch (error) {
      console.error(`❌ [CLIENTE] Error actualizando estado de ${id}:`, error);
      throw error;
    }
  }

  /**
   * Generar reporte de clientes
   */
  async generateReport() {
    try {
      console.log('📋 [CLIENTE] Generando reporte...');

      const clientes = await this.getAll();
      const stats = await this.getStats();

      const report = {
        fecha_generacion: new Date().toISOString(),
        resumen: stats,
        clientes: clientes.map(cliente => ({
          id: cliente.id,
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          estado: cliente.estado,
          creditos_activos: cliente.creditos_activos,
          saldo_total: cliente.saldo_total,
          dias_atraso: cliente.dias_atraso_max,
          pais: cliente.pais,
          created_at: new Date(cliente.created_at).toLocaleDateString(),
          synced: cliente.synced
        }))
      };

      console.log('✅ [CLIENTE] Reporte generado');
      return report;

    } catch (error) {
      console.error('❌ [CLIENTE] Error generando reporte:', error);
      throw error;
    }
  }
}

// ============================================================================
// INSTANCIA Y EXPORTACIONES
// ============================================================================

// Crear instancia del servicio
const contextService = new ContextService();
export const clienteService = new ClienteService(crediSyncApp, contextService);

// Exportar funciones para compatibilidad con código existente
export const createCliente = (data: Partial<Cliente>) => clienteService.create(data);
export const createClienteWithAutoCountry = (data: Partial<Cliente>) => clienteService.createWithAutoCountry(data);
export const getClientes = () => clienteService.getAll();
export const getClienteById = (id: string) => clienteService.getById(id);
export const updateCliente = (id: string, updates: Partial<Cliente>) => clienteService.update(id, updates);
export const updateClienteEstado = (id: string, estado: 'activo' | 'inactivo' | 'bloqueado') => clienteService.updateEstado(id, estado);
export const deleteCliente = (id: string) => clienteService.delete(id);
export const searchClientes = (query: string) => clienteService.searchClientes(query);
export const getClientesStats = () => clienteService.getStats();
export const generateClientesReport = () => clienteService.generateReport();

// Exportar tipo para uso avanzado
export type { Cliente };