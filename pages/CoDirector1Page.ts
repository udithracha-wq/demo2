import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';
import { SupervisorStep1Page } from './SupervisorStep1Page';

/**
 * Co Director 1 / 2: case in Voucher Review → committee Cases → Payment data as of
 * → Co-Director Approval → Accept or Reject.
 *
 * Locators from codegen-output/co-director-1.ts and live UAT inspection.
 */
export class CoDirector1Page extends BasePage {
  private static readonly TOAST =
    '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
    '.toastContainer .slds-notify';

  /**
   * Case highlights/Details → click the Committee Name lookup link
   * (blue dotted link under the "Committee Name" label).
   * Falls back to href navigation, then global search.
   * @returns Committee display name.
   */
  async openCommitteeFromCase(): Promise<string> {
    // Leave Payment Transactions Report — Committee Name lives on the Case record
    const caseTab = this.page
      .getByRole('tab', { name: /\|\s*Case/i })
      .first();
    if (await caseTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await caseTab.click().catch(() => undefined);
    }

    const detailsTab = this.page.getByRole('tab', { name: /^Details$/i }).first();
    if (await detailsTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await detailsTab.click().catch(() => undefined);
    }

    const link = await this.committeeNameLink();
    if (link) {
      const committeeName = ((await link.innerText()) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      const href = (await link.getAttribute('href').catch(() => null)) ?? '';
      console.log(
        `Opening committee "${committeeName}" from Committee Name link` +
          (href ? ` (${href})` : '')
      );

      // Prefer direct navigation — outputLookupLink clicks often open hover cards
      if (/\/lightning\/r\//i.test(href)) {
        const url = href.startsWith('http')
          ? href
          : new URL(href, this.page.url()).toString();
        await this.page.goto(url, { waitUntil: 'domcontentloaded' });
      } else {
        await link.click({ force: true });
      }

      await this.waitForCommitteeRecordReady();
      console.log(`Opened committee: ${committeeName}`);
      return committeeName || 'Account';
    }

    const committeeName = await this.readCommitteeNameFromCase();
    console.log(
      `Committee Name link not found; searching for: ${committeeName}`
    );
    const accountPage = new SupervisorStep1Page(this.page);
    await accountPage.searchAndOpenAccount(committeeName);
    await this.waitForCommitteeRecordReady();
    console.log(`Opened committee via search: ${committeeName}`);
    return committeeName;
  }

  /**
   * Blue Committee Name lookup on Highlights or Details
   * (forceOutputLookup under the "Committee Name" label).
   */
  private async committeeNameLink(): Promise<Locator | null> {
    const candidates: Locator[] = [
      this.page
        .getByRole('listitem')
        .filter({ hasText: /Committee Name/i })
        .locator('a[href*="/lightning/r/"]')
        .first(),
      this.page
        .locator(
          "xpath=//p[normalize-space()='Committee Name']/following::a[contains(@href,'/lightning/r/')][1]"
        )
        .first(),
      this.page
        .locator(
          "xpath=//*[normalize-space()='Committee Name']/following::a[contains(@href,'/lightning/r/')][1]"
        )
        .first(),
      this.page
        .locator('a.outputLookupLink[href*="/lightning/r/001"]')
        .filter({ hasText: /\S/ })
        .first(),
    ];

    for (const candidate of candidates) {
      if (await candidate.isVisible({ timeout: 4_000 }).catch(() => false)) {
        return candidate;
      }
    }
    return null;
  }

  /** Read Committee Name from Details listitem or highlights panel. */
  private async readCommitteeNameFromCase(): Promise<string> {
    const detailsItem = this.page
      .getByRole('listitem')
      .filter({ hasText: /Committee Name/i })
      .first();

    if (await detailsItem.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const link = detailsItem.getByRole('link').first();
      if (await link.isVisible({ timeout: 2_000 }).catch(() => false)) {
        const fromLink = ((await link.innerText()) ?? '')
          .replace(/\s+/g, ' ')
          .trim();
        if (fromLink) return fromLink;
      }
      let raw = ((await detailsItem.innerText()) ?? '').replace(/\s*\n\s*/g, '\n');
      const buttons = await detailsItem
        .getByRole('button')
        .allInnerTexts()
        .catch(() => [] as string[]);
      for (const button of buttons) {
        const text = button.trim();
        if (text) raw = raw.split(text).join('\n');
      }
      const value = raw
        .replace(/Committee Name/i, '\n')
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && l !== '*' && !/^preview$/i.test(l))
        .join(' ')
        .trim();
      if (value) return value;
    }

    const highlightsValue = this.page
      .locator("xpath=//p[normalize-space()='Committee Name']/following::p[1]")
      .first();
    if (
      await highlightsValue.isVisible({ timeout: 5_000 }).catch(() => false)
    ) {
      const value = ((await highlightsValue.innerText()) ?? '')
        .replace(/\s+/g, ' ')
        .replace(/\bPreview\b/gi, '')
        .trim();
      if (value) return value;
    }

    const highlightsLink = this.page
      .locator(
        "xpath=//p[normalize-space()='Committee Name']/following::a[1]"
      )
      .first();
    if (
      await highlightsLink.isVisible({ timeout: 3_000 }).catch(() => false)
    ) {
      const value = ((await highlightsLink.innerText()) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (value) return value;
    }

    throw new Error(
      'Committee Name was not found on case Details or highlights.\n' +
        `Visible text sample:\n${(
          await this.page.locator('body').innerText().catch(() => '')
        )
          .replace(/\n{3,}/g, '\n\n')
          .slice(0, 1_500)}`
    );
  }

  /** Committee Account page shows Committee | Depository/Bank | … tabs. */
  private async waitForCommitteeRecordReady(): Promise<void> {
    await expect
      .poll(
        async () => {
          const committeeTab = await this.page
            .getByRole('tab', { name: /^Committee$/i })
            .or(
              this.page
                .locator('[role="tab"], lightning-tab-bar a')
                .filter({ hasText: /^Committee$/i })
            )
            .first()
            .isVisible()
            .catch(() => false);
          const bankTab = await this.depositoryBankTab()
            .isVisible()
            .catch(() => false);
          const url = this.page.url();
          // Require a layout tab when URL already looks like Account — avoids
          // returning before Committee | Depository/Bank have painted.
          if (/\/lightning\/r\/(001|Account)/i.test(url)) {
            return committeeTab || bankTab;
          }
          return committeeTab || bankTab;
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] }
      )
      .toBeTruthy();
  }

