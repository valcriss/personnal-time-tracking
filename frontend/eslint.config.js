export default [
  {
    files: ["**/*.vue"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      parser: (await import("vue-eslint-parser")).default,
      parserOptions: {
        parser: (await import("@typescript-eslint/parser")).default,
        sourceType: "module",
        ecmaVersion: "latest",
        extraFileExtensions: [".vue"]
      }
    },
    plugins: {
      "@typescript-eslint": (await import("@typescript-eslint/eslint-plugin")).default,
      vue: (await import("eslint-plugin-vue")).default
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
      "vue/multi-word-component-names": "off"
    }
  },
  {
    files: ["**/*.ts"],
    ignores: ["dist/**", "node_modules/**"],
    languageOptions: {
      parser: (await import("@typescript-eslint/parser")).default,
      parserOptions: {
        sourceType: "module",
        ecmaVersion: "latest"
      }
    },
    plugins: {
      "@typescript-eslint": (await import("@typescript-eslint/eslint-plugin")).default
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }]
    }
  },
  (await import("eslint-config-prettier")).default
];
