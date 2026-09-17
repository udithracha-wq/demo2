import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';
import { caseListUrl, lightningHomeUrl } from './SalesforceLoginPage';

/**
 * Duplicate Transaction flow (via Repeat Contributor Report UI).
 * Locators from codegen-output/codegen-nyselections-20260830-012125.ts
 * Flag marker verified live: img[alt="Flagged"][src="/resource/Flag"]
 */
export class DuplicateTransactionPage extends BasePage {
  private static readonly FLAGGED_IMG = 'img[alt="Flagged"][src="/resource/Flag"]';
  private static readonly TXN_LINK = /^T-\d+/;
  private static readonly MAX_REPORT_PAGES = 80;

  async searchAndOpenCase(caseNumber: string): Promise<void> {
    await this.page.goto(lightningHomeUrl(), { waitUntil: 'domcontentloaded' });

    try {
      await this.openCaseViaGlobalSearch(caseNumber);
    } catch (err) {
      console.warn(
        `Global search did not open Case ${caseNumber}; falling back to Case list.`,
        err
      );
      await this.openCaseViaCaseList(caseNumber);
    }

    await expect(
      this.page
        .getByRole('button', { name: 'Repeat Contributor Report' })
        .or(this.page.getByRole('button', { name: 'Random Sampling Records' }))
        .or(this.page.getByText(caseNumber, { exact: true }))
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Global search → type case number → click Case link (recent, suggestion, or results).
   * The overlay field is lightning-input.saInput (closed shadow). Playwright
   * sees the inner input as not visible, so we type into the focused host.
   */
  private async openCaseViaGlobalSearch(caseNumber: string): Promise<void> {
    const searchBtn = this.page.getByRole('button', { name: 'Search' });
    const searchHost = this.page.locator('lightning-input.saInput');

    await expect(searchBtn).toBeVisible({ timeout: 60_000 });

    if ((await searchHost.count()) === 0) {
      await searchBtn.click();
    }

    await expect(searchHost).toBeAttached({ timeout: 15_000 });
    await searchHost.click({ force: true }).catch(() => undefined);

    // Prefer an already-visible Recent / suggestion Case link
    const recentOrSuggestion = this.caseSearchLink(caseNumber);
    if (
      await recentOrSuggestion
        .isVisible({ timeout: 3_000 })
        .catch(() => false)
    ) {
      await recentOrSuggestion.click();
      return;
    }

    await this.page.keyboard.type(caseNumber);

    if (
      await recentOrSuggestion
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await recentOrSuggestion.click();
      return;
    }

    await this.page.keyboard.press('Enter');
    await expect(recentOrSuggestion).toBeVisible({ timeout: 60_000 });
    await recentOrSuggestion.click();
  }

  /** Case number link from search UI — not Transaction T-… links. */
  private caseSearchLink(caseNumber: string): Locator {
    const searchUi = this.page.locator(
      '.forceSearchAssistantDialog, .searchResultsSummary, ' +
        '[role="listbox"], .slds-dropdown_length-with-icon-10'
    );

    return searchUi
      .getByRole('link', { name: caseNumber, exact: true })
      .or(searchUi.locator(`a[title="${caseNumber}"]`))
      .or(searchUi.getByText(caseNumber, { exact: true }))
      .or(
        this.page
          .getByRole('link', { name: caseNumber, exact: true })
          .filter({ hasNotText: /^T-/ })
      )
      .or(this.page.locator(`a[title="${caseNumber}"]`))
      .first();
  }

  /**
   * Case list with list-view search (unused fallback kept for debugging).
   */
  private async openCaseViaCaseList(caseNumber: string): Promise<void> {
    await this.page.goto(caseListUrl(), { waitUntil: 'domcontentloaded' });

    const listSearch = this.page.locator('input[name="Case-search-input"]');
    await expect(listSearch).toBeVisible({ timeout: 30_000 });
    await listSearch.fill(caseNumber);
    await listSearch.press('Enter');

    const listLink = this.page
      .getByRole('link', { name: caseNumber, exact: true })
      .first();
    await expect(listLink).toBeVisible({ timeout: 60_000 });
    await listLink.click();
  }

  async openDuplicateTransactionReport(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Repeat Contributor Report',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
    await expect(
      this.page.getByText(/Repeat Contributor Report\s*\(/).first()
    ).toBeVisible({ timeout: 90_000 });
    // Datatable loads after the title — wait for real rows, not just the header
    await this.waitForReportRows();
  }

  /**
   * Keep walking every report page until a full Refresh + scan finds zero
   * Flagged icons. Never stop just because digit buttons 1–5 are the only
   * ones visible. Finish is required so Salesforce persists the removal.
   */
  async clearAllFlaggedTransactions(): Promise<string[]> {
    await this.waitForReportRows();
    const processed: string[] = [];
    const attemptsById = new Map<string, number>();

    for (let attempt = 0; attempt < 80; attempt++) {
      await this.returnToRepeatContributorReport();
      await this.refreshReportIfPossible();
      const leftover = await this.collectAllFlaggedIds();
      console.log(
        `Full-page scan ${attempt + 1}: ${leftover.length} flagged ` +
          `(${leftover.join(', ') || 'none'})`
      );

      if (leftover.length === 0) {
        if (!(await this.reportHasTransactionLinks())) {
          console.log('Scan found 0 flags but report rows are not visible; retrying.');
          continue;
        }
        break;
      }

      const transactionId = leftover.find((id) => (attemptsById.get(id) ?? 0) < 3);
      if (!transactionId) {
        throw new Error(
          'Flagged rows remain after retries: ' + leftover.join(', ')
        );
      }

      attemptsById.set(transactionId, (attemptsById.get(transactionId) ?? 0) + 1);
      const opened = await this.openFlaggedIdFromReport(transactionId);
      if (!opened) {
        console.log(`Could not open ${transactionId}; will retry on next scan.`);
        await this.closeTransactionWorkspace(transactionId).catch(() => undefined);
        await this.returnToRepeatContributorReport();
        continue;
      }

      console.log(`Clearing flags on ${transactionId}...`);
      await this.searchDuplicateTransactions();
      await this.removeAllDupeFlags();
      await this.finishDuplicateReview();
      await this.closeTransactionWorkspace(transactionId);
      await this.returnToRepeatContributorReport();
      await this.waitForReportRowsQuick().catch(() => undefined);
      if (!processed.includes(transactionId)) processed.push(transactionId);
    }

    const remaining = await this.collectAllFlaggedIds();
    if (remaining.length > 0) {
      throw new Error(
        'Incomplete clear — flagged transactions still on the report: ' +
          remaining.join(', ')
      );
    }

    console.log(
      processed.length
        ? `Cleared flags on ${processed.length} transaction(s): ${processed.join(', ')}`
        : 'No flagged transactions found.'
    );

    if (processed.length === 0) {
      throw new Error(
        'No flagged transactions found after scanning all report pages ' +
          '(all Repeat Contributor Codes). Expected img[alt="Flagged"] rows. ' +
          'Use a case that still has dupe flags.'
      );
    }

    await this.returnToRepeatContributorReport();
    return processed;
  }

  /** Refresh + walk every page; throw if any Flagged row remains. */
  async expectNoFlaggedTransactionsRemain(): Promise<void> {
    const title = this.page.getByText(/Repeat Contributor Report\s*\(/).first();
    if (!(await title.isVisible({ timeout: 8_000 }).catch(() => false))) {
      const btn = this.page.getByRole('button', {
        name: 'Repeat Contributor Report',
      });
      if (await btn.isVisible({ timeout: 10_000 }).catch(() => false)) {
        await this.openDuplicateTransactionReport();
      } else {
        await this.returnToRepeatContributorReport();
      }
    }
    await this.refreshReportIfPossible();
    const remaining = await this.collectAllFlaggedIds();
    if (remaining.length > 0) {
      throw new Error(
        `Expected 0 flagged transactions, still found: ${remaining.join(', ')}`
      );
    }
    console.log('Verification: 0 flagged transactions remain on all pages.');
  }

  /** Walk page 1..last via report pager Next (never Flow Next). */
  private async collectAllFlaggedIds(): Promise<string[]> {
    const title = this.page.getByText(/Repeat Contributor Report\s*\(/).first();
    if (!(await title.isVisible({ timeout: 20_000 }).catch(() => false))) {
      await this.returnToRepeatContributorReport();
    }
    await this.waitForReportRowsQuick().catch(() => undefined);

    const found: string[] = [];
    await this.goToFirstReportPage();

    for (let page = 0; page < DuplicateTransactionPage.MAX_REPORT_PAGES; page++) {
      await this.waitForReportRowsQuick().catch(() => undefined);
      const rows = this.flaggedRows();
      const count = await rows.count();
      for (let r = 0; r < count; r++) {
        const txnLink = rows
          .nth(r)
          .getByRole('link', { name: DuplicateTransactionPage.TXN_LINK })
          .first();
        if (!(await txnLink.isVisible({ timeout: 800 }).catch(() => false))) {
          continue;
        }
        const id = (await txnLink.innerText()).trim();
        if (id && !found.includes(id)) found.push(id);
      }
      if (!(await this.advanceReportPage())) break;
    }

    return found;
  }

  private async openFlaggedIdFromReport(
    transactionId: string
  ): Promise<boolean> {
    await this.goToFirstReportPage();

    for (let page = 0; page < DuplicateTransactionPage.MAX_REPORT_PAGES; page++) {
      await this.waitForReportRowsQuick().catch(() => undefined);
      const txnLink = this.flaggedRows()
        .getByRole('link', { name: transactionId, exact: true })
        .first();
      if (await txnLink.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await txnLink.click({ force: true });
        return this.waitForSearchDuplicateButton(transactionId);
      }
      if (!(await this.advanceReportPage())) break;
    }

    return false;
  }

  /**
   * Clicking T- from the report opens a workspace tab. Search Duplicate
   * Transactions only appears after that tab is active — not after a URL open.
   */
  private async waitForSearchDuplicateButton(
    transactionId: string
  ): Promise<boolean> {
    const searchBtn = this.page.getByRole('button', {
      name: 'Search Duplicate Transactions',
    });
    const txnTab = this.page.getByRole('tab', {
      name: new RegExp(`${transactionId}`),
    });

    if (await searchBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
      return true;
    }

    if (await txnTab.first().isVisible({ timeout: 25_000 }).catch(() => false)) {
      await txnTab.first().click().catch(() => undefined);
      if (await searchBtn.isVisible({ timeout: 20_000 }).catch(() => false)) {
        return true;
      }
      console.log(
        `Opened ${transactionId} workspace but Search Duplicate Transactions did not appear.`
      );
    }

    return false;
  }

  private async reportHasTransactionLinks(): Promise<boolean> {
    return this.page
      .getByRole('link', { name: DuplicateTransactionPage.TXN_LINK })
      .first()
      .isVisible({ timeout: 8_000 })
      .catch(() => false);
  }

  /**
   * Advance the Repeat Contributor datatable only.
   * Uses the Next that shares a parent with Previous — not Flow Next.
   */
  private async advanceReportPage(): Promise<boolean> {
    const pagerNext = this.page
      .locator('button[title="Previous"]')
      .locator('visible=true')
      .locator('xpath=ancestor::*[.//button[@title="Next"]][1]')
      .locator('button[title="Next"]')
      .locator('visible=true');

    if ((await pagerNext.count()) === 0) return false;
    if (await pagerNext.first().isDisabled().catch(() => true)) return false;

    await pagerNext.first().click({ force: true });
    await expect(
      this.page.getByText(/Repeat Contributor Report\s*\(/).first()
    ).toBeAttached({ timeout: 20_000 });
    await this.waitForReportRowsQuick().catch(() => undefined);
    return true;
  }

  private async goToReportPageNumber(pageNumber: number): Promise<boolean> {
    const btn = this.page.getByRole('button', {
      name: String(pageNumber),
      exact: true,
    });
    if (!(await btn.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return false;
    }
    await btn.click();
    await expect(
      this.page.getByText(/Repeat Contributor Report\s*\(/).first()
    ).toBeAttached({ timeout: 20_000 });
    await this.waitForReportRowsQuick().catch(() => undefined);
    return true;
  }

  /** After opening txns, return to the report for Next / Close / resume. */
  private async returnToRepeatContributorReport(): Promise<void> {
    const tab = this.page.getByRole('tab', {
      name: /Repeat Contributor Report/i,
    });
    if (await tab.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tab.first().click();
      await expect(
        this.page.getByText(/Repeat Contributor Report\s*\(/).first()
      ).toBeAttached({ timeout: 30_000 });
      return;
    }

    const btn = this.page.getByRole('button', {
      name: 'Repeat Contributor Report',
    });
    if (await btn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await btn.click();
      await expect(
        this.page.getByText(/Repeat Contributor Report\s*\(/).first()
      ).toBeAttached({ timeout: 60_000 });
    }
  }

  /**
   * Persist and print every transaction number whose flags were cleared.
   * Writes reports/duplicate-transaction-affected.json
   */
  reportAffectedTransactions(
    caseNumber: string,
    transactionNumbers: string[]
  ): string {
    const report = {
      caseNumber,
      clearedCount: transactionNumbers.length,
      transactionNumbers,
      clearedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'duplicate-transaction-affected.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Affected transaction numbers ==========');
    console.log(`Case: ${caseNumber}`);
    console.log(`Count: ${transactionNumbers.length}`);
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Saved → ${outFile}`);
    console.log('==================================================');
    console.log('');

    return outFile;
  }

  async searchDuplicateTransactions(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Search Duplicate Transactions',
    });
    await expect(btn).toBeVisible({ timeout: 45_000 });
    await btn.click();
  }

  async removeAllDupeFlags(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Remove All Dupe Flags',
    });
    await expect(btn).toBeVisible({ timeout: 45_000 });
    await btn.click();
  }

  /**
   * Finish persists the dupe-flag removal. Wait for it after Remove All
   * Dupe Flags; only skip if the dialog already closed on its own.
   */
  async finishDuplicateReview(): Promise<void> {
    const finish = this.page.getByRole('button', { name: /^Finish$/i });
    const remove = this.page.getByRole('button', {
      name: 'Remove All Dupe Flags',
    });

    if (await finish.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await expect(finish.first()).toBeEnabled({ timeout: 15_000 });
      await finish.first().click();
      await expect(remove).toBeHidden({ timeout: 45_000 }).catch(() => undefined);
      return;
    }

    // Dialog already dismissed after Remove All Dupe Flags
    if (!(await remove.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return;
    }

    await expect(finish.first()).toBeVisible({ timeout: 30_000 });
    await finish.first().click();
  }

  async closeTransactionWorkspace(transactionId: string): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: `Close ${transactionId} | Transaction`,
    });
    await expect(btn).toBeVisible({ timeout: 45_000 });
    await btn.click();
  }

  async clickNext(): Promise<void> {
    // Flow footer Next (enabled). Report pager Next is disabled on the last page.
    const next = this.page
      .locator('button:visible:not([disabled])')
      .filter({ hasText: /^Next$/ });

    if (await next.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      await next.first().click();
      return;
    }

    // Some cases leave no Flow Next after the last flag clear — Close is enough
    const close = this.page.getByRole('button', {
      name: 'Close Repeat Contributor',
    });
    if (await close.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('No enabled Next — Close Repeat Contributor is available; continuing.');
      return;
    }

    await expect(next.first()).toBeVisible({ timeout: 30_000 });
  }

  async closeDuplicateTransactionDialog(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Close Repeat Contributor',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  async expectCaseVisible(caseNumber: string): Promise<void> {
    const caseMarker = this.page
      .getByRole('tab', { name: new RegExp(caseNumber) })
      .or(this.page.getByRole('link', { name: caseNumber }))
      .or(this.page.getByText(caseNumber, { exact: true }));
    await expect(caseMarker.first()).toBeAttached({ timeout: 60_000 });
  }

  private flaggedRows(): Locator {
    return this.page.locator('[role="row"]').filter({
      has: this.page.locator(DuplicateTransactionPage.FLAGGED_IMG),
    });
  }

  private async waitForReportRows(): Promise<void> {
    await expect(
      this.page
        .locator(DuplicateTransactionPage.FLAGGED_IMG)
        .or(
          this.page.getByRole('link', {
            name: DuplicateTransactionPage.TXN_LINK,
          })
        )
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  private async waitForReportRowsQuick(): Promise<void> {
    await expect(
      this.page
        .locator(DuplicateTransactionPage.FLAGGED_IMG)
        .or(
          this.page.getByRole('link', {
            name: DuplicateTransactionPage.TXN_LINK,
          })
        )
        .first()
    ).toBeVisible({ timeout: 20_000 });
  }

  private async refreshReportIfPossible(): Promise<void> {
    const refresh = this.page
      .getByRole('button', { name: /^Refresh$/i })
      .locator('visible=true');
    if ((await refresh.count()) === 0) return;
    await refresh.first().click({ force: true }).catch(() => undefined);
    await this.waitForReportRowsQuick().catch(() => undefined);
  }

  /** Report pager digit buttons only — never Flow "Next" (same title, wrong control). */
  private async goToFirstReportPage(): Promise<void> {
    await this.goToReportPageNumber(1);
  }
}