  /**
   * Committee record → Depository/Bank tab beside Committee
   * (Committee | Depository/Bank | Candidate | Treasurer | …).
   */
  async openDepositoryBankSection(): Promise<void> {
    console.log(`Depository/Bank: URL=${this.page.url()}`);
    console.log(`Depository/Bank: tabs=${await this.visibleTabNames()}`);

    const accountTab = this.page
      .getByRole('tab', { name: /\|\s*Account/i })
      .first();
    if (await accountTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      console.log('Depository/Bank: clicking Account workspace tab');
      await accountTab.click().catch(() => undefined);
      console.log(`Depository/Bank: tabs after Account click=${await this.visibleTabNames()}`);
    }

    // Wait for sibling Committee tab so we know the layout tab bar is ready
    const committeeTab = this.page
      .getByRole('tab', { name: /^Committee$/i })
      .first();
    console.log('Depository/Bank: waiting for Committee layout tab…');
    await expect(committeeTab).toBeVisible({ timeout: 60_000 });
    console.log('Depository/Bank: Committee tab is visible');

    let bankTab = this.page
      .getByRole('tab', { name: /Depository\s*\/\s*Bank/i })
      .first();

    if (!(await bankTab.isVisible({ timeout: 5_000 }).catch(() => false))) {
      console.log('Depository/Bank: tab not visible yet — trying More overflow');
      const more = this.page
        .getByRole('button', { name: /^(More|Show more tabs|More Tabs)$/i })
        .or(this.page.getByRole('tab', { name: /^More$/i }))
        .first();
      if (await more.isVisible({ timeout: 2_000 }).catch(() => false)) {
        await more.click().catch(() => undefined);
      }
      bankTab = this.page
        .getByRole('tab', { name: /Depository\s*\/\s*Bank/i })
        .or(
          this.page
            .locator('a, [role="tab"]')
            .filter({ hasText: /Depository\s*\/\s*Bank/i })
        )
        .first();
    }

    if (!(await bankTab.isVisible({ timeout: 15_000 }).catch(() => false))) {
      throw new Error(
        'Depository/Bank tab beside Committee was not found.\n' +
          `Visible tabs: ${await this.visibleTabNames()}\n` +
          `URL: ${this.page.url()}`
      );
    }

    console.log('Opening Depository/Bank tab (beside Committee)…');
    await bankTab.click();

    await expect(
      this.page
        .getByText(/Depository\s*\/\s*Bank Information/i)
        .or(this.page.getByText(/^Bank Name$/i))
        .or(this.page.getByText(/SFS\s*Vendor\s*Id/i))
        .first()
    ).toBeVisible({ timeout: 60_000 });
  }

