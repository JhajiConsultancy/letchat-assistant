import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJsPlugin from 'vite-plugin-css-injected-by-js'
import path from 'path'

// ---------------------------------------------------------------------------
// Vite config for the Sharecare customer-facing chat widget.
//
// Dev: proxy /api → backend at http://127.0.0.1:8000
// Prod: set VITE_API_BASE_URL in your deployment environment
//
// SDK build:  npm run build:sdk   → dist-sdk/widget.iife.js
// ---------------------------------------------------------------------------

const isSdkBuild = process.env.BUILD_TARGET === 'sdk'

export default defineConfig({
  plugins: [react(), ...(isSdkBuild ? [cssInjectedByJsPlugin()] : [])],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
     port: 3001,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        ws: true,
      },
    },
  },
  // SDK library build (BUILD_TARGET=sdk)
  ...(isSdkBuild && {
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    build: {
      outDir: 'dist-sdk',
      lib: {
        entry: path.resolve(__dirname, 'src/sdk.tsx'),
        name: 'LetchatWidget',
        fileName: () => 'widget.js',
        formats: ['iife'],
      },
      rollupOptions: {
        // Bundle everything — consumers just drop a <script> tag
        external: [],
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  }),
})
