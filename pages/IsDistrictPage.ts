import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export type InDistrictValue = 'Yes' | 'No';

/**
 * In District Confirmed? on Audit Matching Claim Data.
 * Locators from codegen-output/codegen-nyselections-20260909-110450.ts
 * + live probe: [role=gridcell][data-label="In District Confirmed?"]
 *
 * Empty cells show "Edit" / blank / "Select an Option".
 * Walk every report page → set empties to Yes or No → Save once at the end.
 * Collects Transaction Number for each row marked.
 */
export class IsDistrictPage extends BasePage {
  private static readonly COL_LABEL = 'In District Confirmed?';
  private static readonly TXN_LABEL = 'Transaction Number';
  private static readonly MAX_REPORT_PAGES = 80;

  private static normalizeValue(raw: string): InDistrictValue {
    const v = raw.trim();
    if (/^yes$/i.test(v)) return 'Yes';
    if (/^no$/i.test(v)) return 'No';
    throw new Error(`In District Confirmed value must be Yes or No, got: ${raw}`);
  }

  async openAuditMatchingClaimData(): Promise<void> {
    await this.withRefreshRetry(async () => {
      const btn = this.page.getByRole('button', {
        name: /Audit Matching Claim Data/i,
      });
      await expect(btn).toBeVisible({ timeout: 60_000 });
      await btn.click();

      await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
      await this.waitForDistrictCells();
      await this.ensureGroupByOff();
    }, 'Audit Matching Claim Data');
  }

  /** Flat table is more reliable for empty-cell edits than grouped view */
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
      (await groupBy.getAttribute('aria-checked')) === 'true' ||
      (await groupBy.getAttribute('checked')) !== null;