  /** Layout tab next to Committee: "Depository/Bank". */
  private depositoryBankTab(): Locator {
    return this.page
      .getByRole('tab', { name: /Depository\s*\/\s*Bank/i })
      .first();
  }

  private async visibleTabNames(): Promise<string> {
    const names = await this.page
      .locator('[role="tab"]')
      .allInnerTexts()
      .catch(() => [] as string[]);
    const cleaned = names
      .map((n) => n.replace(/\s+/g, ' ').trim())
      .filter(Boolean);
    return cleaned.length ? [...new Set(cleaned)].join(' | ') : '(none)';
  }

  /**
   * Assert SFS Vendor Id is shown on Depository/Bank with a non-empty value.
   * Live layout: label "SFS Vendor Id" with value e.g. "1100352557".
   */
  async expectSfsVendorIdPresent(): Promise<void> {
    const value = await this.readSfsVendorIdValue();
    if (!value) {
      throw new Error(
        'SFS Vendor Id field is present but empty on Depository/Bank.'
      );
    }
    console.log(`SFS Vendor Id is present: ${value}`);
  }

  /**
   * Assert SFS Vendor Id on Depository/Bank is blank / not populated
   * (Approve from Approval History should then be blocked).
   */
  async expectSfsVendorIdNotPopulated(): Promise<void> {
    const value = await this.readSfsVendorIdValue();
    if (value) {
      throw new Error(
        `Expected SFS Vendor Id to be empty, but found "${value}".`
      );
    }
    console.log('SFS Vendor Id is not populated (as expected)');
  }

  /** True when Depository/Bank SFS Vendor Id has a non-empty value. */
  async isSfsVendorIdPopulated(): Promise<boolean> {
    const value = await this.readSfsVendorIdValue();
    return Boolean(value);
  }

  async readSfsVendorIdValue(): Promise<string> {
    const field = this.page
      .getByRole('listitem')
      .filter({ hasText: /SFS\s*Vendor\s*Id/i })
      .or(
        this.page
          .locator('.slds-form-element, records-record-layout-item')
          .filter({ hasText: /SFS\s*Vendor\s*Id/i })
      )
      .first();

    await expect(field).toBeVisible({ timeout: 60_000 });

    let raw = ((await field.innerText()) ?? '').replace(/\s+/g, ' ').trim();
    const buttons = await field
      .getByRole('button')
      .allInnerTexts()
      .catch(() => [] as string[]);
    for (const button of buttons) {
      const text = button.trim();
      if (text) raw = raw.split(text).join(' ');
    }

    const value = raw
      .replace(/SFS\s*Vendor\s*Id/i, '')
      .replace(/\*/g, '')
      .trim();

    if (!value || value === '-' || value === '—' || /^none$/i.test(value)) {
      return '';
    }
    return value;
  }

