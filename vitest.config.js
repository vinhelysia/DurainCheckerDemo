import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({ globals: { Buffer: true, global: true, process: true } }),
  ],
  test: {
    globals: true,
    environment: 'node',
    include: [
      'src/**/*.test.{js,jsx,ts,tsx}',
      'test/test-translations.js',
    ],
    exclude: ['node_modules', 'program', 'dist', 'api', 'ml'],
  },
})
