import { readdirSync } from "node:fs";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Qatlam qoidasi: `app → features → shared`. Feature boshqa featureni import
 * qilmaydi (kompozitsiya `app` da), `shared` esa hech kimni tanimaydi.
 */
const FEATURES = readdirSync(new URL("./src/features", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const featureBoundaries = FEATURES.map((feature) => ({
  files: [`src/features/${feature}/**/*.{ts,tsx}`],
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns: [
          {
            group: ["@/features/*", `!@/features/${feature}`, `!@/features/${feature}/**`],
            message:
              "Feature boshqa featureni import qilmaydi — umumiy narsa `shared` ga, kompozitsiya `app` ga.",
          },
          { group: ["@/app/*"], message: "Feature `app` ni import qilmaydi." },
        ],
      },
    ],
  },
}));

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Tarmoqdan kelgan har narsa `unknown` → zod; `any` uchun o'rin yo'q.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-asserted-optional-chain": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "smart"],
    },
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            { group: ["@/features/*", "@/app/*"], message: "`shared` yuqori qatlamlarni import qilmaydi." },
          ],
        },
      ],
    },
  },
  ...featureBoundaries,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
