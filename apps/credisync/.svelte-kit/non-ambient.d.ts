
// this file is generated — do not edit it


declare module "svelte/elements" {
	export interface HTMLAttributes<T> {
		'data-sveltekit-keepfocus'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-noscroll'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-preload-code'?:
			| true
			| ''
			| 'eager'
			| 'viewport'
			| 'hover'
			| 'tap'
			| 'off'
			| undefined
			| null;
		'data-sveltekit-preload-data'?: true | '' | 'hover' | 'tap' | 'off' | undefined | null;
		'data-sveltekit-reload'?: true | '' | 'off' | undefined | null;
		'data-sveltekit-replacestate'?: true | '' | 'off' | undefined | null;
	}
}

export {};


declare module "$app/types" {
	export interface AppTypes {
		RouteId(): "/(app)" | "/" | "/(app)/balance" | "/(app)/clientes" | "/(app)/clientes/nuevo" | "/(app)/clientes/[id]" | "/(app)/configuracion" | "/login" | "/(app)/ruta";
		RouteParams(): {
			"/(app)/clientes/[id]": { id: string }
		};
		LayoutParams(): {
			"/(app)": { id?: string };
			"/": { id?: string };
			"/(app)/balance": Record<string, never>;
			"/(app)/clientes": { id?: string };
			"/(app)/clientes/nuevo": Record<string, never>;
			"/(app)/clientes/[id]": { id: string };
			"/(app)/configuracion": Record<string, never>;
			"/login": Record<string, never>;
			"/(app)/ruta": Record<string, never>
		};
		Pathname(): "/" | "/balance" | "/balance/" | "/clientes" | "/clientes/" | "/clientes/nuevo" | "/clientes/nuevo/" | `/clientes/${string}` & {} | `/clientes/${string}/` & {} | "/configuracion" | "/configuracion/" | "/login" | "/login/" | "/ruta" | "/ruta/";
		ResolvedPathname(): `${"" | `/${string}`}${ReturnType<AppTypes['Pathname']>}`;
		Asset(): "/icon-192.png" | "/icon-512.png" | "/icon.svg" | "/manifest.json" | string & {};
	}
}