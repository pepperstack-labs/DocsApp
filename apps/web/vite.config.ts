import { defineConfig } from 'vite';
import { tanstackStart } from '@tanstack/react-start/plugin/vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [tanstackStart(), react()],
  server: {
    allowedHosts: ['.daytonaproxy01.net', '.proxy.daytona.work'],
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001',
      },
    },
  },
  preview: {
    allowedHosts: ['.daytonaproxy01.net', '.proxy.daytona.work'],
    proxy: {
      '/api': {
        target: process.env.API_PROXY_TARGET ?? 'http://127.0.0.1:3001',
      },
    },
  },
});
