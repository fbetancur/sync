<script>
	import { onMount } from 'svelte';
	import { getProductos } from '$lib/services/productos.js';
	import { formatearMoneda } from '$lib/utils/creditos.js';
	
	let productos = $state([]);
	let loading = $state(true);
	let modalNuevoProducto = $state(false);
	let productoEditando = $state(null);
	
	// Formulario para nuevo/editar producto
	let formData = $state({
		nombre: '',
		descripcion: '',
		interes_porcentaje: '',
		numero_cuotas: '',
		frecuencia: 'DIARIO',
		monto_minimo: '',
		monto_maximo: '',
		excluir_domingos: false,
		activo: true
	});
	
	onMount(async () => {
		await cargarProductos();
	});
	
	async function cargarProductos() {
		try {
			loading = true;
			productos = await getProductos();
			console.log('📦 [CONFIG] Productos cargados:', productos.length);
		} catch (error) {
			console.error('Error cargando productos:', error);
		} finally {
			loading = false;
		}
	}
	
	function nuevoProducto() {
		productoEditando = null;
		formData = {
			nombre: '',
			descripcion: '',
			interes_porcentaje: '',
			numero_cuotas: '',
			frecuencia: 'DIARIO',
			monto_minimo: '',
			monto_maximo: '',
			excluir_domingos: false,
			activo: true
		};
		modalNuevoProducto = true;
	}
	
	function editarProducto(producto) {
		productoEditando = producto;
		formData = {
			nombre: producto.nombre,
			descripcion: producto.descripcion || '',
			interes_porcentaje: producto.interes_porcentaje.toString(),
			numero_cuotas: producto.numero_cuotas.toString(),
			frecuencia: producto.frecuencia,
			monto_minimo: producto.monto_minimo.toString(),
			monto_maximo: producto.monto_maximo.toString(),
			excluir_domingos: producto.excluir_domingos || false,
			activo: producto.activo
		};
		modalNuevoProducto = true;
	}
	
	async function guardarProducto() {
		try {
			console.log('💾 [CONFIG] Guardando producto:', formData);
			
			// TODO: Implementar con @sync/core cuando esté listo
			// Por ahora solo simular
			alert('Funcionalidad de guardar producto será implementada con @sync/core');
			
			modalNuevoProducto = false;
			await cargarProductos();
		} catch (error) {
			console.error('Error guardando producto:', error);
			alert('Error al guardar producto');
		}
	}
	
	async function toggleActivo(producto) {
		try {
			console.log('🔄 [CONFIG] Cambiando estado:', producto.id, !producto.activo);
			
			// TODO: Implementar con @sync/core cuando esté listo
			alert('Funcionalidad de cambiar estado será implementada con @sync/core');
			
		} catch (error) {
			console.error('Error cambiando estado:', error);
		}
	}
	
	function cancelar() {
		modalNuevoProducto = false;
		productoEditando = null;
	}
	
	function getFrecuenciaLabel(frecuencia) {
		const labels = {
			'DIARIO': 'Diario',
			'SEMANAL': 'Semanal', 
			'QUINCENAL': 'Quincenal',
			'MENSUAL': 'Mensual'
		};
		return labels[frecuencia] || frecuencia;
	}
