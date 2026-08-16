import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "error",
  base: "./",
  // Bind to 0.0.0.0 (not just localhost) so other devices on the same
  // Wi-Fi/LAN can reach the dev server at this machine's local IP — needed
  // for testing Train Together / multiplayer across phones or laptops.
  server: {
    host: true,
  },
  preview: {
    host: true,
  },
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: false,
  },
  css: {
    postcss: "./postcss.config.js",
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
  plugins: [react()],
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
});
