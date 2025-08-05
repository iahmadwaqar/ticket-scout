import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwind from '@tailwindcss/vite'
import { visualizer } from 'rollup-plugin-visualizer'

const shouldAnalyze = process.env.ANALYZE === 'true'

export default defineConfig({
  main: { 
    build: {
     watch: {
      include: ['src/main/index.ts'],      
     } 
    }
   },
  preload: { /* ... unchanged ... */ },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@': resolve('src/renderer/src'),
        '@/components': resolve('src/renderer/src/components'),
        '@/lib': resolve('src/renderer/src/lib'),
        '@/hooks': resolve('src/renderer/src/hooks'),
        '@/types': resolve('src/renderer/src/types'),
        '@/assets': resolve('src/renderer/src/assets')
      }
    },
    plugins: [
      react({
        include: '**/*.{jsx,tsx}',
      }),
      tailwind(),
      ...(shouldAnalyze ? [
        visualizer({
          filename: 'bundle-analysis.html',
          open: true,
          gzipSize: true,
          brotliSize: true,
        })
      ] : [])
    ],

  }
})
