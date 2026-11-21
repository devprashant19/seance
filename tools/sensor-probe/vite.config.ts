import { defineConfig } from "vite";

export default defineConfig({
  server: {
    port: 5199,
    host: true,
  },
  build: {
    target: "es2022",
  },
});
