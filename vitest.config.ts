import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist'],
    coverage: {
      provider: 'c8',
      reporter: ['text', 'json', 'html'],
      exclude: ['src/test-utils/**', 'src/__tests__/**'],
    },
    setupFiles: ['src/test-utils/setup.ts'],
    testTimeout: 10000,
    hookTimeout: 10000,
    reporters: ['default', 'html'],
    outputFile: {
      html: './coverage/html/index.html',
    },
  },
  resolve: {
    alias: {
      '@': '/src',
    },
  },
});