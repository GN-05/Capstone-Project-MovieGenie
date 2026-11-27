import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // tests never use the real secrets in .env
    env: {
      JWT_SECRET: 'test-secret',
      CLIENT_ORIGIN: 'http://localhost:5173',
    },
  },
});
