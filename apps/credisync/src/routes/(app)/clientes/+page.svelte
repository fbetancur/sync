<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { syncCounter, isOnline } from '$lib/stores/sync.js';
	import { formatearFecha } from '$lib/utils/creditos.js';
	import { crediSyncApp } from '$lib/app-config.js';
	
	let clientesConEstado = $state([]);
	let clientesFiltrados = $state([]);
	let searchQuery = $state('');
	let loading = $state(true);
	let error = $state('');
	let scrollPosition = $state(0);
	let debounceTimer = null;
	
	// Función para normalizar texto (quitar acentos, convertir a minúsculas)
	function normalizeText(text) {
		if (!text) return '';
		return text
			.toLowerCase()
			.normalize('NFD') // Descompone caracteres con acentos
			.replace(/[\u0300-\u036f]/g, '') // Elimina los acentos
			.replace(/[^\w\s]/g, '') // Elimina caracteres especiales excepto espacios
			.trim();
	}

	// Función para búsqueda inteligente (maneja nombres parciales)
	function matchesSearch(text, query) {
		if (!text || !query) return false;
		
		const normalizedText = normalizeText(text);
		const normalizedQuery = normalizeText(query);
		
		// Búsqueda exacta
		if (normalizedText.includes(normalizedQuery)) {
			return true;
		}
		
		// Búsqueda por palabras (útil para nombres compuestos)
		const queryWords = normalizedQuery.split(/\s+/).filter(word => word.length > 0);
		const textWords = normalizedText.split(/\s+/);
		
		// Verifica si todas las palabras de la búsqueda están en el texto
		return queryWords.every(queryWord => 
			textWords.some(textWord => textWord.includes(queryWord))
		);
	}

	// Función para filtrar clientes
	function filtrarClientes() {
		console.log('🔍 [BUSQUEDA] Filtrando con query:', searchQuery);
		console.log('🔍 [BUSQUEDA] Total clientes:', clientesConEstado.length);
		
		if (searchQuery === '') {
			clientesFiltrados = [...clientesConEstado];
			console.log('🔍 [BUSQUEDA] Query vacía, mostrando todos:', clientesFiltrados.length);
		} else {
			const filtrados = clientesConEstado.filter(c => {
				const matchNombre = matchesSearch(c.nombre, searchQuery);
				const matchDocumento = matchesSearch(c.numero_documento, searchQuery);
				const matchTelefono = matchesSearch(c.telefono, searchQuery);
				
				console.log('🔍 [BUSQUEDA] Verificando cliente:', c.nombre, {
					query: searchQuery,
					matchNombre,
					matchDocumento,
					matchTelefono
				});
				
				return matchNombre || matchDocumento || matchTelefono;
			});
			
			clientesFiltrados = [...filtrados];
			console.log('🔍 [BUSQUEDA] Filtrados encontrados:', clientesFiltrados.length);
		}
	}

	// Filtrar clientes con debounce
	$effect(() => {
		console.log('🔍 [BUSQUEDA] Effect ejecutado, searchQuery:', searchQuery);
		clearTimeout(debounceTimer);
		debounceTimer = setTimeout(filtrarClientes, 200);
	});
	
	// Guardar y restaurar posición de scroll cuando sincroniza
	let lastSyncCount = $state(0);
	$effect(() => {
		if ($syncCounter !== lastSyncCount && !loading) {
			console.log('🔄 [CLIENTES-UI] syncCounter cambió, recargando clientes...', {
				anterior: lastSyncCount,
				nuevo: $syncCounter
			});
			// Guardar posición actual antes de recargar
			scrollPosition = window.scrollY;
			lastSyncCount = $syncCounter;
			cargarClientes();
		}
	});
	
	onMount(async () => {
		await cargarClientes();
		
		// Sincronizar si está online (sin bloquear)
		if ($isOnline) {
			setTimeout(() => {
				// Aquí se llamaría a la sincronización con @sync/core
				console.log('🔄 [CLIENTES] Sincronización automática (pendiente implementación @sync/core)');
			}, 100);
		}
		
		return () => {};
	});
	
	async function cargarClientes() {
		try {
			loading = true;
			error = '';
			
			console.log('📋 [CLIENTES-UI] Cargando clientes...');
			
			// Por ahora, crear datos de ejemplo hasta que @sync/core esté completamente integrado
			// En las próximas fases esto usará crediSyncApp.services.clientes.getAll()
			const clientesEjemplo = [
				{
					id: '1',
					nombre: 'María González Pérez',
					telefono: '555-0123',
					numero_documento: '12345678',
					creditos_activos: 2,
					saldo_total: 1500,
					dias_atraso_max: 5,
					estado: 'EN_MORA',
					score: 'RIESGOSO',
					updated_at: new Date().toISOString(),
					creditosActivos: 2,
					saldoTotal: 1500,
					diasAtraso: 5,
					proximoPago: {
						monto: 250,
						fecha: '2024-12-15'
					}
				},
				{
					id: '2',
					nombre: 'Carlos Rodríguez',
					telefono: '555-0456',
					numero_documento: '87654321',
					creditos_activos: 1,
					saldo_total: 500,
					dias_atraso_max: 0,
					estado: 'AL_DIA',
					score: 'CONFIABLE',
					updated_at: new Date().toISOString(),
					creditosActivos: 1,
					saldoTotal: 500,
					diasAtraso: 0,
					proximoPago: {
						monto: 125,
						fecha: '2024-12-12'
					}
				},
				{
					id: '3',
					nombre: 'Ana Martínez Hernández',
					telefono: '555-0789',
					numero_documento: '11223344',
					creditos_activos: 1,
					saldo_total: 1200,
					dias_atraso_max: 2,
					estado: 'EN_MORA',
					score: 'REGULAR',
					updated_at: new Date().toISOString(),
					creditosActivos: 1,
					saldoTotal: 1200,
					diasAtraso: 2,
					proximoPago: null
				},
				{
					id: '4',
					nombre: 'Luis Hernández',
					telefono: '555-0321',
					numero_documento: '55667788',
					creditos_activos: 0,
					saldo_total: 0,
					dias_atraso_max: 0,
					estado: 'SIN_CREDITOS',
					score: 'REGULAR',
					updated_at: new Date().toISOString(),
					creditosActivos: 0,
					saldoTotal: 0,
					diasAtraso: 0,
					proximoPago: null
				},
				{
					id: '5',
					nombre: 'Patricia López Sánchez',
					telefono: '555-0654',
					numero_documento: '99887766',
					creditos_activos: 3,
					saldo_total: 2800,
					dias_atraso_max: 0,
					estado: 'AL_DIA',
					score: 'CONFIABLE',
					updated_at: new Date().toISOString(),
					creditosActivos: 3,
					saldoTotal: 2800,
					diasAtraso: 0,
					proximoPago: {
						monto: 350,
						fecha: '2024-12-11'
					}
				},
				{
					id: '6',
					nombre: 'José Ángel Ramírez',
					telefono: '555-0987',
					numero_documento: '44556677',
					creditos_activos: 1,
					saldo_total: 800,
					dias_atraso_max: 0,
					estado: 'AL_DIA',
					score: 'CONFIABLE',
					updated_at: new Date().toISOString(),
					creditosActivos: 1,
					saldoTotal: 800,
					diasAtraso: 0,
					proximoPago: {
						monto: 200,
						fecha: '2024-12-13'
					}
				}
			];
			
			console.log(`📋 [CLIENTES-UI] ${clientesEjemplo.length} clientes cargados`);
			
			// Forzar actualización reactiva creando nuevo array
			clientesConEstado = [...clientesEjemplo];
			
			// Inicializar filtrados siempre con todos los clientes
			clientesFiltrados = [...clientesConEstado];
			
			console.log('📋 [CLIENTES] Datos cargados:', {
				total: clientesConEstado.length,
				filtrados: clientesFiltrados.length,
				searchQuery: searchQuery
			});
			
		} catch (err) {
			error = 'Error al cargar clientes';
			console.error('Error cargando clientes:', err);
			clientesConEstado = [];
		} finally {
			loading = false;
			
			// Restaurar posición de scroll después de cargar
			if (scrollPosition > 0) {
				setTimeout(() => {
					window.scrollTo(0, scrollPosition);
				}, 50);
			}
		}
	}
	
	function crearCliente() {
		goto('/clientes/nuevo');
	}
	
	function verDetalle(clienteId) {
		goto(`/clientes/${clienteId}`);
	}
