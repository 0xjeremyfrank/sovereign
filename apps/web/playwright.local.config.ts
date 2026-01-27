import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for local blockchain E2E tests
 *
 * Uses yarn dev:local which spins up:
 * - Anvil local blockchain
 * - Contract deployment
 * - VRF auto-fulfillment watcher
 * - Next.js with local chain config
 */
export default defineConfig({
  testDir: './e2e',
  testMatch: 'blockchain.spec.ts',
  reporter: 'list',
  timeout: 60000,
  expect: {
    timeout: 15000,
  },
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'cd ../.. && yarn dev:local',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120000, // 2 min for Anvil + contracts + Next.js
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
