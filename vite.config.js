import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        // Disable any response buffering so SSE chunks pass through immediately.
        // Without this, /api/ai/doubt hangs until the stream ends and the
        // browser sees a single dump of all events at once (or nothing).
        selfHandleResponse: false,
        configure: (proxy) => {
          proxy.on('proxyRes', (proxyRes, req, res) => {
            // Force chunked transfer + disable buffering for SSE endpoints
            if (req.url?.includes('/ai/doubt') || req.url?.includes('/ai/visual')) {
              proxyRes.headers['cache-control'] = 'no-cache, no-transform'
              proxyRes.headers['x-accel-buffering'] = 'no'
              // Remove any content-length so Node streams the body
              delete proxyRes.headers['content-length']
            }
          })
        },
      },
    },
  },
})
