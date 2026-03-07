import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://127.0.0.1:3000',
    headless: true,
    screenshot: 'only-on-failure',
    launchOptions: {
      args: ['--no-proxy-server'],
    },
  },
  webServer: [
    {
      command: 'JWT_SECRET=dev-secret pnpm --filter @transweave/server run start:dev',
      port: 3001,
      reuseExistingServer: true,
      cwd: '../..',
      timeout: 120_000,
    },
    {
      command: 'NEXT_INTERNAL_API_URL=http://127.0.0.1:3001 pnpm run dev',
      port: 3000,
      reuseExistingServer: true,
      timeout: 30_000,
    },
  ],
});
