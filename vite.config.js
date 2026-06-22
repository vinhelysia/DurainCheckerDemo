import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  base: process.env.VERCEL ? '/' : '/DurainCheckerDemo/',
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@solana/') || id.includes('@coral-xyz/anchor')) {
            return 'solana-vendor'
          }
        }
      }
    }
  }
})