</script>

<div class="clientes-page">
	<!-- Barra de búsqueda fija -->
	<div class="search-container">
		<div class="search-bar">
			<svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input
				type="text"
				bind:value={searchQuery}
				placeholder="Buscar cliente..."
				class="search-input"
			/>
		</div>
		<button onclick={crearCliente} class="add-btn" title="Nuevo cliente">
			<svg class="add-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
			</svg>
		</button>
	</div>
	
	{#if error}
		<div class="error-message">
			⚠️ {error}
		</div>
	{/if}
	
	<div class="clientes-list">
		{#if loading}
			<p class="empty-state">Cargando clientes...</p>
		{:else if clientesFiltrados.length === 0}
			<p class="empty-state">
				{searchQuery ? 'No se encontraron clientes' : 'No hay clientes registrados'}
			</p>
		{:else}
			{#each clientesFiltrados as cliente (cliente.id + '-' + cliente.updated_at)}
				<div class="cliente-card {cliente.estado?.toLowerCase().replace('_', '-') || 'sin-creditos'}" onclick={() => verDetalle(cliente.id)}>
					<div class="cliente-header">
						<div class="cliente-nombre-estado">
							<h3>{cliente.nombre}</h3>
							<span class="badge {cliente.estado?.toLowerCase().replace('_', '-') || 'sin-creditos'}">
								{#if cliente.estado === 'MORA' || cliente.estado === 'EN_MORA'}
									🔴 Mora
								{:else if cliente.estado === 'AL_DIA'}
									🟢 Al día
								{:else}
									⚪ Sin créditos
								{/if}
							</span>
						</div>
						<p class="saldo">${cliente.saldoTotal?.toFixed(2) || '0.00'}</p>
					</div>
					
					<div class="cliente-detalles">
						<div class="detalle-row">
							<span class="detalle-icon">📞</span>
							<span class="detalle-text">{cliente.telefono}</span>
						</div>
						
						{#if cliente.creditosActivos > 0}
							<div class="detalle-row">
								<span class="detalle-icon">💳</span>
								<span class="detalle-text">{cliente.creditosActivos} crédito{cliente.creditosActivos > 1 ? 's' : ''} activo{cliente.creditosActivos > 1 ? 's' : ''}</span>
							</div>
						{/if}
						
						{#if cliente.diasAtraso > 0}
							<div class="detalle-row alerta">
								<span class="detalle-icon">⚠️</span>
								<span class="detalle-text">{cliente.diasAtraso} día{cliente.diasAtraso > 1 ? 's' : ''} de atraso</span>
							</div>
						{:else if cliente.proximoPago}
							<div class="detalle-row">
								<span class="detalle-icon">📅</span>
								<span class="detalle-text">Próximo pago: ${cliente.proximoPago.monto.toFixed(2)} el {formatearFecha(cliente.proximoPago.fecha)}</span>
							</div>
						{/if}
					</div>
				</div>
			{/each}
			
			<!-- Nota sobre datos de ejemplo -->
			<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-6">
				<p class="text-sm text-yellow-800">
					<strong>Nota:</strong> Estos son datos de ejemplo para demostrar la funcionalidad de la lista de clientes. 
					En las próximas fases se integrará completamente con @sync/core para datos reales.
				</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.clientes-page {
		min-height: 100%;
		background: #f8fafc;
	}
	
	/* Barra de búsqueda fija - Azul del login */
	.search-container {
		position: sticky;
		top: 0;
		z-index: 10;
		display: flex;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		background: linear-gradient(180deg, #eef2ff 0%, #ffffff 100%);
		border-bottom: 1px solid #c7d2fe;
		box-shadow: 0 2px 6px rgba(79, 70, 229, 0.1);
	}
	
	.search-bar {
		flex: 1;
		position: relative;
		display: flex;
		align-items: center;
	}
	
	.search-icon {
		position: absolute;
		left: 0.875rem;
		width: 18px;
		height: 18px;
		color: #9ca3af;
		pointer-events: none;
	}
	
	.search-input {
		width: 100%;
		padding: 0.75rem 0.875rem 0.75rem 2.75rem;
		border: 1px solid #d1d5db;
		border-radius: 10px;
		font-size: 0.9375rem;
		background: white;
		transition: all 0.2s;
	}
	
	.search-input:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}
	
	.add-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 44px;
		height: 44px;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 50%, #4338ca 100%);
		border: none;
		border-radius: 12px;
		color: white;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
		flex-shrink: 0;
	}
	
	.add-btn:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);
	}
	
	.add-btn:active {
		transform: translateY(0);
	}
	
	.add-icon {
		width: 22px;
		height: 22px;
		stroke-width: 2.5;
	}
	
	.clientes-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		padding: 1rem;
	}
	
	.cliente-card {
		padding: 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-left: 4px solid #e5e7eb;
		border-radius: 12px;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
	}
	
	.cliente-card.en-mora {
		border-left-color: #dc2626;
		background: #fef2f2;
	}
	
	.cliente-card.al-dia {
		border-left-color: #16a34a;
		background: #f0fdf4;
	}
	
	.cliente-card.sin-creditos {
		border-left-color: #9ca3af;
		background: white;
	}
	
	.cliente-card:hover {
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.15);
		transform: translateY(-2px);
		border-color: #c7d2fe;
	}
	
	.cliente-card:active {
		transform: translateY(0);
	}
	
	.cliente-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.75rem;
		gap: 1rem;
	}
	
	.cliente-nombre-estado {
		flex: 1;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.cliente-nombre-estado h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 700;
		color: #1e293b;
		line-height: 1.3;
	}
	
	.badge {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 700;
		width: fit-content;
	}
	
	.badge.al-dia {
		background: #dcfce7;
		color: #166534;
	}
	
	.badge.en-mora {
		background: #fee2e2;
		color: #991b1b;
	}
	
	.badge.sin-creditos {
		background: #f1f5f9;
		color: #64748b;
	}
	
	.cliente-detalles {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.detalle-row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: #64748b;
	}
	
	.detalle-row.alerta {
		color: #dc2626;
		font-weight: 600;
	}
	
	.detalle-icon {
		font-size: 1rem;
		flex-shrink: 0;
	}
	
	.detalle-text {
		line-height: 1.4;
	}
	
	.error-message {
		padding: 0.75rem 1rem;
		background: #fef2f2;
		color: #dc2626;
		border-radius: 8px;
		margin: 0 1rem 1rem 1rem;
		border: 1px solid #fecaca;
	}
	
	.saldo {
		margin-top: 0.5rem;
		font-size: 1.2rem;
		font-weight: 600;
		color: #1976d2;
	}
	
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #999;
	}
	
	.btn-primary {
		padding: 0.75rem 1.5rem;
		background: #1976d2;
		color: white;
		border: none;
		border-radius: 8px;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}
	
	.btn-primary:hover {
		background: #1565c0;
	}
</style>