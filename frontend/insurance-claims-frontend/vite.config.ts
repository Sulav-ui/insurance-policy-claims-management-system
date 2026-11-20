import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: process.env.E2E_TEST === "true"
          ? "http://localhost:8081"
          : "http://localhost:8080",
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    include: ["src/**/*.{test,spec}.{ts,tsx}"],

    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/test/**",
        "src/**/*.test.*",
        "src/**/*.spec.*",
        "src/**/*.d.ts",
        "src/main.tsx",
      ],
    },
  },
});