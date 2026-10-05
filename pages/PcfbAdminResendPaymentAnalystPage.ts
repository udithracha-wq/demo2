import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PCFB Admin: case → Report Generator → Resend To Payment Analyst → Finish.
 *
 * Locators from codegen-output/pcfb-admin-resend-payament-analyst.ts
 */
export class PcfbAdminResendPaymentAnalystPage extends BasePage {
  async openReportGeneratorTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Report Generator' });
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
  }

  async clickResendToPaymentAnalyst(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: 'Resend To Payment Analyst',
    });
    await expect(button).toBeVisible({ timeout: 60_000 });
    await expect(button).toBeEnabled({ timeout: 15_000 });
    await button.click();
  }

  async clickFinish(): Promise<void> {
    const finish = this.page.getByRole('button', { name: /^Finish$/i });
    await expect(finish).toBeVisible({ timeout: 60_000 });
    await expect(finish).toBeEnabled({ timeout: 15_000 });
    await finish.click();
    // Flow should close after Finish completes.
    await expect(finish).toBeHidden({ timeout: 90_000 }).catch(() => undefined);
  }

  /**
   * After Finish, wait for the flow to settle, reload the case twice so
   * Salesforce picks up the new Status, and reopen Details.
   */
  async waitAndRefreshCase(): Promise<void> {
    const finish = this.page.getByRole('button', { name: /^Finish$/i });
    await expect(finish)
      .toBeHidden({ timeout: 90_000 })
      .catch(() => undefined);

    // Backend status update lags the UI close — brief settle before refresh.
    await this.page.waitForTimeout(15_000);

    for (let i = 0; i < 2; i++) {
      await this.page.reload({ waitUntil: 'domcontentloaded' });

      const detailsTab = this.page.getByRole('tab', { name: 'Details' });
      await expect(detailsTab).toBeVisible({ timeout: 60_000 });
      await detailsTab.click();

      const editStatus = this.page.getByRole('button', {
        name: /^Edit Status$/i,
      });
      await expect(editStatus.first())
        .toBeVisible({ timeout: 30_000 })
        .catch(() => undefined);

      if (i === 0) await this.page.waitForTimeout(5_000);
    }
  }
}
