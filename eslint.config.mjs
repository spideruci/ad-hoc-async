import typescriptEslint from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import importPlugin from "eslint-plugin-import";

export default [
    {
        files: ["**/*.ts"],
        // ✅ Exclude specific files or directories
        ignores: [
            "node_modules/",
            "dist/",
            "build/",
            "**/generated/*",
            "**/*.test.ts",
            "**/legacy/**",
        ],

        rules: {
            "no-console": ["error", { allow: ["warn", "error"] }],
            "curly": "error",
            "eqeqeq": "error",
            "no-throw-literal": "error",
            "semi": ["error", "always"],
            "quotes": ["error", "double", { "avoidEscape": true }],
            "indent": ["error", 2, { "SwitchCase": 1 }],
            "max-len": ["warn", { "code": 120 }],
        },
    },
    {
        plugins: {
            "@typescript-eslint": typescriptEslint,
            "import": importPlugin,
        },

        languageOptions: {
            parser: tsParser,
            ecmaVersion: 2022,
            sourceType: "module",
            parserOptions: {
                project: ["./tsconfig.json"],
            },
        },

        rules: {
            "@typescript-eslint/explicit-function-return-type": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { "argsIgnorePattern": "^_" }],
            "@typescript-eslint/no-explicit-any": "warn",
            "@typescript-eslint/no-floating-promises": "error",
            "@typescript-eslint/consistent-type-imports": "warn",

            "@typescript-eslint/naming-convention": [
                "warn",
                { selector: "import", format: ["camelCase", "PascalCase"] },
            ],

            "import/order": ["error", { "groups": ["builtin", "external", "internal"] }],
            "import/no-extraneous-dependencies": "error",
            "import/newline-after-import": "error",
        },
    },
];
