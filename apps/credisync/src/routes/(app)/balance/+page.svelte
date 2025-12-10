<script>
	import { onMount } from 'svelte';
	import { getCreditosActivos } from '$lib/services/creditos.js';
	import { formatearMoneda, formatearFecha, calcularEstadoCuotas } from '$lib/utils/creditos.js';
	
	let loading = $state(true);
	let creditos = $state([]);
	let filtroEstado = $state('TODOS');
	let filtroFrecuencia = $state('TODOS');
	let creditoSeleccionado = $state(null);
	let mostrarDetalle = $state(false);
	
	// Estadísticas calculadas
	let estadisticas = $derived.by(() => {
		const stats = {
			totalCreditos: creditos.length,
			creditosActivos: creditos.filter(c => c.estado === 'ACTIVO').length,
			creditosVencidos: creditos.filter(c => c.estado === 'VENCIDO').length,
			montoTotal: creditos.reduce((sum, c) => sum + (c.total_a_pagar || 0), 0),
			saldoPendiente: creditos.reduce((sum, c) => sum + (c.saldo_pendiente || 0), 0),
			cuotasVencidas: 0,
			proximosVencimientos: 0
		};
		
		// Calcular cuotas vencidas y próximos vencimientos
		const hoy = new Date();
		const manana = new Date(hoy);
		manana.setDate(manana.getDate() + 1);
		
		creditos.forEach(credito => {
			// Simular cuotas para estadísticas
			const cuotasEjemplo = generarCuotasEjemplo(credito);
			cuotasEjemplo.forEach(cuota => {
				const fechaCuota = new Date(cuota.fecha_programada);
				if (cuota.estado !== 'PAGADA') {
					if (fechaCuota < hoy) {
						stats.cuotasVencidas++;
					} else if (fechaCuota <= manana) {
						stats.proximosVencimientos++;
					}
				}
			});
		});
		
		return stats;
	});
	
	// Créditos filtrados
	let creditosFiltrados = $derived.by(() => {
		let filtrados = [...creditos];
		
		if (filtroEstado !== 'TODOS') {
			filtrados = filtrados.filter(c => c.estado === filtroEstado);
		}
		
		if (filtroFrecuencia !== 'TODOS') {
			filtrados = filtrados.filter(c => c.frecuencia === filtroFrecuencia);
		}
		
		return filtrados;
	});
	
	onMount(async () => {
		await cargarCreditos();
	});
	
	async function cargarCreditos() {
		try {
			loading = true;
			
			// TODO: Usar @sync/core cuando esté completamente integrado
			// const creditosReales = await crediSyncApp.services.creditos.getAll();
			
			// Por ahora, usar lista vacía - el usuario creará todos los datos
			const creditosEjemplo = [];
			
			creditos = [];
			console.log('💳 [BALANCE] Créditos cargados:', creditos.length);
			
		} catch (error) {
			console.error('Error cargando créditos:', error);
		} finally {
			loading = false;
		}
	}
	
	function verDetalle(credito) {
		creditoSeleccionado = credito;
		mostrarDetalle = true;
	}
	
	function cerrarDetalle() {
		mostrarDetalle = false;
		creditoSeleccionado = null;
	}
	
	async function cambiarEstado(credito, nuevoEstado) {
		try {
			console.log('🔄 [BALANCE] Cambiando estado:', credito.numero_credito, nuevoEstado);
			
			// TODO: Implementar con @sync/core cuando esté listo
			alert(`Cambiar estado de ${credito.numero_credito} a ${nuevoEstado}\n(Funcionalidad será implementada con @sync/core)`);
			
		} catch (error) {
			console.error('Error cambiando estado:', error);
		}
	}
	
	function getEstadoClass(credito) {
		if (credito.dias_atraso > 0) return 'mora';
		if (credito.estado === 'VENCIDO') return 'vencido';
		if (credito.estado === 'PAGADO') return 'pagado';
		return 'activo';
	}
	
	function getEstadoLabel(credito) {
		if (credito.dias_atraso > 0) return `MORA (${credito.dias_atraso}d)`;
		return credito.estado;
	}
	
	// Generar cuotas de ejemplo para mostrar en detalle
	function generarCuotasEjemplo(credito) {
		const cuotas = [];
		let fechaActual = new Date(credito.fecha_primera_cuota + 'T12:00:00');
		
		for (let i = 1; i <= credito.numero_cuotas; i++) {
			const isPagada = i <= credito.cuotas_pagadas;
			const fechaFormateada = fechaActual.toISOString().split('T')[0];
			const hoy = new Date().toISOString().split('T')[0];
			const diasAtraso = !isPagada && fechaFormateada < hoy ? 
				Math.floor((new Date(hoy) - new Date(fechaFormateada)) / (1000 * 60 * 60 * 24)) : 0;
			
			cuotas.push({
				numero: i,
				fecha_programada: fechaFormateada,
				monto_programado: credito.valor_cuota,
				monto_pagado: isPagada ? credito.valor_cuota : 0,
				estado: isPagada ? 'PAGADA' : 'PENDIENTE',
				dias_atraso: diasAtraso
			});
			
			// Calcular siguiente fecha según frecuencia
			switch (credito.frecuencia) {
				case 'DIARIO':
					fechaActual.setDate(fechaActual.getDate() + 1);
					if (credito.excluir_domingos && fechaActual.getDay() === 0) {
						fechaActual.setDate(fechaActual.getDate() + 1);
					}
					break;
				case 'SEMANAL':
					fechaActual.setDate(fechaActual.getDate() + 7);
					break;
				case 'QUINCENAL':
					fechaActual.setDate(fechaActual.getDate() + 15);
					break;
				case 'MENSUAL':
					fechaActual.setMonth(fechaActual.getMonth() + 1);
					break;
			}
		}
		
		return cuotas;
	}
