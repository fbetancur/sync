<script>
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { user, auth } from '$lib/stores/auth.js';
	import { isOnline } from '$lib/stores/sync.js';
	import { onMount } from 'svelte';
	
	// Importar sincronización global (se auto-configura)
	import '$lib/sync/index.js';
	
	// Importar herramientas de verificación de almacenamiento (solo en desarrollo)
	if (import.meta.env.DEV) {
		import('$lib/debug/verify-storage.js');
		import('$lib/debug/migrate-to-universal.js');
		
		// Cargar scripts de prueba
		const scripts = [
			'/test-cliente-creation.js',
			'/test-universal-structure.js'
		];
		
		scripts.forEach(src => {
			const script = document.createElement('script');
			script.src = src;
			script.type = 'module';
			document.head.appendChild(script);
		});
	}
	
	// Variable para el registro del Service Worker
	let registerSW;
	
	// Redirigir a login si no está autenticado
	onMount(async () => {
		if (!$user) {
			goto('/login');
		}
		
		// Registrar Service Worker
		try {
			if (import.meta.env.PROD) {
				// En producción, usar VitePWA
				const { registerSW: vitePWARegister } = await import('virtual:pwa-register');
				const updateSW = vitePWARegister({
					onNeedRefresh() {
						console.log('🔄 Nueva versión disponible');
					},
					onOfflineReady() {
						console.log('✅ PWA lista para offline');
					},
					onRegistered(registration) {
						console.log('✅ Service Worker registrado:', registration?.scope);
					},
					onRegisterError(error) {
						console.error('❌ Error en Service Worker:', error);
					}
				});
			} else {
				// En desarrollo, VitePWA maneja el registro automáticamente
				const { registerServiceWorker } = await import('$lib/pwa-register.js');
				await registerServiceWorker();
			}
		} catch (error) {
			console.warn('⚠️ Error registrando Service Worker:', error);
		}
	});
	
	// Determinar sección activa y título
	let currentPath = $derived($page.url.pathname);
	let activeSection = $derived(
		currentPath.startsWith('/ruta') ? 'ruta' :
		currentPath.startsWith('/clientes') ? 'clientes' :
		currentPath.startsWith('/balance') ? 'balance' :
		currentPath.startsWith('/configuracion') ? 'configuracion' :
		'ruta'
	);
	
	// Detectar si estamos en una sub-página
	let isSubPage = $derived(
		currentPath === '/clientes/nuevo' ||
		currentPath.match(/\/clientes\/[^/]+$/)
	);
	
	// Títulos por sección
	let sectionTitle = $derived(
		currentPath === '/clientes/nuevo' ? 'Nuevo Cliente' :
		activeSection === 'ruta' ? 'Mi Ruta' :
		activeSection === 'clientes' ? 'Clientes' :
		activeSection === 'balance' ? 'Balance' :
		activeSection === 'configuracion' ? 'Configuración' :
		'Mi Ruta'
	);
	
	// Función para volver
	function goBack() {
		if (activeSection === 'clientes') {
			goto('/clientes');
		} else {
			window.history.back();
		}
	}
	
	// Navegación
	function navigateTo(section) {
		const routes = {
			ruta: '/ruta',
			clientes: '/clientes',
			balance: '/balance',
			configuracion: '/configuracion'
		};
		goto(routes[section]);
	}
	
	// Acciones contextuales por sección
	function handleSearch() {
		// TODO: Implementar búsqueda
		console.log('Búsqueda');
	}
	
	function handleAdd() {
		if (activeSection === 'clientes') {
			goto('/clientes/nuevo');
		}
	}
	
	function handleMenu() {
		// TODO: Implementar menú contextual
		console.log('Menú');
	}
	
	// Función para cerrar sesión
	async function handleLogout() {
		try {
			console.log('🚪 Cerrando sesión...');
			await auth.signOut();
		} catch (error) {
			console.error('❌ Error al cerrar sesión:', error);
		}
	}
</script>

