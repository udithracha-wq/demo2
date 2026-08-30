import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config (used for codegen / tooling).
 * Cucumber BDD runs do NOT read baseURL from here — set it in features/step-definitions/world.ts.
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { open: 'never', outputFolder: 'reports/playwright-html' }],
    ['allure-playwright', { outputFolder: 'allure-results' }],
  ],
  use: {
    trace: 'retain-on-failure',
    screenshot: 'on',
    video: 'on',
    ignoreHTTPSErrors: true,
    viewport: { width: 1920, height: 1080 },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  outputDir: 'test-results',
});
