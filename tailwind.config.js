/** @type {import('tailwindcss').Config} */
export default {
    content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
    theme: {
        extend: {
            colors: {
                'rebel-red': '#b91c1c',
                'imperial-blue': '#1e40af',
                'hologram-blue': '#0ea5e9',
                'cyber-yellow': '#eab308',
                'dark-saber': '#0f172a',
            },
        },
    },
    plugins: [],
};
