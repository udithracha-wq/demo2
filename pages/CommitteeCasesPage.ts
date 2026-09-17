import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { accountCasesRelatedListUrl, caseRecordUrl } from './SalesforceLoginPage';
import { SupervisorStep1Page } from './SupervisorStep1Page';

/** One case as listed on the committee record page's related list cards. */
export type CommitteeCase = {
  caseNumber: string;
  recordType: string;
  electionYear: string;
  owner: string;
  recordId: string;
};

/**
 * Committee (Account) → Cases.
 *
 * Live DOM (UAT, Account_Committee_Record_Page):
 *   article "Cases (1)"            ← filtered by Case Record Type
 *     article "00120502"
 *       link "00120502" → /lightning/r/500cp00000YrQHOAA3/view
 *       Case Record Type: Eligibility Review / Election Year: 2024 /
 *       Owner: Udith Racha
 *     link "View All"
 *   article "Payment Cases (0)"    ← follow-on cases land here
 *
 * "View All" opens a role=grid (not table) named "Cases" whose columns are
 * Case / Case Record Type / Election Year / Owner / Status / Date Opened, and
 * whose header row is a hidden <tr role="row">.
 *
 * Because the Cases card is filtered, record-type lookups scan every card on
 * the committee page rather than trusting one grid.
 */
export class CommitteeCasesPage extends BasePage {
  /**
   * "View All" on a dynamic related list lands on
   * /lightning/cmp/force__dynamicRelatedListViewAll?...&force__recordId=001...
   * rather than /lightning/r/Account/{id}/related/Cases/view.
   */
  private static readonly CASES_LIST_URL =
    /(\/related\/Cases\/view|dynamicRelatedListViewAll)/i;

  /** Global search the committee and wait for its related list cards. */
  async openCommittee(committee: string): Promise<void> {
    const accountPage = new SupervisorStep1Page(this.page);
    await accountPage.searchAndOpenAccount(committee);

    await expect(this.casesCard()).toBeVisible({ timeout: 90_000 });

    // Cards render their header first and fill in rows a moment later.
    await this.caseEntries()
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .catch(() => undefined);
  }

