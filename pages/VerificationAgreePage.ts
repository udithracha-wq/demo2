import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

/**
 * Verifier Status on Random Sampling Records.
 * Locators from codegen-output/verification-agree.ts
 * + screenshot: [role=gridcell][data-label="Verifier Status"]
 *
 * Empty cells → Agree on every report page → Save once → assert toast.
 */
export class VerificationAgreePage extends BasePage {
  private static readonly COL_LABEL = 'Verifier Status';
  private static readonly TXN_LABEL = 'Transaction Number';
  private static readonly TARGET = 'Agree';
  private static readonly MAX_REPORT_PAGES = 80;

  async openRandomSamplingRecords(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Random Sampling Records',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();

    await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
  }

  private reportTitle(): Locator {
    return this.page
      .getByText(/Random Sampling Records Report\s*\(/i)
      .first();
  }

  private verifierCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${VerificationAgreePage.COL_LABEL}"]`
    );
  }

  private async waitForVerifierCells(): Promise<void> {
    await expect(this.verifierCells().first()).toBeVisible({
      timeout: 90_000,
    });
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
      await this.waitForVerifierCells().catch(() => undefined);
      console.log('Turned off Group by for Verifier Status edits');
    }
  }

  /** Empty / unset — not already Agree / Disagree / etc. */
  private isEmptyVerifierValue(raw: string): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (!text) return true;
    if (/^Edit\b/i.test(text) || /^Select an Option/i.test(text)) return true;
    // Already has a real status
    if (/^Agree\b/i.test(text) || /^Disagree\b/i.test(text)) return false;
    if (/^Accepted\b/i.test(text) || /^Rejected\b/i.test(text)) return false;
    return true;
  }

  private async transactionNumberFromRow(row: Locator): Promise<string> {
    const txnCell = row.locator(
      `[role="gridcell"][data-label="${VerificationAgreePage.TXN_LABEL}"]`
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
    if (match) return match[0];

    // Fallback: any T-#### in the row
    const rowText = (await row.innerText().catch(() => ''))
      .replace(/\s+/g, ' ')
      .trim();
    const rowMatch = rowText.match(/T-\d+/);
    return rowMatch?.[0] ?? text;
  }

  /**
   * Walk every report page; set empty Verifier Status → Agree.
   * Returns identifiers (transaction numbers when available) for each row marked.
   */
  async setEmptyVerifierStatusToAgreeOnAllPages(): Promise<string[]> {
    await this.waitForVerifierCells();
    await this.goToFirstReportPage();

    const marked: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const pageMarked = await this.setEmptyOnCurrentPage();
      marked.push(...pageMarked);
      console.log(
        `Page ${pageNum}: set ${pageMarked.length} empty Verifier Status → Agree` +
          (pageMarked.length ? ` (${pageMarked.join(', ')})` : '')
      );

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Verifier Status: total updated across pages = ${marked.length}`
    );
    return marked;
  }

  private async setEmptyOnCurrentPage(): Promise<string[]> {
    const updated: string[] = [];
    const target = VerificationAgreePage.TARGET;

    for (let guard = 0; guard < 200; guard++) {
      const cells = this.verifierCells();
      const count = await cells.count();
      let emptyIndex = -1;

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        if (
          (await cell
            .getAttribute('data-verifier-skip')
            .catch(() => null)) === '1'
        ) {
          continue;
        }
        const text = (await cell.innerText().catch(() => '')).trim();
        if (this.isEmptyVerifierValue(text)) {
          emptyIndex = i;
          break;
        }
      }

      if (emptyIndex < 0) break;

      const cell = this.verifierCells().nth(emptyIndex);
      const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
      const txnNumber = await this.transactionNumberFromRow(row);

      const ok = await this.setCellToAgree(cell);
      if (!ok) {
        console.warn(
          `Skipping Verifier Status cell index ${emptyIndex}` +
            (txnNumber ? ` (${txnNumber})` : '') +
            ' (could not open picklist)'
        );
        await cell.evaluate((el) =>
          el.setAttribute('data-verifier-skip', '1')
        );
        continue;
      }

      const label = txnNumber || `row-${emptyIndex}`;
      updated.push(label);
      console.log(`  Marked ${target} → ${label}`);
    }

    return updated;
  }

  private async setCellToAgree(cell: Locator): Promise<boolean> {
    const target = VerificationAgreePage.TARGET;
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
        `.slds-has-focus [data-label="${VerificationAgreePage.COL_LABEL}"] input, ` +
          `.slds-is-edited [data-label="${VerificationAgreePage.COL_LABEL}"] input, ` +
          `[data-label="${VerificationAgreePage.COL_LABEL}"] input, ` +
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
      .filter({ hasText: new RegExp(`^${target}$`, 'i') })
      .first();

    if (await option.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await option.click();
    } else {
      const dropOption = this.page
        .locator(
          '[role="listbox"]:visible span, .slds-dropdown:visible span'
        )
        .filter({ hasText: new RegExp(`^${target}$`, 'i') })
        .first();
      if (!(await dropOption.isVisible({ timeout: 5_000 }).catch(() => false))) {
        return false;
      }
      await dropOption.click();
    }

    // Escape cancels Lightning inline edits — use Tab to commit
    await this.page.keyboard.press('Tab').catch(() => undefined);

    const committed = await this.waitForCellValue(cell, target, 5_000);
    if (!committed) {
      console.warn(
        `Verifier Status did not stay as ${target} after picklist select`
      );
      return false;
    }
    return true;
  }

  private async waitForCellValue(
    cell: Locator,
    target: string,
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

  reportMarkedTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      markedValue: VerificationAgreePage.TARGET,
      markedCount: transactionNumbers.length,
      transactionNumbers,
      markedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'verification-agree-marked.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Verifier Status → Agree ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('=============================================');
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
      await this.verifierCells().first().innerText().catch(() => '')
    ).slice(0, 40);

    await pagerNext.first().click({ force: true });
    await expect(this.reportTitle()).toBeAttached({ timeout: 20_000 });

    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
      const firstAfter = (
        await this.verifierCells().first().innerText().catch(() => '')
      ).slice(0, 40);
      if (firstAfter && firstAfter !== firstBefore) break;
      if (await pagerNext.first().isDisabled().catch(() => false)) break;
      await this.page.waitForTimeout(300);
    }

    await this.waitForVerifierCells().catch(() => undefined);
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
        await this.waitForVerifierCells().catch(() => undefined);
        return;
      }
    }

    const page1 = this.page.getByRole('button', { name: '1', exact: true });
    if (await page1.isVisible({ timeout: 2_000 }).catch(() => false)) {
      await page1.click().catch(() => undefined);
      await this.waitForVerifierCells().catch(() => undefined);
    }
  }

  async save(options: { requireEdits?: boolean } = {}): Promise<void> {
    const saveBtn = this.page
      .getByRole('button', { name: /^Save$/i })
      .or(this.page.locator('button[title="Save"]'))
      .first();

    const visible = await saveBtn
      .isVisible({ timeout: 15_000 })
      .catch(() => false);

    if (!visible) {
      if (options.requireEdits) {
        throw new Error(
          'Expected Save after Verifier Status edits, but Save was not visible'
        );
      }
      console.log('Save not visible — no pending Verifier Status edits');
      return;
    }

    await expect(saveBtn).toBeEnabled({ timeout: 30_000 });
    console.log('Clicking Save on Random Sampling Records…');
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
