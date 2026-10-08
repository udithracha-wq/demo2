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
    await this.withRefreshRetry(async () => {
      await this.page.goto(lightningHomeUrl(), { waitUntil: 'domcontentloaded' });

      try {
        await this.openCaseViaGlobalSearch(caseNumber);
      } catch (err) {
        const msg = err instanceof Error ? err.message.split('\n')[0] : String(err);
        console.warn(
          `Global search did not open Case ${caseNumber}; falling back to Case list. ${msg}`
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
    }, `open case ${caseNumber}`);
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

    // Search results often paint the Case link as not-"visible" under overlays.
    const resultsLink = this.page
      .getByRole('link', { name: caseNumber, exact: true })
      .filter({ hasNotText: /^T-/ })
      .first();
    await expect(resultsLink).toBeAttached({ timeout: 20_000 });
    if (await resultsLink.isVisible().catch(() => false)) {
      await resultsLink.click();
    } else {
      await resultsLink.click({ force: true });
    }
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
    await this.withRefreshRetry(async () => {
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
    }, 'Repeat Contributor Report');
  }

  /**
   * Fast path: forward pager walks until Refresh shows zero Flagged rows.
   * Always re-anchor on the Repeat Contributor Report after each txn so the
   * walk cannot exit early. Finish persists removals.
   */
  async clearAllFlaggedTransactions(): Promise<string[]> {
    await this.waitForReportRows();
    const processed: string[] = [];

    for (let pass = 1; pass <= 40; pass++) {
      await this.ensureOnRepeatContributorReport();
      await this.clearFlagsForwardWalk(processed, `pass-${pass}`);
      await this.ensureOnRepeatContributorReport();
      await this.refreshReportIfPossible();
      const remaining = await this.collectAllFlaggedIds();
      console.log(
        `After pass-${pass}: ${remaining.length} flagged ` +
          `(${remaining.slice(0, 12).join(', ') || 'none'}` +
          `${remaining.length > 12 ? `, …+${remaining.length - 12}` : ''})`
      );
      if (remaining.length === 0) break;
      if (pass === 40) {
        throw new Error(
          'Incomplete clear — flagged transactions still on the report: ' +
            remaining.join(', ')
        );
      }
    }

    if (processed.length === 0) {
      console.log(
        'No flagged transactions on the first scan. Checking the report once again…'
      );
      await this.ensureOnRepeatContributorReport();
      await this.refreshReportIfPossible();
      await this.clearFlagsForwardWalk(processed, 'recheck');
      await this.ensureOnRepeatContributorReport();
      await this.refreshReportIfPossible();
      const remaining = await this.collectAllFlaggedIds();
      console.log(
        `After recheck: ${remaining.length} flagged ` +
          `(${remaining.slice(0, 12).join(', ') || 'none'}` +
          `${remaining.length > 12 ? `, …+${remaining.length - 12}` : ''})`
      );
      if (remaining.length > 0) {
        throw new Error(
          'Incomplete clear — flagged transactions still on the report: ' +
            remaining.join(', ')
        );
      }
    }

    console.log(
      processed.length
        ? `Cleared flags on ${processed.length} transaction(s): ${processed.join(', ')}`
        : 'No duplicate flags were found. Continuing with the rest of the scenario.'
    );

    if (processed.length === 0) {
      await this.ensureOnRepeatContributorReport();
      return processed;
    }

    await this.ensureOnRepeatContributorReport();
    return processed;
  }

  /**
   * Walk pages 1..N once. On each page keep clearing the first Flagged T-
   * until none remain, then advance. Skip ids already successfully cleared.
   */
  private async clearFlagsForwardWalk(
    processed: string[],
    label: string
  ): Promise<void> {
    const attemptsById = new Map<string, number>();
    await this.ensureOnRepeatContributorReport();
    await this.goToFirstReportPage();
    let pageIdx = 0;
    let emptyAdvances = 0;
    let clearedSinceRefresh = 0;

    while (pageIdx < DuplicateTransactionPage.MAX_REPORT_PAGES) {
      await this.waitForFlagIconsOrSettleFast();
      const next = await this.firstFlaggedOnCurrentPage(processed);
      if (!next) {
        // Grid often stays stale after Remove All — refresh + restart once
        // within this walk before treating the report as done.
        if (clearedSinceRefresh > 0) {
          console.log(
            `${label}: no flags visible after ${clearedSinceRefresh} clear(s); refreshing…`
          );
          await this.refreshReportIfPossible();
          await this.goToFirstReportPage();
          pageIdx = 0;
          clearedSinceRefresh = 0;
          emptyAdvances = 0;
          continue;
        }
        if (await this.advanceReportPage()) {
          pageIdx++;
          emptyAdvances++;
          if (emptyAdvances >= 5) {
            await this.ensureOnRepeatContributorReport();
            await this.goToReportPageNumber(pageIdx + 1).catch(() => undefined);
            emptyAdvances = 0;
          }
          continue;
        }
        break;
      }
      emptyAdvances = 0;

      const { id, link } = next;
      const attempts = attemptsById.get(id) ?? 0;
      if (attempts >= 3) {
        console.log(
          `${label}: giving up on ${id} after ${attempts} open attempts; advancing.`
        );
        if (!(await this.advanceReportPage())) break;
        pageIdx++;
        continue;
      }
      attemptsById.set(id, attempts + 1);

      console.log(`${label}: clearing ${id} (page ~${pageIdx + 1})...`);
      const opened = await this.openTransactionFromReportLink(link, id);
      if (!opened) {
        console.log(`${label}: could not open ${id}; retrying.`);
        await this.dismissTransactionWorkspace(id);
        await this.ensureOnRepeatContributorReport();
        continue;
      }

      await this.searchDuplicateTransactions();
      await this.removeAllDupeFlags();
      await this.finishDuplicateReview();
      await this.dismissTransactionWorkspace(id);
      await this.ensureOnRepeatContributorReport();
      if (!processed.includes(id)) processed.push(id);
      clearedSinceRefresh++;
    }
  }

  /**
   * Refresh and walk every page. Flagged rows still on the report fail the check.
   * When the earlier scan found nothing and the report cannot be shown again
   * after one refresh, continue — there is nothing left to clear.
   */
  async expectNoFlaggedTransactionsRemain(
    options: { continueIfNothingFound?: boolean } = {}
  ): Promise<void> {
    let opened = false;
    try {
      opened = await this.reopenReportForFlagCheck();
    } catch (err) {
      if (!options.continueIfNothingFound) throw err;
      const why = err instanceof Error ? err.message.split('\n')[0] : String(err);
      console.log(
        `No duplicate flags were found. Could not reopen the report (${why}). Continuing with the next steps.`
      );
      return;
    }
    if (!opened) {
      if (options.continueIfNothingFound) {
        console.log(
          'No duplicate flags were found. The report is not open after refresh, so continuing with the next steps.'
        );
        return;
      }
      throw new Error(
        'Page was still not as expected after refresh during "no flagged transactions should remain". Repeat Contributor Report did not open.'
      );
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

  private async reopenReportForFlagCheck(): Promise<boolean> {
    const title = () =>
      this.page.getByText(/Repeat Contributor Report\s*\(/).first();
    if (await title().isVisible({ timeout: 8_000 }).catch(() => false)) {
      return true;
    }

    const openFromCase = async (): Promise<boolean> => {
      const btn = this.page.getByRole('button', {
        name: 'Repeat Contributor Report',
      });
      if (await btn.isVisible({ timeout: 8_000 }).catch(() => false)) {
        await btn.click();
        return title().isVisible({ timeout: 30_000 }).catch(() => false);
      }
      await this.returnToRepeatContributorReport();
      return title().isVisible({ timeout: 8_000 }).catch(() => false);
    };

    if (await openFromCase()) return true;

    console.log(
      'Repeat Contributor Report was not visible for the flag check. Refreshing and trying once more.'
    );
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    return openFromCase();
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
      await this.waitForFlagIconsOrSettleFast();
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

  private async firstFlaggedOnCurrentPage(
    skipIds: string[]
  ): Promise<{ id: string; link: Locator } | null> {
    const rows = this.flaggedRows();
    const count = await rows.count();
    for (let r = 0; r < count; r++) {
      const rowLink = rows
        .nth(r)
        .getByRole('link', { name: DuplicateTransactionPage.TXN_LINK })
        .first();
      if (!(await rowLink.isVisible({ timeout: 500 }).catch(() => false))) {
        continue;
      }
      const id = (await rowLink.innerText()).trim();
      if (!id || skipIds.includes(id)) continue;
      return { id, link: rowLink };
    }
    return null;
  }

  /**
   * Lightning often ignores the first T- click. Click, short probe, click
   * again immediately — fail fast if Search Duplicate never appears.
   */
  private async openTransactionFromReportLink(
    rowLink: Locator,
    transactionId: string
  ): Promise<boolean> {
    await rowLink.click({ force: true }).catch(() => undefined);
    if (await this.waitForSearchDuplicateButton(transactionId, 4_000)) {
      return true;
    }

    await rowLink.click({ force: true }).catch(async () => {
      const again = this.page
        .getByRole('link', { name: transactionId, exact: true })
        .first();
      await again.click({ force: true }).catch(() => undefined);
    });
    if (await this.waitForSearchDuplicateButton(transactionId, 12_000)) {
      return true;
    }

    console.log(
      `Click on ${transactionId} did not open Search Duplicate Transactions.`
    );
    return false;
  }

  private async waitForSearchDuplicateButton(
    transactionId: string,
    timeoutMs = 10_000
  ): Promise<boolean> {
    const searchBtn = this.searchDuplicateButton();
    const txnTab = this.page.getByRole('tab', {
      name: new RegExp(transactionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    });
    const deadline = Date.now() + timeoutMs;
    let activatedTab = false;

    while (Date.now() < deadline) {
      if (await searchBtn.isVisible().catch(() => false)) return true;

      if (!activatedTab && (await txnTab.first().isVisible().catch(() => false))) {
        await txnTab.first().click().catch(() => undefined);
        activatedTab = true;
        if (await searchBtn.isVisible({ timeout: 3_000 }).catch(() => false)) {
          return true;
        }
      }

      await searchBtn
        .waitFor({ state: 'visible', timeout: 250 })
        .catch(() => undefined);
    }
    return false;
  }

  private searchDuplicateButton(): Locator {
    return this.page
      .getByRole('button', { name: /Search Duplicate Transactions/i })
      .or(this.page.getByText(/Search Duplicate Transactions/i))
      .first();
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
    await this.ensureOnRepeatContributorReport();
  }

  /** Guarantee the Repeat Contributor Report grid is the active view. */
  private async ensureOnRepeatContributorReport(): Promise<void> {
    const title = this.page.getByText(/Repeat Contributor Report\s*\(/).first();
    if (await title.isVisible({ timeout: 1_000 }).catch(() => false)) {
      return;
    }
    if ((await title.count()) > 0) {
      const tab = this.page.getByRole('tab', {
        name: /Repeat Contributor Report/i,
      });
      if (await tab.first().isVisible({ timeout: 1_500 }).catch(() => false)) {
        await tab.first().click().catch(() => undefined);
      }
      if (await title.isVisible({ timeout: 8_000 }).catch(() => false)) {
        return;
      }
    }

    const tab = this.page.getByRole('tab', {
      name: /Repeat Contributor Report/i,
    });
    if (await tab.first().isVisible({ timeout: 2_000 }).catch(() => false)) {
      await tab.first().click();
      if (await title.isVisible({ timeout: 8_000 }).catch(() => false)) {
        return;
      }
      console.log(
        'Repeat Contributor Report heading stayed hidden. Refreshing and opening the report again.'
      );
      await this.page.reload({ waitUntil: 'domcontentloaded' });
    }

    const btn = this.page.getByRole('button', {
      name: 'Repeat Contributor Report',
    });
    if (await btn.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await btn.click();
      await expect(title).toBeVisible({ timeout: 90_000 });
      await this.waitForReportRowsQuick().catch(() => undefined);
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
      ...(transactionNumbers.length === 0
        ? { note: 'No duplicate flags were found.' }
        : {}),
      clearedAt: new Date().toISOString(),
    };

    const outDir = path.resolve('reports');
    fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, 'duplicate-transaction-affected.json');
    fs.writeFileSync(outFile, JSON.stringify(report, null, 2));

    console.log('');
    console.log('========== Affected transaction numbers ==========');
    console.log(`Case: ${caseNumber}`);
    if (transactionNumbers.length === 0) {
      console.log('No duplicate flags were found.');
    }
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
    const btn = this.searchDuplicateButton();
    await expect(btn).toBeVisible({ timeout: 20_000 });
    await btn.click();
  }

  async removeAllDupeFlags(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Remove All Dupe Flags',
    });
    await expect(btn).toBeVisible({ timeout: 20_000 });
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

    if (await finish.first().isVisible({ timeout: 10_000 }).catch(() => false)) {
      await expect(finish.first()).toBeEnabled({ timeout: 10_000 });
      await finish.first().click();
      await expect(remove).toBeHidden({ timeout: 30_000 }).catch(() => undefined);
      return;
    }

    // Dialog already dismissed after Remove All Dupe Flags
    if (!(await remove.isVisible({ timeout: 1_500 }).catch(() => false))) {
      return;
    }

    await expect(finish.first()).toBeVisible({ timeout: 20_000 });
    await finish.first().click();
  }

  async closeTransactionWorkspace(transactionId: string): Promise<void> {
    await this.dismissTransactionWorkspace(transactionId, 30_000);
  }

  /** Close txn workspace quickly; no long wait when the tab never opened. */
  private async dismissTransactionWorkspace(
    transactionId: string,
    timeoutMs = 4_000
  ): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: `Close ${transactionId} | Transaction`,
    });
    if (await btn.isVisible({ timeout: Math.min(timeoutMs, 4_000) }).catch(() => false)) {
      await btn.click().catch(() => undefined);
      return;
    }
    const tab = this.page.getByRole('tab', {
      name: new RegExp(transactionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    });
    if (await tab.first().isVisible({ timeout: 800 }).catch(() => false)) {
      // Close control sometimes uses a different accessible name
      const closeAny = this.page
        .getByRole('button', { name: new RegExp(`Close ${transactionId}`) })
        .first();
      if (await closeAny.isVisible({ timeout: 1_500 }).catch(() => false)) {
        await closeAny.click().catch(() => undefined);
      }
    }
  }

  async clickNext(options: { continueIfMissing?: boolean } = {}): Promise<void> {
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

    if (options.continueIfMissing) {
      console.log(
        'No duplicate flags were found, and Next is not available. Continuing with the rest of the scenario.'
      );
      return;
    }

    await expect(next.first()).toBeVisible({ timeout: 30_000 });
  }

  async closeDuplicateTransactionDialog(
    options: { continueIfMissing?: boolean } = {}
  ): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Close Repeat Contributor',
    });
    if (
      options.continueIfMissing &&
      !(await btn.isVisible({ timeout: 15_000 }).catch(() => false))
    ) {
      console.log(
        'No duplicate flags were found, and Close Repeat Contributor is not available. Continuing with the rest of the scenario.'
      );
      return;
    }
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  async expectCaseVisible(
    caseNumber: string,
    options: { recoverBySearch?: boolean } = {}
  ): Promise<void> {
    const caseMarker = this.page
      .getByRole('tab', { name: new RegExp(caseNumber) })
      .or(this.page.getByRole('link', { name: caseNumber }))
      .or(this.page.getByText(caseNumber, { exact: true }));
    if (await caseMarker.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
      return;
    }
    console.log(
      `Case ${caseNumber} was not visible. Refreshing and checking once more.`
    );
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    if (await caseMarker.first().isVisible({ timeout: 20_000 }).catch(() => false)) {
      return;
    }
    if (options.recoverBySearch) {
      console.log(
        `Case ${caseNumber} was still not visible after refresh. Opening the case again and continuing.`
      );
      await this.searchAndOpenCase(caseNumber);
      return;
    }
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
    await this.waitForFlagIconsOrSettle();
  }

  /**
   * Transaction links paint before Flag icons. Wait for a Flagged image
   * after rows exist so we do not treat a still-loading page as clean.
   */
  private async waitForFlagIconsOrSettle(): Promise<void> {
    await this.waitForReportRowsQuick().catch(() => undefined);
    await this.page
      .locator(DuplicateTransactionPage.FLAGGED_IMG)
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .catch(() => undefined);
  }

  /** Shorter settle for the forward clear walk. */
  private async waitForFlagIconsOrSettleFast(): Promise<void> {
    await this.page
      .getByRole('link', { name: DuplicateTransactionPage.TXN_LINK })
      .first()
      .waitFor({ state: 'visible', timeout: 8_000 })
      .catch(() => undefined);
    await this.page
      .locator(DuplicateTransactionPage.FLAGGED_IMG)
      .first()
      .waitFor({ state: 'visible', timeout: 1_500 })
      .catch(() => undefined);
  }

  /** Report pager digit buttons only — never Flow "Next" (same title, wrong control). */
  private async goToFirstReportPage(): Promise<void> {
    await this.goToReportPageNumber(1);
  }
}
