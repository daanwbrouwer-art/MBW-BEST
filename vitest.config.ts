import { fileURLToPath, URL } from "url";
import { defineConfig } from "vitest/config";

// Separate from vite.config.js (which pulls in @vitejs/plugin-react and dev
// server settings that tests don't need) — this only mirrors the `@` alias
// used throughout src/, plus vitest's own `test` block. jsdom is required
// because src/store/workout.ts's zustand `persist` middleware touches
// `localStorage` at import time, which plain Node doesn't provide.
export default defineConfig({
  resolve: {
    alias: [
      {
        find: "@",
        replacement: fileURLToPath(new URL("./src", import.meta.url)),
      },
    ],
  },
  test: {
    environment: "jsdom",
  },
});
