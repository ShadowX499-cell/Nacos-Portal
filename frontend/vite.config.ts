import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        configure: (proxy) => {
          // Return 503 instead of ECONNREFUSED when backend isn't ready yet.
          // Vite registers its own error logger after configure(), so we use
          // setImmediate to remove it and keep only this silent handler.
          const silentHandler = (
            _err: Error,
            _req: unknown,
            res: { headersSent: boolean; writeHead: (...a: unknown[]) => unknown; end: (...a: unknown[]) => unknown },
          ) => {
            if (!res.headersSent) {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(JSON.stringify({ success: false, error: { code: 'BACKEND_UNAVAILABLE', message: 'Backend not ready' } }));
            }
          };
          proxy.on('error', silentHandler);
          setImmediate(() => {
            proxy.removeAllListeners('error');
            proxy.on('error', silentHandler);
          });
        },
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
