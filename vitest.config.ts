import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    resolve: {
        alias: {
            '@site': path.resolve(__dirname),
        },
    },
    test: {
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
        },
        include: ['tests/**/*.test.{ts,tsx}'],
    },
});
