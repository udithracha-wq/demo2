import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Auditor Accept and Reject Report: open Accepted and Rejected Claims Data,
 * turn on Payment Disagreed Transactions, set In District Confirmed? to No
 * where Payment Analyst Status is Disagree, then Save.
 *
 * Locators from codegen-output/auditor-accept-and-reject-report.ts
 */
export class AuditorAcceptAndRejectReportPage extends BasePage {
  private static readonly MAX_REPORT_PAGES = 50;
  private static readonly STATUS_LABEL = 'Payment Analyst Status';
  private static readonly IN_DISTRICT_LABEL = 'In District Confirmed?';
  private static readonly TXN_LABEL = 'Transaction Number';
  private static readonly TOGGLE_LABEL = 'Payment Disagreed Transactions';

  private reportTitle(): Locator {
    return this.page
      .getByText(/Accepted\s+and\s+Rejected\s+Claims?\s*(Data)?\s*(Report)?\s*\(/i)
      .first();
  }

  private statusCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${AuditorAcceptAndRejectReportPage.STATUS_LABEL}"]`
    );
  }

  /**
   * Report chrome ready (before Payment Disagreed filter).
   * SF sticky headers often report as "hidden" to Playwright — prefer the
   * Payment Disagreed label (always in the toolbar) + attached column header.
   */
  private paymentDisagreedLabel(): Locator {
    return this.page
      .getByText(/^Payment\s+Disagreed\s+Transactions$/i)
      .first();
  }

  private async waitForStatusCells(): Promise<void> {
    await expect(this.statusCells().first()).toBeVisible({ timeout: 90_000 });
  }

  private async waitForReportGrid(): Promise<void> {
    await expect(this.paymentDisagreedLabel()).toBeVisible({ timeout: 90_000 });
    const header = this.page
      .getByRole('columnheader', { name: /Contributor Full Name/i })
      .first();
    await expect(header).toBeAttached({ timeout: 60_000 });
  }

  /**
   * Report Generator tab → Accepted and Rejected Claims (codegen).
   * Payment Analyst Status is only reliable after Payment Disagreed is Active —
   * so open waits for the report grid, not that column.
   */
  async openAcceptedAndRejectedClaimsDataReport(): Promise<void> {
    const reportTab = this.page.getByRole('tab', { name: 'Report Generator' });
    if (await reportTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await reportTab.click();
    }

    const btn = this.page.getByRole('button', {
      name: /Accepted\s+and\s+Rejected\s+Claims/i,
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();

    await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
    await this.waitForReportGrid();
    await this.ensureGroupByOff();
    console.log(
      'Opened:',
      (await this.reportTitle().innerText().catch(() => 'Accepted and Rejected Claims'))
        .replace(/\s+/g, ' ')
        .trim()
    );
  }

  /**
   * Click Payment Disagreed Transactions toggle until it shows Active.
   * Screenshot: label left of the switch, "Inactive"/"Active" under the knob.
   * Do NOT use input[name=gridToggle].first() — Group by is a separate switch.
   */
  async selectPaymentDisagreedTransactions(): Promise<void> {
    const label = this.page
      .getByText(/^Payment\s+Disagreed\s+Transactions$/i)
      .first();
    await expect(label).toBeVisible({ timeout: 60_000 });

    // Scope to the control that owns this exact label (not Group by).
    const control = this.page
      .locator(
        'xpath=//*[normalize-space()="Payment Disagreed Transactions"]' +
          '/ancestor::*[.//*[@role="switch"] or .//input[@type="checkbox"] ' +
          'or .//*[contains(@class,"slds-checkbox_toggle")] ' +
          'or .//*[contains(@class,"slds-checkbox_faux")]][1]'
      )
      .first();
    await expect(control).toBeVisible({ timeout: 30_000 });

    const inactiveUnderControl = control
      .locator('xpath=.//*[normalize-space()="Inactive"]')
      .first();
    const activeUnderControl = control
      .locator('xpath=.//*[normalize-space()="Active"]')
      .first();

    if (
      (await activeUnderControl.isVisible({ timeout: 2_000 }).catch(() => false)) &&
      !(await inactiveUnderControl.isVisible().catch(() => false))
    ) {
      console.log('Payment Disagreed Transactions already shows Active');
      await this.waitForStatusCells().catch(() => undefined);
      return;
    }

    console.log('Clicking Payment Disagreed Transactions toggle…');

    const faux = control
      .locator('.slds-checkbox_faux, .slds-checkbox_on, .slds-checkbox_off')
      .first();
    const switchInput = control
      .locator('input[role="switch"], input[type="checkbox"], input[name="gridToggle"]')
      .first();

    // Prefer the visible faux knob (codegen: #toggle-description-* > .slds-checkbox_faux).
    if (await faux.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await faux.click({ force: true });
    } else if (await switchInput.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await switchInput.click({ force: true });
    } else if (await switchInput.count()) {
      await switchInput.evaluate((el) => (el as HTMLInputElement).click());
    } else {
      // Fallback: click the Inactive text under the knob.
      await inactiveUnderControl.click({ force: true });
    }

    await expect
      .poll(
        async () =>
          (await activeUnderControl.isVisible().catch(() => false)) &&
          !(await inactiveUnderControl.isVisible().catch(() => false)),
        { timeout: 20_000, intervals: [250, 500, 1_000] }
      )
      .toBeTruthy();

    console.log('Payment Disagreed Transactions toggle is Active');
    // Status / In District columns appear after the disagreed filter loads.
    await this.waitForStatusCells();
  }

  /**
   * For every visible row with Payment Analyst Status = Disagree, set
   * In District Confirmed? to the given value (typically No). Walks pages.
   */
  async setInDistrictConfirmedForPaymentAnalystDisagreeRows(
    target: string
  ): Promise<string[]> {
    const value = this.normalizeYesNo(target);
    await this.waitForStatusCells();
    await this.goToFirstReportPage();

    // Dismiss unexpected Lightning confirm dialogs (codegen dismissed one).
    const onDialog = (dialog: { message: () => string; dismiss: () => Promise<void> }) => {
      console.log(`Dialog: ${dialog.message()}`);
      dialog.dismiss().catch(() => undefined);
    };
    this.page.on('dialog', onDialog);

    const transactionNumbers: string[] = [];
    let updated = 0;

    try {
      for (
        let pageNum = 1;
        pageNum <= AuditorAcceptAndRejectReportPage.MAX_REPORT_PAGES;
        pageNum++
      ) {
        await this.ensurePaymentDisagreedActive();
        await this.waitForStatusCells().catch(() => undefined);

        const cells = this.statusCells();
        const count = await cells.count();

        for (let i = 0; i < count; i++) {
          const statusCell = this.statusCells().nth(i);
          if (!(await statusCell.isVisible().catch(() => false))) continue;

          const statusText = (await statusCell.innerText().catch(() => ''))
            .replace(/\s+/g, ' ')
            .trim();
          if (!this.matchesValue(statusText, 'Disagree')) continue;

          const row = statusCell.locator(
            'xpath=ancestor::*[@role="row" or self::tr][1]'
          );
          const districtCell = this.inDistrictCell(row);
          await expect(districtCell).toBeVisible({ timeout: 15_000 });

          const txn = await this.transactionNumberFromRow(row);
          const label = txn || `row-${i}-p${pageNum}`;
          const current = (await districtCell.innerText().catch(() => ''))
            .replace(/\s+/g, ' ')
            .trim();

          if (this.matchesValue(current, value)) {
            console.log(
              `  Skip ${label}: In District Confirmed? already ${value}`
            );
            continue;
          }

          const ok = await this.setPicklistCell(districtCell, value);
          if (!ok) {
            throw new Error(
              `Could not set In District Confirmed? to "${value}" for ${label}`
            );
          }

          updated += 1;
          transactionNumbers.push(label);
          console.log(
            `  ✓ ${label}: In District Confirmed? → ${value} (Disagree, page ${pageNum})`
          );
        }

        if (!(await this.advanceReportPage())) break;
      }
    } finally {
      this.page.off('dialog', onDialog);
    }

    console.log(
      `Set In District Confirmed? to ${value} on ${updated} Payment Analyst Disagree row(s)`
    );
    if (updated < 1) {
      throw new Error(
        'No Payment Analyst Status Disagree rows found to update In District Confirmed?'
      );
    }
    return transactionNumbers;
  }

  async saveReport(options: { requireEdits?: boolean } = {}): Promise<void> {
    const saveBtn = this.page
      .getByRole('button', { name: /^Save$/i })
      .or(this.page.locator('button[title="Save"]'))
      .locator('visible=true')
      .first();

    const visible = await saveBtn
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!visible) {
      if (options.requireEdits) {
        throw new Error(
          'Expected Save after Accept/Reject report edits, but Save was not visible'
        );
      }
      console.log('Save not visible — no pending Accept/Reject report edits');
      return;
    }

    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
    console.log('Clicking Save on Accepted and Rejected Claims Data…');
    await saveBtn.click();
    await expect(saveBtn).toBeHidden({ timeout: 60_000 }).catch(() => {
      console.warn('Save still showing after click — edits may be pending');
    });
  }

  async expectSavedSuccessfully(
    options: { requireToast?: boolean } = {}
  ): Promise<void> {
    const toast = this.page
      .locator('.slds-notify_toast, .toastMessage, [role="status"]')
      .filter({ hasText: /success|saved/i })
      .first();

    if (options.requireToast) {
      await expect(toast).toBeVisible({ timeout: 60_000 });
      console.log(
        'Save toast:',
        (await toast.innerText().catch(() => 'success')).replace(/\s+/g, ' ').trim()
      );
      return;
    }

    if (await toast.isVisible({ timeout: 10_000 }).catch(() => false)) {
      console.log(
        'Save toast:',
        (await toast.innerText().catch(() => 'success')).replace(/\s+/g, ' ').trim()
      );
    } else {
      console.log('No success toast seen — Save click completed');
    }
  }

  private inDistrictCell(row: Locator): Locator {
    return row
      .locator(
        `[role="gridcell"][data-label="${AuditorAcceptAndRejectReportPage.IN_DISTRICT_LABEL}"]`
      )
      .or(
        row.locator(
          '[role="gridcell"][data-label="In District Confirmed"]'
        )
      )
      .first();
  }

  private async transactionNumberFromRow(row: Locator): Promise<string> {
    const txnCell = row.locator(
      `[role="gridcell"][data-label="${AuditorAcceptAndRejectReportPage.TXN_LABEL}"]`
    );
    return (await txnCell.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async ensurePaymentDisagreedActive(): Promise<void> {
    const control = this.page
      .locator(
        'xpath=//*[normalize-space()="Payment Disagreed Transactions"]' +
          '/ancestor::*[.//*[@role="switch"] or .//input[@type="checkbox"] ' +
          'or .//*[contains(@class,"slds-checkbox_toggle")] ' +
          'or .//*[contains(@class,"slds-checkbox_faux")]][1]'
      )
      .first();
    const inactive = control
      .locator('xpath=.//*[normalize-space()="Inactive"]')
      .first();
    if (await inactive.isVisible().catch(() => false)) {
      await this.selectPaymentDisagreedTransactions();
    }
  }

  private async ensureGroupByOff(): Promise<void> {
    const groupBy = this.page
      .getByRole('switch', { name: /Group by/i })
      .or(
        this.page
          .locator('lightning-input')
          .filter({ hasText: /Group by/i })
          .locator('input')
      )
      .first();

    if (!(await groupBy.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }

    const checked =
      (await groupBy.isChecked().catch(() => false)) ||
      (await groupBy.getAttribute('aria-checked')) === 'true';

    if (checked) {
      await groupBy.click({ force: true });
      await this.waitForReportGrid().catch(() => undefined);
      console.log('Turned off Group by for Accept/Reject report edits');
    }
  }

  private async setPicklistCell(
    cell: Locator,
    target: string
  ): Promise<boolean> {
    await cell.scrollIntoViewIfNeeded().catch(() => undefined);
    await cell.hover().catch(() => undefined);

    const editBtn = cell
      .locator(
        'button[name="tes"], ' +
          'c-datatable-picklist-column .slds-table_edit_container .slds-button, ' +
          'c-datatable-picklist-column .slds-button, ' +
          '.slds-table_edit_container .slds-button'
      )
      .first();

    if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await editBtn.click({ force: true });

    const row = cell.locator('xpath=ancestor::*[@role="row" or self::tr][1]');
    const col = AuditorAcceptAndRejectReportPage.IN_DISTRICT_LABEL;
    const input = this.page
      .locator(
        `.slds-has-focus [data-label="${col}"] input, ` +
          `.slds-is-edited [data-label="${col}"] input, ` +
          `[data-label="${col}"] input, ` +
          '.slds-has-focus c-datatable-picklist-column input, ' +
          '.slds-is-edited c-datatable-picklist-column input'
      )
      .first();
    const rowCombo = row.getByLabel('', { exact: true }).first();

    if (await input.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await input.click();
    } else if (await rowCombo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rowCombo.click();
    } else {
      return false;
    }

    // Codegen: span filter /^No$/ nth(1) — prefer role=option first.
    const option = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${this.escape(target)}$`, 'i') })
      .first();

    if (await option.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await option.click();
    } else {
      const dropOption = this.page
        .locator('span')
        .filter({ hasText: new RegExp(`^${this.escape(target)}$`) })
        .nth(1);
      if (!(await dropOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return false;
      }
      await dropOption.click();
    }

    await this.page.keyboard.press('Tab').catch(() => undefined);

    return this.waitForCell(
      cell,
      (text) => this.matchesValue(text, target),
      5_000
    );
  }

  private async waitForCell(
    cell: Locator,
    settled: (text: string) => boolean,
    timeoutMs: number
  ): Promise<boolean> {
    try {
      await expect
        .poll(
          async () =>
            settled(
              (await cell.innerText().catch(() => ''))
                .replace(/\s+/g, ' ')
                .trim()
            ),
          { timeout: timeoutMs, intervals: [150, 250, 400] }
        )
        .toBeTruthy();
      return true;
    } catch {
      return false;
    }
  }

  private async goToFirstReportPage(): Promise<void> {
    const first = this.page
      .getByRole('button', { name: /^First$/i })
      .or(this.page.locator('button[title="First"]'))
      .first();

    if (await first.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (!(await first.isDisabled().catch(() => true))) {
        await first.click({ force: true });
        await this.waitForStatusCells().catch(() => undefined);
      }
    }
  }

  private async advanceReportPage(): Promise<boolean> {
    const next = this.page
      .locator('button[title="Next"]')
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .locator('visible=true')
      .first();

    if ((await next.count()) === 0) return false;
    if (await next.isDisabled().catch(() => true)) return false;

    await next.click({ force: true });
    await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });
    await this.waitForStatusCells().catch(() => undefined);
    return true;
  }

  private matchesValue(raw: string, target: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    return new RegExp(`^${this.escape(target)}\\b`, 'i').test(text);
  }

  private normalizeYesNo(raw: string): 'Yes' | 'No' {
    if (/^yes$/i.test(raw.trim())) return 'Yes';
    if (/^no$/i.test(raw.trim())) return 'No';
    throw new Error(`In District Confirmed value must be Yes or No, got: ${raw}`);
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
