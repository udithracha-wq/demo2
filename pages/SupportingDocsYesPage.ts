import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

/**
 * Contribution Supporting Docs Received? on Audit Matching Claim Data.
 * Locators from codegen-output/supporting-docs-yes.ts
 * + gridcell data-label pattern (same as IsDistrictPage).
 *
 * Walk every report page → set every cell that is not already Yes → Yes
 * → Save once at the end. Collects Transaction Number for each row marked.
 */
export class SupportingDocsYesPage extends BasePage {
  private static readonly COL_LABELS = [
    'Contribution Supporting Docs Received ?',
    'Contribution Supporting Docs Received?',
  ] as const;
  private static readonly TXN_LABEL = 'Transaction Number';
  private static readonly MAX_REPORT_PAGES = 80;
  private static readonly SKIP_ATTR = 'data-supporting-docs-skip';

  private activeColLabel = SupportingDocsYesPage.COL_LABELS[0];

  async openAuditMatchingClaimData(): Promise<void> {
    await this.withRefreshRetry(async () => {
      const btn = this.page.getByRole('button', {
        name: /Audit Matching Claim Data/i,
      });
      await expect(btn).toBeVisible({ timeout: 60_000 });
      await btn.click();

      await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
      await this.resolveColumnLabel();
      await this.waitForDocsCells();
      await this.ensureGroupByOff();
    }, 'Audit Matching Claim Data');
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
      (await groupBy.getAttribute('aria-checked')) === 'true' ||
      (await groupBy.getAttribute('checked')) !== null;

    if (checked) {
      await groupBy.click({ force: true });
      await this.waitForDocsCells().catch(() => undefined);
      console.log(
        'Turned off Group by for Contribution Supporting Docs Received edits'
      );
    }
  }

