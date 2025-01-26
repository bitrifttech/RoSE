import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 8080,
    proxy: {
      '/files': {
        target: 'http://dev_container:4000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            console.log('Sending Request:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response:', proxyRes.statusCode, req.url);
          });
        }
      },
      '/server': {
        target: 'http://dev_container:4000',
        changeOrigin: true,
        secure: false,
      },
      '/dev_container': {
        target: 'http://dev_container:4000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/dev_container/, ''),
      },
      '/api': {
        target: 'http://container-orchestrator:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/langgraph': {
        target: 'http://langgraph_soa:8000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/langgraph/, ''),
      },
    },
  },
})
