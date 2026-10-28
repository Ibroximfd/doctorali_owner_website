import { readdirSync } from "node:fs";

import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Qatlam qoidasi: `app → features → shared`. Feature boshqa featureni import
 * qilmaydi (kompozitsiya `app` da), `shared` esa hech kimni tanimaydi.
 *
 * Qo'shimcha: namuna (soxta) ma'lumot va test yordamchilari (`src/shared/testing`)
 * faqat testlarda va demo rejimda (`src/shared/demo`) — boshqa ishchi kod ularni import qilmaydi.
 * ESLint da bitta qoidani keyingi blok to'liq almashtiradi, shuning uchun har blok
 * o'ziga kerakli hamma taqiqni o'zi sanaydi.
 */
const FEATURES = readdirSync(new URL("./src/features", import.meta.url), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const TEST_FILES = ["src/**/*.test.{ts,tsx}"];

const NO_TEST_DATA = {
  group: ["@/shared/testing", "@/shared/testing/*", "**/testing/fixtures/*"],
  message: "Namuna/test ma'lumoti ishchi kodga kirmaydi — sayt faqat API ma'lumotini ko'rsatadi.",
};

const restrict = (patterns) => ({ "no-restricted-imports": ["error", { patterns }] });

const featurePatterns = (feature) => [
  {
    group: ["@/features/*", `!@/features/${feature}`, `!@/features/${feature}/**`],
    message: "Feature boshqa featureni import qilmaydi — umumiy narsa `shared` ga, kompozitsiya `app` ga.",
  },
  { group: ["@/app/*"], message: "Feature `app` ni import qilmaydi." },
];

const featureBoundaries = FEATURES.flatMap((feature) => [
  {
    files: [`src/features/${feature}/**/*.{ts,tsx}`],
    ignores: TEST_FILES,
    rules: restrict([...featurePatterns(feature), NO_TEST_DATA]),
  },
  {
    files: [`src/features/${feature}/**/*.test.{ts,tsx}`],
    rules: restrict(featurePatterns(feature)),
  },
]);

const SHARED_UP = {
  group: ["@/features/*", "@/app/*"],
  message: "`shared` yuqori qatlamlarni import qilmaydi.",
};

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
    files: ["src/app/**/*.{ts,tsx}", "src/i18n/**/*.{ts,tsx}", "src/proxy.ts"],
    ignores: TEST_FILES,
    rules: restrict([NO_TEST_DATA]),
  },
  {
    files: ["src/shared/**/*.{ts,tsx}"],
    ignores: [...TEST_FILES, "src/shared/testing/**", "src/shared/demo/**"],
    rules: restrict([SHARED_UP, NO_TEST_DATA]),
  },
  {
    files: ["src/shared/**/*.test.{ts,tsx}", "src/shared/testing/**/*.{ts,tsx}"],
    rules: restrict([SHARED_UP]),
  },
  {
    // Demo rejim (`config/servers.mjs`) — namuna bazani ishchi kodga ulaydigan YAGONA joy.
    files: ["src/shared/demo/**/*.{ts,tsx}"],
    rules: restrict([SHARED_UP]),
  },
  ...featureBoundaries,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
]);

export default eslintConfig;