  private reportTitle(): Locator {
    return this.page
      .getByText(/Audit Matching Claims? Data Report\s*\(/i)
      .first();
  }

  private async resolveColumnLabel(): Promise<void> {
    for (const label of SupportingDocsYesPage.COL_LABELS) {
      const cells = this.page.locator(
        `[role="gridcell"][data-label="${label}"]`
      );
      if ((await cells.count()) > 0) {
        this.activeColLabel = label;
        console.log(`Using column data-label: "${label}"`);
        return;
      }
    }

    // Fallback: fuzzy match on data-label
    const fuzzy = this.page.locator(
      '[role="gridcell"][data-label*="Supporting Docs" i]'
    );
    if ((await fuzzy.count()) > 0) {
      const label =
        (await fuzzy.first().getAttribute('data-label')) ||
        SupportingDocsYesPage.COL_LABELS[0];
      this.activeColLabel = label;
      console.log(`Using fuzzy column data-label: "${label}"`);
      return;
    }

    throw new Error(
      'Could not find Contribution Supporting Docs Received? column ' +
        `(tried: ${SupportingDocsYesPage.COL_LABELS.map((l) => `"${l}"`).join(', ')})`
    );
  }

  private docsCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${this.activeColLabel}"]`
    );
  }

  private async waitForDocsCells(): Promise<void> {
    await expect(this.docsCells().first()).toBeVisible({
      timeout: 90_000,
    });
  }

  /** Already Yes — leave alone */
  private isAlreadyYes(raw: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    return /^Yes\b/i.test(text);
  }

  private async transactionNumberFromRow(row: Locator): Promise<string> {
    const txnCell = row.locator(
      `[role="gridcell"][data-label="${SupportingDocsYesPage.TXN_LABEL}"]`
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
   * Walk every report page; set Contribution Supporting Docs Received? → Yes
   * for every cell that is not already Yes.
   */
  async setAllContributionSupportingDocsToYesOnAllPages(): Promise<string[]> {
    await this.resolveColumnLabel();
    await this.waitForDocsCells();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= SupportingDocsYesPage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForDocsCells();
      const pageTxns = await this.setNonYesOnCurrentPage();
      transactionNumbers.push(...pageTxns);
      console.log(
        `Page ${pageNum}: set ${pageTxns.length} Contribution Supporting Docs Received? → Yes` +
          (pageTxns.length ? ` (${pageTxns.join(', ')})` : '')
      );

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Contribution Supporting Docs Received?: total updated = ${transactionNumbers.length}`
    );
    return transactionNumbers;
  }

  private async setNonYesOnCurrentPage(): Promise<string[]> {
    const updated: string[] = [];

    for (let guard = 0; guard < 200; guard++) {
      const cells = this.docsCells();
      const count = await cells.count();
      let targetIndex = -1;

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        if (
          (await cell
            .getAttribute(SupportingDocsYesPage.SKIP_ATTR)
            .catch(() => null)) === '1'
        ) {
          continue;
        }
        const text = (await cell.innerText().catch(() => '')).trim();
        if (!this.isAlreadyYes(text)) {
          targetIndex = i;
          break;
        }
      }

      if (targetIndex < 0) break;

      const cell = this.docsCells().nth(targetIndex);
      const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
      const txnNumber = await this.transactionNumberFromRow(row);

      const ok = await this.setCellToYes(cell);
      if (!ok) {
        console.warn(
          `Skipping Contribution Supporting Docs Received? cell index ${targetIndex}` +
            (txnNumber ? ` (${txnNumber})` : '') +
            ' (could not open picklist)'
        );
        await cell.evaluate(
          (el, attr) => el.setAttribute(attr, '1'),
          SupportingDocsYesPage.SKIP_ATTR
        );
        continue;
      }

      if (txnNumber) {
        updated.push(txnNumber);
        console.log(`  Marked Yes → ${txnNumber}`);
      } else {
        console.warn(
          `  Marked Yes but Transaction Number was empty (row index ${targetIndex})`
        );
      }
    }

    return updated;
  }

  private async setCellToYes(cell: Locator): Promise<boolean> {
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
    const col = this.activeColLabel;

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

    const option = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({ hasText: /^Yes$/ })
      .first();

    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
    } else {
      const dropOption = this.page
        .locator(
          '[role="listbox"]:visible span, .slds-dropdown:visible span'
        )
        .filter({ hasText: /^Yes$/ })
        .first();
      if (!(await dropOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return false;
      }
      await dropOption.click();
    }

    await this.page.keyboard.press('Tab').catch(() => undefined);

    const committed = await this.waitForCellValue(cell, 5_000);
    if (!committed) {
      console.warn(
        'Contribution Supporting Docs Received? did not stay as Yes after picklist select'
      );
      return false;
    }
    return true;
  }

  private async waitForCellValue(
    cell: Locator,
    timeoutMs: number
  ): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const text = (await cell.innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (/^Yes\b/i.test(text)) return true;
      await this.page.waitForTimeout(150);
    }
    return false;
  }

  reportMarkedTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      markedValue: 'Yes',
      markedCount: transactionNumbers.length,
      markedYesCount: transactionNumbers.length,
      column: this.activeColLabel,
      transactionNumbers,
      markedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'supporting-docs-marked-yes.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log(
      '========== Contribution Supporting Docs Received? → Yes =========='
    );
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('==============================================================');
    console.log('');

    return outFile;
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
      await this.docsCells().first().innerText().catch(() => '')
    ).slice(0, 40);

    await pagerNext.first().click({ force: true });
    await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const firstAfter = (
        await this.docsCells().first().innerText().catch(() => '')
      ).slice(0, 40);
      if (firstAfter && firstAfter !== firstBefore) break;
      if (await pagerNext.first().isDisabled().catch(() => false)) break;
      await this.page.waitForTimeout(300);
    }

    await this.waitForDocsCells().catch(() => undefined);
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
        await this.waitForDocsCells().catch(() => undefined);
        return;
      }
    }

    const page1 = this.page.getByRole('button', { name: '1', exact: true });
    if (await page1.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page1.click().catch(() => undefined);
      await this.waitForDocsCells().catch(() => undefined);
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
          'Expected Save after Contribution Supporting Docs Received? edits, but Save was not visible'
        );
      }
      console.log(
        'Save not visible — no pending Contribution Supporting Docs Received? edits'
      );
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
