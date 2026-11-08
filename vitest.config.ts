import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/node_modules/**', '**/AUTAI_ZEN_AOD_2.0/**'],
  },
});
