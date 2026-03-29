import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// ---------------------------------------------------------------------------
// Vite config for the Sharecare customer-facing chat widget.
//
// Dev: proxy /api → backend at http://127.0.0.1:8000
// Prod: set VITE_API_BASE_URL in your deployment environment
// ---------------------------------------------------------------------------
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3001,
    host: '0.0.0.0', // Allow any incoming connection (useful for testing subdomains)
    allowedHosts: true, // Allow any host (e.g., neeraj.localhost)
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8000',
        changeOrigin: true,
        ws: true, // Proxy WebSocket connections for real-time features
      },
    },
  },
})
