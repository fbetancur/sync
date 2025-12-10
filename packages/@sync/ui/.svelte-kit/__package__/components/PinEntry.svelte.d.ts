interface $$__sveltets_2_IsomorphicComponent<Props extends Record<string, any> = any, Events extends Record<string, any> = any, Slots extends Record<string, any> = any, Exports = {}, Bindings = string> {
    new (options: import('svelte').ComponentConstructorOptions<Props>): import('svelte').SvelteComponent<Props, Events, Slots> & {
        $$bindings?: Bindings;
    } & Exports;
    (internal: unknown, props: Props & {
        $$events?: Events;
        $$slots?: Slots;
    }): Exports & {
        $set?: any;
        $on?: any;
    };
    z_$$bindings?: Bindings;
}
declare const PinEntry: $$__sveltets_2_IsomorphicComponent<{
    title?: string;
    subtitle?: string;
    required?: boolean;
    minLength?: number;
    maxLength?: number;
    encryptionService?: any;
}, {
    success: CustomEvent<{
        pin: string;
    }>;
    cancel: CustomEvent<void>;
} & {
    [evt: string]: CustomEvent<any>;
}, {}, {}, string>;
type PinEntry = InstanceType<typeof PinEntry>;
export default PinEntry;
//# sourceMappingURL=PinEntry.svelte.d.ts.map