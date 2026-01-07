import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 0, // No timeout
    hookTimeout: 0, // No timeout
    reporters: ['verbose'],
    include: ['tests/**/*.spec.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});

