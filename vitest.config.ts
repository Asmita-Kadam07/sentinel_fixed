import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['services/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'json'],
    },
  },
});
