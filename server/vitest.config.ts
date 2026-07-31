import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['dist/**', 'node_modules/**'],
    env: {
      JWT_SECRET: 'test-only-jwt-secret-at-least-32-characters',
    },
  },
});
