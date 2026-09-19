const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  globalIgnores([
    '.expo/**',
    '**/.next/**',
    'coverage/**',
    'dist/**',
    'node_modules/**',
    'apps/web/playwright-report/**',
    'apps/web/test-results/**',
    'apps/web/next-env.d.ts',
  ]),
  expoConfig,
  {
    files: ['scripts/**/*.ts', 'tests/**/*.ts', 'vitest.config.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
]);
