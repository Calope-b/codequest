import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Vite configuration for the CodeQuest client.
// The react() plugin enables JSX transformation and Fast Refresh during dev.
// The API target is read from VITE_API_TARGET so the port stays out of code.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: env.VITE_API_TARGET || 'http://localhost:5000',
          changeOrigin: true,
        },
      },
    },
    // Vitest configuration. jsdom gives a browser-like global scope so
    // importing modules that transitively import Phaser does not crash;
    // the tests themselves never instantiate a Phaser.Game.
    test: {
      environment: 'jsdom',
      globals: true,
    },
  }
})