import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Served from a custom apex domain (https://safecarrynys.com), so the site
// lives at the root and base must be '/'. (If you ever drop the custom domain
// and serve from https://rafibarides.github.io/ccw-safety-map/, change the
// build base back to '/ccw-safety-map/'.)
export default defineConfig({
  plugins: [react()],
  base: '/',
  server: {
    host: true,
    port: 5173,
  },
});
