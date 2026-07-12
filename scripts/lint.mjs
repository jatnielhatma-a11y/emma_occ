import { ESLint } from "eslint";

const eslint = new ESLint({
  extensions: [".ts", ".tsx"],
  useEslintrc: false,
  errorOnUnmatchedPattern: false,
  overrideConfig: {
    ignorePatterns: [".next/**", ".tools/**", "node_modules/**", "dist/**", "coverage/**"],
    env: {
      browser: true,
      es2022: true,
      node: true,
    },
    parser: "@typescript-eslint/parser",
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: "latest",
      sourceType: "module",
    },
    plugins: ["@typescript-eslint"],
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "no-undef": "off",
    },
  },
});

const results = await eslint.lintFiles(["app", "components", "lib", "middleware.ts"]);
const formatter = await eslint.loadFormatter("stylish");
const output = formatter.format(results);

if (output) {
  console.log(output);
}

const errorCount = results.reduce((count, result) => count + result.errorCount, 0);
const warningCount = results.reduce((count, result) => count + result.warningCount, 0);

if (errorCount > 0 || warningCount > 0) {
  process.exitCode = 1;
}