  /**
   * Committee record → Cases tab (right-side related lists) → View All Cases
   * so the grid exposes Payment data as of.
   */
  async openCasesTabAndViewAll(): Promise<void> {
    const casesTab = this.page.getByRole('tab', { name: /^Cases$/i }).first();
    await expect(casesTab).toBeVisible({ timeout: 60_000 });
    await casesTab.click();

    const casesCard = this.page.getByRole('article', {
      name: 'Cases',
      exact: true,
    });
    await expect(casesCard).toBeVisible({ timeout: 60_000 });

    const viewAll = casesCard
      .getByRole('link', { name: /View All( Cases)?/i })
      .or(casesCard.getByRole('button', { name: /View All( Cases)?/i }))
      .or(this.page.getByRole('link', { name: /View All Cases/i }))
      .first();
    await expect(viewAll).toBeVisible({ timeout: 30_000 });
    await viewAll.click();

    // Must be on the full Cases list before looking for Payment data as of.
    // Do not match Payment Cycle links that may already exist on the account.
    await this.page.waitForURL(
      /dynamicRelatedListViewAll|related\/Cases\/view/i,
      { timeout: 60_000 }
    );

    await expect(
      this.page
        .locator(
          '[data-label="Payment data as of"] a, ' +
            '[data-label="Payment date as of"] a'
        )
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  /**
   * In the Cases related-list grid, open the Payment data as of link on the
   * row whose Status is the given value (e.g. Voucher Review).
   *
   * Column header: "Payment data as of"
   * Link example: "2026-07-30 - General" → Payment_Cycle__c
   *
   * Use data-label cells — getByRole('row').filter({ hasText }) misses Status
   * text in this Lightning datatable.
   */
  async openPaymentDataAsOfForStatus(status: string): Promise<void> {
    const statusPattern = new RegExp(
      `^${CoDirector1Page.escape(status.trim())}$`,
      'i'
    );

    const row = this.page.locator('[role="row"]').filter({
      has: this.page
        .locator('[data-label="Status"]')
        .filter({ hasText: statusPattern }),
    });

    const paymentLink = row
      .locator(
        '[data-label="Payment data as of"] a, ' +
          '[data-label="Payment date as of"] a'
      )
      .filter({ visible: true })
      .first();

    await expect(paymentLink).toBeVisible({ timeout: 60_000 });
    await paymentLink.scrollIntoViewIfNeeded().catch(() => undefined);
    await paymentLink.click();

    // Payment Cycle page: Co-Director flows wait for that tab; PCFB Admin
    // waits for Generate Voucher Report (button or overflow menu item).
    await expect(
      this.coDirectorApprovalTab()
        .or(
          this.page.getByRole('button', {
            name: /Generate Voucher Report/i,
          })
        )
        .or(
          this.page.getByRole('menuitem', {
            name: /Generate Voucher Report/i,
          })
        )
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  async openCoDirectorApprovalTab(): Promise<void> {
    const tab = this.coDirectorApprovalTab();
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
    await expect(
      this.coDirector1ApprovalButton()
        .or(this.coDirector2ApprovalButton())
        .first()
    ).toBeVisible({
      timeout: 60_000,
    });
  }

  /**
   * A Co Director 1 Approval row for the case's committee must show blank
   * Co-Director Approval Status and Commissioner Approval Date (may not be
   * the first grid row when other committees appear above it).
   */
  async expectApprovalFieldsEmpty(committeeName: string): Promise<void> {
    const row = await this.findEmptyApprovalRowForCommittee(committeeName);
    const status = await this.cellTextInRow(
      row,
      'Co-Director Approval Status'
    );
    const date = await this.cellTextInRow(row, 'Commissioner Approval Date');
    console.log(
      `Empty Co-Director Approval fields found for committee "${committeeName}" ` +
        `(Status="${status}" Date="${date}")`
    );
  }

  /**
   * A Co Director 2 row for the case's committee must show a Co Director 1
   * decision: Approved → Commissioner Approval Date filled; Rejected → date empty.
   */
  async expectApprovalFieldsFilled(committeeName: string): Promise<void> {
    const row = await this.findFilledApprovalRowForCommittee(committeeName);
    const status = await this.cellTextInRow(
      row,
      'Co-Director Approval Status'
    );
    const date = await this.cellTextInRow(row, 'Commissioner Approval Date');
    console.log(
      `Co Director 1 decision row found for committee "${committeeName}" ` +
        `(Status="${status}" Date="${date || '(empty)'}")`
    );
  }

  /**
   * Select the empty-approval row matching the case committee name
   * (not necessarily the first checkbox in the grid).
   */
  async selectCoDirector1ApprovalRecord(committeeName: string): Promise<void> {
    const row = await this.findEmptyApprovalRowForCommittee(committeeName);
    await this.selectApprovalRow(row);
  }

  /**
   * Select the Co Director 1 decision row matching the case committee name
   * (Approved with date, or Rejected with empty date).
   */
  async selectCoDirector2ApprovalRecord(committeeName: string): Promise<void> {
    const row = await this.findFilledApprovalRowForCommittee(committeeName);
    await this.selectApprovalRow(row);
  }

  private async selectApprovalRow(row: Locator): Promise<void> {
    const checkbox = row.getByRole('checkbox', { name: /Select Item/i }).first();
    await expect(checkbox).toBeAttached({ timeout: 30_000 });

    if (await checkbox.isChecked().catch(() => false)) return;

    // Lightning primitive checkboxes often ignore input.check(); click the label.
    const label = row
      .locator('label.slds-checkbox__label')
      .filter({ hasText: /Select Item/i })
      .first();
    if (await label.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await label.click({ force: true });
    } else {
      await checkbox.click({ force: true });
    }

    await expect(checkbox).toBeChecked({ timeout: 15_000 });
  }

  /**
   * Find a data row whose Committee Name matches the case committee and whose
   * Co-Director Approval Status + Commissioner Approval Date are blank.
   */
  private async findEmptyApprovalRowForCommittee(
    committeeName: string
  ): Promise<Locator> {
    const name = committeeName.trim();
    if (!name) {
      throw new Error(
        'Committee name is required to locate the empty Co-Director Approval row.'
      );
    }

    await this.waitForApprovalGrid();

    const namePattern = new RegExp(CoDirector1Page.escape(name), 'i');
    const candidates = this.approvalGrid()
      .locator('[role="row"]')
      .filter({
        has: this.page
          .locator('[data-label="Committee Name"]')
          .filter({ hasText: namePattern }),
      })
      .filter({
        has: this.page.getByRole('checkbox', { name: /Select Item/i }),
      });

    await expect
      .poll(async () => candidates.count(), {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000],
      })
      .toBeGreaterThan(0);

    const count = await candidates.count();
    const inspected: string[] = [];

    for (let i = 0; i < count; i++) {
      const row = candidates.nth(i);
      const status = await this.cellTextInRow(
        row,
        'Co-Director Approval Status'
      );
      const date = await this.cellTextInRow(row, 'Commissioner Approval Date');
      inspected.push(`row${i + 1}: Status="${status}" Date="${date}"`);

      if (
        CoDirector1Page.isBlank(status) &&
        CoDirector1Page.isBlank(date)
      ) {
        return row;
      }
    }

    throw new Error(
      `Expected an empty Co-Director Approval Status and Commissioner ` +
        `Approval Date row for committee "${name}", but found none. ` +
        `Inspected: ${inspected.join('; ')}`
    );
  }

  /**
   * Find a committee row with a Co Director 1 decision:
   * - Co-Director 1 Approved* → Commissioner Approval Date must be filled
   * - Co-Director 1 Rejected → Commissioner Approval Date must be empty
   */
  private async findFilledApprovalRowForCommittee(
    committeeName: string
  ): Promise<Locator> {
    const name = committeeName.trim();
    if (!name) {
      throw new Error(
        'Committee name is required to locate the Co Director 1 decision row.'
      );
    }

    await this.waitForApprovalGrid();

    const namePattern = new RegExp(CoDirector1Page.escape(name), 'i');
    const candidates = this.approvalGrid()
      .locator('[role="row"]')
      .filter({
        has: this.page
          .locator('[data-label="Committee Name"]')
          .filter({ hasText: namePattern }),
      })
      .filter({
        has: this.page.getByRole('checkbox', { name: /Select Item/i }),
      });

    await expect
      .poll(async () => candidates.count(), {
        timeout: 60_000,
        intervals: [500, 1_000, 2_000],
      })
      .toBeGreaterThan(0);

    const count = await candidates.count();
    const inspected: string[] = [];

    for (let i = 0; i < count; i++) {
      const row = candidates.nth(i);
      const status = await this.cellTextInRow(
        row,
        'Co-Director Approval Status'
      );
      const date = await this.cellTextInRow(row, 'Commissioner Approval Date');
      inspected.push(`row${i + 1}: Status="${status}" Date="${date}"`);

      if (CoDirector1Page.isCoDirector1DecisionRow(status, date)) {
        return row;
      }
    }

    throw new Error(
      `Expected a Co Director 1 decision row for committee "${name}" ` +
        `(Approved → date filled, Rejected → date empty), but found none. ` +
        `Inspected: ${inspected.join('; ')}`
    );
  }

  /**
   * Header action → pick Approve (Accept) → Save.
   * Combobox options on UAT: --None-- / Approve / Reject.
   */
  async acceptCoDirector1Approval(): Promise<void> {
    await this.chooseCoDirectorApprovalAction(1, /^(Approve|Accept)$/i);
  }

  /**
   * Header action → pick Reject → Save.
   * Combobox options on UAT: --None-- / Approve / Reject.
   */
  async rejectCoDirector1Approval(): Promise<void> {
    await this.chooseCoDirectorApprovalAction(1, /^Reject$/i);
  }

  /**
   * Co Director 2 Approval → pick Approve (Accept) → Save.
   */
  async acceptCoDirector2Approval(): Promise<void> {
    await this.chooseCoDirectorApprovalAction(2, /^(Approve|Accept)$/i);
  }

  /**
   * Co Director 2 Approval → pick Reject → Save.
   */
  async rejectCoDirector2Approval(): Promise<void> {
    await this.chooseCoDirectorApprovalAction(2, /^Reject$/i);
  }

  private async chooseCoDirectorApprovalAction(
    directorNumber: 1 | 2,
    optionPattern: RegExp
  ): Promise<void> {
    const actionBtn =
      directorNumber === 1
        ? this.coDirector1ApprovalButton()
        : this.coDirector2ApprovalButton();
    await expect(actionBtn).toBeVisible({ timeout: 30_000 });
    await actionBtn.click();

    const dialog = this.approvalDialog(directorNumber);
    await expect(dialog).toBeVisible({ timeout: 60_000 });

    const combo = dialog.getByRole('combobox').first();
    await expect(combo).toBeVisible({ timeout: 30_000 });

    const current = ((await combo.innerText()) ?? '').trim();
    if (!optionPattern.test(current)) {
      await combo.click();
      const option = this.page.getByRole('option', { name: optionPattern }).first();
      await expect(option).toBeVisible({ timeout: 15_000 });
      await option.click();
    }

    const save = dialog.getByRole('button', { name: /^Save$/i }).first();
    await expect(save).toBeVisible({ timeout: 15_000 });
    await save.click();
  }

  async expectApprovalSuccessMessage(directorNumber: 1 | 2 = 1): Promise<void> {
    const label = `Co Director ${directorNumber} Approval`;
    const successish =
      /success|saved|updated|submitted|complete|approved|reject|record/i;
    const errorish = /error|exception|failed|unable|select at least one/i;

    let message = '';
    await expect
      .poll(
        async () => {
          const toastTexts = (
            await this.page.locator(CoDirector1Page.TOAST).allInnerTexts()
          )
            .map((t) => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

          if (!toastTexts.length) {
            const dialogGone = await this.approvalDialog(directorNumber)
              .isHidden()
              .catch(() => true);
            return dialogGone ? 'dialog-closed' : false;
          }

          const joined = [...new Set(toastTexts)].join(' | ');
          if (toastTexts.some((t) => errorish.test(t))) {
            throw new Error(
              `${label} failed with Salesforce error: ${joined}`
            );
          }
          if (toastTexts.some((t) => successish.test(t))) {
            message = joined;
            return true;
          }
          return false;
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] }
      )
      .toBeTruthy();

    if (message) {
      console.log(`${label} success: ${message}`);
    } else {
      console.log(`${label} dialog closed (no toast text captured)`);
    }
  }

  private coDirectorApprovalTab(): Locator {
    return this.page.getByRole('tab', { name: /Co-Director Approval/i }).first();
  }

  private coDirector1ApprovalButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Co Director 1 Approval',
      exact: true,
    });
  }

