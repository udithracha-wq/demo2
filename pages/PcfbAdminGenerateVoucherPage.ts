import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PCFB Admin: Payment Cycle → Generate Voucher Report → success toast.
 *
 * Navigation to the Payment Cycle (committee Cases → Payment data as of)
 * reuses CoDirector1Page / shared steps.
 */
export class PcfbAdminGenerateVoucherPage extends BasePage {
  private static readonly TOAST =
    '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
    '.toastContainer .slds-notify';

  /**
   * Payment Cycle header action (or Show more actions overflow) →
   * Generate Voucher Report.
   */
  async clickGenerateVoucherReport(): Promise<void> {
    const direct = this.generateVoucherReportButton();
    if (await direct.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(direct).toBeEnabled({ timeout: 15_000 });
      await direct.click();
      return;
    }

    const more = this.page
      .getByRole('button', { name: /Show more actions/i })
      .first();
    await expect(more).toBeVisible({ timeout: 60_000 });
    await more.click();

    const menuItem = this.page
      .getByRole('menuitem', { name: /Generate Voucher Report/i })
      .first();
    await expect(menuItem).toBeVisible({ timeout: 15_000 });
    await menuItem.click();
  }

  async expectGenerateVoucherReportSuccess(): Promise<void> {
    const successish =
      /success|saved|updated|submitted|complete|generated|voucher|report/i;
    const errorish = /error|exception|failed|unable|access denied/i;

    let message = '';
    await expect
      .poll(
        async () => {
          const toastTexts = (
            await this.page.locator(PcfbAdminGenerateVoucherPage.TOAST).allInnerTexts()
          )
            .map((t) => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

          const dialogText = await this.readVisibleDialogText();
          const texts = [
            ...toastTexts,
            ...(dialogText ? [dialogText] : []),
          ];

          if (!texts.length) return false;

          const joined = [...new Set(texts)].join(' | ');
          if (texts.some((t) => errorish.test(t))) {
            throw new Error(
              `Generate Voucher Report failed with Salesforce error: ${joined}`
            );
          }
          if (texts.some((t) => successish.test(t))) {
            message = joined;
            return true;
          }
          return false;
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] }
      )
      .toBeTruthy();

    console.log(`Generate Voucher Report success: ${message}`);
  }

  private generateVoucherReportButton(): Locator {
    return this.page
      .getByRole('button', { name: /Generate Voucher Report/i })
      .first();
  }

  private async readVisibleDialogText(): Promise<string> {
    const dialog = this.page.getByRole('dialog').first();
    if (!(await dialog.isVisible().catch(() => false))) return '';
    return ((await dialog.innerText().catch(() => '')) ?? '')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
