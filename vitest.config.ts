import { resolve } from 'node:path';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      { find: /^@\/domain\/(.*)$/, replacement: resolve(__dirname, 'src/domain/$1') },
      {
        find: /^@\/interpretation\/(.*)$/,
        replacement: resolve(__dirname, 'src/domain/interpretation/$1'),
      },
      {
        find: /^@\/professional\/(.*)$/,
        replacement: resolve(__dirname, 'src/domain/professional/$1'),
      },
      { find: '@', replacement: resolve(__dirname, 'src') },
    ],
  },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
