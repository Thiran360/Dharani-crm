import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'https://ungreased-repulsive-consuming.ngrok-free.dev',
        changeOrigin: true,
      },
      '/dharani-api': {
        target: 'http://dland.southindia.cloudapp.azure.com/fnvNETWebApiV3',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/dharani-api/, '')
      }
    }
  }
})