</script>
<div class="configuracion-page">
	<!-- Header -->
	<div class="header">
		<h1>Configuración</h1>
		<button onclick={nuevoProducto} class="btn-nuevo">
			+ Nuevo Producto
		</button>
	</div>
	
	<!-- Productos de Crédito -->
	<div class="section">
		<h2>Productos de Crédito</h2>
		
		{#if loading}
			<div class="loading">
				<div class="spinner"></div>
				<p>Cargando productos...</p>
			</div>
		{:else if productos.length === 0}
			<div class="empty-state">
				<p>No hay productos configurados</p>
				<button onclick={nuevoProducto} class="btn-primario">
					Crear Primer Producto
				</button>
			</div>
		{:else}
			<div class="productos-grid">
				{#each productos as producto (producto.id)}
					<div class="producto-card {producto.activo ? 'activo' : 'inactivo'}">
						<div class="producto-header">
							<h3>{producto.nombre}</h3>
							<div class="producto-estado">
								<label class="switch">
									<input 
										type="checkbox" 
										checked={producto.activo}
										onchange={() => toggleActivo(producto)}
									/>
									<span class="slider"></span>
								</label>
								<span class="estado-label">
									{producto.activo ? 'Activo' : 'Inactivo'}
								</span>
							</div>
						</div>
						
						{#if producto.descripcion}
							<p class="producto-descripcion">{producto.descripcion}</p>
						{/if}
						
						<div class="producto-detalles">
							<div class="detalle-row">
								<span class="label">Interés:</span>
								<span class="value">{producto.interes_porcentaje}%</span>
							</div>
							<div class="detalle-row">
								<span class="label">Cuotas:</span>
								<span class="value">{producto.numero_cuotas} {getFrecuenciaLabel(producto.frecuencia).toLowerCase()}</span>
							</div>
							<div class="detalle-row">
								<span class="label">Rango:</span>
								<span class="value">
									{formatearMoneda(producto.monto_minimo)} - {formatearMoneda(producto.monto_maximo)}
								</span>
							</div>
							{#if producto.frecuencia === 'DIARIO' && producto.excluir_domingos}
								<div class="detalle-row">
									<span class="label">Domingos:</span>
									<span class="value">Excluidos</span>
								</div>
							{/if}
						</div>
						
						<div class="producto-acciones">
							<button onclick={() => editarProducto(producto)} class="btn-editar">
								Editar
							</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>

<!-- Modal Nuevo/Editar Producto -->
{#if modalNuevoProducto}
	<div class="modal-backdrop" role="dialog" onclick={cancelar} onkeydown={(e) => e.key === 'Escape' && cancelar()}>
		<div class="modal-content" onclick={(e) => e.stopPropagation()}>
			<div class="modal-header">
				<h2>{productoEditando ? 'Editar Producto' : 'Nuevo Producto'}</h2>
				<button onclick={cancelar} class="btn-close">✕</button>
			</div>
			
			<div class="modal-body">
				<form onsubmit={(e) => { e.preventDefault(); guardarProducto(); }}>
					<div class="form-grid">
						<div class="form-group span-2">
							<label for="nombre">Nombre del Producto</label>
							<input 
								id="nombre"
								type="text" 
								bind:value={formData.nombre}
								placeholder="Ej: Crédito Diario Express"
								required
							/>
						</div>
						
						<div class="form-group span-2">
							<label for="descripcion">Descripción (Opcional)</label>
							<textarea 
								id="descripcion"
								bind:value={formData.descripcion}
								placeholder="Descripción del producto..."
								rows="2"
							></textarea>
						</div>
						
						<div class="form-group">
							<label for="interes">Interés (%)</label>
							<input 
								id="interes"
								type="number" 
								bind:value={formData.interes_porcentaje}
								placeholder="20"
								min="0"
								max="100"
								step="0.1"
								required
							/>
						</div>
						
						<div class="form-group">
							<label for="cuotas">Número de Cuotas</label>
							<input 
								id="cuotas"
								type="number" 
								bind:value={formData.numero_cuotas}
								placeholder="20"
								min="1"
								max="100"
								required
							/>
						</div>
						
						<div class="form-group">
							<label for="frecuencia">Frecuencia</label>
							<select id="frecuencia" bind:value={formData.frecuencia} required>
								<option value="DIARIO">Diario</option>
								<option value="SEMANAL">Semanal</option>
								<option value="QUINCENAL">Quincenal</option>
								<option value="MENSUAL">Mensual</option>
							</select>
						</div>
						
						{#if formData.frecuencia === 'DIARIO'}
							<div class="form-group">
								<label class="checkbox-label">
									<input 
										type="checkbox" 
										bind:checked={formData.excluir_domingos}
									/>
									Excluir domingos
								</label>
							</div>
						{/if}
						
						<div class="form-group">
							<label for="monto_min">Monto Mínimo</label>
							<input 
								id="monto_min"
								type="number" 
								bind:value={formData.monto_minimo}
								placeholder="500"
								min="0"
								step="100"
								required
							/>
						</div>
						
						<div class="form-group">
							<label for="monto_max">Monto Máximo</label>
							<input 
								id="monto_max"
								type="number" 
								bind:value={formData.monto_maximo}
								placeholder="5000"
								min="0"
								step="100"
								required
							/>
						</div>
					</div>
					
					<div class="form-actions">
						<button type="button" onclick={cancelar} class="btn-cancelar">
							Cancelar
						</button>
						<button type="submit" class="btn-guardar">
							{productoEditando ? 'Actualizar' : 'Crear'} Producto
						</button>
					</div>
				</form>
			</div>
		</div>
	</div>
{/if}
<style>
	.configuracion-page {
		min-height: 100vh;
		background: #f8fafc;
		padding: 1rem;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
		padding: 0 0.5rem;
	}
	
	.header h1 {
		margin: 0;
		font-size: 1.5rem;
		color: #1e293b;
		font-weight: 700;
	}
	
	.btn-nuevo {
		padding: 0.75rem 1.5rem;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
	}
	
	.btn-nuevo:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
	}
	
	.section {
		background: white;
		border-radius: 12px;
		padding: 1.5rem;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}
	
	.section h2 {
		margin: 0 0 1.5rem 0;
		font-size: 1.25rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.loading {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 3rem;
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
	
	.empty-state {
		text-align: center;
		padding: 3rem;
		color: #64748b;
	}
	
	.empty-state p {
		margin-bottom: 1.5rem;
		font-size: 1.125rem;
	}
	
	.btn-primario {
		padding: 0.875rem 1.5rem;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-primario:hover {
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
	}
	
	.productos-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
		gap: 1.5rem;
	}
	
	.producto-card {
		border: 2px solid #e5e7eb;
		border-radius: 12px;
		padding: 1.5rem;
		transition: all 0.2s;
	}
	
	.producto-card.activo {
		border-color: #a5d6a7;
		background: #f1f8f4;
	}
	
	.producto-card.inactivo {
		border-color: #ffcdd2;
		background: #fef7f7;
		opacity: 0.8;
	}
	
	.producto-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 1rem;
	}
	
	.producto-header h3 {
		margin: 0;
		font-size: 1.125rem;
		color: #1e293b;
		font-weight: 600;
		flex: 1;
		margin-right: 1rem;
	}
	
	.producto-estado {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	
	.switch {
		position: relative;
		display: inline-block;
		width: 44px;
		height: 24px;
	}
	
	.switch input {
		opacity: 0;
		width: 0;
		height: 0;
	}
	
	.slider {
		position: absolute;
		cursor: pointer;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: #ccc;
		transition: 0.2s;
		border-radius: 24px;
	}
	
	.slider:before {
		position: absolute;
		content: "";
		height: 18px;
		width: 18px;
		left: 3px;
		bottom: 3px;
		background-color: white;
		transition: 0.2s;
		border-radius: 50%;
	}
	
	input:checked + .slider {
		background-color: #4f46e5;
	}
	
	input:checked + .slider:before {
		transform: translateX(20px);
	}
	
	.estado-label {
		font-size: 0.875rem;
		color: #64748b;
		font-weight: 500;
	}
	
	.producto-descripcion {
		color: #64748b;
		font-size: 0.9375rem;
		margin-bottom: 1rem;
		line-height: 1.4;
	}
	
	.producto-detalles {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
	}
	
	.detalle-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.detalle-row .label {
		font-size: 0.875rem;
		color: #64748b;
	}
	
	.detalle-row .value {
		font-size: 0.875rem;
		color: #1e293b;
		font-weight: 600;
	}
	
	.producto-acciones {
		display: flex;
		gap: 0.75rem;
	}
	
	.btn-editar {
		flex: 1;
		padding: 0.75rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		color: #4f46e5;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-editar:hover {
		background: #f8fafc;
		border-color: #4f46e5;
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
		max-width: 600px;
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
	
	.form-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 2rem;
	}
	
	.form-group {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
	
	.form-group.span-2 {
		grid-column: span 2;
	}
	
	.form-group label {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
	}
	
	.form-group input,
	.form-group select,
	.form-group textarea {
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		font-size: 1rem;
		transition: all 0.2s;
	}
	
	.form-group input:focus,
	.form-group select:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #4f46e5;
		box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
	}
	
	.checkbox-label {
		display: flex !important;
		flex-direction: row !important;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}
	
	.checkbox-label input[type="checkbox"] {
		width: auto;
		margin: 0;
	}
	
	.form-actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}
	
	.btn-cancelar {
		padding: 0.875rem;
		background: white;
		border: 1px solid #d1d5db;
		border-radius: 8px;
		color: #64748b;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.btn-cancelar:hover {
		background: #f8fafc;
		border-color: #94a3b8;
	}
	
	.btn-guardar {
		padding: 0.875rem;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		border: none;
		border-radius: 8px;
		color: white;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
	}
	
	.btn-guardar:hover {
		transform: translateY(-1px);
		box-shadow: 0 6px 16px rgba(79, 70, 229, 0.4);
	}
</style>