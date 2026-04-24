import js from "@eslint/js";
import globals from "globals";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist"] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
      "@typescript-eslint/no-unused-vars": "off",
      // Polkadot/SIWS typings and third-party extension shims make selective `any`
      // usage the pragmatic choice here. Not enforced at the repo level; the IDE
      // will still surface it in hover. Revisit post-Phase-2.
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    // shadcn/ui components ship with co-exports (cva variants) that trip
    // react-refresh's single-export-per-file rule. Vendor code; not ours to
    // restructure.
    files: ["src/components/ui/**/*.{ts,tsx}"],
    rules: {
      "react-refresh/only-export-components": "off",
    },
  }
);
