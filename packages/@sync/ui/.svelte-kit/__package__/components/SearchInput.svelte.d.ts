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
declare const SearchInput: $$__sveltets_2_IsomorphicComponent<{
    [x: string]: any;
    value?: string;
    placeholder?: string;
    disabled?: boolean;
    debounceMs?: number;
    clearable?: boolean;
    loading?: boolean;
    focus?: () => void;
    clear?: () => void;
}, {
    focus: FocusEvent;
    blur: FocusEvent;
    input: CustomEvent<any>;
    search: CustomEvent<any>;
    clear: CustomEvent<any>;
    keydown: CustomEvent<any>;
} & {
    [evt: string]: CustomEvent<any>;
}, {}, {
    focus: () => void;
    clear: () => void;
}, string>;
type SearchInput = InstanceType<typeof SearchInput>;
export default SearchInput;
//# sourceMappingURL=SearchInput.svelte.d.ts.map