</script>
<div class="credit-management-page">
	{#if loading}
		<div class="loading-container">
			<div class="spinner"></div>
			<p>Cargando créditos...</p>
		</div>
	{:else}
		<!-- Header con Estadísticas -->
		<div class="stats-header">
			<h1>Gestión de Créditos</h1>
			<div class="stats-grid">
				<div class="stat-card">
					<div class="stat-value">{estadisticas.totalCreditos}</div>
					<div class="stat-label">Total Créditos</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{estadisticas.creditosActivos}</div>
					<div class="stat-label">Activos</div>
				</div>
				<div class="stat-card">
					<div class="stat-value">{formatearMoneda(estadisticas.saldoPendiente)}</div>
					<div class="stat-label">Saldo Pendiente</div>
				</div>
				<div class="stat-card alert">
					<div class="stat-value">{estadisticas.cuotasVencidas}</div>
					<div class="stat-label">Cuotas Vencidas</div>
				</div>
			</div>
		</div>
		
		<!-- Filtros -->
		<div class="filters-section">
			<div class="filters-row">
				<div class="filter-group">
					<label for="filtro-estado">Estado:</label>
					<select id="filtro-estado" bind:value={filtroEstado}>
						<option value="TODOS">Todos</option>
						<option value="ACTIVO">Activos</option>
						<option value="VENCIDO">Vencidos</option>
						<option value="PAGADO">Pagados</option>
					</select>
				</div>
				<div class="filter-group">
					<label for="filtro-frecuencia">Frecuencia:</label>
					<select id="filtro-frecuencia" bind:value={filtroFrecuencia}>
						<option value="TODOS">Todas</option>
						<option value="DIARIO">Diario</option>
						<option value="SEMANAL">Semanal</option>
						<option value="QUINCENAL">Quincenal</option>
						<option value="MENSUAL">Mensual</option>
					</select>
				</div>
			</div>
		</div>
		
		<!-- Lista de Créditos -->
		<div class="credits-section">
			{#if creditosFiltrados.length === 0}
				<div class="empty-state">
					<p>No hay créditos que coincidan con los filtros</p>
				</div>
			{:else}
				<div class="credits-list">
					{#each creditosFiltrados as credito (credito.id)}
						<div class="credit-card {getEstadoClass(credito)}">
							<div class="credit-header">
								<div class="credit-info">
									<h3>{credito.numero_credito}</h3>
									<p class="client-name">{credito.cliente_nombre}</p>
								</div>
								<div class="credit-status">
									<span class="status-badge {getEstadoClass(credito)}">
										{getEstadoLabel(credito)}
									</span>
								</div>
							</div>
							
							<div class="credit-details">
								<div class="detail-row">
									<span class="label">Monto Total:</span>
									<span class="value">{formatearMoneda(credito.total_a_pagar)}</span>
								</div>
								<div class="detail-row">
									<span class="label">Saldo Pendiente:</span>
									<span class="value">{formatearMoneda(credito.saldo_pendiente)}</span>
								</div>
								<div class="detail-row">
									<span class="label">Cuotas:</span>
									<span class="value">{credito.cuotas_pagadas}/{credito.numero_cuotas} ({credito.frecuencia})</span>
								</div>
								<div class="detail-row">
									<span class="label">Desembolso:</span>
									<span class="value">{formatearFecha(credito.fecha_desembolso)}</span>
								</div>
							</div>
							
							<div class="credit-actions">
								<button onclick={() => verDetalle(credito)} class="btn-detalle">
									Ver Detalle
								</button>
								<div class="state-actions">
									{#if credito.estado === 'ACTIVO'}
										<button onclick={() => cambiarEstado(credito, 'VENCIDO')} class="btn-estado vencido">
											Marcar Vencido
										</button>
										<button onclick={() => cambiarEstado(credito, 'PAGADO')} class="btn-estado pagado">
											Marcar Pagado
										</button>
									{:else if credito.estado === 'VENCIDO'}
										<button onclick={() => cambiarEstado(credito, 'ACTIVO')} class="btn-estado activo">
											Reactivar
										</button>
									{/if}
								</div>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
<!-- Modal de Detalle del Crédito -->
{#if mostrarDetalle && creditoSeleccionado}
	<div class="modal-backdrop" role="dialog" onclick={cerrarDetalle} onkeydown={(e) => e.key === 'Escape' && cerrarDetalle()}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>Detalle del Crédito {creditoSeleccionado.numero_credito}</h2>
				<button onclick={cerrarDetalle} class="btn-close">✕</button>
			</div>
			
			<div class="modal-body">
				<!-- Información General -->
				<div class="credit-info-section">
					<h3>Información General</h3>
					<div class="info-grid">
						<div class="info-item">
							<span class="info-label">Cliente:</span>
							<span class="info-value">{creditoSeleccionado.cliente_nombre}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Número:</span>
							<span class="info-value">{creditoSeleccionado.numero_credito}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Estado:</span>
							<span class="info-value status-badge {getEstadoClass(creditoSeleccionado)}">
								{getEstadoLabel(creditoSeleccionado)}
							</span>
						</div>
						<div class="info-item">
							<span class="info-label">Frecuencia:</span>
							<span class="info-value">{creditoSeleccionado.frecuencia}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Monto Total:</span>
							<span class="info-value">{formatearMoneda(creditoSeleccionado.total_a_pagar)}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Saldo Pendiente:</span>
							<span class="info-value">{formatearMoneda(creditoSeleccionado.saldo_pendiente)}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Valor Cuota:</span>
							<span class="info-value">{formatearMoneda(creditoSeleccionado.valor_cuota)}</span>
						</div>
						<div class="info-item">
							<span class="info-label">Progreso:</span>
							<span class="info-value">{creditoSeleccionado.cuotas_pagadas}/{creditoSeleccionado.numero_cuotas} cuotas</span>
						</div>
					</div>
				</div>
				
				<!-- Cronograma de Pagos -->
				<div class="schedule-section">
					<h3>Cronograma de Pagos</h3>
					<div class="schedule-table">
						<table>
							<thead>
								<tr>
									<th>#</th>
									<th>Fecha</th>
									<th>Monto</th>
									<th>Pagado</th>
									<th>Estado</th>
									<th>Atraso</th>
								</tr>
							</thead>
							<tbody>
								{#each generarCuotasEjemplo(creditoSeleccionado) as cuota (cuota.numero)}
									<tr class="cuota-row {cuota.estado.toLowerCase()}">
										<td>{cuota.numero}</td>
										<td>{formatearFecha(cuota.fecha_programada)}</td>
										<td>{formatearMoneda(cuota.monto_programado)}</td>
										<td>{formatearMoneda(cuota.monto_pagado)}</td>
										<td>
											<span class="cuota-estado {cuota.estado.toLowerCase()}">
												{cuota.estado}
											</span>
										</td>
										<td>
											{#if cuota.dias_atraso > 0}
												<span class="dias-atraso">{cuota.dias_atraso} días</span>
											{:else}
												-
											{/if}
										</td>
									</tr>
								{/each}
							</tbody>
						</table>
					</div>
				</div>
				
				<!-- Acciones del Crédito -->
				<div class="credit-actions-section">
					<h3>Acciones</h3>
					<div class="actions-grid">
						{#if creditoSeleccionado.estado === 'ACTIVO'}
							<button onclick={() => cambiarEstado(creditoSeleccionado, 'VENCIDO')} class="btn-action vencido">
								Marcar como Vencido
							</button>
							<button onclick={() => cambiarEstado(creditoSeleccionado, 'PAGADO')} class="btn-action pagado">
								Marcar como Pagado
							</button>
						{:else if creditoSeleccionado.estado === 'VENCIDO'}
							<button onclick={() => cambiarEstado(creditoSeleccionado, 'ACTIVO')} class="btn-action activo">
								Reactivar Crédito
							</button>
						{/if}
						<button onclick={() => alert('Funcionalidad de registrar pago próximamente')} class="btn-action pago">
							Registrar Pago
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
<style>
	.credit-management-page {
		min-height: 100vh;
		background: #f8fafc;
		padding: 1rem;
	}
	
	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 50vh;
		color: #64748b;
	}
	
	.spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #e2e8f0;
		border-top: 3px solid #4f46e5;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}
	
	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
	
	/* Header con Estadísticas */
	.stats-header {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.stats-header h1 {
		margin: 0 0 1.5rem 0;
		font-size: 1.5rem;
		color: #1e293b;
		font-weight: 700;
	}
	
	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.stat-card {
		padding: 1rem;
		background: linear-gradient(135deg, #eef2ff 0%, #f8fafc 100%);
		border: 2px solid #c7d2fe;
		border-radius: 12px;
		text-align: center;
	}
	
	.stat-card.alert {
		background: linear-gradient(135deg, #fef2f2 0%, #fff5f5 100%);
		border-color: #fca5a5;
	}
	
	.stat-value {
		font-size: 1.875rem;
		font-weight: 700;
		color: #1e293b;
		margin-bottom: 0.25rem;
	}
	
	.stat-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}
	
	/* Filtros */
	.filters-section {
		background: white;
		border-radius: 12px;
		padding: 1rem;
		margin-bottom: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.filters-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.filter-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.filter-group label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}
	
	.filter-group select {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
	}
	
	.filter-group select:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}
	
	/* Lista de Créditos */
	.credits-section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #64748b;
	}
	
	.credits-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}
	
	.credit-card {
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
	}
	
	.credit-card.activo {
		border-color: #a5d6a7;
		background: #f1f8f4;
	}
	
	.credit-card.mora {
		border-color: #ffab91;
		background: #fff8f5;
	}
	
	.credit-card.vencido {
		border-color: #ef9a9a;
		background: #fff5f5;
	}
	
	.credit-card.pagado {
		border-color: #81c784;
		background: #f1f8e9;
		opacity: 0.8;
	}
	
	.credit-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	
	.credit-info h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.125rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.client-name {
		margin: 0;
		font-size: 0.9375rem;
		color: #64748b;
	}
	
	.status-badge {
		padding: 0.375rem 0.875rem;
		border-radius: 12px;
		font-size: 0.875rem;
		font-weight: 700;
		text-transform: uppercase;
	}
	
	.status-badge.activo {
		background: #e8f5e9;
		color: #2e7d32;
	}
	
	.status-badge.mora {
		background: #fff3e0;
		color: #f57c00;
	}
	
	.status-badge.vencido {
		background: #ffebee;
		color: #c62828;
	}
	
	.status-badge.pagado {
		background: #e8f5e9;
		color: #388e3c;
	}
	
	.credit-details {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.75rem;
		margin-bottom: 1.5rem;
	}
	
	.detail-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.detail-row .label {
		font-size: 0.875rem;
		color: #64748b;
	}
	
	.detail-row .value {
		font-size: 0.875rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.credit-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}
	
	.btn-detalle {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
	}
	
	.btn-detalle:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
	}
	
	.state-actions {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}
	
	.btn-estado {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-estado.vencido {
		background: #ffebee;
		color: #c62828;
	}
	
	.btn-estado.vencido:hover {
		background: #ffcdd2;
	}
	
	.btn-estado.pagado {
		background: #e8f5e9;
		color: #2e7d32;
	}
	
	.btn-estado.pagado:hover {
		background: #c8e6c9;
	}
	
	.btn-estado.activo {
		background: #e3f2fd;
		color: #1976d2;
	}
	
	.btn-estado.activo:hover {
		background: #bbdefb;
	}
	
	/* Modal Styles */
	.modal-backdrop {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
		animation: fadeIn 0.15s ease-out;
	}
	
	.modal-content {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 900px;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
		animation: slideUp 0.15s ease-out;
	}
	
	@keyframes fadeIn {
		from { opacity: 0; }
		to { opacity: 1; }
	}
	
	@keyframes slideUp {
		from {
			transform: translateY(20px);
			opacity: 0;
		}
		to {
			transform: translateY(0);
			opacity: 1;
		}
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}
	
	.modal-header h2 {
		margin: 0;
		font-size: 1.25rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.btn-close {
		width: 32px;
		height: 32px;
		border: none;
		background: #f1f5f9;
		border-radius: 8px;
		color: #64748b;
		font-size: 1.25rem;
		cursor: pointer;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.2s;
	}
	
	.btn-close:hover {
		background: #e2e8f0;
		color: #1e293b;
	}
	
	.modal-body {
		padding: 1.5rem;
		overflow-y: auto;
		flex: 1;
	}
	
	.credit-info-section,
	.schedule-section,
	.credit-actions-section {
		margin-bottom: 2rem;
	}
	
	.credit-info-section h3,
	.schedule-section h3,
	.credit-actions-section h3 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		color: #1e293b;
		font-weight: 600;
		border-bottom: 2px solid #e5e7eb;
		padding-bottom: 0.5rem;
	}
	
	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}
	
	.info-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		background: #f8fafc;
		border-radius: 8px;
	}
	
	.info-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}
	
	.info-value {
		font-size: 0.875rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.schedule-table {
		overflow-x: auto;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
	}
	
	.schedule-table table {
		width: 100%;
		border-collapse: collapse;
		background: white;
	}
	
	.schedule-table thead {
		background: #f8fafc;
	}
	
	.schedule-table th {
		padding: 0.75rem;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 600;
		color: #64748b;
		border-bottom: 2px solid #e5e7eb;
	}
	
	.schedule-table td {
		padding: 0.75rem;
		font-size: 0.875rem;
		color: #1e293b;
		border-bottom: 1px solid #f1f5f9;
	}
	
	.cuota-row.pagada {
		background: #f0fdf4;
	}
	
	.cuota-row.pendiente {
		background: white;
	}
	
	.cuota-estado {
		padding: 0.25rem 0.5rem;
		border-radius: 6px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
	}
	
	.cuota-estado.pagada {
		background: #dcfce7;
		color: #166534;
	}
	
	.cuota-estado.pendiente {
		background: #f1f5f9;
		color: #475569;
	}
	
	.dias-atraso {
		color: #dc2626;
		font-weight: 600;
	}
	
	.actions-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}
	
	.btn-action {
		padding: 0.875rem 1.5rem;
		border: none;
		border-radius: 8px;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}
	
	.btn-action.vencido {
		background: #ffebee;
		color: #c62828;
	}
	
	.btn-action.vencido:hover {
		background: #ffcdd2;
		transform: translateY(-1px);
	}
	
	.btn-action.pagado {
		background: #e8f5e9;
		color: #2e7d32;
	}
	
	.btn-action.pagado:hover {
		background: #c8e6c9;
		transform: translateY(-1px);
	}
	
	.btn-action.activo {
		background: #e3f2fd;
		color: #1976d2;
	}
	
	.btn-action.activo:hover {
		background: #bbdefb;
		transform: translateY(-1px);
	}
	
	.btn-action.pago {
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		color: white;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
	}
	
	.btn-action.pago:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
	}
</style>