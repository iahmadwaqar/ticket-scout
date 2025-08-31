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
        include: ['src/main/index.js']
      },
      rollupOptions: {
        external: [
          'gologin',
          'utf-8-validate',
          'bufferutil'
        ],
        output: {
          format: 'es',
          globals: {
            gologin: 'gologin'
          }
        }
      },
      commonjsOptions: {
        ignoreDynamicRequires: true,
        transformMixedEsModules: true
      }
    }
  },
  preload: {
    build: {
      watch: {
        include: ['src/preload/index.js']
      },
      rollupOptions: {
        output: {
          entryFileNames: 'index.mjs'
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@/components': resolve('src/renderer/src/components'),
        '@/lib': resolve('src/renderer/src/lib'),
        '@/hooks': resolve('src/renderer/src/hooks'),
        '@/types': resolve('src/renderer/src/types'),
        '@/assets': resolve('src/renderer/src/assets'),
        '@/shared': resolve('src/shared')
      }
    },
    plugins: [
      react({
        include: '**/*.{jsx,js}'
      }),
      tailwind(),
      ...(shouldAnalyze
        ? [
          visualizer({
            filename: 'bundle-analysis.html',
            open: true,
            gzipSize: true,
            brotliSize: true
          })
        ]
        : [])
    ]
  }
})
