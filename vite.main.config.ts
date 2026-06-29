import { defineConfig } from 'vite';
import pkg from './package.json';

// https://vitejs.dev/config
// Native/electron deps must stay external so Vite doesn't try to bundle the
// libnut .node addon — they are require()'d at runtime from node_modules
// (dev) or the unpacked asar (packaged, via plugin-auto-unpack-natives).
export default defineConfig({
  build: {
    rollupOptions: {
      external: [
        'electron',
        ...Object.keys(pkg.dependencies ?? {}),
        ...Object.keys(pkg.devDependencies ?? {}).filter((d) => d.startsWith('@nut-tree')),
      ],
    },
  },
});
