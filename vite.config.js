import { defineConfig } from 'vite';

export default defineConfig({
    base: './', // Ensure relative paths for GH Pages
    build: {
        outDir: 'docs',
    },
});
