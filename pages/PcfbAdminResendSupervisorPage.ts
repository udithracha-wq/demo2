import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PCFB Admin: case → Report Generator → Send to Supervisor Review → Finish.
 *
 * Mirrors PcfbAdminResendPaymentAnalystPage with the Supervisor Review action.
 */
export class PcfbAdminResendSupervisorPage extends BasePage {
  async clickSendToSupervisorReview(): Promise<void> {
    const button = this.page.getByRole('button', {
      name: /Send to Supervisor Review/i,
    });
    await expect(button).toBeVisible({ timeout: 60_000 });
    await expect(button).toBeEnabled({ timeout: 15_000 });
    await button.click();
  }
}
