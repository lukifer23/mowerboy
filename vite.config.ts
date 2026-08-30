import { defineConfig } from "vitest/config";

export default defineConfig({
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: 5173,
    strictPort: true,
  },
  build: {
    target: "es2022",
    sourcemap: true,
    assetsInlineLimit: 0,
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
