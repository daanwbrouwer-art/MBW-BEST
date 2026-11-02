import { fileURLToPath, URL } from "url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  logLevel: "error",
  // Relative paths for the Capacitor app bundle; absolute on Vercel so a
  // refresh or shared link on a nested route (/onboarding/welcome) still
  // finds /assets/... instead of /onboarding/assets/... (blank page).
  base: process.env.VERCEL ? "/" : "./",
  // Bind to 0.0.0.0 (not just localhost) so other devices on the same
  // Wi-Fi/LAN can reach the dev server at this machine's local IP — needed
  // for testing Train Together / multiplayer across phones or laptops.
  server: {
    host: true,
    port: process.env.PORT ? Number(process.env.PORT) : 5173,
  },
  preview: {
    host: true,
  },
  build: {
    emptyOutDir: true,
    sourcemap: false,
    minify: "esbuild",
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
