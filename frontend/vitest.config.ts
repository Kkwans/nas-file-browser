import { defineConfig, configDefaults } from "vitest/config";

export default defineConfig({
  test: {
    // Playwright owns browser specs under e2e/. Keep the unit/static suite
    // deterministic and let `pnpm run test:e2e` be the explicit browser gate.
    exclude: [...configDefaults.exclude, "e2e/**"],
  },
});
