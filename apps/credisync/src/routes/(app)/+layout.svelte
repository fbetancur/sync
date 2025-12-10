<script lang="ts">
	import { user } from '$lib/stores/auth';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';

	// Verificación adicional de seguridad para rutas protegidas
	$: if (!$user) {
		goto('/login');
	}
</script>

{#if $user}
	<!-- Layout para rutas protegidas -->
	<!-- TODO: En FASE 3.1 se implementará el layout completo con bottom navigation -->
	<div class="min-h-screen bg-gray-50">
		<slot />
	</div>
{:else}
	<!-- Fallback mientras se redirige -->
	<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
		<div class="text-center">
			<div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Redirigiendo...</p>
		</div>
	</div>
{/if}