import { defineConfig } from 'vite';

// https://vitejs.dev/config
// No native modules anymore — only `electron` stays external (provided at runtime).
export default defineConfig({
  build: {
    rollupOptions: {
      external: ['electron'],
    },
  },
});
