import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

export type SupervisorStatusValue = 'Agree with Auditor' | 'Disagree with Auditor';

/**
 * Supervisor Review Data Report: a supervisor answers the auditor's Disagree
 * rows by setting Supervisor Status, then saves.
 *
 * Locators from codegen-output/supervisor-agree-with-auditor.ts plus a live
 * DOM probe of case 00121029 (UAT), which established:
 *   - the report opens in its own workspace subtab titled
 *     "Supervisor Review Data Report (N)", rendered as "(0)" first and
 *     backfilled, so the row count must be awaited
 *   - the grid is an LWC in a shadow root: Playwright locators reach it,
 *     document.querySelectorAll inside page.evaluate does not
 *   - editable picklists are Auditor Response (Agree / Disagree) and
 *     Supervisor Status (Agree with Auditor / Disagree with Auditor);
 *     Verifier Status has no inline edit for this profile
 *   - an empty Supervisor Status cell reads as just "Edit" (its edit button)
 *   - Save only appears once an edit is pending
 */
export class SupervisorAgreeWithAuditorPage extends BasePage {
  private static readonly AUDITOR_RESPONSE_LABEL = 'Auditor Response';
  private static readonly SUPERVISOR_STATUS_LABEL = 'Supervisor Status';
  private static readonly TXN_LABEL = 'Transaction Number';
  private static readonly MAX_REPORT_PAGES = 80;

  private reportTitle(): Locator {
    return this.page
      .getByText(/Supervisor Review Data Report\s*\(/i)
      .first();
  }

  /** Title once the row count has backfilled off "(0)". */
  private loadedReportTitle(): Locator {
    return this.page
      .getByText(/Supervisor Review Data Report\s*\((?!0\))\d+\)/i)
      .first();
  }

