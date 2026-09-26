import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["server/**/*.integration.test.ts"],
    setupFiles: ["server/src/testing/closeSupertestAgents.ts"],
  },
});
