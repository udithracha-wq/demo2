import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * PostGrid In-District Audit Report: select every row on the current batch,
 * Confirm and Next, then repeat until the report reports that all
 * transactions are completed.
 *
 * Locators from codegen-output/post-grid-selecting-all.ts
 */
export class PostGridSelectingAllPage extends BasePage {
  private static readonly MAX_BATCHES = 80;
  /** Green banner when the PostGrid batch loop is finished. */
  private static readonly COMPLETED_MESSAGE =
    /all transactions? are (?:reviewed|completed)/i;

  private reportTitle(): Locator {
    return this.page
      .getByText(/PostGrid In-District Audit Report\s*\(/i)
      .first();
  }

  /** Title once the row count has backfilled off "(0)". */
  private loadedReportTitle(): Locator {
    return this.page
      .getByText(/PostGrid In-District Audit Report\s*\((?!0\))\d+\)/i)
      .first();
  }

  private confirmAndNextButton(): Locator {
    return this.page.getByRole('button', { name: 'Confirm and Next' });
  }

  private completedMessage(): Locator {
    return this.page
      .getByText(PostGridSelectingAllPage.COMPLETED_MESSAGE)
      .or(
        this.page
          .locator(
            '.slds-theme_success, .slds-notify, .slds-alert, .slds-badge, ' +
              '[class*="success"], [class*="banner"]'
          )
          .filter({ hasText: PostGridSelectingAllPage.COMPLETED_MESSAGE })
      )
      .first();
  }