  private coDirector2ApprovalButton(): Locator {
    return this.page.getByRole('button', {
      name: 'Co Director 2 Approval',
      exact: true,
    });
  }

  private approvalDialog(directorNumber: 1 | 2 = 1): Locator {
    const title =
      directorNumber === 1
        ? /Co Director 1 Approval/i
        : /Co Director 2 Approval/i;
    return this.page.getByRole('dialog').filter({ hasText: title }).first();
  }

  /**
   * Blue Payment data as of lookup on the Cases View All grid,
   * e.g. "2026-07-30 - General" → /lightning/r/a10... or Payment_Cycle__c.
   */
  private casesListPaymentCycleLink(): Locator {
    const paymentCycleName = /\d{4}-\d{2}-\d{2}\s*-\s*(Primary|General)/i;
    return this.page
      .getByRole('link', { name: paymentCycleName })
      .filter({ visible: true });
  }

  /** Visible Cases-list column header (not hidden record-layout labels). */
  private paymentDataAsOfHeader(): Locator {
    return this.page
      .getByRole('columnheader', {
        name: /Payment data as of|Payment date as of/i,
      })
      .filter({ visible: true })
      .first();
  }

  /** Grid that carries the Co-Director Approval Status column. */
  private approvalGrid(): Locator {
    return this.page
      .getByRole('grid')
      .filter({
        has: this.page.locator(
          '[data-label="Co-Director Approval Status"], ' +
            '[aria-label*="Co-Director Approval Status"]'
        ),
      })
      .or(
        this.page.getByRole('grid').filter({
          hasText: /Co-Director Approval Status/i,
        })
      )
      .first();
  }

