import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Testlar o'z modulining yonida (`*.test.ts(x)`). Sukutda `node` muhiti;
 * DOM kerak bo'lgan test boshida `// @vitest-environment jsdom` deb yozadi.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      // `server-only` Node'da ataylab xato otadi — testda bo'sh modulga almashtiriladi.
      "server-only": path.resolve(__dirname, "src/shared/testing/server-only.ts"),
    },
  },
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    setupFiles: ["./vitest.setup.ts"],
    // Ekran testlari butun sahifani (o'nlab blok, grafiklar) chizadi — parallel ishlaganda 5 s chegarada qoladi.
    testTimeout: 15_000,
    css: false,
    environmentOptions: { jsdom: { url: "http://localhost:3000" } },
  },
});
