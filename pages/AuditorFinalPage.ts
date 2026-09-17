import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type ReportClickResult = {
  /** Suggested filename when a download fired; empty when none did. */
  downloadName: string;
  /** Toast / dialog text seen after the click. */
  message: string;
};

/**
 * Auditor Final: download Rejected Claims / All Claims / Eligibility reports,
 * then approve from Approval History (approval itself reuses EmptyErrorMessagePage).
 *
 * Locators from codegen-output/auditor-final.ts
 *
 * Downloads are optional — Salesforce sometimes shows a toast/dialog instead
 * of (or before) a file download. Missing download must not fail the step.
 */
export class AuditorFinalPage extends BasePage {
  /**
   * Case toolbar → Generate Rejected Claims, collect any message, optionally
   * dismiss Cancel and close.
   */
  async generateRejectedClaimsReport(): Promise<ReportClickResult> {
    const btn = this.page.getByRole('button', {
      name: 'Generate Rejected Claims',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });

    const result = await this.clickAndCollect('Rejected Claims', async () => {
      await btn.click();
    });

    const cancelClose = this.page.getByRole('button', {
      name: 'Cancel and close',
    });
    if (await cancelClose.isVisible({ timeout: 5_000 }).catch(() => false)) {
      // Prefer dialog text if the toast poll missed it
      if (!result.message) {
        result.message = await this.readVisibleDialogText();
      }
      await cancelClose.click();
      await expect(cancelClose).toBeHidden({ timeout: 30_000 });
    }

    return result;
  }

  /** Show more actions → Generate All Claims Report. */
  async generateAllClaimsReport(): Promise<ReportClickResult> {
    const more = this.page.getByRole('button', { name: 'Show more actions' });
    await expect(more).toBeVisible({ timeout: 60_000 });
    await more.click();

    const menuItem = this.page.getByRole('menuitem', {
      name: 'Generate All Claims Report',
    });
    await expect(menuItem).toBeVisible({ timeout: 15_000 });

    return this.clickAndCollect('All Claims Report', async () => {
      await menuItem.click();
    });
  }

  /** Case toolbar → Generate Eligibility Report. */
  async generateEligibilityReport(): Promise<ReportClickResult> {
    const btn = this.page.getByRole('button', {
      name: 'Generate Eligibility Report',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });

    return this.clickAndCollect('Eligibility Report', async () => {
      await btn.click();
    });
  }

  /**
   * Click a report action, soft-wait for a download, and collect any
   * toast/dialog message. Never throws solely because no download arrived.
   */
  private async clickAndCollect(
    label: string,
    click: () => Promise<void>
  ): Promise<ReportClickResult> {
    const downloadPromise = this.page
      .waitForEvent('download', { timeout: 30_000 })
      .then((d) => d.suggestedFilename())
      .catch(() => '');

    await click();

    const [downloadName, message] = await Promise.all([
      downloadPromise,
      this.capturePostClickMessage(30_000),
    ]);

    if (downloadName) {
      console.log(`${label} download: ${downloadName}`);
    } else {
      console.log(`${label}: no download event (continuing)`);
    }

    if (message) {
      console.log(`${label} message: ${message}`);
    } else {
      console.log(`${label}: no toast/dialog message collected`);
    }

    return { downloadName, message };
  }

  /** Toast + dialog text after a report button/menu click (soft — empty if none). */
  private async capturePostClickMessage(timeoutMs: number): Promise<string> {
    let message = '';
    try {
      await expect
        .poll(
          async () => {
            message =
              (await this.readVisibleToastText()) ||
              (await this.readVisibleDialogText());
            return message.length > 0;
          },
          { timeout: timeoutMs }
        )
        .toBe(true);
    } catch {
      // No toast/dialog within the window — caller continues anyway.
    }
    return message;
  }

  private notifications(): Locator {
    return this.page.locator(
      '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
        '.toastContainer .slds-notify'
    );
  }

  private async readVisibleToastText(): Promise<string> {
    const texts = (await this.notifications().allInnerTexts().catch(() => []))
      .map((t) => t.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return texts.length ? [...new Set(texts)].join(' | ') : '';
  }

  private async readVisibleDialogText(): Promise<string> {
    const dialog = this.page.getByRole('dialog').first();
    if (!(await dialog.isVisible().catch(() => false))) return '';

    const text = (await dialog.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    return text;
  }
}
