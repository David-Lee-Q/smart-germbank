import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
  },
  resolve: {
    alias: {
      'node:sqlite': fileURLToPath(new URL('./tests/sqlite-shim.ts', import.meta.url)),
    },
  },
})
