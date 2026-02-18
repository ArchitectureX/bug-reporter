import js from "@eslint/js";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";

export default [
  js.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: { jsx: true }
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        Blob: "readonly",
        File: "readonly",
        MediaRecorder: "readonly",
        MediaStream: "readonly",
        HTMLCanvasElement: "readonly",
        fetch: "readonly",
        console: "readonly",
        performance: "readonly"
      }
    },
    plugins: {
      "@typescript-eslint": tseslint
    },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/consistent-type-imports": "error",
      "no-console": "off"
    }
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      globals: {
        process: "readonly",
        console: "readonly",
        __dirname: "readonly",
        crypto: "readonly"
      }
    }
  },
  {
    ignores: ["dist/**", "**/dist/**", "node_modules/**", "**/node_modules/**", "_legacy_app_backup/**"]
  },
  prettier
];
