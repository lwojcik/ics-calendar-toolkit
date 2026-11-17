import { createConfig } from '@lwojcik/eslint-config';

export default createConfig({
  tsconfigRootDir: import.meta.dirname,
  importAliases: ['@ics'],
  ignores: ['coverage/', 'dist/'],
  untypedFiles: ['vitest.config.ts', 'tsdown.config.ts', 'eslint.config.js'],
  nodeVersion: '>=24.0.0',
  overrides: [
    {
      files: ['src/duplicates.ts'],
      rules: { 'optimize-regex/optimize-regex': 'off' },
    },
  ],
});
