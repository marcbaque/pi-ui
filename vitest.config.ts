import { resolve } from 'path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@shared': resolve('src/shared'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['src/renderer/src/test-setup.ts'],
    exclude: ['**/node_modules/**', '**/e2e/**', '**/.worktrees/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/renderer/src/test-setup.ts',
        'src/renderer/src/main.tsx',
        'src/**/*.d.ts',
      ],
      thresholds: { lines: 70, functions: 70 },
    },
  },
})
