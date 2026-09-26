declare module '@site/tailwind.config.cjs' {
    type ColorValue = string | Readonly<Record<string, string>>;
    const config: { theme: { extend: { colors: Readonly<Record<string, ColorValue>> } } };
    export default config;
}
