import { Page, expect } from '@playwright/test';

function briefFailure(value: unknown): string {
  const raw = value instanceof Error ? value.message : String(value ?? '');
  const lines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  return (
    lines.find((line) =>
      /Expected |Timeout|element\(s\) not found|still not as expected/i.test(line)
    ) ||
    lines[0] ||
    'the page was not as expected'
  );
}

/**
 * Shared helpers for all page objects.
 */
export class BasePage {
  constructor(protected readonly page: Page) {}

  /**
   * If the screen is not the one the action expects, reload once and try again.
   * A second failure stops the scenario.
   */
  protected async withRefreshRetry(
    action: () => Promise<void>,
    label: string
  ): Promise<void> {
    try {
      await action();
    } catch (first) {
      const firstWhy =
        first instanceof Error ? first.message.split('\n')[0] : String(first);
      console.log(
        `Page was not as expected during "${label}" (${firstWhy}). Refreshing and trying once more.`
      );
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      try {
        await action();
      } catch (second) {
        const why = briefFailure(second);
        throw new Error(
          `Page was still not as expected after refresh during "${label}". ${why}`
        );
      }
    }
  }

  async goto(path: string = '/'): Promise<void> {
    await this.page.goto(path);
  }

  async waitForVisible(locator: ReturnType<Page['locator']>): Promise<void> {
    await expect(locator).toBeVisible();
  }
}