  private async waitForApprovalGrid(): Promise<void> {
    await expect(
      this.page
        .locator('[data-label="Co-Director Approval Status"]')
        .or(this.page.getByText('Co-Director Approval Status', { exact: true }))
        .first()
    ).toBeVisible({ timeout: 60_000 });
  }

  private async cellTextInRow(
    row: Locator,
    dataLabel: string
  ): Promise<string> {
    const cell = row.locator(`[data-label="${dataLabel}"]`).first();
    await expect(cell).toBeVisible({ timeout: 30_000 });
    return ((await cell.innerText()) ?? '').replace(/\s+/g, ' ').trim();
  }

  private static isBlank(value: string): boolean {
    return !value || value === '-' || value === '—' || /^none$/i.test(value);
  }

  /** Co-Director 1 Approved / Approved Only (date expected). */
  private static isCoDirector1Approved(status: string): boolean {
    return /Co-Director\s*1\s*Approved/i.test(status.trim());
  }

  /** Co-Director 1 Rejected (date expected empty). */
  private static isCoDirector1Rejected(status: string): boolean {
    return /Co-Director\s*1\s*Rejected/i.test(status.trim());
  }

  /**
   * Approved → date filled; Rejected → date empty. Other statuses do not match.
   */
  private static isCoDirector1DecisionRow(
    status: string,
    date: string
  ): boolean {
    if (CoDirector1Page.isCoDirector1Approved(status)) {
      return !CoDirector1Page.isBlank(date);
    }
    if (CoDirector1Page.isCoDirector1Rejected(status)) {
      return CoDirector1Page.isBlank(date);
    }
    return false;
  }

  private static escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
