import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        // Defaults to a locally-run backend (8080); override with
        // VITE_PROXY_TARGET to point at e.g. the docker-compose backend (8085).
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
      },
      // Live GPS tracking (Phase 3): proxy the STOMP/WebSocket handshake.
      "/ws": {
        target: process.env.VITE_PROXY_TARGET || "http://localhost:8080",
        changeOrigin: true,
        ws: true,
      },
    },
  },
});
