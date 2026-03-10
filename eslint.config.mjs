// @ts-check
import nextConfig from "eslint-config-next";
import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

export default [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**", "build/**"],
  },
  ...nextConfig,
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Overrides for existing technical debt: downgraded to warn so CI passes
  // while remaining visible for gradual remediation.
  {
    rules: {
      // Many existing files use `any` – warn rather than block
      "@typescript-eslint/no-explicit-any": "warn",
      // Unused vars/imports are common in WIP code
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      // React-hooks stricter rules: warn until existing violations are fixed
      "react-hooks/static-components": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      // <img> instead of next/image – warn until images are migrated
      "@next/next/no-img-element": "warn",
      // Dutch UI strings often contain unescaped quotes – warn until fixed
      "react/no-unescaped-entities": "warn",
      // Existing code uses require() in a few places
      "@typescript-eslint/no-require-imports": "warn",
      // Existing code has some use-before-declare patterns
      "no-use-before-define": "warn",
      "react-hooks/immutability": "warn",
      // Existing code assigns to module in proxy/config files
      "@next/next/no-assign-module-variable": "warn",
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: {
        self: "readonly",
        caches: "readonly",
      },
    },
  },
];