    if (checked) {
      await groupBy.click({ force: true });
      await this.waitForDistrictCells().catch(() => undefined);
      console.log('Turned off Group by for In District Confirmed edits');
    }
  }

  private reportTitle(): Locator {
    return this.page
      .getByText(/Audit Matching Claims? Data Report\s*\(/i)
      .first();
  }

  private districtCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${IsDistrictPage.COL_LABEL}"]`
    );
  }

  private async waitForDistrictCells(): Promise<void> {
    await expect(this.districtCells().first()).toBeVisible({
      timeout: 90_000,
    });
  }

  /** Empty / unset — not already Yes or No */
  private isEmptyDistrictValue(raw: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (/^Yes\b/i.test(text) || /^No\b/i.test(text)) return false;
    return true;
  }

  private async transactionNumberFromRow(row: Locator): Promise<string> {
    const txnCell = row.locator(
      `[role="gridcell"][data-label="${IsDistrictPage.TXN_LABEL}"]`
    );
    let text = (await txnCell.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();

    if (!text) {
      const link = txnCell.getByRole('link').first();
      if (await link.isVisible({ timeout: 1_000 }).catch(() => false)) {
        text = (await link.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();
      }
    }

    const match = text.match(/T-\d+/);
    return match?.[0] ?? text;
  }

  /**
   * Walk every report page; set empty In District Confirmed? → Yes or No.
   * Returns Transaction Numbers for every row marked.
   */
  async setEmptyInDistrictConfirmedOnAllPages(
    value: string
  ): Promise<string[]> {
    const target = IsDistrictPage.normalizeValue(value);
    await this.waitForDistrictCells();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];

    for (let pageNum = 1; pageNum <= IsDistrictPage.MAX_REPORT_PAGES; pageNum++) {
      await this.waitForDistrictCells();
      const pageTxns = await this.setEmptyOnCurrentPage(target);
      transactionNumbers.push(...pageTxns);
      console.log(
        `Page ${pageNum}: set ${pageTxns.length} empty In District Confirmed? → ${target}` +
          (pageTxns.length ? ` (${pageTxns.join(', ')})` : '')
      );

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `In District Confirmed?: total updated across pages = ${transactionNumbers.length}`
    );
    return transactionNumbers;
  }

  /** @deprecated Prefer setEmptyInDistrictConfirmedOnAllPages('No') */
  async setEmptyInDistrictConfirmedToNoOnAllPages(): Promise<string[]> {
    return this.setEmptyInDistrictConfirmedOnAllPages('No');
  }

  private async setEmptyOnCurrentPage(
    target: InDistrictValue
  ): Promise<string[]> {
    const updated: string[] = [];

    for (let guard = 0; guard < 200; guard++) {
      const cells = this.districtCells();
      const count = await cells.count();
      let emptyIndex = -1;

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        if (
          (await cell.getAttribute('data-isdistrict-skip').catch(() => null)) ===
          '1'
        ) {
          continue;
        }
        const text = (await cell.innerText().catch(() => '')).trim();
        if (this.isEmptyDistrictValue(text)) {
          emptyIndex = i;
          break;
        }
      }

      if (emptyIndex < 0) break;

      const cell = this.districtCells().nth(emptyIndex);
      const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
      const txnNumber = await this.transactionNumberFromRow(row);

      const ok = await this.setCellToValue(cell, target);
      if (!ok) {
        console.warn(
          `Skipping In District Confirmed? cell index ${emptyIndex}` +
            (txnNumber ? ` (${txnNumber})` : '') +
            ' (could not open picklist)'
        );
        await cell.evaluate((el) =>
          el.setAttribute('data-isdistrict-skip', '1')
        );
        continue;
      }

      if (txnNumber) {
        updated.push(txnNumber);
        console.log(`  Marked ${target} → ${txnNumber}`);
      } else {
        console.warn(
          `  Marked ${target} but Transaction Number was empty (row index ${emptyIndex})`
        );
      }
    }

    return updated;
  }

  private async setCellToValue(
    cell: Locator,
    target: InDistrictValue
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

    const row = cell.locator('xpath=ancestor::*[@role="row"][1]');

    const input = this.page
      .locator(
        `.slds-has-focus [data-label="${IsDistrictPage.COL_LABEL}"] input, ` +
          `.slds-is-edited [data-label="${IsDistrictPage.COL_LABEL}"] input, ` +
          `[data-label="${IsDistrictPage.COL_LABEL}"] input, ` +
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
      } else if (await rowCombo.isVisible({ timeout: 5_000 }).catch(() => false)) {
        await rowCombo.click();
      } else {
        return false;
      }
    }

    const option = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: new RegExp(`^${target}$`) })
      .first();

    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
    } else {
      const dropOption = this.page
        .locator(
          '[role="listbox"]:visible span, .slds-dropdown:visible span'
        )
        .filter({ hasText: new RegExp(`^${target}$`) })
        .first();
      if (!(await dropOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return false;
      }
      await dropOption.click();
    }

    // Escape cancels Lightning inline edits — use Tab to commit, then verify.
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const committed = await this.waitForCellValue(cell, target, 5_000);
    if (!committed) {
      console.warn(
        `In District Confirmed? did not stay as ${target} after picklist select`
      );
      return false;
    }
    return true;
  }

  private async waitForCellValue(
    cell: Locator,
    target: InDistrictValue,
    timeoutMs: number
  ): Promise<boolean> {
    const pattern = new RegExp(`^${target}\\b`, 'i');
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = (await cell.innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (pattern.test(text)) return true;
      await this.page.waitForTimeout(150);
    }
    return false;
  }

  /**
   * Persist and print every transaction number marked Yes/No.
   * Writes reports/isdistrict-marked-yes.json or isdistrict-marked-no.json
   */
  reportMarkedTransactions(
    caseNumber: string,
    transactionNumbers: string[],
    value: string
  ): string {
    const target = IsDistrictPage.normalizeValue(value);
    const report = {
      caseNumber,
      markedValue: target,
      markedCount: transactionNumbers.length,
      /** kept for No-flow consumers */
      markedNoCount: target === 'No' ? transactionNumbers.length : undefined,
      markedYesCount: target === 'Yes' ? transactionNumbers.length : undefined,
      transactionNumbers,
      markedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      `isdistrict-marked-${target.toLowerCase()}.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log(`========== In District Confirmed? → ${target} ==========`);
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('================================================');
    console.log('');

    return outFile;
  }

  /** @deprecated Prefer reportMarkedTransactions(..., 'No') */
  reportMarkedNoTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    return this.reportMarkedTransactions(caseNumber, transactionNumbers, 'No');
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
      await this.districtCells().first().innerText().catch(() => '')
    ).slice(0, 40);

    await pagerNext.first().click({ force: true });
    await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const firstAfter = (
        await this.districtCells().first().innerText().catch(() => '')
      ).slice(0, 40);
      if (firstAfter && firstAfter !== firstBefore) break;
      if (await pagerNext.first().isDisabled().catch(() => false)) break;
      await this.page.waitForTimeout(300);
    }

    await this.waitForDistrictCells().catch(() => undefined);
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
        await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });
        await this.waitForDistrictCells().catch(() => undefined);
        return;
      }
    }

    const page1 = this.page.getByRole('button', { name: '1', exact: true });
    if (await page1.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page1.click().catch(() => undefined);
      await this.waitForDistrictCells().catch(() => undefined);
    }
  }

  async saveAuditMatchingClaimData(
    options: { requireEdits?: boolean } = {}
  ): Promise<void> {
    const saveBtn = this.page.getByRole('button', { name: /^Save$/i }).first();
    const visible = await saveBtn
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!visible) {
      if (options.requireEdits) {
        throw new Error(
          'Expected Save after In District Confirmed? edits, but Save was not visible'
        );
      }
      console.log('Save not visible — no pending In District Confirmed? edits');
      return;
    }

    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
    console.log('Clicking Save on Audit Matching Claim Data…');
    await saveBtn.click();
    await this.page.waitForLoadState('domcontentloaded');
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
        'Save confirmed via toast:',
        (await toast.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
      );
      return;
    }

    await expect(toast.or(this.reportTitle()).first()).toBeVisible({
      timeout: 60_000,
    });
  }
}
