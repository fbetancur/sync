<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, loading, auth } from '$lib/stores/auth';
	import { initializeCrediSync } from '$lib/app-config';
	import '../app.css';

	// Rutas que no requieren autenticación
	const publicRoutes = ['/login', '/'];

	onMount(async () => {
		// Inicializar CrediSync explícitamente
		try {
			await initializeCrediSync();
			console.log('✅ CrediSync inicializado en layout principal');
		} catch (error) {
			console.error('❌ Error inicializando CrediSync:', error);
		}
		
		// Inicializar autenticación si no está inicializada
		await auth.initialize();
		
		// Cargar herramientas de debug PWA en desarrollo
		if (import.meta.env.DEV) {
			try {
				await import('$lib/debug/pwa-test.js');
				console.log('🔧 PWA Debug Tools cargadas');
			} catch (error) {
				console.warn('⚠️ No se pudieron cargar las herramientas de debug PWA:', error);
			}
		}
	});

	// Reactive statement para manejar redirecciones
	$: {
		if (!$loading) {
			const currentPath = $page.url.pathname;
			const isPublicRoute = publicRoutes.includes(currentPath);
			const isAuthenticated = !!$user;

			if (!isAuthenticated && !isPublicRoute) {
				// Usuario no autenticado intentando acceder a ruta protegida
				goto('/login');
			} else if (isAuthenticated && currentPath === '/login') {
				// Usuario autenticado en página de login
				goto('/ruta');
			}
		}
	}
</script>

{#if $loading}
	<!-- Loading global mientras se verifica autenticación -->
	<div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
		<div class="text-center">
			<div class="w-20 h-20 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
				<span class="text-white font-bold text-3xl">C</span>
			</div>
			<div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
			<p class="text-gray-600">Verificando autenticación...</p>
		</div>
	</div>
{:else}
	<!-- Renderizar contenido de la página -->
	<slot />
{/if}