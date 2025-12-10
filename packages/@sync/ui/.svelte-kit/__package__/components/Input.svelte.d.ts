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
declare const Input: $$__sveltets_2_IsomorphicComponent<{
    [x: string]: any;
    type?: "text" | "number" | "email" | "tel" | "password" | "url";
    value?: string | number;
    label?: string;
    placeholder?: string;
    prefix?: string;
    suffix?: string;
    error?: string;
    disabled?: boolean;
    required?: boolean;
    readonly?: boolean;
    id?: string;
    name?: string;
    autocomplete?: string;
    step?: string | number | undefined;
    min?: string | number | undefined;
    max?: string | number | undefined;
    focus?: () => void;
    blur?: () => void;
}, {
    input: CustomEvent<any>;
    focus: CustomEvent<any>;
    blur: CustomEvent<any>;
    keydown: CustomEvent<any>;
} & {
    [evt: string]: CustomEvent<any>;
}, {}, {
    focus: () => void;
    blur: () => void;
}, string>;
type Input = InstanceType<typeof Input>;
export default Input;
//# sourceMappingURL=Input.svelte.d.ts.map