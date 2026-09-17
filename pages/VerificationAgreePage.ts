import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';

export type VerifierStatusValue = 'Agree' | 'Disagree';

/**
 * Verifier Status on Random Sampling Records.
 * Locators from codegen-output/verification-agree.ts
 * + screenshot: [role=gridcell][data-label="Verifier Status"]
 *
 * Empty cells → Agree/Disagree on every report page → Save once → assert toast.
 */
export type InDistrictConfirmedValue = 'Yes' | 'No';

export class VerificationAgreePage extends BasePage {
  private static readonly COL_LABEL = 'Verifier Status';
  private static readonly AUDITOR_RESPONSE_LABEL = 'Auditor Response';
  private static readonly IN_DISTRICT_CONFIRMED_LABEL = 'In District Confirmed?';
  private static readonly TXN_LABEL = 'Transaction Number';
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

  private auditorResponseCells(): Locator {
    return this.page.locator(
      `[role="gridcell"][data-label="${VerificationAgreePage.AUDITOR_RESPONSE_LABEL}"]`
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
   * Find empty / unset Verifier Status cells across every report page.
   * Returns transaction numbers (or row labels) for each empty field found.
   * Does not edit cells — used by incomplete-review error scenarios.
   */
  async findEmptyVerifierStatusTransactionNumbers(): Promise<string[]> {
    await this.waitForVerifierCells();
    await this.goToFirstReportPage();

    const emptyTxnNumbers: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const pageEmpty = await this.findEmptyOnCurrentPage();
      emptyTxnNumbers.push(...pageEmpty);
      console.log(
        `Page ${pageNum}: ${pageEmpty.length} empty Verifier Status cell(s)` +
          (pageEmpty.length ? ` → ${pageEmpty.join(', ')}` : '')
      );

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Verifier Status: total empty across pages = ${emptyTxnNumbers.length}`
    );
    return emptyTxnNumbers;
  }

  /** @deprecated Prefer findEmptyVerifierStatusTransactionNumbers() */
  async countEmptyVerifierStatusOnAllPages(): Promise<number> {
    return (await this.findEmptyVerifierStatusTransactionNumbers()).length;
  }

  private async findEmptyOnCurrentPage(): Promise<string[]> {
    const cells = this.verifierCells();
    const count = await cells.count();
    const empty: string[] = [];

    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      if (!(await cell.isVisible().catch(() => false))) continue;
      const text = (await cell.innerText().catch(() => '')).trim();
      if (!this.isEmptyVerifierValue(text)) continue;

      const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
      const txnNumber = await this.transactionNumberFromRow(row);
      const label = txnNumber || `row-${i}`;
      empty.push(label);
      console.log(`  Empty Verifier Status → ${label}`);
    }

    return empty;
  }

  private matchesVerifierStatus(
    raw: string,
    target: VerifierStatusValue
  ): boolean {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (target === 'Disagree') return /^Disagree\b/i.test(text);
    return /^Agree\b/i.test(text);
  }

  /**
   * Find Verifier Status cells already set to Agree or Disagree across every
   * report page. Returns transaction numbers for each match.
   */
  async findVerifierStatusTransactionNumbers(
    target: VerifierStatusValue
  ): Promise<string[]> {
    await this.waitForVerifierCells();
    await this.goToFirstReportPage();

    const txnNumbers: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const pageHits = await this.findStatusOnCurrentPage(target);
      txnNumbers.push(...pageHits);
      console.log(
        `Page ${pageNum}: ${pageHits.length} Verifier Status = ${target}` +
          (pageHits.length ? ` → ${pageHits.join(', ')}` : '')
      );

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Verifier Status: total ${target} across pages = ${txnNumbers.length}`
    );
    return txnNumbers;
  }

  private async findStatusOnCurrentPage(
    target: VerifierStatusValue
  ): Promise<string[]> {
    const cells = this.verifierCells();
    const count = await cells.count();
    const hits: string[] = [];

    for (let i = 0; i < count; i++) {
      const cell = cells.nth(i);
      if (!(await cell.isVisible().catch(() => false))) continue;
      const text = (await cell.innerText().catch(() => '')).trim();
      if (!this.matchesVerifierStatus(text, target)) continue;

      const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
      const txnNumber = await this.transactionNumberFromRow(row);
      const label = txnNumber || `row-${i}`;
      hits.push(label);
      console.log(`  Verifier Status ${target} → ${label}`);
    }

    return hits;
  }

  /**
   * Persist empty Verifier Status transaction numbers for the incomplete-review report.
   */
  reportEmptyVerifierTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      emptyCount: transactionNumbers.length,
      transactionNumbers,
      scannedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      'empty-verifier-status-transactions.json'
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Empty Verifier Status ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Empty count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('===========================================');
    console.log('');

    return outFile;
  }

