/**
 * Esquemas de validación para clientes usando Zod
 * Implementa validación en tiempo real con mensajes localizados
 */

import { z } from 'zod';

// ============================================================================
// ESQUEMAS BASE
// ============================================================================

/**
 * Esquema completo para cliente
 */
export const clienteSchema = z.object({
	// Campos obligatorios
	nombre: z
		.string()
		.min(2, 'El nombre debe tener al menos 2 caracteres')
		.max(100, 'El nombre no puede exceder 100 caracteres')
		.regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre solo puede contener letras y espacios')
		.transform(str => str.trim().replace(/\s+/g, ' ')), // Normalizar espacios
	
	numero_documento: z
		.string()
		.min(6, 'El número de documento debe tener al menos 6 caracteres')
		.max(20, 'El número de documento no puede exceder 20 caracteres')
		.regex(/^[0-9A-Za-z]+$/, 'El número de documento solo puede contener números y letras')
		.transform(str => str.trim()),
	
	telefono: z
		.string()
		.min(7, 'El teléfono debe tener al menos 7 dígitos')
		.max(15, 'El teléfono no puede exceder 15 dígitos')
		.regex(/^[0-9+\-\s()]+$/, 'El teléfono contiene caracteres inválidos')
		.transform(str => str.replace(/[\s\-()]/g, '')), // Limpiar formato
	
	direccion: z
		.string()
		.min(10, 'La dirección debe tener al menos 10 caracteres')
		.max(200, 'La dirección no puede exceder 200 caracteres')
		.transform(str => str.trim()),
	
	// Campos opcionales
	tipo_documento: z
		.enum(['CC', 'CE', 'TI', 'NIT', 'PASAPORTE', 'CURP'], {
			errorMap: () => ({ message: 'Tipo de documento inválido' })
		})
		.default('CC'),
	
	telefono_2: z
		.string()
		.min(7, 'El teléfono secundario debe tener al menos 7 dígitos')
		.max(15, 'El teléfono secundario no puede exceder 15 dígitos')
		.regex(/^[0-9+\-\s()]+$/, 'El teléfono secundario contiene caracteres inválidos')
		.transform(str => str.replace(/[\s\-()]/g, ''))
		.optional()
		.or(z.literal('')),
	
	barrio: z
		.string()
		.max(100, 'El barrio no puede exceder 100 caracteres')
		.transform(str => str.trim())
		.optional()
		.or(z.literal('')),
	
	referencia: z
		.string()
		.max(200, 'La referencia no puede exceder 200 caracteres')
		.transform(str => str.trim())
		.optional()
		.or(z.literal('')),
	
	ruta_id: z
		.string()
		.uuid('ID de ruta inválido')
		.optional(),
	
	// Campos de fiador
	nombre_fiador: z
		.string()
		.min(2, 'El nombre del fiador debe tener al menos 2 caracteres')
		.max(100, 'El nombre del fiador no puede exceder 100 caracteres')
		.regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/, 'El nombre del fiador solo puede contener letras y espacios')
		.transform(str => str.trim().replace(/\s+/g, ' '))
		.optional()
		.or(z.literal('')),
	
	telefono_fiador: z
		.string()
		.min(7, 'El teléfono del fiador debe tener al menos 7 dígitos')
		.max(15, 'El teléfono del fiador no puede exceder 15 dígitos')
		.regex(/^[0-9+\-\s()]+$/, 'El teléfono del fiador contiene caracteres inválidos')
		.transform(str => str.replace(/[\s\-()]/g, ''))
		.optional()
		.or(z.literal('')),
	
	// Coordenadas GPS
	latitud: z
		.number()
		.min(-90, 'Latitud inválida')
		.max(90, 'Latitud inválida')
		.optional(),
	
	longitud: z
		.number()
		.min(-180, 'Longitud inválida')
		.max(180, 'Longitud inválida')
		.optional()
});

// ============================================================================
// ESQUEMAS DERIVADOS
// ============================================================================

/**
 * Esquema para actualización parcial de cliente
 */
export const clienteUpdateSchema = clienteSchema.partial();

/**
 * Esquema para búsqueda de clientes
 */
export const clienteSearchSchema = z.object({
	query: z.string().max(100, 'La búsqueda no puede exceder 100 caracteres').optional(),
	estado: z.enum(['activo', 'inactivo', 'bloqueado', 'todos']).default('todos'),
	ruta_id: z.string().uuid().optional(),
	con_creditos: z.boolean().optional(),
	limit: z.number().min(1).max(1000).default(100),
	offset: z.number().min(0).default(0)
});

// ============================================================================
// FUNCIONES DE VALIDACIÓN
// ============================================================================

