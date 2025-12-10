import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
	plugins: [
		sveltekit(),
		VitePWA({
			registerType: 'autoUpdate',
			injectRegister: 'auto',
			includeAssets: ['favicon.ico', 'icon-192.png', 'icon-512.png', 'icon.svg'],
			manifest: {
				name: 'CrediSync - Gestión de Microcréditos',
				short_name: 'CrediSync',
				description: 'Aplicación offline-first para gestión de microcréditos',
				theme_color: '#1e40af',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				orientation: 'portrait',
				icons: [
					{
						src: '/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
						purpose: 'any maskable'
					},
					{
						src: '/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
						purpose: 'any maskable'
					}
				]
			},
			workbox: {
				globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
				globIgnores: ['**/node_modules/**/*'],
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/_app\//, /^\/api\//],
				cleanupOutdatedCaches: true,
				skipWaiting: true,
				clientsClaim: true,
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/hmnlriywocnpiktflehr\.supabase\.co\/.*$/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'supabase-api',
							networkTimeoutSeconds: 10,
							cacheableResponse: {
								statuses: [0, 200]
							}
						}
					},
					{
						urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/,
						handler: 'CacheFirst',
						options: {
							cacheName: 'images',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 30 * 24 * 60 * 60 // 30 días
							}
						}
					},
					{
						urlPattern: /\.(?:js|css)$/,
						handler: 'StaleWhileRevalidate',
						options: {
							cacheName: 'static-resources'
						}
					}
				]
			},
			devOptions: {
				enabled: true,
				type: 'module',
				navigateFallback: '/'
			}
		})
	],
	
	build: {
		target: 'esnext',
		minify: 'esbuild',
		rollupOptions: {
			output: {
				manualChunks: {
					vendor: ['svelte'],
					utils: ['@sync/core', '@sync/types']
				}
			}
		}
	},
	
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'jsdom',
		setupFiles: ['src/lib/test-setup.ts']
	}
});