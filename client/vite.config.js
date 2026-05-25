import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        gebra: resolve(__dirname, 'gebra.html'),
        manage: resolve(__dirname, 'manage.html'),
        live: resolve(__dirname, 'live.html'),
        recorded: resolve(__dirname, 'recorded.html'),
        games: resolve(__dirname, 'games.html'),
        setPassword: resolve(__dirname, 'set-password.html'),
        login: resolve(__dirname, 'login.html'),
        steps: resolve(__dirname, 'steps.html'),
        plans: resolve(__dirname, 'plans.html'),
        worksheets: resolve(__dirname, 'worksheets.html'),
        grades: resolve(__dirname, 'grades.html'),
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
