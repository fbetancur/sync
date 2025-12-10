import { writable } from 'svelte/store';
import { goto } from '$app/navigation';
import { crediSyncApp, initializeCrediSync } from '$lib/app-config';

// Store para el estado de autenticación
export const user = writable(null);
export const loading = writable(true);

// Wrapper para los métodos de autenticación de @sync/core
export const auth = {
	// Inicializar el estado de autenticación
	async initialize() {
		loading.set(true);
		try {
			// Primero inicializar CrediSync si no está iniciado
			if (!crediSyncApp.isStarted) {
				console.log('🔄 Inicializando CrediSync...');
				await initializeCrediSync();
			}
			
			const authService = crediSyncApp.services.auth;
			const currentUser = await authService.getCurrentUser();
			user.set(currentUser);
		} catch (error) {
			console.error('Error initializing auth:', error);
			user.set(null);
		} finally {
			loading.set(false);
		}
	},

	// Iniciar sesión
	async signIn(email, password) {
		// Asegurar que CrediSync esté inicializado
		if (!crediSyncApp.isStarted) {
			await initializeCrediSync();
		}
		
		const authService = crediSyncApp.services.auth;
		const result = await authService.signIn(email, password);
		
		if (!result.error) {
			user.set(result.user);
		}
		
		return result;
	},

	// Registrarse
	async signUp(email, password) {
		// Asegurar que CrediSync esté inicializado
		if (!crediSyncApp.isStarted) {
			await initializeCrediSync();
		}
		
		const authService = crediSyncApp.services.auth;
		const result = await authService.signUp(email, password);
		
		if (!result.error && result.user) {
			user.set(result.user);
		}
		
		return result;
	},

	// Cerrar sesión
	async signOut() {
		// Asegurar que CrediSync esté inicializado
		if (!crediSyncApp.isStarted) {
			await initializeCrediSync();
		}
		
		const authService = crediSyncApp.services.auth;
		const result = await authService.signOut();
		
		if (!result.error) {
			user.set(null);
			goto('/login');
		}
		
		return result;
	},

	// Verificar si el usuario está autenticado
	isAuthenticated() {
		let currentUser;
		user.subscribe(u => currentUser = u)();
		return !!currentUser;
	}
};

// Inicializar el estado de autenticación al cargar
if (typeof window !== 'undefined') {
	auth.initialize();
}