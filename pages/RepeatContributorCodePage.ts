import { expect, type Locator } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { BasePage } from './BasePage';
import { DuplicateTransactionPage } from './DuplicateTransactionPage';

export type ReportRow = {
  name: string;
  code: string;
  pageNum: number;
  rowIndex: number;
  transactionNumber: string;
};

type CodeFix = {
  name: string;
  wrongCode: string;
  canonical: string;
  pageNum: number;
  transactionNumber: string;
};

/** One row updated during align (reported in feature / console / reports). */
export type ContributorCodeChange = {
  contributorFullName: string;
  oldCode: string;
  newCode: string;
  transactionNumber: string;
};

/**
 * Align or clear Repeat Contributor Codes on the Repeat Contributor Report.
 * Locators from codegen-output/codegen-nyselections-20260902-104954.ts
 *
 * - Align: same Contributor Full Name → same code
 * - Clear shared: same code on different name groups → clear minority names
 */
export class RepeatContributorCodePage extends BasePage {
  private static readonly MAX_REPORT_PAGES = 100;
  private static readonly CHANGES_REPORT_PATH = path.resolve(
    'reports/repeat-contributor-code-changes.json'
  );
  private static readonly CLEAR_SHARED_CHANGES_REPORT_PATH = path.resolve(
    'reports/clear-shared-contributor-code-changes.json'
  );

  private lastChanges: ContributorCodeChange[] = [];
  /** Cached scan from align/clear — avoids a second full pass when nothing changed. */
  private lastCollectedRows: ReportRow[] | null = null;
  private changesReportPath = RepeatContributorCodePage.CHANGES_REPORT_PATH;

  private report(): DuplicateTransactionPage {
    return new DuplicateTransactionPage(this.page);
  }

  async openRepeatContributorReport(): Promise<void> {
    await this.report().openDuplicateTransactionReport();
  }

  getLastChanges(): ContributorCodeChange[] {
    return [...this.lastChanges];
  }

  getLastCollectedRows(): ReportRow[] | null {
    return this.lastCollectedRows ? [...this.lastCollectedRows] : null;
  }

  /** Markdown table: Contributor Full Name | Old Code | New Code */
  formatChangesReport(changes: ContributorCodeChange[] = this.lastChanges): string {
    if (changes.length === 0) {
      return 'No Repeat Contributor Code changes were required.';
    }

    const header =
      '| Contributor Full Name | Old Code | New Code |\n' +
      '|---|---|---|';
    const rows = changes.map(
      (c) =>
        `| ${c.contributorFullName} | ${c.oldCode || '(empty)'} | ${c.newCode || '(cleared)'} |`
    );
    return [header, ...rows].join('\n');
  }

  /**
   * Scan every report page. For each Contributor Full Name that appears
   * 2+ times with mixed codes, copy the majority (matching) code onto
   * each mismatched row via Edit → fill → Save.
   * Returns the list of applied changes (name, old code, new code).
   */
  async alignCodesForDuplicateNames(): Promise<ContributorCodeChange[]> {
    this.changesReportPath = RepeatContributorCodePage.CHANGES_REPORT_PATH;
    return this.applyFixesAcrossReport({
      buildFixes: (rows) => this.buildFixes(rows),
      actionLabel: 'align',
      logLine: (fix) =>
        `Aligning "${fix.name}": ${fix.wrongCode || '(empty)'} → ${fix.canonical}` +
        (fix.transactionNumber ? ` [${fix.transactionNumber}]` : ''),
    });
  }

  /**
   * Scan every report page. When the same non-empty Repeat Contributor Code
   * appears on 2+ distinct Contributor Full Names, keep the code on the
   * majority name group and clear it on the other name(s) via Edit → clear → Save.
   *
   * Example: 4 rows for "Smith, Jane" share code ABC and 1 row for
   * "Doe, John" also has ABC → clear Doe's code.
   */
  async clearCodesSharedAcrossDifferentNames(): Promise<ContributorCodeChange[]> {
    this.changesReportPath =
      RepeatContributorCodePage.CLEAR_SHARED_CHANGES_REPORT_PATH;
    return this.applyFixesAcrossReport({
      buildFixes: (rows) => this.buildClearSharedCodeFixes(rows),
      actionLabel: 'clear',
      logLine: (fix) =>
        `Clearing "${fix.name}": ${fix.wrongCode || '(empty)'} → (cleared)` +
        (fix.transactionNumber ? ` [${fix.transactionNumber}]` : ''),
    });
  }

