import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.ts"],
      exclude: ["src/server.ts", "src/infra/prismaClient.ts"],
      lines: 100,
      functions: 100,
      branches: 100,
      statements: 100
    }
  }
});
