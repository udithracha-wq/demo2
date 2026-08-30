import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Example home/landing page — replace with real application pages.
 */
export class HomePage extends BasePage {
  async open(path: string = '/'): Promise<void> {
    await this.goto(path);
  }

  async expectTitleContains(text: string): Promise<void> {
    await expect(this.page).toHaveTitle(new RegExp(text, 'i'));
  }

  async expectHeadingVisible(name: string | RegExp): Promise<void> {
    await expect(this.page.getByRole('heading', { name })).toBeVisible();
  }
}