  /**
   * Green banner shown when every PostGrid row is already confirmed.
   * Returns the banner text, or null when the report still has work left.
   */
  private async readReviewedBanner(): Promise<string | null> {
    const banner = this.completedMessage();
    const visible = await banner
      .isVisible({ timeout: 1_500 })
      .catch(() => false);
    if (!visible) return null;

    const text = (await banner.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    return text || 'All Transactions are Reviewed';
  }

  private anyReportHeading(): Locator {
    return this.page.getByText(/PostGrid In-District Audit Report/i).first();
  }

  private toasts(): Locator {
    return this.page.locator(
      '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
        '.toastContainer .slds-notify'
    );
  }

  private reportRoot(): Locator {
    return this.page
      .locator('flexipage-component2')
      .filter({ hasText: /PostGrid In-District Audit Report/i })
      .first();
  }

  private selectAllFaux(): Locator {
    const inReport = this.reportRoot().locator(
      '.slds-checkbox__label > .slds-checkbox_faux'
    );
    const onPage = this.page.locator(
      '.slds-checkbox__label > .slds-checkbox_faux'
    );
    return inReport.first().or(onPage.first());
  }

  private rowFauxCheckboxes(): Locator {
    const inReport = this.reportRoot().locator(
      '.slds-checkbox__label > .slds-checkbox_faux'
    );
    return inReport.or(
      this.page.locator('.slds-checkbox__label > .slds-checkbox_faux')
    );
  }

  private transactionLinks(): Locator {
    return this.page.getByRole('link', { name: /^T-\d+/ });
  }

  async openPostGridInDistrictAuditReport(): Promise<void> {
    await this.withRefreshRetry(
      () => this.openPostGridInDistrictAuditReportOnce(),
      'PostGrid In-District Audit Report'
    );
  }

  private async openPostGridInDistrictAuditReportOnce(): Promise<void> {
    await this.clickPostGridAction();

    await expect(this.anyReportHeading()).toBeVisible({ timeout: 45_000 });

    const alreadyReviewed = await this.readReviewedBanner();
    if (alreadyReviewed) {
      console.log(alreadyReviewed);
      return;
    }

    // Wait until either the green completion banner or a loaded grid appears.
    let state = '';
    await expect
      .poll(
        async () => {
          const banner = await this.readReviewedBanner();
          if (banner) {
            state = 'reviewed';
            return true;
          }
          if (
            await this.loadedReportTitle()
              .isVisible()
              .catch(() => false)
          ) {
            state = 'grid';
            return true;
          }
          return false;
        },
        {
          timeout: 45_000,
          message:
            'Expected PostGrid grid rows or "All Transactions are Reviewed".',
        }
      )
      .toBe(true);

    if (state === 'reviewed') {
      console.log(
        (await this.readReviewedBanner()) || 'All Transactions are Reviewed'
      );
      return;
    }

    await expect(
      this.transactionLinks()
        .first()
        .or(
          this.page
            .locator('.slds-checkbox__label > .slds-checkbox_faux')
            .first()
        )
    ).toBeVisible({ timeout: 90_000 });

    console.log(
      'Opened:',
      (await this.loadedReportTitle().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * The case action is sometimes covered or tucked under Show more actions.
   * Try the visible button, then the overflow menu, then a forced click.
   */
  private async clickPostGridAction(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'PostGrid In-District Audit',
    });

    if (await btn.isVisible({ timeout: 20_000 }).catch(() => false)) {
      await btn.scrollIntoViewIfNeeded().catch(() => undefined);
      try {
        await btn.click({ timeout: 20_000 });
        return;
      } catch {
        console.log(
          'PostGrid button was visible but the click did not land. Trying Show more actions.'
        );
      }
    }

    const more = this.page.getByRole('button', { name: 'Show more actions' });
    if (await more.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await more.click();
      const item = this.page
        .getByRole('menuitem', { name: /PostGrid In-District Audit/i })
        .or(btn);
      await expect(item.first()).toBeVisible({ timeout: 15_000 });
      await item.first().click();
      return;
    }

    await expect(btn).toBeVisible({ timeout: 30_000 });
    await btn.click({ force: true, timeout: 30_000 });
  }

  async isAllTransactionsCompleted(): Promise<boolean> {
    return (await this.readReviewedBanner()) !== null;
  }

  async expectAllTransactionsCompleted(): Promise<void> {
    const banner = await this.readReviewedBanner();
    if (banner) {
      console.log(banner);
      return;
    }

    await expect(this.completedMessage()).toBeVisible({ timeout: 60_000 });
    console.log(
      (await this.readReviewedBanner()) || 'All Transactions are Reviewed'
    );
  }

  /**
   * Ensure every visible row is selected so Confirm and Next becomes enabled.
   * Trust the Confirm button state over faux-checkbox heuristics — after a
   * batch processes, rows reload unchecked while our old detection can lie.
   */
  async ensureAllCheckboxesChecked(): Promise<void> {
    if (await this.isAllTransactionsCompleted()) return;

    const confirm = this.confirmAndNextButton();
    await expect(this.selectAllFaux()).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(async () => this.rowFauxCheckboxes().count(), {
        timeout: 60_000,
        message: 'Expected PostGrid row checkboxes to render',
      })
      .toBeGreaterThan(1);

    if (await confirm.isEnabled().catch(() => false)) {
      console.log('Confirm and Next already enabled — selection ready');
      return;
    }

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (await this.isAllTransactionsCompleted()) return;

      console.log(
        `Selecting all PostGrid rows via header checkbox (attempt ${attempt})…`
      );
      await this.selectAllFaux().click({ force: true });

      let outcome: 'reviewed' | 'ready' | '' = '';
      const ok = await expect
        .poll(
          async () => {
            if (await this.isAllTransactionsCompleted()) {
              outcome = 'reviewed';
              return true;
            }
            if (await confirm.isEnabled().catch(() => false)) {
              outcome = 'ready';
              return true;
            }
            return false;
          },
          { timeout: 15_000, intervals: [250, 500, 1_000] }
        )
        .toBe(true)
        .then(() => true)
        .catch(() => false);

      if (ok && outcome === 'reviewed') return;
      if (ok && outcome === 'ready') {
        console.log('Confirm and Next enabled after Select All');
        return;
      }
    }

    throw new Error(
      'Could not enable Confirm and Next after selecting all PostGrid rows.'
    );
  }

  async clickConfirmAndNext(): Promise<string> {
    const btn = this.confirmAndNextButton();
    await expect(btn).toBeVisible({ timeout: 60_000 });

    if (!(await btn.isEnabled().catch(() => false))) {
      if (await this.isAllTransactionsCompleted()) {
        return (
          (await this.completedMessage().innerText().catch(() => ''))
            .replace(/\s+/g, ' ')
            .trim() || 'All Transactions are Reviewed'
        );
      }
      await expect(btn).toBeEnabled({ timeout: 30_000 });
    }

    console.log('Clicking Confirm and Next…');
    await btn.click();
    return this.captureConfirmResult(90_000);
  }

  /**
   * After Confirm and Next:
   * - any error toast → fail the test immediately
   * - success toast → continue the batch loop
   * - "All Transactions are Reviewed" → done
   */
  private async captureConfirmResult(timeoutMs: number): Promise<string> {
    const successish =
      /success|confirm|saved|updated|submitted|complete|record|reviewed|processed/i;
    const errorish = /error|exception|cannot_|failed|unable/i;

    let message = '';
    await expect
      .poll(
        async () => {
          if (await this.isAllTransactionsCompleted()) {
            message =
              (await this.completedMessage().innerText().catch(() => ''))
                .replace(/\s+/g, ' ')
                .trim() || 'All Transactions are Reviewed';
            return true;
          }

          const toastTexts = (
            await this.toasts().allInnerTexts().catch(() => [])
          )
            .map((t) => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

          if (!toastTexts.length) return false;

          const joined = [...new Set(toastTexts)].join(' | ');
          if (toastTexts.some((t) => errorish.test(t))) {
            throw new Error(
              `Confirm and Next failed with Salesforce error: ${joined}`
            );
          }
          if (toastTexts.some((t) => successish.test(t))) {
            message = joined;
            return true;
          }
          return false;
        },
        {
          timeout: timeoutMs,
          message:
            'Expected a success message after Confirm and Next, but none appeared.',
        }
      )
      .toBe(true);

    console.log(
      PostGridSelectingAllPage.COMPLETED_MESSAGE.test(message)
        ? `Completion: ${message}`
        : `Success message: ${message}`
    );
    return message;
  }

  /**
   * After a batch succeeds, wait for the next grid (Confirm disabled again with
   * rows) or the green "All Transactions are Reviewed" banner.
   */
  private async waitForNextBatchOrReviewed(): Promise<'reviewed' | 'batch'> {
    let state: 'reviewed' | 'batch' | '' = '';
    await expect
      .poll(
        async () => {
          if (await this.isAllTransactionsCompleted()) {
            state = 'reviewed';
            return true;
          }

          const confirm = this.confirmAndNextButton();
          const visible = await confirm.isVisible().catch(() => false);
          if (!visible) return false;

          const enabled = await confirm.isEnabled().catch(() => false);
          const rowCount = await this.rowFauxCheckboxes().count();
          // Next batch: Confirm present (often disabled until Select All) and rows shown.
          if (rowCount > 1) {
            state = 'batch';
            return true;
          }
          // Sometimes Confirm stays enabled if residual selection remains.
          if (enabled) {
            state = 'batch';
            return true;
          }
          return false;
        },
        {
          timeout: 120_000,
          message:
            'Expected the next PostGrid batch or "All Transactions are Reviewed".',
        }
      )
      .toBe(true);

    return state === 'reviewed' ? 'reviewed' : 'batch';
  }

  /**
   * Select-all → Confirm and Next → assert success, repeating until the
   * report shows that all transactions are reviewed.
   */
  async selectAllAndConfirmUntilCompleted(): Promise<{
    batches: number;
    lastMessage: string;
  }> {
    let batches = 0;
    let lastMessage = '';

    for (let i = 0; i < PostGridSelectingAllPage.MAX_BATCHES; i++) {
      const reviewed = await this.readReviewedBanner();
      if (reviewed) {
        console.log(reviewed);
        return { batches, lastMessage: reviewed };
      }

      const confirm = this.confirmAndNextButton();
      const confirmVisible = await confirm
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (!confirmVisible) {
        const next = await this.waitForNextBatchOrReviewed();
        if (next === 'reviewed') {
          const banner =
            (await this.readReviewedBanner()) || 'All Transactions are Reviewed';
          console.log(banner);
          return { batches, lastMessage: banner };
        }
      }

      await this.ensureAllCheckboxesChecked();
      const reviewedAfterSelect = await this.readReviewedBanner();
      if (reviewedAfterSelect) {
        console.log(reviewedAfterSelect);
        return { batches, lastMessage: reviewedAfterSelect };
      }

      lastMessage = await this.clickConfirmAndNext();
      batches += 1;
      console.log(`PostGrid batch ${batches} confirmed.`);

      if (PostGridSelectingAllPage.COMPLETED_MESSAGE.test(lastMessage)) {
        return { batches, lastMessage };
      }

      const next = await this.waitForNextBatchOrReviewed();
      if (next === 'reviewed') {
        const banner =
          (await this.readReviewedBanner()) || lastMessage || 'All Transactions are Reviewed';
        console.log(banner);
        return { batches, lastMessage: banner };
      }
    }

    throw new Error(
      `Still seeing Confirm and Next after ${PostGridSelectingAllPage.MAX_BATCHES} ` +
        'batches — expected the "All Transactions are Reviewed" message.'
    );
  }
}
