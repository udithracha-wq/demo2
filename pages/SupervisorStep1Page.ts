import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { lightningHomeUrl } from './SalesforceLoginPage';

/**
 * Supervisor Step 1: Account global search → right-side Cases card → Case record.
 *
 * Live DOM (aria snapshot, UAT sandbox):
 *   article "Cases"
 *     heading "Cases (1)"
 *     article "00120502"                       ← one article per case
 *       link "00120502"
 *       term "Case Record Type:" / definition → link "Eligibility Review"
 *   Case Details tab fields are listitems identified by their edit button:
 *     listitem: text "Status New"        + button "Edit Status"
 *     listitem: text "Primary Auditor"   + button "Edit Primary Auditor"
 *
 * The Cases card does NOT expose Status, so Status is verified on the case record.
 */
export class SupervisorStep1Page extends BasePage {
  /** Global search for an Account by name and open its record page. */
  async searchAndOpenAccount(accountName: string): Promise<void> {
    await this.page.goto(lightningHomeUrl(), { waitUntil: 'domcontentloaded' });

    await this.runGlobalSearch(accountName);

    const accountLink = this.accountResultLink(accountName);
    await expect(accountLink).toBeVisible({ timeout: 60_000 });
    await accountLink.click();

    await this.expectAccountRecordLoaded(accountName);
  }

  /**
   * Type a term into global search and submit it.
   *
   * keyboard.type() loses characters here — the overlay re-renders on every
   * keystroke, which truncated "Committee to Elect Patrick Sheehan" to
   * "Elect P" — so fill/insertText the whole string and verify it landed.
   */
  private async runGlobalSearch(term: string): Promise<void> {
    const searchBtn = this.page.getByRole('button', { name: 'Search' });
    await expect(searchBtn).toBeVisible({ timeout: 60_000 });

    const searchBox = this.page.getByRole('searchbox', { name: 'Search...' });

    for (let attempt = 1; attempt <= 3; attempt++) {
      if (!(await searchBox.isVisible().catch(() => false))) {
        await searchBtn.click();
      }

      if (await searchBox.isVisible().catch(() => false)) {
        await searchBox.fill(term).catch(() => undefined);
      } else {
        // Overlay host is lightning-input.saInput (closed shadow): focus it and
        // insert the whole string in one event.
        const searchHost = this.page.locator('lightning-input.saInput');
        await expect(searchHost).toBeAttached({ timeout: 15_000 });
        await searchHost.click({ force: true }).catch(() => undefined);
        await this.page.keyboard.insertText(term);
      }

      const typed = (await searchBox.inputValue().catch(() => ''))?.trim();
      if (typed === term) {
        await this.page.keyboard.press('Enter');
        return;
      }

      console.warn(
        `Global search box held "${typed}" instead of "${term}" (attempt ${attempt}) — retrying.`
      );
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    throw new Error(
      `Global search never accepted the full term "${term}" — the Lightning ` +
        'search overlay kept truncating the input.'
    );
  }

  /**
   * Account link on the search results page. The recording used .nth(2)
   * because the committee name also matches Contact/Case rows; prefer the
   * title attribute, which search results set to the exact record name.
   */
  private accountResultLink(accountName: string): Locator {
    return this.page
      .locator(`a[title="${accountName}"]`)
      .or(this.page.getByRole('link', { name: accountName, exact: true }))
      .or(this.page.getByRole('link', { name: accountName }))
      .first();
  }

  private async expectAccountRecordLoaded(accountName: string): Promise<void> {
    await expect(
      this.page
        .getByRole('tab', { name: new RegExp(accountName, 'i') })
        .or(this.page.getByRole('heading', { name: accountName }))
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  /** Right-side Cases related-list card on the Account record page. */
  private casesCard(): Locator {
    return this.page.getByRole('article', { name: 'Cases', exact: true });
  }

  /** Case entry inside the Cases card matching the given Case Record Type. */
  private caseEntry(recordType: string): Locator {
    return this.casesCard()
      .getByRole('article')
      .filter({ hasText: new RegExp(this.escape(recordType), 'i') })
      .first();
  }

  /**
   * Confirm the Cases card lists a case of this record type and open it.
   * Returns the case number so the scenario can report which case was used.
   */
  async openCaseFromCasesCard(recordType: string): Promise<string> {
    await expect(this.casesCard()).toBeVisible({ timeout: 90_000 });

    // isVisible() ignores its timeout, so wait with expect() and translate the
    // timeout into a message that names what the panel actually holds.
    const entry = this.caseEntry(recordType);
    try {
      await expect(entry).toBeVisible({ timeout: 60_000 });
    } catch {
      const cardText = (await this.casesCard().innerText().catch(() => '')) ?? '';
      throw new Error(
        `The Cases panel has no case with Case Record Type "${recordType}".\n` +
          `Cases panel contents:\n${cardText}`
      );
    }

    const caseLink = entry
      .getByRole('link')
      .filter({ hasText: /^\d{6,}$/ })
      .first();
    await expect(caseLink).toBeVisible({ timeout: 30_000 });

    const caseNumber = (await caseLink.textContent())?.trim() ?? '';
    await caseLink.click();

    await expect(
      this.page.getByRole('tab', { name: 'Details' }).first()
    ).toBeVisible({ timeout: 90_000 });

    return caseNumber;
  }

  /** Details-tab field identified by its inline edit button. */
  private fieldByEditButton(editButtonName: RegExp): Locator {
    return this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('button', { name: editButtonName }) })
      .first();
  }

  private statusField(): Locator {
    return this.fieldByEditButton(/^Edit Status$/i);
  }

  private primaryAuditorField(): Locator {
    return this.fieldByEditButton(/^Edit Primary Auditor$/i);
  }

  /** Case Record Type + Status as shown on the open case record. */
  async expectCaseRecordTypeAndStatus(
    recordType: string,
    status: string
  ): Promise<void> {
    const recordTypeField = this.page
      .getByRole('listitem')
      .filter({ hasText: /Case Record Type/i })
      .first();
    await expect(recordTypeField).toContainText(recordType, {
      timeout: 60_000,
    });

    await expect(this.statusField()).toContainText(status, { timeout: 60_000 });
  }

  /**
   * Precondition: the assignment must be a real change, so fail when the case
   * already carries the auditor we are about to assign.
   */
  async expectPrimaryAuditorNotAlreadySet(auditorName: string): Promise<void> {
    const field = this.primaryAuditorField();
    await expect(field).toBeVisible({ timeout: 60_000 });

    const current = (await field.innerText().catch(() => '')) ?? '';
    if (new RegExp(this.escape(auditorName), 'i').test(current)) {
      throw new Error(
        `Primary Auditor is already "${auditorName}" on this case, so the ` +
          'update would be a no-op and would not prove anything. Clear the ' +
          'field on the case (or use a different case) before re-running.'
      );
    }
  }

  /** Read-back check that the saved Primary Auditor field holds the name. */
  async expectPrimaryAuditorValue(auditorName: string): Promise<void> {
    const field = this.primaryAuditorField();
    await expect(field).toBeVisible({ timeout: 60_000 });
    await expect(field).toContainText(auditorName, { timeout: 60_000 });
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
