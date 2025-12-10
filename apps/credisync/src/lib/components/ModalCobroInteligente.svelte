<script>
	import { formatearMoneda } from '$lib/utils/creditos.js';
	
	let { open = $bindable(false), cliente, onSuccess } = $props();
	
	let montoPago = $state(cliente?.resumen?.total_adeudado || 0);
	let procesando = $state(false);
	
	// Inicializar monto cuando se abre el modal
	$effect(() => {
		if (open && cliente?.resumen) {
			montoPago = cliente.resumen.total_adeudado;
		}
	});
	
	// Manejar cambio de monto
	function handleMontoChange(e) {
		const valor = parseFloat(e.target.value) || 0;
		montoPago = Math.max(0, valor);
	}
	
	// Confirmar cobro (versión simplificada)
	async function confirmarCobro() {
		if (procesando) return;
		
		if (montoPago <= 0) {
			alert('El monto debe ser mayor a cero');
			return;
		}
		
		try {
			procesando = true;
			
			// Simular procesamiento (será implementado con @sync/core en fases posteriores)
			await new Promise(resolve => setTimeout(resolve, 1000));
			
			alert(`Pago de ${formatearMoneda(montoPago)} registrado exitosamente (simulado)`);
			
			open = false;
			if (onSuccess) onSuccess();
			
		} catch (error) {
			console.error('Error al registrar pago:', error);
			alert('Error al registrar el pago');
		} finally {
			procesando = false;
		}
	}
	
	function cerrar() {
		if (!procesando) {
			open = false;
		}
	}
</script>

{#if open}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onclick={cerrar}>
		<div class="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-hidden" onclick={(e) => e.stopPropagation()}>
			<!-- Header -->
			<div class="bg-blue-600 text-white px-6 py-4 flex items-center justify-between">
				<h2 class="text-xl font-bold flex items-center gap-2">
					💵 Cobrar a {cliente.nombre}
				</h2>
				<button
					onclick={cerrar}
					disabled={procesando}
					class="text-white hover:text-gray-200 text-2xl leading-none disabled:opacity-50"
				>
					×
				</button>
			</div>
			
			<!-- Body -->
			<div class="p-6">
				<!-- Monto a Cobrar -->
				<div class="mb-6">
					<label class="block text-sm font-medium text-gray-700 mb-2">
						Monto recibido:
					</label>
					<div class="relative">
						<span class="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 text-lg">$</span>
						<input
							type="number"
							value={montoPago}
							oninput={handleMontoChange}
							step="0.01"
							min="0"
							disabled={procesando}
							class="w-full pl-8 pr-4 py-3 text-2xl font-bold border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
							placeholder="0.00"
						/>
					</div>
					<p class="text-sm text-gray-600 mt-1">
						Total adeudado: {formatearMoneda(cliente.resumen?.total_adeudado || 0)}
					</p>
				</div>
				
				<!-- Información del cliente -->
				<div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
					<h3 class="font-semibold text-blue-900 mb-2">Resumen del cliente:</h3>
					<div class="text-sm text-blue-800 space-y-1">
						<p>• Créditos activos: {cliente.resumen?.creditos_activos || 0}</p>
						<p>• Cuotas atrasadas: {cliente.resumen?.cuotas_atrasadas || 0}</p>
						{#if cliente.resumen?.dias_atraso_max > 0}
							<p>• Días de atraso: {cliente.resumen.dias_atraso_max}</p>
						{/if}
					</div>
				</div>
				
				<!-- Nota sobre funcionalidad -->
				<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
					<p class="text-sm text-yellow-800">
						<strong>Nota:</strong> Esta es una versión simplificada del modal de cobro. 
						La funcionalidad completa será implementada en las próximas fases usando @sync/core.
					</p>
				</div>
			</div>
			
			<!-- Footer -->
			<div class="bg-gray-50 px-6 py-4 flex gap-3">
				<button
					onclick={cerrar}
					disabled={procesando}
					class="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
				>
					Cancelar
				</button>
				<button
					onclick={confirmarCobro}
					disabled={procesando || montoPago <= 0}
					class="flex-1 px-4 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
				>
					{#if procesando}
						<span class="inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
						Procesando...
					{:else}
						✓ Confirmar Cobro (Simulado)
					{/if}
				</button>
			</div>
		</div>
	</div>
{/if}