/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/renderer/src/test/setup.ts'],
    globals: true,
    include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'out', 'build'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/coverage/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@': resolve(__dirname, 'src/renderer/src'),
      '@/components': resolve(__dirname, 'src/renderer/src/components'),
      '@/lib': resolve(__dirname, 'src/renderer/src/lib'),
      '@/hooks': resolve(__dirname, 'src/renderer/src/hooks'),
      '@/types': resolve(__dirname, 'src/renderer/src/types'),
      '@/assets': resolve(__dirname, 'src/renderer/src/assets'),
      '@/test': resolve(__dirname, 'src/renderer/src/test')
    }
  }
})