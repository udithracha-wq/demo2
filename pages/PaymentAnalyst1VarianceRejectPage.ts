import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Payment Analyst 1 Variance Reject: open Variance Report when available,
 * turn on Unreviewed Transactions, set Payment Analyst Status + Notes on every
 * row, save/close, then hand off to Approval History Reject.
 *
 * Locators from codegen-output/payment-analyst-1-variance-reject.ts plus the
 * live failure screenshot (Variance Report (3) workspace subtab).
 *
 * Save only appears once an inline edit is pending — do not wait for Save on open.
 */
export class PaymentAnalyst1VarianceRejectPage extends BasePage {
  private static readonly MAX_REPORT_PAGES = 50;
  private static readonly STATUS_LABEL = 'Payment Analyst Status';
  private static readonly NOTES_LABEL = 'Payment Analyst Notes';

  private reportTitle(): Locator {
    return this.page.getByText(/Variance Report\s*\(/i).first();
  }

  private loadedReportTitle(): Locator {
    return this.page
      .getByText(/Variance Report\s*\((?!0\))\d+\)/i)
      .first();
  }

  private statusCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${PaymentAnalyst1VarianceRejectPage.STATUS_LABEL}"]`
    );
  }

  private notesCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"]`
    );
  }

  /**
   * Case toolbar → Variance Report when the button is present.
   * Returns false when the report is not available (later steps no-op).
   */
  async openVarianceReportIfAvailable(): Promise<boolean> {
    const btn = this.page.getByRole('button', { name: 'Variance Report' });
    const available = await btn
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!available) {
      console.log('Variance Report button not available — skipping report steps');
      return false;
    }

    await btn.click();

    // Title may flash "(0)" while rows load — wait for a non-zero count when possible.
    const loaded = await this.loadedReportTitle()
      .isVisible({ timeout: 90_000 })
      .catch(() => false);
    if (!loaded) {
      await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
    }

    console.log(
      'Opened:',
      (
        await (loaded ? this.loadedReportTitle() : this.reportTitle())
          .innerText()
          .catch(() => 'Variance Report')
      )
        .replace(/\s+/g, ' ')
        .trim()
    );

    await this.waitForStatusCells();
    await this.ensureGroupByOff();
    return true;
  }

  /**
   * Click the Unreviewed Transactions toggle so it becomes Active.
   * UAT: hidden `<input name="gridToggle" role="switch">` — use label click /
   * DOM click because Playwright actionability still blocks the hidden input.
   */
  async selectUnreviewedTransactions(): Promise<void> {
    const label = this.page.getByText(/Unreviewed\s*Transactions?/i).first();
    await expect(label).toBeVisible({ timeout: 60_000 });

    const toggle = this.page.locator('input[name="gridToggle"]').first();
    await expect(toggle).toBeAttached({ timeout: 30_000 });

    const inactiveLabel = this.page
      .locator(
        'xpath=//*[contains(normalize-space(.),"Unreviewed Transactions")]' +
          '/following::*[normalize-space()="Inactive"][1]'
      )
      .first();

    const looksInactive = await inactiveLabel
      .isVisible({ timeout: 3_000 })
      .catch(() => false);

    if (!looksInactive) {
      console.log('Unreviewed Transactions already shows Active');
      await this.waitForStatusCells().catch(() => undefined);
      return;
    }

    console.log('Clicking Unreviewed Transactions toggle…');

    // 1) Click the visible label text (Lightning toggles often wire label → input)
    await label.click({ force: true }).catch(() => undefined);

    // 2) Click the visible Inactive status under the control
    if (await inactiveLabel.isVisible().catch(() => false)) {
      await inactiveLabel.click({ force: true }).catch(() => undefined);
    }

    // 3) Native DOM click on the hidden switch (Playwright click can still fail)
    await toggle.evaluate((el) => (el as HTMLInputElement).click());

    await expect
      .poll(
        async () => !(await inactiveLabel.isVisible().catch(() => false)),
        { timeout: 15_000, intervals: [250, 500, 1_000] }
      )
      .toBeTruthy();

    console.log('Unreviewed Transactions toggle is Active');
    await this.waitForStatusCells().catch(() => undefined);
  }

  /**
   * While Unreviewed Transactions stays Active, set Status then Notes on each
   * remaining row (always re-query first unsettled Status cell — Disagree rows
   * leave the Unreviewed filter).
   */
  async setPaymentAnalystStatusAndNotesForAllRows(
    status: string,
    notes: string
  ): Promise<number> {
    await this.waitForStatusCells();
    await this.goToFirstReportPage();
    let updated = 0;

    for (let guard = 0; guard < 200; guard++) {
      // Keep Unreviewed filter on while walking remaining rows.
      const inactiveLabel = this.page
        .locator(
          'xpath=//*[contains(normalize-space(.),"Unreviewed Transactions")]' +
            '/following::*[normalize-space()="Inactive"][1]'
        )
        .first();
      if (await inactiveLabel.isVisible().catch(() => false)) {
        await this.selectUnreviewedTransactions();
      }

      const cells = this.statusCells();
      const count = await cells.count();
      let targetIndex = -1;

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const current = (await cell.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();
        if (this.matchesValue(current, status)) continue;
        targetIndex = i;
        break;
      }

      if (targetIndex < 0) {
        if (count === 0 && updated === 0) {
          throw new Error(
            'No Unreviewed Variance rows found after activating the filter.'
          );
        }
        break;
      }

      const statusCell = this.statusCells().nth(targetIndex);
      const row = statusCell.locator(
        'xpath=ancestor::*[@role="row" or self::tr][1]'
      );
      const notesCell = row
        .locator(
          `[role="gridcell"][data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"]`
        )
        .first();

      const statusOk = await this.setPicklistCell(statusCell, status);
      if (!statusOk) {
        throw new Error(
          `Could not set Payment Analyst Status to "${status}" on row ${updated + 1}`
        );
      }

      const notesOk = await this.setNotesCell(notesCell, notes);
      if (!notesOk) {
        throw new Error(
          `Could not set Payment Analyst Notes on row ${updated + 1}`
        );
      }

      updated += 1;
      console.log(
        `  ✓ Row ${updated}: Status ${status}, Notes "${notes}" (Unreviewed Active)`
      );
    }

    console.log(
      `Updated ${updated} Unreviewed Variance row(s) → ${status} + notes`
    );
    if (updated < 1) {
      throw new Error(
        `No Variance rows were updated to Payment Analyst Status "${status}".`
      );
    }
    return updated;
  }

  /** @deprecated Prefer setPaymentAnalystStatusAndNotesForAllRows */
  async setPaymentAnalystStatusForAllRows(status: string): Promise<number> {
    return this.setPaymentAnalystStatusAndNotesForAllRows(status, 'test');
  }

  /**
   * Enter Payment Analyst Notes on every row across pages.
   * Always targets the first unsettled cell (re-query) so Unreviewed filter
   * refreshes after Status edits do not break nth-index walks.
   */
  async enterPaymentAnalystNotesForAllRows(notes: string): Promise<number> {
    await this.waitForStatusCells();
    await this.goToFirstReportPage();
    let updated = 0;

    for (
      let pageNum = 1;
      pageNum <= PaymentAnalyst1VarianceRejectPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      for (let guard = 0; guard < 200; guard++) {
        const cells = this.notesCells();
        const count = await cells.count();
        let emptyIndex = -1;

        for (let i = 0; i < count; i++) {
          const cell = cells.nth(i);
          if (!(await cell.isVisible().catch(() => false))) continue;
          if (
            (await cell.getAttribute('data-notes-done').catch(() => null)) ===
            '1'
          ) {
            continue;
          }
          const current = (await cell.innerText().catch(() => ''))
            .replace(/\s+/g, ' ')
            .trim();
          if (this.notesAlreadySet(current, notes)) {
            await cell
              .evaluate((el) => el.setAttribute('data-notes-done', '1'))
              .catch(() => undefined);
            updated += 1;
            continue;
          }
          emptyIndex = i;
          break;
        }

        if (emptyIndex < 0) break;

        const cell = this.notesCells().nth(emptyIndex);
        const ok = await this.setNotesCell(cell, notes);
        if (!ok) {
          await cell
            .evaluate((el) => el.setAttribute('data-notes-done', '1'))
            .catch(() => undefined);
          throw new Error(
            `Could not set Payment Analyst Notes on cell ${emptyIndex + 1}`
          );
        }
        await cell
          .evaluate((el) => el.setAttribute('data-notes-done', '1'))
          .catch(() => undefined);
        updated += 1;
        console.log(`  ✓ Notes (cell ${emptyIndex + 1}, page ${pageNum})`);
      }

      if (!(await this.advanceReportPage())) break;
    }

    console.log(`Payment Analyst Notes updated: ${updated} row(s)`);
    if (updated < 1) {
      throw new Error('No Variance rows received Payment Analyst Notes.');
    }
    return updated;
  }

  /** Save pending inline edits, then close the Variance Report workspace subtab. */
  async saveAndCloseVarianceReport(): Promise<void> {
    await this.save({ requireEdits: true });
    await this.closeVarianceReport();
  }

  private async save(options: { requireEdits?: boolean } = {}): Promise<void> {
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
          'Expected Save after Variance Report edits, but Save was not visible'
        );
      }
      console.log('Save not visible — no pending Variance edits');
      return;
    }

    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
    console.log('Clicking Save on Variance Report…');
    await saveBtn.click();
    await expect(saveBtn).toBeHidden({ timeout: 60_000 }).catch(() => {
      console.warn('Save still showing after click — edits may be pending');
    });
  }

  private async closeVarianceReport(): Promise<void> {
    const closeBtn = this.page
      .getByRole('button', { name: /^Close Variance Report/i })
      .or(this.page.getByRole('button', { name: /^Close Variance/i }))
      .first();

    if (await closeBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      // Codegen used a generic Close, then returned via the Case workspace tab.
      const genericClose = this.page
        .getByRole('button', { name: 'Close', exact: true })
        .first();
      if (await genericClose.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await genericClose.click();
      }
    }

    const caseTab = this.page
      .getByRole('tab', { name: /\|?\s*Case/i })
      .or(this.page.getByRole('tab', { name: /\d{5,}/ }))
      .first();
    if (await caseTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await caseTab.click();
    }

    // Report is a workspace subtab — success is being able to reach case actions.
    const changeOwner = this.page.getByRole('button', { name: 'Change Owner' });
    const approvalActions = this.page.getByRole('button', {
      name: 'Show actions for Approval',
    });
    await expect(changeOwner.or(approvalActions).first()).toBeVisible({
      timeout: 60_000,
    });
    console.log('Closed Variance Report — back on case record');
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
      await this.waitForStatusCells().catch(() => undefined);
      console.log('Turned off Group by for Variance edits');
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
    const input = this.page
      .locator(
        `.slds-has-focus [data-label="${PaymentAnalyst1VarianceRejectPage.STATUS_LABEL}"] input, ` +
          `.slds-is-edited [data-label="${PaymentAnalyst1VarianceRejectPage.STATUS_LABEL}"] input, ` +
          `[data-label="${PaymentAnalyst1VarianceRejectPage.STATUS_LABEL}"] input, ` +
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

    const option = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${this.escape(target)}$`, 'i') })
      .first();

    if (!(await option.isVisible({ timeout: 8_000 }).catch(() => false))) {
      return false;
    }
    await option.click();
    await this.page.keyboard.press('Tab').catch(() => undefined);

    return this.waitForCell(
      cell,
      (text) => this.matchesValue(text, target),
      5_000
    );
  }

  private async setNotesCell(cell: Locator, notes: string): Promise<boolean> {
    await cell.scrollIntoViewIfNeeded().catch(() => undefined);
    await cell.hover().catch(() => undefined);

    const row = cell.locator('xpath=ancestor::*[@role="row" or self::tr][1]');

    // Codegen: Edit / Edit Payment Analyst Notes (may need hover to appear).
    const editCandidates = [
      cell.getByRole('button', { name: /Edit Payment Analyst Notes/i }).first(),
      cell
        .locator(
          '.slds-table_edit_container .slds-button, ' +
            'c-datatable-editable-text-column .slds-button, button'
        )
        .first(),
      row.getByRole('button', { name: /Edit Payment Analyst Notes/i }).first(),
      this.page.getByRole('button', { name: 'Edit Payment Analyst Notes' }).first(),
      cell.locator('span').filter({ hasText: /^Edit$/ }).first(),
    ];

    let opened = false;
    for (const editBtn of editCandidates) {
      if (await editBtn.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await editBtn.click({ force: true });
        opened = true;
        break;
      }
    }

    if (!opened) {
      // Last resort: double-click the cell to enter inline edit.
      await cell.dblclick({ force: true }).catch(() => undefined);
    }

    const notesBox = this.page
      .getByRole('textbox', { name: /Payment Analyst Notes/i })
      .or(
        this.page.locator(
          `.slds-has-focus [data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] textarea, ` +
            `.slds-is-edited [data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] textarea, ` +
            `.slds-has-focus [data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] input, ` +
            `.slds-is-edited [data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] input, ` +
            `[data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] textarea, ` +
            `[data-label="${PaymentAnalyst1VarianceRejectPage.NOTES_LABEL}"] input`
        )
      )
      .or(cell.locator('textarea, input').first())
      .first();

    if (!(await notesBox.isVisible({ timeout: 8_000 }).catch(() => false))) {
      console.warn('Payment Analyst Notes textbox did not appear');
      return false;
    }

    await notesBox.click({ force: true }).catch(() => undefined);
    await notesBox.fill(notes);
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const committed = await this.waitForCell(
      cell,
      (text) => this.notesAlreadySet(text, notes),
      8_000
    );
    if (!committed) {
      // Fill may have worked even if cell text still includes Edit chrome.
      const raw = (await cell.innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (new RegExp(this.escape(notes), 'i').test(raw)) return true;
      console.warn(`Notes cell did not show "${notes}" (saw: "${raw}")`);
    }
    return committed;
  }

  private async waitForStatusCells(): Promise<void> {
    await expect(this.statusCells().first()).toBeVisible({ timeout: 90_000 });
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

  private matchesValue(raw: string, target: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    return new RegExp(`^${this.escape(target)}\\b`, 'i').test(text);
  }

  private notesAlreadySet(raw: string, notes: string): boolean {
    const text = raw
      .replace(/\bEdit\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return text.toLowerCase() === notes.trim().toLowerCase();
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

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
