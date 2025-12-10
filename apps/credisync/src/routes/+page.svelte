<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user, loading } from '$lib/stores/auth';
	
	onMount(() => {
		// El layout principal maneja la autenticación
		// Esta página solo redirige basado en el estado actual
		const unsubscribe = loading.subscribe(isLoading => {
			if (!isLoading) {
				// Una vez que la autenticación está verificada, redirigir
				const currentUser = user.subscribe(u => {
					if (u) {
						goto('/ruta');
					} else {
						goto('/login');
					}
				});
				currentUser(); // Ejecutar inmediatamente
			}
		});
		
		return unsubscribe;
	});
</script>

<!-- Loading mientras se determina la ruta -->
<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
	<div class="text-center">
		<div class="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
			<span class="text-white font-bold text-3xl">C</span>
		</div>
		<div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
		<p class="text-gray-600">Iniciando CrediSync...</p>
	</div>
</div>