  /** Every case listed on the committee page, across all related list cards. */
  async casesOnCommitteePage(): Promise<CommitteeCase[]> {
    const entries = this.caseEntries();
    const found: CommitteeCase[] = [];

    for (let i = 0; i < (await entries.count()); i++) {
      const entry = entries.nth(i);
      const link = this.caseNumberLink(entry);

      const caseNumber = (await link.textContent().catch(() => ''))?.trim();
      if (!caseNumber) continue;
      // The card wrapper matches too, and repeats its first case.
      if (found.some((c) => c.caseNumber === caseNumber)) continue;

      const text = (await entry.innerText().catch(() => '')) ?? '';
      const href = (await link.getAttribute('href').catch(() => null)) ?? '';

      found.push({
        caseNumber,
        recordType: CommitteeCasesPage.field(text, 'Case Record Type'),
        electionYear: CommitteeCasesPage.field(text, 'Election Year'),
        owner: CommitteeCasesPage.field(text, 'Owner'),
        recordId: href.match(/\/r\/(?:Case\/)?(500[a-zA-Z0-9]{12,15})\//)?.[1] ?? '',
      });
    }

    return found;
  }

  /** Click the Cases card on the right of the committee page. */
  async openCasesListFromCard(): Promise<void> {
    try {
      await this.clickCasesCardEntry();
      // Only trust the grid once the list page is really open — the committee
      // page itself holds other tables.
      await this.page.waitForURL(CommitteeCasesPage.CASES_LIST_URL, {
        timeout: 60_000,
      });
      await expect(this.grid()).toBeVisible({ timeout: 60_000 });
      return;
    } catch (err) {
      console.warn(
        'Cases card did not open the list; falling back to the related list URL.',
        err
      );
    }

    const accountId = this.accountIdFromUrl();
    if (!accountId) {
      throw new Error(
        'Could not open the Cases list: the Cases card did not open and the ' +
          `URL holds no Account Id (${this.page.url()}).`
      );
    }

    await this.page.goto(accountCasesRelatedListUrl(accountId), {
      waitUntil: 'domcontentloaded',
    });
    await expect(this.grid()).toBeVisible({ timeout: 90_000 });
  }

  /** Open the first case in the Cases grid with this record type and status. */
  async openCaseByRecordTypeAndStatus(
    recordType: string,
    status: string
  ): Promise<string> {
    const typePattern = CommitteeCasesPage.recordTypePattern(recordType);
    const statusPattern = new RegExp(
      `\\b${CommitteeCasesPage.escape(status)}\\b`,
      'i'
    );

    const match = (await this.gridRowTexts())
      .filter((text) => typePattern.test(text) && statusPattern.test(text))
      .map((text) => text.match(/\b\d{6,}\b/)?.[0])
      .find(Boolean);

    if (!match) {
      throw new Error(
        `The Cases list has no case with Case Record Type "${recordType}" ` +
          `and Status "${status}".\nCases list contents:\n${await this.gridText()}`
      );
    }

    await this.openCaseByNumber(match);
    return match;
  }

  async openCaseByNumber(caseNumber: string): Promise<void> {
    const link = this.page
      .getByRole('link', { name: caseNumber, exact: true })
      .first();
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
    await this.expectCaseRecordOpen();
  }

  /** Open a case straight from its related-list link, by record Id. */
  async openCaseRecord(caseRecord: CommitteeCase): Promise<void> {
    if (!caseRecord.recordId) {
      await this.openCaseByNumber(caseRecord.caseNumber);
      return;
    }

    await this.page.goto(caseRecordUrl(caseRecord.recordId), {
      waitUntil: 'domcontentloaded',
    });
    await this.expectCaseRecordOpen();
  }

  /** Diagnostic dump of the Cases grid, used in failure messages. */
  async gridText(): Promise<string> {
    return (await this.grid().innerText().catch(() => '')) ?? '';
  }

  private async expectCaseRecordOpen(): Promise<void> {
    await expect(
      this.page.getByRole('tab', { name: 'Details' }).first()
    ).toBeVisible({ timeout: 90_000 });
  }

  /** Row text of every data row, or [] when the grid holds no cases. */
  private async gridRowTexts(): Promise<string[]> {
    const rows = this.dataRows();
    const appeared = await rows
      .first()
      .waitFor({ state: 'visible', timeout: 30_000 })
      .then(() => true)
      .catch(() => false);

    return appeared ? rows.allInnerTexts() : [];
  }

  private grid(): Locator {
    return this.page
      .getByRole('grid')
      .or(this.page.getByRole('table'))
      .first();
  }

  /**
   * Rows holding a case. The Lightning datatable renders its HEADER row as a
   * hidden <tr role="row"> with no links, so require a link in the row.
   */
  private dataRows(): Locator {
    return this.grid()
      .getByRole('row')
      .filter({ has: this.page.getByRole('link') });
  }

  /** The "Cases" card — not "Payment Cases", hence the exact name. */
  private casesCard(): Locator {
    return this.page.getByRole('article', { name: 'Cases', exact: true });
  }

  /** Related-list entries that carry a case-number link, on any card. */
  private caseEntries(): Locator {
    return this.page
      .getByRole('article')
      .filter({ has: this.page.getByRole('link', { name: /^\d{6,}$/ }) });
  }

  private caseNumberLink(entry: Locator): Locator {
    return entry.getByRole('link', { name: /^\d{6,}$/ }).first();
  }

  /** The card header and its "View All" footer both open the full list. */
  private async clickCasesCardEntry(): Promise<void> {
    const card = this.casesCard();
    await expect(card).toBeVisible({ timeout: 90_000 });

    const entry = card
      .getByRole('link', { name: /^Cases(\s*\(\d+\+?\))?$/ })
      .or(card.getByRole('heading', { name: /^Cases/ }).getByRole('link'))
      .or(card.getByRole('link', { name: /^View All/i }))
      .or(card.getByRole('button', { name: /^View All/i }))
      .first();

    await expect(entry).toBeVisible({ timeout: 30_000 });
    await entry.click();
  }

  private accountIdFromUrl(): string | null {
    const url = decodeURIComponent(this.page.url());
    return (
      url.match(/\/lightning\/r\/Account\/([a-zA-Z0-9]{15,18})\//)?.[1] ??
      url.match(/force__recordId=([a-zA-Z0-9]{15,18})/)?.[1] ??
      null
    );
  }

  /**
   * Value under a "<Label>:" line in related-list card text. Empty fields are
   * followed straight by the next label, e.g. "Election Year:" / "Office:".
   */
  private static field(text: string, label: string): string {
    const lines = text.split('\n').map((line) => line.trim());
    const index = lines.findIndex((line) =>
      new RegExp(`^${CommitteeCasesPage.escape(label)}:$`, 'i').test(line)
    );
    if (index === -1) return '';

    const value = lines[index + 1] ?? '';
    return /:$/.test(value) ? '' : value;
  }

  /**
   * "Eligibility Review Case" also matches a field reading "Eligibility
   * Review", and hyphen/space differences are ignored so "Pre-Payment Review"
   * matches "Pre Payment Review".
   */
  static recordTypePattern(recordType: string): RegExp {
    const words = recordType
      .trim()
      .replace(/\s+case$/i, '')
      .split(/[\s-]+/)
      .map((word) => CommitteeCasesPage.escape(word));

    return new RegExp(`${words.join('[\\s-]*')}(\\s+Case)?`, 'i');
  }

  private static escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
