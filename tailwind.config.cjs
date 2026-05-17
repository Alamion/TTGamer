// test dark mode:                     document.documentElement.setAttribute('data-theme', 'dark');

/** @type {import('tailwindcss').Config} */
module.exports = {
    important: '.tailwind-root',
    content: ['./src/**/*.{js,ts,jsx,tsx,mdx}', './app/**/*.{js,ts,jsx,tsx}', './docs/**/*.{tsx,mdx}'],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: `rgb(var(--primary) / 1)`,
                    hover: `rgb(var(--primary) / 0.8)`,
                    on: `rgb(var(--on-primary) / 1)`,
                    dark: `color-mix(in srgb, rgb(var(--primary)), black 25%)`,
                    darker: `color-mix(in srgb, rgb(var(--primary)), black 50%)`,
                    darkest: `color-mix(in srgb, rgb(var(--primary)), black 75%)`,
                    light: `color-mix(in srgb, rgb(var(--primary)), white 25%)`,
                    lighter: `color-mix(in srgb, rgb(var(--primary)), white 50%)`,
                    lightest: `color-mix(in srgb, rgb(var(--primary)), white 75%)`,
                },
                secondary: {
                    DEFAULT: `rgb(var(--secondary) / 1)`,
                    hover: `rgb(var(--secondary) / 0.8)`,
                    on: `rgb(var(--on-secondary) / 1)`,
                    dark: `color-mix(in srgb, rgb(var(--secondary)), black 25%)`,
                    darker: `color-mix(in srgb, rgb(var(--secondary)), black 50%)`,
                    darkest: `color-mix(in srgb, rgb(var(--secondary)), black 75%)`,
                    light: `color-mix(in srgb, rgb(var(--secondary)), white 25%)`,
                    lighter: `color-mix(in srgb, rgb(var(--secondary)), white 50%)`,
                    lightest: `color-mix(in srgb, rgb(var(--secondary)), white 75%)`,
                },
                info: `rgb(var(--info) / 1)`,
                error: `rgb(var(--error) / 1)`,
                warning: `rgb(var(--warning) / 1)`,
                success: `rgb(var(--success) / 1)`,
                bgBase: `rgb(var(--bg-base) / 1)`,
                bgSurface: `rgb(var(--bg-surface) / 1)`,
                textPrimary: `rgb(var(--text-primary) / 1)`,
                textSecondary: `rgb(var(--text-secondary) / 1)`,
                border: `rgb(var(--border) / 1)`,
                borderMoreContrast: `rgb(var(--border-more-contrast) / 1)`,

                jediBlue: `rgb(var(--sw-jedi-blue) / 1)`,
                jediGreen: `rgb(var(--sw-jedi-green) / 1)`,
                jediViolet: `rgb(var(--sw-jedi-violet) / 1)`,
                jediRed: `rgb(var(--sw-jedi-red) / 1)`,
                empireGrey: `rgb(var(--sw-empire-grey) / 1)`,
                empireBlack: `rgb(var(--sw-empire-black) / 1)`,
                empireWhite: `rgb(var(--sw-empire-white) / 1)`,
                droidGold: `rgb(var(--sw-droid-gold) / 1)`,
                droidOrange: `rgb(var(--sw-droid-orange) / 1)`,
                droidRust: `rgb(var(--sw-droid-rust) / 1)`,
                mandalorian: `rgb(var(--sw-mandalorian) / 1)`,
                hyperjump: `rgb(var(--sw-hyperjump) / 1)`,
            },
        },
    },
    plugins: [],
};