  /**
   * Persist Disagree Verifier Status transaction numbers (Agree All Error report).
   */
  reportDisagreeVerifierTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      disagreeCount: transactionNumbers.length,
      transactionNumbers,
      scannedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      'disagree-verifier-status-transactions.json'
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Disagree Verifier Status ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Disagree count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('==============================================');
    console.log('');

    return outFile;
  }

  /**
   * Walk every report page; set empty Verifier Status → Agree or Disagree.
   * Returns identifiers (transaction numbers when available) for each row marked.
   */
  async setEmptyVerifierStatusOnAllPages(
    target: VerifierStatusValue
  ): Promise<string[]> {
    await this.waitForVerifierCells();
    await this.goToFirstReportPage();

    const marked: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const pageMarked = await this.setEmptyOnCurrentPage(target);
      marked.push(...pageMarked);
      console.log(
        `Page ${pageNum}: set ${pageMarked.length} empty Verifier Status → ${target}` +
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

  /** @deprecated Prefer setEmptyVerifierStatusOnAllPages('Agree') */
  async setEmptyVerifierStatusToAgreeOnAllPages(): Promise<string[]> {
    return this.setEmptyVerifierStatusOnAllPages('Agree');
  }

  private async setEmptyOnCurrentPage(
    target: VerifierStatusValue
  ): Promise<string[]> {
    const updated: string[] = [];

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

      const ok = await this.setCellToStatus(cell, target);
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

  private async setCellToStatus(
    cell: Locator,
    target: string,
    columnLabel: string = VerificationAgreePage.COL_LABEL
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
        `${columnLabel} did not stay as ${target} after picklist select`
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
    transactionNumbers: string[],
    markedValue: VerifierStatusValue = 'Agree'
  ): string {
    const report = {
      caseNumber,
      markedValue,
      markedCount: transactionNumbers.length,
      transactionNumbers,
      markedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      `verification-${markedValue.toLowerCase()}-marked.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log(`========== Verifier Status → ${markedValue} ==========`);
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

  /**
   * Set the first empty Verifier Status across report pages.
   * Locators from codegen-output/auditor-disagree-supervisor.ts
   * (picklist edit → option) via setCellToStatus.
   */
  async setFirstEmptyVerifierStatus(
    target: VerifierStatusValue
  ): Promise<string> {
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const cells = this.verifierCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const text = (await cell.innerText().catch(() => '')).trim();
        if (!this.isEmptyVerifierValue(text)) continue;

        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        const txnNumber = await this.transactionNumberFromRow(row);
        const ok = await this.setCellToStatus(cell, target);
        if (!ok) {
          throw new Error(
            `Could not set Verifier Status to ${target}` +
              (txnNumber ? ` for ${txnNumber}` : ` at cell index ${i}`)
          );
        }

        const label = txnNumber || `row-${i}`;
        console.log(
          `Marked first empty Verifier Status → ${target} (${label}) on page ${pageNum}`
        );
        return label;
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    throw new Error(
      `No empty Verifier Status cell found to set to ${target}`
    );
  }

  /**
   * Set Verifier Status for a specific transaction number (any current value).
   * Locators from codegen-output/auditor-disagree-supervisor.ts (T-23013719 → Disagree).
   * @returns changed=false when the cell already matched target (no Save needed).
   */
  async setVerifierStatusForTransaction(
    transactionNumber: string,
    target: VerifierStatusValue
  ): Promise<{ transactionNumber: string; changed: boolean }> {
    const txn = transactionNumber.trim();
    if (!txn) {
      throw new Error('Transaction number is required');
    }

    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();

      const txnLink = this.page.getByRole('link', { name: txn, exact: true });
      if (await txnLink.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        const row = txnLink
          .first()
          .locator('xpath=ancestor::*[@role="row"][1]');
        const cell = row.locator(
          `[role="gridcell"][data-label="${VerificationAgreePage.COL_LABEL}"]`
        );
        await expect(cell.first()).toBeVisible({ timeout: 15_000 });

        const current = (await cell.first().innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();
        if (this.matchesVerifierStatus(current, target)) {
          console.log(
            `Verifier Status already ${target} for ${txn} (page ${pageNum})`
          );
          return { transactionNumber: txn, changed: false };
        }

        const ok = await this.setCellToStatus(cell.first(), target);
        if (!ok) {
          throw new Error(
            `Could not set Verifier Status to ${target} for ${txn}`
          );
        }
        console.log(
          `Marked Verifier Status → ${target} for ${txn} (page ${pageNum})`
        );
        return { transactionNumber: txn, changed: true };
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    throw new Error(
      `Transaction ${txn} not found in Random Sampling Records`
    );
  }

  /**
   * Disagree Verifier Status rows whose Auditor Response is empty/unset.
   */
  async findDisagreeWithEmptyAuditorResponse(): Promise<string[]> {
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    const txnNumbers: string[] = [];

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const cells = this.verifierCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const verifierText = (await cell.innerText().catch(() => '')).trim();
        if (!this.matchesVerifierStatus(verifierText, 'Disagree')) continue;

        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        const auditorCell = row.locator(
          `[role="gridcell"][data-label="${VerificationAgreePage.AUDITOR_RESPONSE_LABEL}"]`
        );
        const auditorText = (
          await auditorCell.first().innerText().catch(() => '')
        ).trim();

        if (!this.isEmptyVerifierValue(auditorText)) {
          console.log(
            `  Skip ${await this.transactionNumberFromRow(row)} — Auditor Response is "${auditorText.replace(/\s+/g, ' ').trim()}"`
          );
          continue;
        }

        const txnNumber = await this.transactionNumberFromRow(row);
        const label = txnNumber || `row-${i}`;
        txnNumbers.push(label);
        console.log(
          `  Disagree + empty Auditor Response → ${label} (page ${pageNum})`
        );
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Disagree with empty Auditor Response: total = ${txnNumbers.length}`
    );
    return txnNumbers;
  }

  /**
   * Set Auditor Response for every row where Verifier Status is Disagree.
   * Returns transaction numbers that were updated (or already matched target).
   */
  async setAuditorResponseForDisagreeRows(
    target: VerifierStatusValue
  ): Promise<{ transactionNumbers: string[]; changedCount: number }> {
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];
    let changedCount = 0;

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const cells = this.verifierCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const verifierText = (await cell.innerText().catch(() => '')).trim();
        if (!this.matchesVerifierStatus(verifierText, 'Disagree')) continue;

        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        const auditorCell = row
          .locator(
            `[role="gridcell"][data-label="${VerificationAgreePage.AUDITOR_RESPONSE_LABEL}"]`
          )
          .first();
        await expect(auditorCell).toBeVisible({ timeout: 15_000 });

        const txnNumber = await this.transactionNumberFromRow(row);
        const label = txnNumber || `row-${i}`;
        const current = (await auditorCell.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();

        if (this.matchesVerifierStatus(current, target)) {
          console.log(
            `  Auditor Response already ${target} for ${label} (page ${pageNum})`
          );
          transactionNumbers.push(label);
          continue;
        }

        const ok = await this.setCellToStatus(
          auditorCell,
          target,
          VerificationAgreePage.AUDITOR_RESPONSE_LABEL
        );
        if (!ok) {
          throw new Error(
            `Could not set Auditor Response to ${target} for ${label}`
          );
        }
        changedCount += 1;
        transactionNumbers.push(label);
        console.log(
          `  Marked Auditor Response → ${target} for ${label} (page ${pageNum})`
        );
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Auditor Response ${target} on Disagree rows: ${transactionNumbers.length} ` +
        `(changed ${changedCount})`
    );
    return { transactionNumbers, changedCount };
  }

  /**
   * Clear Auditor Response for every row where Verifier Status is Disagree.
   * Returns transaction numbers cleared (already-empty rows are included).
   */
  async clearAuditorResponseForDisagreeRows(): Promise<{
    transactionNumbers: string[];
    changedCount: number;
  }> {
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];
    let changedCount = 0;

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const cells = this.verifierCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const verifierText = (await cell.innerText().catch(() => '')).trim();
        if (!this.matchesVerifierStatus(verifierText, 'Disagree')) continue;

        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        const auditorCell = row
          .locator(
            `[role="gridcell"][data-label="${VerificationAgreePage.AUDITOR_RESPONSE_LABEL}"]`
          )
          .first();
        await expect(auditorCell).toBeVisible({ timeout: 15_000 });

        const txnNumber = await this.transactionNumberFromRow(row);
        const label = txnNumber || `row-${i}`;
        const current = (await auditorCell.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();

        if (this.isEmptyVerifierValue(current)) {
          console.log(
            `  Auditor Response already empty for ${label} (page ${pageNum})`
          );
          transactionNumbers.push(label);
          continue;
        }

        const ok = await this.clearPicklistCell(
          auditorCell,
          VerificationAgreePage.AUDITOR_RESPONSE_LABEL
        );
        if (!ok) {
          throw new Error(`Could not clear Auditor Response for ${label}`);
        }
        changedCount += 1;
        transactionNumbers.push(label);
        console.log(
          `  Cleared Auditor Response for ${label} (page ${pageNum})`
        );
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Cleared Auditor Response on Disagree rows: ${transactionNumbers.length} ` +
        `(changed ${changedCount})`
    );
    return { transactionNumbers, changedCount };
  }

  private async clearPicklistCell(
    cell: Locator,
    columnLabel: string
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
      await input.fill('');
      await this.page.keyboard.press('ControlOrMeta+A').catch(() => undefined);
      await this.page.keyboard.press('Backspace').catch(() => undefined);
    } else if (await rowCombo.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await rowCombo.click();
    } else {
      return false;
    }

    const noneOption = this.page
      .locator('[role="listbox"] [role="option"]')
      .filter({
        hasText: /^(\s*|None|--None--|Select an Option|Select an option)$/i,
      })
      .first();

    if (await noneOption.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await noneOption.click();
    } else {
      // Escape closes without saving in some grids — prefer Tab after clear
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await editBtn.click({ force: true }).catch(() => undefined);
      if (await input.isVisible({ timeout: 3_000 }).catch(() => false)) {
        await input.fill('');
      }
    }

    await this.page.keyboard.press('Tab').catch(() => undefined);

    const deadline = Date.now() + 5_000;
    while (Date.now() < deadline) {
      const text = (await cell.innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();
      if (this.isEmptyVerifierValue(text)) return true;
      await this.page.waitForTimeout(150);
    }
    return this.isEmptyVerifierValue(
      (await cell.innerText().catch(() => '')).replace(/\s+/g, ' ').trim()
    );
  }

  reportDisagreeEmptyAuditorResponse(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      condition: 'Disagree Verifier Status with empty Auditor Response',
      count: transactionNumbers.length,
      transactionNumbers,
      scannedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      'disagree-empty-auditor-response-transactions.json'
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Disagree + empty Auditor Response ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('=======================================================');
    console.log('');

    return outFile;
  }

  reportDisagreeAuditorResponse(
    caseNumber: string,
    transactionNumbers: string[],
    auditorResponse: VerifierStatusValue
  ): string {
    const report = {
      caseNumber,
      condition: `Disagree Verifier Status with Auditor Response ${auditorResponse}`,
      auditorResponse,
      count: transactionNumbers.length,
      transactionNumbers,
      scannedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const slug = auditorResponse.toLowerCase();
    const outFile = path.join(
      outDir,
      `disagree-auditor-response-${slug}-transactions.json`
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log(
      `========== Disagree + Auditor Response ${auditorResponse} ==========`
    );
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('==========================================================');
    console.log('');

    return outFile;
  }

  /** @deprecated Prefer reportDisagreeAuditorResponse(..., 'Disagree') */
  reportDisagreeAuditorResponseDisagree(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    return this.reportDisagreeAuditorResponse(
      caseNumber,
      transactionNumbers,
      'Disagree'
    );
  }

  private parseInDistrictConfirmed(raw: string): InDistrictConfirmedValue | null {
    const text = raw.replace(/\s+/g, ' ').trim();
    if (/^Yes\b/i.test(text)) return 'Yes';
    if (/^No\b/i.test(text)) return 'No';
    return null;
  }

  private flipInDistrictValue(
    current: InDistrictConfirmedValue
  ): InDistrictConfirmedValue {
    return current === 'Yes' ? 'No' : 'Yes';
  }

  private inDistrictConfirmedCell(row: Locator): Locator {
    return row
      .locator(
        `[role="gridcell"][data-label="${VerificationAgreePage.IN_DISTRICT_CONFIRMED_LABEL}"]`
      )
      .or(
        row.locator(
          '[role="gridcell"][data-label="In District Confirmed"]'
        )
      )
      .first();
  }

  /**
   * For every Verifier Status = Disagree row, flip In District Confirmed?
   * Yes→No and No→Yes. Locators from
   * codegen-output/auditor-agree-audit-fields-change.ts (picklist edit).
   */
  async flipInDistrictConfirmedForDisagreeRows(): Promise<{
    transactionNumbers: string[];
    flips: Array<{
      transactionNumber: string;
      from: InDistrictConfirmedValue;
      to: InDistrictConfirmedValue;
    }>;
    changedCount: number;
  }> {
    await this.waitForVerifierCells();
    await this.ensureGroupByOff();
    await this.goToFirstReportPage();

    const transactionNumbers: string[] = [];
    const flips: Array<{
      transactionNumber: string;
      from: InDistrictConfirmedValue;
      to: InDistrictConfirmedValue;
    }> = [];
    let changedCount = 0;

    for (
      let pageNum = 1;
      pageNum <= VerificationAgreePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForVerifierCells();
      const cells = this.verifierCells();
      const count = await cells.count();

      for (let i = 0; i < count; i++) {
        const cell = cells.nth(i);
        if (!(await cell.isVisible().catch(() => false))) continue;
        const verifierText = (await cell.innerText().catch(() => '')).trim();
        if (!this.matchesVerifierStatus(verifierText, 'Disagree')) continue;

        const row = cell.locator('xpath=ancestor::*[@role="row"][1]');
        const districtCell = this.inDistrictConfirmedCell(row);
        await expect(districtCell).toBeVisible({ timeout: 15_000 });

        const txnNumber = await this.transactionNumberFromRow(row);
        const label = txnNumber || `row-${i}`;
        const currentRaw = (await districtCell.innerText().catch(() => ''))
          .replace(/\s+/g, ' ')
          .trim();
        const current = this.parseInDistrictConfirmed(currentRaw);

        if (!current) {
          throw new Error(
            `Disagree row ${label} has In District Confirmed? = ` +
              `"${currentRaw || '(empty)'}" — expected Yes or No to flip.`
          );
        }

        const target = this.flipInDistrictValue(current);
        const columnLabel = VerificationAgreePage.IN_DISTRICT_CONFIRMED_LABEL;
        const ok = await this.setCellToStatus(districtCell, target, columnLabel);
        if (!ok) {
          throw new Error(
            `Could not flip In District Confirmed? ${current}→${target} for ${label}`
          );
        }

        changedCount += 1;
        transactionNumbers.push(label);
        flips.push({ transactionNumber: label, from: current, to: target });
        console.log(
          `  Flipped In District Confirmed? ${current}→${target} for ${label} (page ${pageNum})`
        );
      }

      if (!(await this.advanceReportPage())) {
        break;
      }
    }

    console.log(
      `Flipped In District Confirmed? on Disagree rows: ${changedCount}`
    );
    return { transactionNumbers, flips, changedCount };
  }

  /**
   * Persist flipped In District Confirmed? rows for Disagree Verifier Status.
   * Writes reports/auditor-agree-in-district-flipped.json
   */
  reportFlippedInDistrictConfirmed(
    caseNumber: string,
    flips: Array<{
      transactionNumber: string;
      from: InDistrictConfirmedValue;
      to: InDistrictConfirmedValue;
    }>
  ): string {
    const report = {
      caseNumber,
      condition: 'Disagree Verifier Status — In District Confirmed? flipped',
      flippedCount: flips.length,
      flips,
      transactionNumbers: flips.map((f) => f.transactionNumber),
      flippedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(
      outDir,
      'auditor-agree-in-district-flipped.json'
    );
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== In District Confirmed? flipped ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${flips.length}`);
    for (const f of flips) {
      console.log(`  - ${f.transactionNumber}: ${f.from} → ${f.to}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('====================================================');
    console.log('');

    return outFile;
  }
}