  async openSupervisorReviewData(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Supervisor Review Data',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();

    await expect(this.loadedReportTitle()).toBeVisible({ timeout: 180_000 });
    console.log(
      'Opened:',
      (await this.loadedReportTitle().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim()
    );

    await this.waitForSupervisorStatusCells();
    await this.ensureGroupByOff();
  }

  /**
   * The report is a workspace subtab, so the case record — and with it
   * Approval History — is only reachable again once the subtab is closed.
   */
  async closeSupervisorReviewData(): Promise<void> {
    const closeBtn = this.page
      .getByRole('button', {
        name: /^Close Supervisor Review Data Report/i,
      })
      .or(this.page.getByRole('button', { name: /^Close Supervisor Review/i }))
      .first();

    if (await closeBtn.isVisible({ timeout: 30_000 }).catch(() => false)) {
      await closeBtn.click();
      await expect(this.reportTitle()).toBeHidden({ timeout: 30_000 });
      return;
    }

    throw new Error(
      'Could not find the close button for the Supervisor Review Data Report ' +
        'subtab, so the case record is still covered by the report.'
    );
  }

  /**
   * role="gridcell" matters: data-label alone also matches a wrapper inside
   * each cell, which makes every row show up twice.
   */
  private supervisorStatusCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${SupervisorAgreeWithAuditorPage.SUPERVISOR_STATUS_LABEL}"]`
    );
  }

  private auditorResponseCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${SupervisorAgreeWithAuditorPage.AUDITOR_RESPONSE_LABEL}"]`
    );
  }

  private async waitForSupervisorStatusCells(): Promise<void> {
    await expect(this.supervisorStatusCells().first()).toBeVisible({
      timeout: 90_000,
    });
  }

  /** Flat table is more reliable for inline edits than the grouped view. */
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
      await this.waitForSupervisorStatusCells().catch(() => undefined);
      console.log('Turned off Group by for Supervisor Status edits');
    }
  }

  /** Empty / unset picklist cell — inline edit buttons leave "Edit" behind. */
  private isEmptyValue(raw: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return true;
    if (/^Edit\b/i.test(text)) return true;
    if (/^Select an Option/i.test(text)) return true;
    if (/^--None--$/i.test(text)) return true;
    return false;
  }

  /**
   * Anchored so "Agree with Auditor" never matches "Disagree with Auditor",
   * and tolerant of the trailing "Edit" the inline edit button contributes.
   */
  private matchesValue(raw: string, target: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    return new RegExp(`^${this.escape(target)}\\b`, 'i').test(text);
  }

  private async transactionNumberFromRow(row: Locator): Promise<string> {
    const txnCell = row.locator(
      `[role="gridcell"][data-label="${SupervisorAgreeWithAuditorPage.TXN_LABEL}"]`
    );
    const text = (await txnCell.first().innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();

    const match = text.match(/T-\d+/);
    if (match) return match[0];

    const rowText = (await row.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    return rowText.match(/T-\d+/)?.[0] ?? text;
  }

  /**
   * Transaction numbers whose Auditor Response is Disagree — the rows a
   * supervisor has to answer. Walks every report page.
   */
  async findDisagreeAuditorResponseTransactions(): Promise<string[]> {
    await this.waitForSupervisorStatusCells();
    await this.goToFirstReportPage();

    const found: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= SupervisorAgreeWithAuditorPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForSupervisorStatusCells();

      const cells = this.auditorResponseCells();
      const count = await cells.count();
      const pageHits: string[] = [];

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const text = (await cell.innerText().catch(() => '')).trim();
        if (!this.matchesValue(text, 'Disagree')) continue;

        const row = cell.locator('xpath=ancestor::tr[1]');
        const txn = await this.transactionNumberFromRow(row);
        pageHits.push(txn || `row-${i}`);
      }

      found.push(...pageHits);
      console.log(
        `Page ${pageNum}: ${pageHits.length} Auditor Response = Disagree` +
          (pageHits.length ? ` → ${pageHits.join(', ')}` : '')
      );

      if (!(await this.advanceReportPage())) break;
    }

    console.log(`Auditor Response Disagree: total = ${found.length}`);
    return found;
  }

  /**
   * Set Supervisor Status on every row whose Auditor Response is Disagree.
   * Rows already holding the target value are reported but not re-edited, so
   * changedCount tells the caller whether a Save is actually pending.
   */
  async setSupervisorStatusForDisagreeRows(
    target: SupervisorStatusValue
  ): Promise<{ transactionNumbers: string[]; changedCount: number }> {
    await this.waitForSupervisorStatusCells();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];
    let changedCount = 0;

    for (
      let pageNum = 1;
      pageNum <= SupervisorAgreeWithAuditorPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForSupervisorStatusCells();

      const cells = this.auditorResponseCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const auditorCell = cells.nth(i);
        if (!(await auditorCell.isVisible().catch(() => false))) continue;
        const auditorText = (
          await auditorCell.innerText().catch(() => '')
        ).trim();
        if (!this.matchesValue(auditorText, 'Disagree')) continue;

        const row = auditorCell.locator('xpath=ancestor::tr[1]');
        const txn = await this.transactionNumberFromRow(row);
        const label = txn || `row-${i}`;

        const statusCell = row
          .locator(
            `[role="gridcell"][data-label="${SupervisorAgreeWithAuditorPage.SUPERVISOR_STATUS_LABEL}"]`
          )
          .first();
        await expect(statusCell).toBeVisible({ timeout: 15_000 });

        const current = (await statusCell.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();

        if (this.matchesValue(current, target)) {
          console.log(
            `  Supervisor Status already ${target} for ${label} (page ${pageNum})`
          );
          transactionNumbers.push(label);
          continue;
        }

        const ok = await this.setCellToValue(statusCell, target);
        if (!ok) {
          throw new Error(
            `Could not set Supervisor Status to "${target}" for ${label}`
          );
        }

        changedCount += 1;
        transactionNumbers.push(label);
        console.log(
          `  Supervisor Status → ${target} for ${label} (page ${pageNum})`
        );
      }

      if (!(await this.advanceReportPage())) break;
    }

    console.log(
      `Supervisor Status ${target}: ${transactionNumbers.length} row(s) ` +
        `(changed ${changedCount})`
    );

    // Nothing changed means Save never appears and the success notification
    // can never show, so the scenario would pass without proving anything.
    if (changedCount === 0) {
      throw new Error(
        `Every Disagree row on this case already has Supervisor Status ` +
          `"${target}", so there is no edit to save and no Record Updated ` +
          'notification to assert. Reset the case with ' +
          '`npm run reset:supervisor-status` (or use a case that has not been ' +
          'answered yet) before re-running.'
      );
    }

    return { transactionNumbers, changedCount };
  }

  /** Transaction numbers whose Supervisor Status currently holds a value. */
  async findRowsWithSupervisorStatus(): Promise<string[]> {
    await this.waitForSupervisorStatusCells();
    await this.goToFirstReportPage();

    const set: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= SupervisorAgreeWithAuditorPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForSupervisorStatusCells();

      const cells = this.supervisorStatusCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const text = (await cell.innerText().catch(() => '')).trim();
        if (this.isEmptyValue(text)) continue;

        const row = cell.locator('xpath=ancestor::tr[1]');
        set.push((await this.transactionNumberFromRow(row)) || `row-${i}`);
      }

      if (!(await this.advanceReportPage())) break;
    }

    return set;
  }

  /**
   * Test-data reset: clear Supervisor Status back to --None-- on every row
   * that carries a value, so the scenario can be run again.
   */
  async clearSupervisorStatusForAllRows(): Promise<string[]> {
    await this.waitForSupervisorStatusCells();
    await this.goToFirstReportPage();

    const cleared: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= SupervisorAgreeWithAuditorPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForSupervisorStatusCells();

      const cells = this.supervisorStatusCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const text = (await cell.innerText().catch(() => '')).trim();
        if (this.isEmptyValue(text)) continue;

        const row = cell.locator('xpath=ancestor::tr[1]');
        const label = (await this.transactionNumberFromRow(row)) || `row-${i}`;

        const ok = await this.setCellToValue(cell, '--None--');
        if (!ok) {
          throw new Error(`Could not clear Supervisor Status for ${label}`);
        }
        cleared.push(label);
        console.log(`  Cleared Supervisor Status for ${label}`);
      }

      if (!(await this.advanceReportPage())) break;
    }

    console.log(`Cleared Supervisor Status on ${cleared.length} row(s)`);
    return cleared;
  }

  /**
   * Inline-edit a picklist cell: hover → edit pencil → combobox → option →
   * Tab. Escape cancels a Lightning inline edit, so Tab is what commits it.
   */
  private async setCellToValue(
    cell: Locator,
    target: string,
    columnLabel: string = SupervisorAgreeWithAuditorPage.SUPERVISOR_STATUS_LABEL
  ): Promise<boolean> {
    await cell.scrollIntoViewIfNeeded().catch(() => undefined);
    await cell.hover().catch(() => undefined);

    const editBtn = cell
      .locator(
        'c-datatable-picklist-column .slds-table_edit_container .slds-grid > .slds-button, ' +
          'c-datatable-picklist-column .slds-button, ' +
          '.slds-table_edit_container .slds-button'
      )
      .first();

    if (!(await editBtn.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await editBtn.click({ force: true });

    const row = cell.locator('xpath=ancestor::tr[1]');
    const input = this.page
      .locator(
        `.slds-has-focus [data-label="${columnLabel}"] input, ` +
          `.slds-is-edited [data-label="${columnLabel}"] input, ` +
          `[data-label="${columnLabel}"] input, ` +
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
      await editBtn.click({ force: true }).catch(() => undefined);
      if (await input.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await input.click();
      } else if (
        await rowCombo.isVisible({ timeout: 5_000 }).catch(() => false)
      ) {
        await rowCombo.click();
      } else {
        return false;
      }
    }

    // Exact match matters: "Disagree with Auditor" contains "Agree with Auditor".
    const option = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${this.escape(target)}$`, 'i') })
      .first();

    if (!(await option.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return false;
    }
    await option.click();

    await this.page.keyboard.press('Tab').catch(() => undefined);

    // Clearing leaves the cell showing only its "Edit" button, not "--None--".
    const committed = /^--None--$/i.test(target)
      ? await this.waitForCell(cell, (text) => this.isEmptyValue(text), 5_000)
      : await this.waitForCell(
          cell,
          (text) => this.matchesValue(text, target),
          5_000
        );

    if (!committed) {
      console.warn(`${columnLabel} did not stay as ${target} after select`);
      return false;
    }
    return true;
  }

  private async waitForCell(
    cell: Locator,
    settled: (text: string) => boolean,
    timeoutMs: number
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = (await cell.innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (settled(text)) return true;
      await this.page.waitForTimeout(150);
    }
    return false;
  }

  private async advanceReportPage(): Promise<boolean> {
    const pagerNext = this.page
      .locator('button[title="Previous"]')
      .locator('visible=true')
      .locator('xpath=ancestor::*[.//button[@title="Next"]][1]')
      .locator('button[title="Next"]')
      .locator('visible=true');

    if ((await pagerNext.count()) === 0) return false;
    if (await pagerNext.first().isDisabled().catch(() => true)) return false;

    const firstBefore = (
      await this.supervisorStatusCells().first().innerText().catch(() => '')
    ).slice(0, 40);

    await pagerNext.first().click({ force: true });
    await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const firstAfter = (
        await this.supervisorStatusCells().first().innerText().catch(() => '')
      ).slice(0, 40);
      if (firstAfter && firstAfter !== firstBefore) break;
      if (await pagerNext.first().isDisabled().catch(() => false)) break;
      await this.page.waitForTimeout(300);
    }

    await this.waitForSupervisorStatusCells().catch(() => undefined);
    return true;
  }

  private async goToFirstReportPage(): Promise<void> {
    const first = this.page
      .getByRole('button', { name: /^First$/i })
      .or(this.page.locator('button[title="First"]'))
      .first();

    if (await first.isVisible({ timeout: 3_000 }).catch(() => false)) {
      if (!(await first.isDisabled().catch(() => true))) {
        await first.click({ force: true });
        await this.waitForSupervisorStatusCells().catch(() => undefined);
      }
    }
  }

  /**
   * Save only renders once an inline edit is pending.
   *
   * Returns the notification text raised by the save. It is captured here
   * rather than asserted later because Salesforce toasts auto-dismiss, and
   * because each Cucumber step builds a fresh page object — the text has to
   * travel through the World to reach the Then step.
   */
  async save(options: { requireEdits?: boolean } = {}): Promise<string> {
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
          'Expected Save after Supervisor Status edits, but Save was not visible'
        );
      }
      console.log('Save not visible — no pending Supervisor Status edits');
      return '';
    }

    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
    console.log('Clicking Save on Supervisor Review Data…');
    await saveBtn.click();

    const notification = await this.captureNotification(60_000);
    console.log(`Save notification: ${notification || '(none seen)'}`);

    // The toast can fire before the write lands. Save is only rendered while
    // edits are pending, so waiting for it to go away confirms the grid
    // committed them — without this, closing the browser can drop the save.
    await expect(saveBtn).toBeHidden({ timeout: 60_000 }).catch(() => {
      console.warn('Save button still showing after save — edits may be pending');
    });

    return notification;
  }

  /**
   * Real Lightning toasts only. A bare [role="status"] also matches the
   * list-view live regions ("5+ items • Sorted by …") that are always on the
   * page, which would swallow the poll below on its first tick.
   */
  private notifications(): Locator {
    return this.page.locator(
      '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
        '.toastContainer .slds-notify'
    );
  }

  /** Poll for a notification to appear, before it auto-dismisses. */
  private async captureNotification(timeoutMs: number): Promise<string> {
    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
      const texts = (await this.notifications().allInnerTexts().catch(() => []))
        .map((t) => t.replace(/\s+/g, ' ').trim())
        .filter(Boolean);

      if (texts.length) return [...new Set(texts)].join(' | ');
      await this.page.waitForTimeout(200);
    }

    return '';
  }

  /**
   * Success notification reads "Success notification. Success Records
   * Updated!" — Salesforce pluralises it with the number of rows saved, so
   * both spellings count.
   */
  expectRecordUpdatedToast(seen: string): string {
    if (!/Records? Updated/i.test(seen)) {
      throw new Error(
        'Expected the "Records Updated!" notification after saving ' +
          'Supervisor Review Data, but saw: ' +
          (seen ? `"${seen}"` : 'no notification at all')
      );
    }

    console.log(`Save confirmed: ${seen}`);
    return seen;
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
