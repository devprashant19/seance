import { resolve } from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

/** Local relay the dev server proxies `/relay` to (same-origin wss:// avoids mixed-content blocking). */
const RELAY_TARGET = process.env["SEANCE_RELAY_TARGET"] ?? "ws://127.0.0.1:4000";

// `vite --mode phone` serves HTTPS with a self-signed certificate so phones on the LAN
// grant motion/orientation access (browsers only allow sensors on secure pages).
export default defineConfig(({ mode }) => ({
  plugins: mode === "phone" ? [react(), basicSsl()] : [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/relay": { target: RELAY_TARGET, ws: true, rewrite: (p: string) => p.replace(/^\/relay/, "") },
      // Banshee Choir dev server (base /choir/), so both apps share one origin like production.
      "/choir": {
        target: `${mode === "phone" ? "https" : "http"}://127.0.0.1:5174`,
        ws: true,
        secure: false, // the Choir's dev certificate is self-signed
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        join: resolve(__dirname, "join.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules/three")) return "three";
          if (
            id.includes("node_modules/react-router") ||
            id.includes("node_modules/@remix-run")
          ) {
            return "router";
          }
          if (
            id.includes("node_modules/react") ||
            id.includes("node_modules/react-dom")
          ) {
            return "react";
          }
        },
      },
    },
  },
}));
