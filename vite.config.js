import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// GitHub Pages serves this at https://<user>.github.io/ccw-safety-map/
// so we need the base to match the repo name in production builds.
export default defineConfig(({ command }) => ({
  plugins: [react()],
  base: command === 'build' ? '/ccw-safety-map/' : '/',
  server: {
    host: true,
    port: 5173,
  },
}));
