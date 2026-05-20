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
    },
  },
});