{#if $user}
	<div class="app-container">
		<!-- Header fijo 48px -->
		<header class="app-header">
			<div class="header-content">
				<!-- Izquierda: Logo/Nombre + Estado + Título (o botón volver en sub-páginas) -->
				<div class="header-left">
					{#if isSubPage}
						<button onclick={goBack} class="back-btn">
							<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
							</svg>
						</button>
						<h1 class="section-title">{sectionTitle}</h1>
						<!-- Indicador de estado también en sub-páginas -->
						<div class="status-dot {$isOnline ? 'online' : 'offline'}"></div>
					{:else}
						<span class="app-name">CrediSync</span>
						<div class="status-dot {$isOnline ? 'online' : 'offline'}"></div>
						<h1 class="section-title">{sectionTitle}</h1>
					{/if}
				</div>				
				<!-- Derecha: Botón de logout -->
				<div class="header-right">
					<button onclick={handleLogout} class="logout-btn" title="Cerrar sesión">
						<svg class="icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
						</svg>
					</button>
				</div>
			</div>
		</header>
		
		<!-- Contenido principal -->
		<main class="app-main">
			<slot />
		</main>
		
		<!-- Bottom Navigation -->
		<nav class="bottom-nav">
			<button 
				class="nav-item {activeSection === 'ruta' ? 'active' : ''}"
				onclick={() => navigateTo('ruta')}
			>
				<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
				</svg>
				<span class="nav-label">Mi Ruta</span>
			</button>
			
			<button 
				class="nav-item {activeSection === 'clientes' ? 'active' : ''}"
				onclick={() => navigateTo('clientes')}
			>
				<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
				</svg>
				<span class="nav-label">Clientes</span>
			</button>
			
			<button 
				class="nav-item {activeSection === 'balance' ? 'active' : ''}"
				onclick={() => navigateTo('balance')}
			>
				<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<span class="nav-label">Balance</span>
			</button>
			
			<button 
				class="nav-item {activeSection === 'configuracion' ? 'active' : ''}"
				onclick={() => navigateTo('configuracion')}
			>
				<svg class="nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
				</svg>
				<span class="nav-label">Configuración</span>
			</button>
		</nav>
	</div>
{/if}

<style>
	.app-container {
		display: flex;
		flex-direction: column;
		height: 100vh;
		background: #f8fafc;
	}
	
	/* Header fijo 48px - Azul del login */
	.app-header {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		height: 48px;
		background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
		border-bottom: 1px solid #4338ca;
		z-index: 40;
		box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
	}
	
	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: center;
		height: 100%;
		padding: 0 1rem;
		max-width: 100%;
	}
	
	.header-left {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		min-width: 0;
	}
	
	.app-name {
		font-size: 1rem;
		font-weight: 800;
		color: #ffffff;
		letter-spacing: -0.03em;
		flex-shrink: 0;
		text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
	}
	
	.status-dot {
		width: 8px;
		height: 8px;
		border-radius: 50%;
		flex-shrink: 0;
	}
	
	.status-dot.online {
		background: #10b981;
	}
	
	.status-dot.offline {
		background: #ef4444;
	}
	
	.back-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: #ffffff;
		cursor: pointer;
		transition: all 0.2s;
		margin-right: -0.5rem;
	}
	
	.back-btn:hover {
		background: rgba(255, 255, 255, 0.2);
		color: #ffffff;
	}
	
	.back-btn:active {
		transform: scale(0.95);
	}
	
	.section-title {
		font-size: 0.9375rem;
		font-weight: 600;
		color: #e0f2fe;
		margin: 0;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}
	
	.header-right {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}
	
	.header-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: #6b7280;
		cursor: pointer;
		transition: all 0.2s;
	}
	
	.header-btn:hover {
		background: #f3f4f6;
		color: #111827;
	}
	
	.header-btn:active {
		transform: scale(0.95);
	}
	
	.logout-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 36px;
		height: 36px;
		background: transparent;
		border: none;
		border-radius: 8px;
		color: rgba(255, 255, 255, 0.9);
		cursor: pointer;
		transition: all 0.2s ease;
		position: relative;
	}
	
	.logout-btn:hover {
		background: rgba(255, 255, 255, 0.15);
		color: #ffffff;
		transform: translateY(-1px);
	}
	
	.logout-btn:active {
		transform: scale(0.95) translateY(0);
		background: rgba(255, 255, 255, 0.2);
	}
	
	.logout-btn:focus {
		outline: none;
		box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.3);
	}
	
	.icon {
		width: 20px;
		height: 20px;
	}
	
	/* Contenido principal */
	.app-main {
		flex: 1;
		overflow-y: auto;
		margin-top: 48px;
		margin-bottom: 64px;
		-webkit-overflow-scrolling: touch;
	}
	
	/* Bottom Navigation - Fondo claro (estilo imagen original) */
	.bottom-nav {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		height: 64px;
		background: linear-gradient(0deg, #f1f5f9 0%, #ffffff 100%);
		border-top: 1px solid #cbd5e1;
		display: flex;
		justify-content: space-around;
		align-items: center;
		z-index: 40;
		box-shadow: 0 -4px 12px rgba(0, 0, 0, 0.08);
	}
	
	.nav-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 4px;
		flex: 1;
		height: 100%;
		background: transparent;
		border: none;
		color: #64748b;
		cursor: pointer;
		transition: all 0.3s;
		padding: 8px 4px;
		position: relative;
	}
	
	.nav-item:active {
		transform: scale(0.95);
	}
	
	.nav-item.active {
		color: #2563eb;
		font-weight: 700;
		background: linear-gradient(180deg, rgba(37, 99, 235, 0.08) 0%, rgba(79, 70, 229, 0.12) 100%);
	}
	
	.nav-item.active::before {
		content: '';
		position: absolute;
		top: 0;
		left: 50%;
		transform: translateX(-50%);
		width: 40px;
		height: 3px;
		background: linear-gradient(90deg, #2563eb, #4f46e5);
		border-radius: 0 0 3px 3px;
	}
	
	.nav-item.active .nav-icon {
		stroke-width: 2.5;
	}
	
	.nav-item.active .nav-label {
		font-weight: 700;
	}
	
	.nav-icon {
		width: 26px;
		height: 26px;
		stroke-width: 2;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	.nav-label {
		font-size: 0.6875rem;
		font-weight: 600;
		white-space: nowrap;
		letter-spacing: 0.01em;
		transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
	}
	
	/* Optimizaciones para móviles viejos */
	@media (max-width: 640px) {
		.section-title {
			font-size: 1rem;
		}
		
		.nav-label {
			font-size: 0.65rem;
		}
		
		.nav-icon {
			width: 24px;
			height: 24px;
		}
		
		.bottom-nav {
			height: 64px;
		}
		
		.app-main {
			margin-bottom: 64px;
		}
	}
	
	/* Mejoras para pantallas muy pequeñas */
	@media (max-width: 360px) {
		.nav-label {
			font-size: 0.625rem;
		}
		
		.nav-icon {
			width: 22px;
			height: 22px;
		}
	}
	
	/* Evitar scroll bounce en iOS */
	.app-main {
		overscroll-behavior: contain;
	}
</style>