/**
 * Validar datos de cliente
 * @param {object} data - Datos a validar
 * @param {object} options - Opciones de validación
 * @returns {object} Resultado de validación
 */
export function validateCliente(data, options = {}) {
	try {
		const schema = options.partial ? clienteUpdateSchema : clienteSchema;
		const result = schema.safeParse(data);
		
		if (result.success) {
			return {
				success: true,
				data: result.data,
				errors: []
			};
		} else {
			return {
				success: false,
				data: null,
				errors: result.error.errors.map(err => ({
					field: err.path.join('.'),
					message: err.message,
					code: err.code
				}))
			};
		}
	} catch (error) {
		return {
			success: false,
			data: null,
			errors: [{
				field: 'general',
				message: 'Error de validación interno',
				code: 'VALIDATION_ERROR'
			}]
		};
	}
}

/**
 * Validar búsqueda de clientes
 */
export function validateClienteSearch(data) {
	try {
		const result = clienteSearchSchema.safeParse(data);
		
		if (result.success) {
			return {
				success: true,
				data: result.data,
				errors: []
			};
		} else {
			return {
				success: false,
				data: null,
				errors: result.error.errors.map(err => ({
					field: err.path.join('.'),
					message: err.message,
					code: err.code
				}))
			};
		}
	} catch (error) {
		return {
			success: false,
			data: null,
			errors: [{
				field: 'general',
				message: 'Error de validación de búsqueda',
				code: 'SEARCH_VALIDATION_ERROR'
			}]
		};
	}
}

// ============================================================================
// VALIDACIONES PERSONALIZADAS
// ============================================================================

/**
 * Validar que el número de documento sea único
 */
export async function validateUniqueDocumento(numeroDocumento, clienteId = null) {
	try {
		// Esta función se implementará cuando tengamos acceso a la base de datos
		// Por ahora, retornamos true
		return {
			valid: true,
			message: null
		};
	} catch (error) {
		return {
			valid: false,
			message: 'Error verificando unicidad del documento'
		};
	}
}

/**
 * Validar coordenadas GPS
 */
export function validateGPSCoordinates(latitud, longitud) {
	if (latitud === null || longitud === null) {
		return {
			valid: true,
			message: 'Coordenadas no proporcionadas'
		};
	}
	
	if (typeof latitud !== 'number' || typeof longitud !== 'number') {
		return {
			valid: false,
			message: 'Las coordenadas deben ser números'
		};
	}
	
	if (latitud < -90 || latitud > 90) {
		return {
			valid: false,
			message: 'Latitud debe estar entre -90 y 90'
		};
	}
	
	if (longitud < -180 || longitud > 180) {
		return {
			valid: false,
			message: 'Longitud debe estar entre -180 y 180'
		};
	}
	
	return {
		valid: true,
		message: 'Coordenadas válidas'
	};
}

// ============================================================================
// UTILIDADES DE VALIDACIÓN
// ============================================================================

/**
 * Formatear errores de validación para mostrar en UI
 */
export function formatValidationErrors(errors) {
	const formatted = {};
	
	errors.forEach(error => {
		formatted[error.field] = error.message;
	});
	
	return formatted;
}

/**
 * Verificar si hay errores en campos específicos
 */
export function hasFieldError(errors, fieldName) {
	return errors.some(error => error.field === fieldName);
}

/**
 * Obtener mensaje de error para un campo específico
 */
export function getFieldError(errors, fieldName) {
	const error = errors.find(error => error.field === fieldName);
	return error ? error.message : null;
}

// ============================================================================
// CONSTANTES DE VALIDACIÓN
// ============================================================================

export const VALIDATION_CONSTANTS = {
	NOMBRE_MIN_LENGTH: 2,
	NOMBRE_MAX_LENGTH: 100,
	DOCUMENTO_MIN_LENGTH: 6,
	DOCUMENTO_MAX_LENGTH: 20,
	TELEFONO_MIN_LENGTH: 7,
	TELEFONO_MAX_LENGTH: 15,
	DIRECCION_MIN_LENGTH: 10,
	DIRECCION_MAX_LENGTH: 200,
	BARRIO_MAX_LENGTH: 100,
	REFERENCIA_MAX_LENGTH: 200,
	
	TIPOS_DOCUMENTO: ['CC', 'CE', 'TI', 'NIT', 'PASAPORTE', 'CURP'],
	ESTADOS_CLIENTE: ['activo', 'inactivo', 'bloqueado'],
	
	REGEX_PATTERNS: {
		NOMBRE: /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/,
		DOCUMENTO: /^[0-9]+$/,
		TELEFONO: /^[0-9+\-\s()]+$/
	}
};