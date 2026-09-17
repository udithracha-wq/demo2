import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

/**
 * Playwright Test runner config (codegen + tests/*.spec.ts).
 * Cucumber BDD runs do NOT read anything from here — see
 * features/step-definitions/world.ts, which is kept in sync with these values.
 */
const authPath = path.resolve('.auth/nyselections.json');

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  // Lightning flows are slow; matches setDefaultTimeout in hooks.ts
  timeout: 600_000,
  expect: { timeout: 60_000 },
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    baseURL: process.env.BASE_URL,
    // Reuse the session from `npm run auth:save` when it exists
    storageState: fs.existsSync(authPath) ? authPath : undefined,
    headless: process.env.HEADLESS !== 'false',
    launchOptions: { slowMo: Number(process.env.SLOW_MO || 0) },
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'chromium',
      // Spread first: Desktop Chrome carries its own 1280x720 viewport
      use: { ...devices['Desktop Chrome'], viewport: { width: 1920, height: 1080 } },
    },
  ],
  outputDir: 'test-results',
});
