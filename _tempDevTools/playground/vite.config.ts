import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The playground runs as a normal dev-mode React app so React DevTools reports
// a "development" build, which is what the debug hook needs to attach.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5199,
  },
});
