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
        this.page.locator(
          '.slds-theme_success, .slds-notify, .slds-alert, .slds-badge, ' +
            '[class*="success"], [class*="banner"]'
        ).filter({ hasText: PostGridSelectingAllPage.COMPLETED_MESSAGE })
      )
      .first();
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
    const btn = this.page.getByRole('button', {
      name: 'PostGrid In-District Audit',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();

    await expect(this.anyReportHeading()).toBeVisible({ timeout: 180_000 });

    // Wait until either the green completion banner or a loaded grid appears.
    let state = '';
    await expect
      .poll(
        async () => {
          if (
            await this.completedMessage()
              .isVisible()
              .catch(() => false)
          ) {
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
          timeout: 180_000,
          message:
            'Expected PostGrid grid rows or "All Transactions are Reviewed".',
        }
      )
      .toBe(true);

    if (state === 'reviewed' || (await this.isAllTransactionsCompleted())) {
      console.log('Opened PostGrid report — All Transactions are Reviewed');
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

  async isAllTransactionsCompleted(): Promise<boolean> {
    return this.completedMessage()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
  }

  async expectAllTransactionsCompleted(): Promise<void> {
    await expect(this.completedMessage()).toBeVisible({ timeout: 60_000 });
    console.log(
      'Completion message:',
      (await this.completedMessage().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Ensure every visible row checkbox is checked via the header Select All.
   */
  async ensureAllCheckboxesChecked(): Promise<void> {
    await expect(this.selectAllFaux()).toBeVisible({ timeout: 60_000 });
    await expect
      .poll(async () => this.rowFauxCheckboxes().count(), {
        timeout: 60_000,
        message: 'Expected PostGrid row checkboxes to render',
      })
      .toBeGreaterThan(1);

    if (await this.areAllRowCheckboxesChecked()) {
      console.log('All PostGrid row checkboxes already checked');
      return;
    }

    console.log('Selecting all PostGrid rows via header checkbox…');
    await this.selectAllFaux().click({ force: true });

    const selected = await expect
      .poll(async () => this.areAllRowCheckboxesChecked(), {
        timeout: 15_000,
        intervals: [250, 500, 1_000],
      })
      .toBe(true)
      .then(() => true)
      .catch(() => false);

    if (!selected) {
      // Second click only if still not selected (codegen clicked twice, but
      // a second click on an already-checked header would deselect).
      console.log('Rows still unchecked — clicking Select All once more…');
      await this.selectAllFaux().click({ force: true });
      await expect
        .poll(async () => this.areAllRowCheckboxesChecked(), {
          timeout: 30_000,
          message: 'Expected every PostGrid row checkbox to be checked',
        })
        .toBe(true);
    }

    console.log(
      `PostGrid selection confirmed for ${
        (await this.rowFauxCheckboxes().count()) - 1
      } row(s).`
    );
  }

  private async areAllRowCheckboxesChecked(): Promise<boolean> {
    const boxes = this.rowFauxCheckboxes();
    const count = await boxes.count();
    if (count <= 1) return false;

    for (let i = 1; i < count; i++) {
      if (!(await this.isFauxChecked(boxes.nth(i)))) return false;
    }
    return true;
  }

  private async isFauxChecked(faux: Locator): Promise<boolean> {
    const input = faux
      .locator(
        'xpath=ancestor::label[1]//input[@type="checkbox"] | ' +
          'ancestor::*[contains(@class,"slds-checkbox")][1]//input[@type="checkbox"]'
      )
      .first();

    if (await input.count()) {
      if (await input.isChecked().catch(() => false)) return true;
      if ((await input.getAttribute('aria-checked')) === 'true') return true;
    }

    const row = faux.locator(
      'xpath=ancestor::tr[1] | ancestor::*[@role="row"][1]'
    );
    if ((await row.getAttribute('aria-selected').catch(() => null)) === 'true') {
      return true;
    }

    // Visual cue used by this report: checked rows show a blue check glyph.
    const checkedIcon = faux
      .locator(
        'xpath=ancestor::td[1]//*[contains(@class,"slds-icon") or self::svg or self::img]'
      )
      .or(
        faux.locator(
          'xpath=following-sibling::*[contains(@class,"checked") or contains(@class,"selected")]'
        )
      );
    if (await checkedIcon.first().isVisible().catch(() => false)) return true;

    const className = (await faux.getAttribute('class').catch(() => '')) || '';
    return /is-checked|slds-is-selected|checked/i.test(className);
  }

  async clickConfirmAndNext(): Promise<string> {
    const btn = this.confirmAndNextButton();
    await expect(btn).toBeVisible({ timeout: 60_000 });

    // After the last successful batch the button can stay visible but disabled
    // while the green "All Transactions are Reviewed" banner appears.
    const enabled = await btn.isEnabled().catch(() => false);
    if (!enabled) {
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
      /success|confirm|saved|updated|submitted|complete|record|reviewed/i;
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
      if (await this.isAllTransactionsCompleted()) {
        console.log(
          `All PostGrid transactions reviewed after ${batches} Confirm and Next batch(es).`
        );
        return { batches, lastMessage };
      }

      const confirm = this.confirmAndNextButton();
      const confirmVisible = await confirm
        .isVisible({ timeout: 10_000 })
        .catch(() => false);

      if (!confirmVisible) {
        if (await this.isAllTransactionsCompleted()) {
          return { batches, lastMessage };
        }
        await expect(confirm).toBeVisible({ timeout: 60_000 });
      }

      // Disabled Confirm after prior batches usually means the review finished.
      const confirmEnabled = await confirm.isEnabled().catch(() => false);
      if (!confirmEnabled) {
        await expect
          .poll(async () => this.isAllTransactionsCompleted(), {
            timeout: 30_000,
            message:
              'Confirm and Next stayed disabled — expected "All Transactions are Reviewed".',
          })
          .toBe(true);
        return { batches, lastMessage };
      }

      await this.ensureAllCheckboxesChecked();
      lastMessage = await this.clickConfirmAndNext();
      batches += 1;
      console.log(`PostGrid batch ${batches} confirmed.`);

      if (PostGridSelectingAllPage.COMPLETED_MESSAGE.test(lastMessage)) {
        return { batches, lastMessage };
      }
    }

    throw new Error(
      `Still seeing Confirm and Next after ${PostGridSelectingAllPage.MAX_BATCHES} ` +
        'batches — expected the "All Transactions are Reviewed" message.'
    );
  }
}