  private async applyFixesAcrossReport(options: {
    buildFixes: (rows: ReportRow[]) => CodeFix[];
    actionLabel: string;
    logLine: (fix: CodeFix) => string;
  }): Promise<ContributorCodeChange[]> {
    this.lastChanges = [];
    this.lastCollectedRows = null;
    await this.waitForReportRows();
    await this.clearReportFilter();
    await this.ensureGroupByOff();
    const rows = await this.collectAllRows();
    this.lastCollectedRows = rows;
    const fixes = options.buildFixes(rows);

    console.log(
      fixes.length
        ? `Found ${fixes.length} row(s) to ${options.actionLabel} across ${rows.length} report row(s).`
        : `No ${options.actionLabel} needed in ${rows.length} report row(s).`
    );

    if (fixes.length === 0) {
      this.logAndPersistChanges([]);
      return [];
    }

    const failed: string[] = [];
    for (const fix of fixes) {
      console.log(options.logLine(fix));
      const ok = await this.applyFix(fix);
      if (ok) {
        this.lastChanges.push({
          contributorFullName: fix.name,
          oldCode: fix.wrongCode,
          newCode: fix.canonical,
          transactionNumber: fix.transactionNumber,
        });
      } else {
        failed.push(
          `${fix.name} (${fix.wrongCode || '(empty)'} → ${fix.canonical || '(cleared)'})`
        );
      }
      await this.clearReportFilter();
      await this.waitForReportRows();
    }

    // Edits invalidate the cached scan
    this.lastCollectedRows = null;
    this.logAndPersistChanges(this.lastChanges);

    if (failed.length) {
      throw new Error(
        `Could not update ${failed.length} mismatched row(s):\n${failed.join('\n')}`
      );
    }

    return this.getLastChanges();
  }

  private logAndPersistChanges(changes: ContributorCodeChange[]): void {
    const table = this.formatChangesReport(changes);
    console.log('\n=== Repeat Contributor Code changes ===');
    console.log(table);
    console.log('=== End changes ===\n');

    fs.mkdirSync(path.dirname(this.changesReportPath), {
      recursive: true,
    });
    fs.writeFileSync(
      this.changesReportPath,
      JSON.stringify(
        {
          generatedAt: new Date().toISOString(),
          changeCount: changes.length,
          changes,
          markdownTable: table,
        },
        null,
        2
      ),
      'utf8'
    );
    console.log(`Wrote changes report → ${this.changesReportPath}`);
  }

  async expectDuplicateNamesShareCodes(options?: {
    cachedRows?: ReportRow[] | null;
    skipRescanIfClean?: boolean;
  }): Promise<void> {
    const rows = await this.resolveRowsForVerify(options, 'align');
    const mismatches = this.findMismatchMessages(rows);
    expect(mismatches, mismatches.join('\n') || undefined).toEqual([]);
  }

  /**
   * After clearing shared codes, no non-empty code should appear on
   * more than one distinct Contributor Full Name.
   */
  async expectCodesNotSharedAcrossDifferentNames(options?: {
    cachedRows?: ReportRow[] | null;
    skipRescanIfClean?: boolean;
  }): Promise<void> {
    const rows = await this.resolveRowsForVerify(options, 'clear');
    const mismatches = this.findSharedCodeAcrossNamesMessages(rows);
    expect(mismatches, mismatches.join('\n') || undefined).toEqual([]);
  }

  private async resolveRowsForVerify(
    options: {
      cachedRows?: ReportRow[] | null;
      skipRescanIfClean?: boolean;
    } | undefined,
    actionLabel: string
  ): Promise<ReportRow[]> {
    const canReuse =
      !!options?.skipRescanIfClean &&
      !!options.cachedRows &&
      options.cachedRows.length > 0;

    if (canReuse) {
      const rows = options!.cachedRows!;
      console.log(
        `Skipping re-scan (reusing ${rows.length} rows from ${actionLabel} — 0 changes).`
      );
      return rows;
    }

    await this.clearReportFilter();
    const rows = await this.collectAllRows();
    this.lastCollectedRows = rows;
    return rows;
  }

