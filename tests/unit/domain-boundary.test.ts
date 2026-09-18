import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const bannedImports = ['react', 'react-native', 'expo-router', 'expo-sqlite'];

function findTypeScriptFiles(directory: string): string[] {
  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory).flatMap((entry) => {
    const path = resolve(directory, entry);
    if (statSync(path).isDirectory()) {
      return findTypeScriptFiles(path);
    }
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe('domain dependency boundary', () => {
  it('does not import UI, router, or database packages', () => {
    const files = findTypeScriptFiles(resolve(process.cwd(), 'src/domain'));

    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      for (const dependency of bannedImports) {
        expect(source, `${file} imports ${dependency}`).not.toMatch(
          new RegExp(`['\"]${dependency}(?:/[^'\"]*)?['\"]`),
        );
      }
    }
  });
});
