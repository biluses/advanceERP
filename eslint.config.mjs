import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "dist/**", "node_modules/**", "drizzle/**", "playwright-report/**", "test-results/**", "data/**"]),
  {
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
      /* The project does not use the React Compiler; the virtualizer is fine. */
      "react-hooks/incompatible-library": "off",
    },
  },
]);
