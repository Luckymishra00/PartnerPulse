<<<<<<< HEAD
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { '/api': { target: 'http://localhost:5000', changeOrigin: true } },
  },
});
=======
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
>>>>>>> 4017971b524365c7b13d61151cdfc0b1e2f0033c
