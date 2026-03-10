const browserGlobals = {
  window: "readonly",
  document: "readonly",
  fetch: "readonly",
  URL: "readonly",
};

const serviceWorkerGlobals = {
  ...browserGlobals,
  self: "readonly",
  caches: "readonly",
};

const nodeGlobals = {
  module: "readonly",
  require: "readonly",
  process: "readonly",
  __dirname: "readonly",
};

export default [
  {
    ignores: ["node_modules/**", ".next/**", "out/**", "dist/**", "build/**"],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: browserGlobals,
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-undef": "error",
    },
  },
  {
    files: ["postcss.config.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: nodeGlobals,
    },
  },
  {
    files: ["public/sw.js"],
    languageOptions: {
      globals: serviceWorkerGlobals,
    },
  },
];
