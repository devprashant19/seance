import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

/** Local relay the dev server proxies `/relay` to (same-origin wss:// avoids mixed-content blocking). */
const RELAY_TARGET = process.env["SEANCE_RELAY_TARGET"] ?? "ws://127.0.0.1:4000";

// The Choir lives under /choir/ on the same origin as the Lab (dev: the Lab server proxies
// /choir/ here; production: `pnpm build:site` puts this build in site/choir/).
// `vite --mode phone` serves HTTPS (self-signed) so phones on the LAN grant motion access.
export default defineConfig(({ mode }) => ({
  base: "/choir/",
  plugins: mode === "phone" ? [react(), basicSsl()] : [react()],
  server: {
    host: true,
    port: 5174,
    proxy: {
      "/relay": { target: RELAY_TARGET, ws: true, rewrite: (p: string) => p.replace(/^\/relay/, "") },
    },
  },
}));
