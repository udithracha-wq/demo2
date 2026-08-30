import { Page, expect } from '@playwright/test';

/**
 * Shared helpers for all page objects.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForVisible(locator: ReturnType<Page['locator']>): Promise<void> {
    await expect(locator).toBeVisible();
  }
}
