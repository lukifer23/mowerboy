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
    sourcemap: false,
    assetsInlineLimit: 0,
    rolldownOptions: {
      output: {
        manualChunks(id) {
          return id.includes("node_modules/phaser/") ? "phaser" : undefined;
        },
      },
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
