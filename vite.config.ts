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
    host: '0.0.0.0', // Allow any incoming connection (useful for testing subdomains)
    allowedHosts: true, // Allow any host (e.g., neeraj.localhost)
    proxy: {
      '/api': {
        target: 'https://api.letchat.in',
        changeOrigin: true,
        ws: true, // Proxy WebSocket connections for real-time features
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
