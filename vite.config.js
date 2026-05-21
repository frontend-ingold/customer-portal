import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/b1s': {
        target: 'https://51.103.23.201:50000',
        changeOrigin: true,
        secure: false,
      },
      '/b1i': {
        target: 'http://51.103.23.201:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/b1i/, ''),
      },
      '/graphql': {
        target: 'https://biancoevento.com',
        changeOrigin: true,
        secure: true,
      },
      '/rest': {
        target: 'https://bianco-app.ingold-dev.com',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