  private findMismatchMessages(rows: ReportRow[]): string[] {
    const mismatches: string[] = [];
    const byName = this.groupByName(rows);
    for (const [, group] of byName) {
      if (group.length < 2) continue;
      const displayName = group[0]?.name ?? '';
      const codes = new Set(group.map((r) => r.code));
      if (codes.size > 1) {
        mismatches.push(
          `"${displayName}" has codes: ${[...codes].map((c) => c || '(empty)').join(', ')}`
        );
      }
    }
    return mismatches;
  }

  private findSharedCodeAcrossNamesMessages(rows: ReportRow[]): string[] {
    const mismatches: string[] = [];
    const byCode = this.groupByCode(rows);
    for (const [code, group] of byCode) {
      // Case-insensitive distinct names (Zhang, YanFeng === Zhang, Yanfeng)
      const byName = this.groupByName(group);
      if (byName.size < 2) continue;
      const names = [...byName.values()].map((g) => g[0]?.name ?? '');
      mismatches.push(
        `Code "${code}" is shared by ${names.length} name(s): ${names.join('; ')}`
      );
    }
    return mismatches;
  }

  private buildFixes(rows: ReportRow[]): CodeFix[] {
    const fixes: CodeFix[] = [];
    const byName = this.groupByName(rows);

    for (const [, group] of byName) {
      if (group.length < 2) continue;
      const canonical = this.majorityCode(group.map((r) => r.code));
      if (!canonical) continue;

      for (const row of group) {
        if (row.code === canonical) continue;
        fixes.push({
          name: row.name,
          wrongCode: row.code,
          canonical,
          pageNum: row.pageNum,
          transactionNumber: row.transactionNumber,
        });
      }
    }
    return fixes;
  }

  /**
   * For each non-empty code used by 2+ distinct names (case-insensitive):
   * keep the majority name group; on a tie, keep the alphabetically first
   * name key and clear the code on every other name's rows.
   */
  private buildClearSharedCodeFixes(rows: ReportRow[]): CodeFix[] {
    const fixes: CodeFix[] = [];
    const byCode = this.groupByCode(rows);

    for (const [code, codeRows] of byCode) {
      const byName = this.groupByName(codeRows);
      if (byName.size < 2) continue;

      const { keeper, tied } = this.keeperNameKey(byName);
      if (tied) {
        const summary = [...byName.entries()]
          .map(([key, list]) => `${list[0]?.name ?? key}×${list.length}`)
          .join(', ');
        console.log(
          `Code "${code}" tied (${summary}); keeping "${byName.get(keeper)?.[0]?.name ?? keeper}" (alphabetical), clearing others.`
        );
      }

      for (const [nameKey, nameRows] of byName) {
        if (nameKey === keeper) continue;
        for (const row of nameRows) {
          fixes.push({
            name: row.name,
            wrongCode: row.code || code,
            canonical: '',
            pageNum: row.pageNum,
            transactionNumber: row.transactionNumber,
          });
        }
      }
    }
    return fixes;
  }

  /**
   * Prefer the unique majority name; on a tie for most rows, keep the
   * alphabetically first name key among the tied contenders.
   */
  private keeperNameKey(byName: Map<string, ReportRow[]>): {
    keeper: string;
    tied: boolean;
  } {
    let bestCount = 0;
    for (const list of byName.values()) {
      if (list.length > bestCount) bestCount = list.length;
    }

    const contenders = [...byName.entries()]
      .filter(([, list]) => list.length === bestCount)
      .map(([key]) => key)
      .sort((a, b) => a.localeCompare(b));

    return {
      keeper: contenders[0]!,
      tied: contenders.length > 1,
    };
  }

  /**
   * Prefer report filter (by wrong code, then last name) over brittle
   * numbered pagination when locating a row to edit.
   */
  private async applyFix(fix: CodeFix): Promise<boolean> {
    await this.ensureGroupByOff();
    // Prefer human-readable filter keys (skip Salesforce record paths like /a0W...)
    const txnFilter =
      fix.transactionNumber.startsWith('T-') || /^\d+$/.test(fix.transactionNumber)
        ? fix.transactionNumber
        : '';
    const queries = [
      txnFilter,
      fix.wrongCode,
      fix.name.split(',')[0]?.trim() ?? fix.name,
      fix.name,
    ].filter((q) => !!q);

    for (const query of queries) {
      await this.filterReport(query);
      const rows = this.dataRows();
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        if (fix.transactionNumber) {
          const txn = await this.cellValue(row, 'Transaction Number');
          if (txn !== fix.transactionNumber) continue;
        } else {
          const code = await this.readContributorCode(row);
          if (code !== fix.wrongCode) continue;
          const name = await this.readContributorName(row);
          if (
            name &&
            name.trim().toLowerCase() !== fix.name.trim().toLowerCase()
          ) {
            continue;
          }
        }

        const code = await this.readContributorCode(row);
        if (code === fix.canonical) return true;
        if (fix.wrongCode && code !== fix.wrongCode) continue;

        await this.editRow(row, fix.canonical);
        return true;
      }
    }

