/**
 * Utilidades para cálculos de créditos usando @sync/core
 * Adaptado para la arquitectura del monorepo
 */

/**
 * Formatear moneda
 */
export function formatearMoneda(valor) {
	return new Intl.NumberFormat('es-MX', {
		style: 'currency',
		currency: 'MXN'
	}).format(valor || 0);
}

/**
 * Formatear fecha con día de la semana
 */
export function formatearFecha(fecha) {
	return new Date(fecha + 'T12:00:00').toLocaleDateString('es-MX', {
		weekday: 'short',
		year: 'numeric',
		month: 'short',
		day: 'numeric'
	});
}

/**
 * Calcular saldo pendiente del crédito
 */
export function calcularSaldoPendiente(credito, pagos) {
	const totalPagado = pagos.reduce((sum, p) => sum + parseFloat(p.monto), 0);
	return parseFloat(credito.total_a_pagar) - totalPagado;
}

/**
 * Calcular días de atraso del crédito
 */
export function calcularDiasAtraso(credito, pagos) {
	// Esta función será implementada usando @sync/core en las próximas fases
	// Por ahora retorna 0 para evitar errores
	return 0;
}

/**
 * Calcular estado del crédito (AL_DIA o MORA)
 */
export function calcularEstadoCredito(credito, pagos) {
	const diasAtraso = calcularDiasAtraso(credito, pagos);
	return diasAtraso > 0 ? 'MORA' : 'AL_DIA';
}