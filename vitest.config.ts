import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@site': path.resolve(__dirname),
        },
    },
    test: {
        include: ['tests/**/*.test.ts'],
    },
});
