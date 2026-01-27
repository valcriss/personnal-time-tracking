import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true
      }
    }
  },
  test: {
    environment: "jsdom",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,vue}"],
      exclude: ["src/main.ts", "src/components/DayRow.vue"],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100
    }
  }
});