    await this.clearReportFilter();
    await this.goToFirstPage();
    for (
      let pageNum = 1;
      pageNum <= RepeatContributorCodePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      const rows = this.dataRows();
      const count = await rows.count();
      for (let i = 0; i < count; i++) {
        const row = rows.nth(i);
        if (fix.transactionNumber) {
          const txn = await this.cellValue(row, 'Transaction Number');
          if (txn !== fix.transactionNumber) continue;
        } else {
          const code = await this.readContributorCode(row);
          if (fix.wrongCode && code !== fix.wrongCode) continue;
          const name = await this.readContributorName(row);
          if (
            name &&
            name.trim().toLowerCase() !== fix.name.trim().toLowerCase()
          ) {
            continue;
          }
        }

        const code = await this.readContributorCode(row);
        if (code === fix.canonical) return true;

        await this.editRow(row, fix.canonical);
        return true;
      }
      if (!(await this.goToNextPage())) break;
    }

    console.warn(
      `Could not find row for "${fix.name}" with code ${fix.wrongCode || '(empty)'}` +
        (fix.transactionNumber ? ` txn ${fix.transactionNumber}` : '')
    );
    return false;
  }

  private async expectedReportCount(): Promise<number | null> {
    const title = this.page.getByText(/Repeat Contributor Report\s*\(\d+\)/).first();
    if (!(await title.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return null;
    }
    const text = (await title.innerText()).replace(/\s+/g, ' ');
    const match = text.match(/Repeat Contributor Report\s*\((\d+)\)/i);
    return match ? Number(match[1]) : null;
  }

  /**
   * "Group by Active" hides First/Last Name on continuation rows, so those
   * transactions were skipped (e.g. 162 of 281). Turn it off for a flat list.
   */
  private async ensureGroupByOff(): Promise<void> {
    const toggle = this.page.locator('input[name="groupToggle"]');
    if (!(await toggle.count())) return;
    if (!(await toggle.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    const wasGrouped = await toggle.isChecked().catch(() => false);
    if (wasGrouped) {
      console.log('Turning off Group by so every transaction row is visible');
      await toggle.click({ force: true });
      await this.page
        .locator('.slds-spinner')
        .first()
        .waitFor({ state: 'hidden', timeout: 15_000 })
        .catch(() => undefined);
      await this.waitForReportRows();
    }
  }

  private async collectAllRows(): Promise<ReportRow[]> {
    await this.clearReportFilter();
    await this.ensureGroupByOff();
    await this.goToFirstPage();
    const expected = await this.expectedReportCount();
    if (expected) {
      console.log(`Report title count: ${expected}`);
    }

    const all: ReportRow[] = [];
    const seenTxn = new Set<string>();

    for (
      let pageNum = 1;
      pageNum <= RepeatContributorCodePage.MAX_REPORT_PAGES;
      pageNum++
    ) {
      await this.waitForReportRows();
      const pageRows = await this.collectPageWithScroll(pageNum);
      let addedOnPage = 0;

      for (const row of pageRows) {
        if (!row.name && !row.transactionNumber) continue;
        const dedupeKey =
          row.transactionNumber ||
          `${row.name}|${row.code}|${pageNum}|${row.rowIndex}`;
        if (seenTxn.has(dedupeKey)) continue;
        seenTxn.add(dedupeKey);
        all.push(row);
        addedOnPage += 1;
      }

      console.log(
        `Scanned page ${pageNum}: ${addedOnPage} new row(s) (running total ${all.length}` +
          (expected ? ` / ${expected}` : '') +
          ')'
      );

      if (expected && all.length >= expected) break;
      if (!(await this.goToNextPage())) break;
    }

    if (expected && all.length < expected) {
      throw new Error(
        `Scanned ${all.length} Repeat Contributor Report row(s) but the report shows ${expected}. ` +
          'Pagination or virtualized rows were missed.'
      );
    }

    return all;
  }

  /**
   * Lightning datatable virtualizes rows — only the viewport is in the DOM.
   * Scroll the table scroller and merge batches until no new rows appear.
   */
  private async collectPageWithScroll(pageNum: number): Promise<ReportRow[]> {
    await this.scrollTable('top');
    const byKey = new Map<string, ReportRow>();
    let stagnant = 0;

    for (let i = 0; i < 50; i++) {
      const batch = await this.collectVisibleRowsFast(pageNum);
      let added = 0;
      for (const row of batch) {
        if (!row.name && !row.transactionNumber && !row.code) continue;
        const key =
          row.transactionNumber || `${row.name}|${row.code}|${row.rowIndex}`;
        if (byKey.has(key)) continue;
        byKey.set(key, row);
        added += 1;
      }

      const moved = await this.scrollTable('down');
      if (added === 0 && !moved) {
        stagnant += 1;
        if (stagnant >= 2) break;
      } else {
        stagnant = 0;
      }
    }

    return [...byKey.values()];
  }

  private async scrollTable(direction: 'top' | 'down'): Promise<boolean> {
    const row = this.dataRows().first();
    if (!(await row.isVisible().catch(() => false))) return false;

    const scrollFn = new Function(
      'el',
      'dir',
      `
      var node = el;
      while (node) {
        var style = getComputedStyle(node);
        var scrollable =
          (style.overflowY === 'auto' || style.overflowY === 'scroll') &&
          node.scrollHeight > node.clientHeight + 8;
        if (scrollable) {
          if (dir === 'top') {
            node.scrollTop = 0;
            return true;
          }
          var before = node.scrollTop;
          node.scrollTop = Math.min(
            node.scrollTop + Math.max(node.clientHeight - 40, 200),
            node.scrollHeight
          );
          return node.scrollTop > before + 2;
        }
        node = node.parentElement;
      }
      if (dir === 'down') {
        var y = window.scrollY;
        window.scrollBy(0, 400);
        return window.scrollY > y + 2;
      }
      window.scrollTo(0, 0);
      return true;
      `
    ) as (el: unknown, dir: string) => boolean;

    return row.evaluate(scrollFn, direction);
  }

  /**
   * One round-trip for all visible data rows (Playwright pierces shadow DOM).
   * Uses Function() so tsx does not inject __name into the browser script.
   */
  private async collectVisibleRowsFast(pageNum: number): Promise<ReportRow[]> {
    const rows = this.dataRows();
    await rows
      .first()
      .waitFor({ state: 'visible', timeout: 90_000 })
      .catch(() => undefined);

    const extractFn = new Function(
      'rowEls',
      `
      var clean = function (value) {
        return (value || '')
          .trim()
          .split('\\n')[0]
          .trim()
          .replace(/\\s*Edit\\s*Repeat.*$/i, '')
          .trim();
      };

      var cellValue = function (row, label) {
        var cell = row.querySelector(
          'th[data-label=\"' + label + '\"], td[data-label=\"' + label + '\"]'
        );
        if (!cell) return '';

        var attr = clean(cell.getAttribute('data-cell-value'));
        var text = clean(cell.innerText || cell.textContent);
        var link = cell.querySelector('a');
        var linkText = clean(link && (link.innerText || link.textContent));

        if (label === 'Transaction Number') {
          if (linkText) return linkText;
          var tMatch = (text || attr).match(/T-\\d+/);
          if (tMatch) return tMatch[0];
          if (attr) return attr;
          return text;
        }

        if (attr && attr.charAt(0) !== '/') return attr;
        return text;
      };

      return rowEls.map(function (row, rowIndex) {
        var full = cellValue(row, 'Contributor Full Name');
        var first = cellValue(row, 'First Name');
        var middle = cellValue(row, 'Middle Name');
        var last = cellValue(row, 'Last Name');
        var given = [first, middle].filter(Boolean).join(' ').trim();
        var name = full || (last && given ? last + ', ' + given : last || given);

        return {
          name: name,
          code: cellValue(row, 'Repeat Contributor Code'),
          transactionNumber: cellValue(row, 'Transaction Number'),
          rowIndex: rowIndex,
        };
      });
      `
    ) as (rowEls: unknown[]) => Array<{
      name: string;
      code: string;
      transactionNumber: string;
      rowIndex: number;
    }>;

    const raw = await rows.evaluateAll(extractFn);

    return raw.map((r) => ({
      name: r.name,
      code: r.code,
      transactionNumber: r.transactionNumber,
      rowIndex: r.rowIndex,
      pageNum,
    }));
  }

  private groupByName(rows: ReportRow[]): Map<string, ReportRow[]> {
    const map = new Map<string, ReportRow[]>();
    for (const row of rows) {
      const key = row.name.trim().toLowerCase();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }

  /** Group non-empty Repeat Contributor Codes (case-sensitive as shown in UI). */
  private groupByCode(rows: ReportRow[]): Map<string, ReportRow[]> {
    const map = new Map<string, ReportRow[]>();
    for (const row of rows) {
      const key = row.code.trim();
      if (!key) continue;
      const list = map.get(key) ?? [];
      list.push(row);
      map.set(key, list);
    }
    return map;
  }

  /** Prefer the code that already matches across most rows for that name. */
  private majorityCode(codes: string[]): string {
    const nonEmpty = codes.filter((c) => !!c.trim());
    if (nonEmpty.length === 0) return '';

    const counts = new Map<string, number>();
    for (const code of nonEmpty) {
      counts.set(code, (counts.get(code) ?? 0) + 1);
    }

    let best = nonEmpty[0]!;
    let bestCount = 0;
    for (const [code, count] of counts) {
      if (count > bestCount) {
        best = code;
        bestCount = count;
      }
    }
    return best;
  }

  private dataRows(): Locator {
    return this.page.locator('[role="row"]').filter({
      has: this.page.getByRole('button', {
        name: 'Edit Repeat Contributor Code',
      }),
    });
  }

  /**
   * Report data rows expose First/Last Name (Contributor Full Name is a
   * separate column/header). Compose "Last, First" to match the UI.
   */
  private async readContributorName(row: Locator): Promise<string> {
    const full = await this.cellValue(row, 'Contributor Full Name');
    if (full) return full;

    const first = await this.cellValue(row, 'First Name');
    const middle = await this.cellValue(row, 'Middle Name');
    const last = await this.cellValue(row, 'Last Name');
    if (!first && !last) return '';

    const given = [first, middle].filter(Boolean).join(' ').trim();
    if (last && given) return `${last}, ${given}`;
    return last || given;
  }

  private async readContributorCode(row: Locator): Promise<string> {
    const fromAttr = await this.cellValue(row, 'Repeat Contributor Code');
    if (fromAttr) return fromAttr;

    const header = row
      .locator(
        'th[data-label="Repeat Contributor Code"], td[data-label="Repeat Contributor Code"]'
      )
      .first();
    if (await header.isVisible().catch(() => false)) {
      const raw = (await header.innerText()).trim();
      return raw.replace(/\s*Edit\s*Repeat.*$/i, '').trim();
    }
    return '';
  }

  private async cellValue(row: Locator, label: string): Promise<string> {
    const cell = row
      .locator(`th[data-label="${label}"], td[data-label="${label}"]`)
      .first();
    try {
      if ((await cell.count()) === 0) return '';
      const attr = (
        await cell.getAttribute('data-cell-value', { timeout: 2_000 })
      )?.trim();
      const text =
        (await cell.innerText({ timeout: 2_000 })).trim().split('\n')[0]?.trim() ??
        '';
      const cleaned = text.replace(/\s*Edit\s*Repeat.*$/i, '').trim();

      if (label === 'Transaction Number') {
        const tMatch = cleaned.match(/T-\d+/) || attr?.match(/T-\d+/);
        if (tMatch) return tMatch[0];
        if (cleaned) return cleaned;
        return attr ?? '';
      }

      if (attr && !attr.startsWith('/')) return attr;
      return cleaned;
    } catch {
      return '';
    }
  }

  private async editRow(row: Locator, code: string): Promise<void> {
    const cell = row
      .locator(
        'th[data-label="Repeat Contributor Code"], td[data-label="Repeat Contributor Code"]'
      )
      .first();
    await cell.scrollIntoViewIfNeeded();
    await cell.hover();

    const editBtn = row.getByRole('button', {
      name: 'Edit Repeat Contributor Code',
    });
    await expect(editBtn).toBeVisible({ timeout: 30_000 });

    const textbox = this.page.getByRole('textbox', {
      name: 'Repeat Contributor Code',
    });

    await editBtn.click();
    if (!(await textbox.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await editBtn.dblclick();
    }
    if (!(await textbox.isVisible({ timeout: 2_000 }).catch(() => false))) {
      await cell.dblclick();
    }

    await expect(textbox).toBeVisible({ timeout: 30_000 });
    await textbox.fill(code);
    await this.commitInlineEdit(textbox);
  }

  private async commitInlineEdit(textbox: Locator): Promise<void> {
    await textbox.press('Enter');

    const save = this.page
      .getByRole('button', { name: /^Save$/i })
      .or(this.page.locator('button[title="Save"]'))
      .or(this.page.getByRole('button', { name: /Complete|Apply/i }));

    if (await save.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
      await save.first().click();
    }

    await expect(textbox)
      .toBeHidden({ timeout: 15_000 })
      .catch(() => undefined);
  }

  private reportFilter(): Locator {
    return this.page
      .getByPlaceholder(/Search here to filter/i)
      .or(this.page.getByPlaceholder(/filter the transactions/i))
      .or(this.page.getByRole('searchbox', { name: /filter/i }))
      .first();
  }

  private async filterReport(query: string): Promise<void> {
    const filter = this.reportFilter();
    if (!(await filter.isVisible({ timeout: 5_000 }).catch(() => false))) {
      return;
    }
    await filter.click();
    await filter.fill('');
    await filter.fill(query);
    await filter.press('Enter');
    await this.page
      .locator('.slds-spinner, [role="status"][aria-busy="true"]')
      .first()
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => undefined);
    await this.waitForReportRows().catch(() => undefined);
  }

  private async clearReportFilter(): Promise<void> {
    const filter = this.reportFilter();
    if (!(await filter.isVisible({ timeout: 3_000 }).catch(() => false))) {
      return;
    }
    const current = await filter.inputValue().catch(() => '');
    if (!current) return;
    await filter.click();
    await filter.fill('');
    await filter.press('Enter');
    await this.page
      .locator('.slds-spinner, [role="status"][aria-busy="true"]')
      .first()
      .waitFor({ state: 'hidden', timeout: 15_000 })
      .catch(() => undefined);
  }

  private paginationNext(): Locator {
    return this.page
      .locator('.slds-button-group, [class*="pagination"], footer, lightning-datatable')
      .getByRole('button', { name: /^Next$/i })
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .last();
  }

  private async goToFirstPage(): Promise<void> {
    const first = this.page
      .getByRole('button', { name: /^First$/i })
      .or(this.page.getByRole('button', { name: '1', exact: true }))
      .first();
    if (await first.isVisible({ timeout: 2_000 }).catch(() => false)) {
      const disabled = await first.isDisabled().catch(() => false);
      if (!disabled) {
        await first.click();
        await this.waitForReportRows();
      }
    }
  }

  private async goToNextPage(): Promise<boolean> {
    const before = await this.firstRowFingerprint();
    const next = this.paginationNext();
    const clickable =
      (await next.isVisible({ timeout: 2_000 }).catch(() => false)) &&
      !(await next.isDisabled().catch(() => true));

    if (!clickable) return false;

    await next.click();
    await this.waitForReportRows();

    // Table can take a moment to swap virtualized rows after Next
    for (let i = 0; i < 10; i++) {
      const after = await this.firstRowFingerprint();
      if (after && after !== before) return true;
      await this.page
        .locator('.slds-spinner')
        .first()
        .waitFor({ state: 'hidden', timeout: 1_000 })
        .catch(() => undefined);
    }

    const after = await this.firstRowFingerprint();
    return !!(after && after !== before);
  }

  private async firstRowFingerprint(): Promise<string> {
    const rows = await this.collectVisibleRowsFast(0);
    const first = rows[0];
    if (!first) return '';
    return `${first.transactionNumber}|${first.code}`;
  }

  private async waitForReportRows(): Promise<void> {
    await expect(
      this.page
        .getByRole('button', { name: 'Edit Repeat Contributor Code' })
        .or(this.page.getByRole('link', { name: /^T-\d+/ }))
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }
}
