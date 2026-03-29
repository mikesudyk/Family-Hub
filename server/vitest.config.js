const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/__tests__/setup.js'],
    testTimeout: 15000,
    // Override DATABASE_URL with the test database before any module loads
    env: {
      DATABASE_URL: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL || '',
      JWT_SECRET:   process.env.JWT_SECRET        || 'test-secret-do-not-use-in-prod',
    },
  },
});
