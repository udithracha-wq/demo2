import { expect, type Locator, type Page } from '@playwright/test';
import { BasePage } from './BasePage';
import {
  caseListUrl,
  caseRecordUrl,
  lightningHomeUrl,
} from './SalesforceLoginPage';

/** Structural select shape for page.evaluate (tsconfig has no DOM lib). */
type SelectLike = {
  disabled: boolean;
  selectedIndex: number;
  options: ArrayLike<{ textContent: string | null; value: string }>;
  getAttribute(name: string): string | null;
};

/**
 * Auditor1 flow: Case record + Eligibility Dashboard wizard.
 * Locators from codegen-output/codegen-nyselections-20260828-214339.ts
 */
export class Auditor1Page extends BasePage {
  /**
   * Stable Flow field name (ids like #select-746 change every load).
   * Live DOM: select[name="Political_Party_Values"] options use
   * value=RepublicanParty / visible text=Republican
   */
  private static readonly PARTY_SELECT = 'select[name="Political_Party_Values"]';

  /** Salesforce Case Id (15/18) starting with 500 */
  private static isCaseRecordId(value: string): boolean {
    return /^500[a-zA-Z0-9]{12}([a-zA-Z0-9]{3})?$/.test(value.trim());
  }

  private static caseIdFromInput(value: string): string | null {
    const trimmed = value.trim();
    if (Auditor1Page.isCaseRecordId(trimmed)) return trimmed;
    try {
      const u = new URL(trimmed);
      const m = u.pathname.match(/\/Case\/([a-zA-Z0-9]{15,18})\//);
      return m?.[1] ?? null;
    } catch {
      return null;
    }
  }

  /** Map business party names to picklist option values from codegen */
  private static readonly PARTY_OPTION_VALUES: Record<string, string> = {
    republican: 'RepublicanParty',
    republicanparty: 'RepublicanParty',
    democratic: 'DemocraticParty',
    democraticparty: 'DemocraticParty',
    conservative: 'ConservativeParty',
    workingfamilies: 'WorkingFamiliesParty',
    other: 'OtherParty',
  };

  /** Visible option text in the Flow picklist (not the API value) */
  private static readonly PARTY_OPTION_LABELS: Record<string, string> = {
    republican: 'Republican',
    republicanparty: 'Republican',
    democratic: 'Democratic',
    democraticparty: 'Democratic',
    conservative: 'Conservative',
    workingfamilies: 'Working Families',
    other: 'Other',
  };

  async openCase(caseNumber: string): Promise<void> {
    const recordId = Auditor1Page.caseIdFromInput(caseNumber);
    if (recordId) {
      await this.page.goto(caseRecordUrl(recordId), {
        waitUntil: 'domcontentloaded',
      });
      await this.expectCaseRecordLoaded(recordId);
      return;
    }

    const recentLink = this.page.getByRole('link', { name: caseNumber }).first();
    if (await recentLink.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await recentLink.click();
      await this.expectCaseRecordLoaded(caseNumber);
      return;
    }

    // Global search → Enter → click Case link (preferred for case numbers)
    try {
      await this.openCaseViaGlobalSearch(caseNumber);
      await this.expectCaseRecordLoaded(caseNumber);
      return;
    } catch (err) {
      console.warn(
        `Global search did not open Case ${caseNumber}; falling back to Case list.`,
        err
      );
    }

    await this.page.goto(caseListUrl(), { waitUntil: 'domcontentloaded' });
    const listLink = this.page.getByRole('link', { name: caseNumber }).first();
    await expect(listLink).toBeVisible({ timeout: 90_000 });
    await listLink.click();
    await this.expectCaseRecordLoaded(caseNumber);
  }

  /**
   * Global search → type case number → Enter → click the Case result.
   * Matches: Search button → searchbox "Search..." → Enter → link.
   */
  private async openCaseViaGlobalSearch(caseNumber: string): Promise<void> {
    // Ensure we are on Lightning (search is in the global header)
    if (!/lightning\.force\.com/i.test(this.page.url())) {
      await this.page.goto(lightningHomeUrl(), {
        waitUntil: 'domcontentloaded',
      });
    }

    const searchBtn = this.page.getByRole('button', { name: 'Search' });
    const searchHost = this.page.locator('lightning-input.saInput');

    await expect(searchBtn).toBeVisible({ timeout: 60_000 });
    if ((await searchHost.count()) === 0) {
      await searchBtn.click();
    }
    await expect(searchHost).toBeAttached({ timeout: 15_000 });
    await searchHost.click({ force: true }).catch(() => undefined);
    await this.page.keyboard.type(caseNumber);
    await this.page.keyboard.press('Enter');

    // Results: click the Case number link (not Transaction T-… links)
    const caseLink = this.page
      .getByRole('link', { name: caseNumber, exact: true })
      .filter({ hasNotText: /^T-/ })
      .first();

    await expect(caseLink).toBeVisible({ timeout: 60_000 });
    await caseLink.click();
  }

  private async expectCaseRecordLoaded(caseNumber: string): Promise<void> {
    await expect(
      this.page
        .locator(Auditor1Page.PARTY_SELECT)
        .or(this.page.getByRole('tab', { name: 'Details' }))
        .or(this.page.getByRole('tab', { name: 'Eligibility Dashboard' }))
        .or(this.page.getByText(caseNumber, { exact: true }))
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }

  async openDetailsTab(): Promise<void> {
    const tab = this.page.getByRole('tab', { name: 'Details' });
    await expect(tab).toBeVisible({ timeout: 60_000 });
    await tab.click();
  }

  async openEligibilityDashboardTab(): Promise<void> {
    // Codegen returns to Case workspace before opening the Flow
    const caseTab = this.page.getByRole('tab', { name: /\| Case$|^Case$/i });
    if (await caseTab.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await caseTab.first().click();
    }

    const tab = this.page.getByRole('tab', { name: /Eligibility Dashboard/i });
    if (await tab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await tab.click();
      await this.waitForEligibilityFlow();
      return;
    }

    const more = this.page
      .getByRole('tab', { name: /^More$/i })
      .or(this.page.getByRole('button', { name: /^More$/i }))
      .or(this.page.getByRole('button', { name: /Show more tabs|More Tabs/i }));
    if (await more.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
      await more.first().click();
      const menuItem = this.page
        .getByRole('menuitem', { name: /Eligibility Dashboard/i })
        .or(this.page.getByText('Eligibility Dashboard', { exact: true }));
      if (await menuItem.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await menuItem.first().click();
        await this.waitForEligibilityFlow();
        return;
      }
    }

    // Case flow is launched from a record action when no Eligibility tab exists
    const launch = this.page
      .getByRole('button', { name: /Committee Eligibility/i })
      .or(this.page.getByRole('button', { name: /Candidate Eligibility/i }))
      .or(this.page.getByRole('button', { name: /Eligibility/i }));
    await expect(launch.first()).toBeVisible({ timeout: 60_000 });
    await launch.first().click();

    try {
      await this.waitForEligibilityFlow();
    } catch {
      throw new Error(
        'Eligibility Flow did not open after Committee Eligibility. ' +
          'Use a case that has not finished Eligibility Review yet ' +
          '(Status should not already be Reviewed).'
      );
    }
  }

  private async waitForEligibilityFlow(): Promise<void> {
    await this.page
      .locator(Auditor1Page.PARTY_SELECT)
      .or(
        this.page.locator(
          'select:visible:enabled[name*="question"], select:visible:enabled[name*="Yes_No"]'
        )
      )
      .or(this.page.getByText(/Are All Disclosure Reports Filed/i))
      .or(this.page.getByRole('button', { name: /^Next$/i }))
      .or(this.page.getByRole('button', { name: /^Finish$/i }))
      .or(this.page.locator('button:visible').filter({ hasText: /^Next$/ }))
      .first()
      .waitFor({ state: 'visible', timeout: 60_000 });
  }

  async clickNext(): Promise<void> {
    const next = this.nextButton();
    await expect(next.first()).toBeVisible({ timeout: 60_000 });
    await next.first().click();
  }

  async clickNextIfPresent(): Promise<void> {
    const next = this.nextButton();
    if (await next.first().isVisible({ timeout: 8_000 }).catch(() => false)) {
      await next.first().click();
    }
  }

  private nextButton() {
    // Prefer real footer buttons; avoid matching stray "Next" text nodes
    return this.page
      .locator('button:visible')
      .filter({ hasText: /^Next$/ })
      .or(this.page.getByRole('button', { name: /^Next$/i }));
  }

  private finishButton() {
    return this.page
      .locator('button:visible')
      .filter({ hasText: /^Finish$/ })
      .or(this.page.getByRole('button', { name: /^Finish$/i }))
      .or(this.page.locator('button').filter({ hasText: 'Finish' }));
  }

  /**
   * After Next on Eligibility Dashboard: set Yes on EVERY editable Yes/No
   * dropdown. One-at-a-time with waits so dependents unlock (Disclosure Reports).
   */
  async answerEnabledQuestionSelectsYes(): Promise<number> {
    let totalAnswered = 0;
    const answeredNames = new Set<string>();

    for (let pass = 0; pass < 25; pass++) {
      const selects = this.page.locator('select:visible:enabled');
      if (
        !(await selects.first().isVisible({ timeout: 5_000 }).catch(() => false))
      ) {
        break;
      }

      const nextName = await selects.evaluateAll((els, already) => {
        const skip = /Political_Party|Election_Type/i;
        const done = new Set(already as string[]);

        for (const el of els) {
          const select = el as SelectLike;
          const name = select.getAttribute('name') ?? '';
          if (!name || skip.test(name) || select.disabled || done.has(name)) {
            continue;
          }
          const labels = Array.from(select.options).map((o) =>
            (o.textContent ?? '').trim().toLowerCase()
          );
          const values = Array.from(select.options).map((o) =>
            o.value.trim().toLowerCase()
          );
          const hasYes = labels.includes('yes') || values.includes('yes');
          const hasNo = labels.includes('no') || values.includes('no');
          if (!(hasYes && hasNo)) continue;

          const selectedText = (
            select.options[select.selectedIndex]?.textContent ?? ''
          )
            .trim()
            .toLowerCase();
          if (selectedText === 'yes') continue;
          return name;
        }
        return null;
      }, [...answeredNames]);

      if (!nextName) {
        // Sweep by label for known sticky fields
        let labeled = false;
        for (const pattern of [
          /Are All Disclosure Reports Filed/i,
          /Disclosure Reports/i,
        ]) {
          if (await this.selectYesByLabel(pattern)) {
            totalAnswered += 1;
            labeled = true;
            await this.page.waitForTimeout(1_000);
          }
        }
        if (labeled) continue;

        await this.page.waitForTimeout(2_000);
        // Final index-based sweep for any remaining Yes/No still not Yes
        const swept = await this.sweepAllYesNoSelects();
        totalAnswered += swept;
        if (swept === 0 && !(await this.hasPendingYesNoSelects(answeredNames))) {
          break;
        }
        continue;
      }

      const pick = this.page.locator(`select[name="${nextName}"]`).first();
      // Do NOT mark answered if still disabled — retry on a later pass
      if (await pick.isDisabled().catch(() => true)) {
        await this.page.waitForTimeout(1_000);
        continue;
      }

      await pick.selectOption({ label: 'Yes' }).catch(async () => {
        await pick.selectOption('Yes').catch(async () => {
          await pick.selectOption({ value: 'Yes' });
        });
      });

      const nowYes = await pick.evaluate((el) => {
        const s = el as SelectLike;
        return /^yes$/i.test(
          (s.options[s.selectedIndex]?.textContent ?? '').trim()
        );
      });
      if (nowYes) {
        answeredNames.add(nextName);
        totalAnswered += 1;
      }
      await this.page.waitForTimeout(1_000);
    }

    // Always try Disclosure once more at the end
    if (await this.selectYesByLabel(/Are All Disclosure Reports Filed/i)) {
      totalAnswered += 1;
    }
    totalAnswered += await this.sweepAllYesNoSelects();

    return totalAnswered;
  }

  /** Force Yes on every currently enabled Yes/No select still not Yes. */
  private async sweepAllYesNoSelects(): Promise<number> {
    const names = await this.page
      .locator('select:visible:enabled')
      .evaluateAll((els) => {
        const skip = /Political_Party|Election_Type/i;
        return els
          .map((el) => {
            const select = el as SelectLike;
            const name = select.getAttribute('name') ?? '';
            if (!name || skip.test(name) || select.disabled) return null;
            const labels = Array.from(select.options).map((o) =>
              (o.textContent ?? '').trim().toLowerCase()
            );
            if (!(labels.includes('yes') && labels.includes('no'))) return null;
            const selected = (
              select.options[select.selectedIndex]?.textContent ?? ''
            )
              .trim()
              .toLowerCase();
            return selected === 'yes' ? null : name;
          })
          .filter((n) => !!n);
      });

    let count = 0;
    for (const name of names) {
      if (!name) continue;
      const pick = this.page.locator(`select[name="${name}"]`).first();
      if (await pick.isDisabled().catch(() => true)) continue;
      await pick.selectOption({ label: 'Yes' }).catch(async () => {
        await pick.selectOption('Yes');
      });
      count += 1;
      await this.page.waitForTimeout(500);
    }
    return count;
  }

  /** Set Yes on a select found by its visible field label text. */
  private async selectYesByLabel(labelPattern: RegExp): Promise<boolean> {
    const field = this.page
      .locator('.slds-form-element, flowruntime-input-select, flowruntime-screen-field')
      .filter({ hasText: labelPattern });
    if (!(await field.first().isVisible({ timeout: 2_000 }).catch(() => false))) {
      return false;
    }

    const select = field.first().locator('select').first();
    if (!(await select.isVisible({ timeout: 2_000 }).catch(() => false))) {
      return false;
    }
    if (await select.isDisabled().catch(() => true)) {
      // Try waiting briefly for unlock
      await this.page.waitForTimeout(2_000);
      if (await select.isDisabled().catch(() => true)) {
        return false;
      }
    }

    const current = await select
      .evaluate((el) => {
        const s = el as SelectLike;
        return (s.options[s.selectedIndex]?.textContent ?? '').trim();
      })
      .catch(() => '');
    if (/^yes$/i.test(current)) {
      return false;
    }

    await select.selectOption({ label: 'Yes' }).catch(async () => {
      await select.selectOption('Yes');
    });
    return true;
  }

  private async hasPendingYesNoSelects(
    alreadyAnswered: Set<string>
  ): Promise<boolean> {
    return this.page
      .locator('select:visible:enabled')
      .evaluateAll((els, already) => {
        const skip = /Political_Party|Election_Type/i;
        const done = new Set(already as string[]);
        return els.some((el) => {
          const select = el as SelectLike;
          const name = select.getAttribute('name') ?? '';
          if (!name || skip.test(name) || select.disabled || done.has(name)) {
            return false;
          }
          const labels = Array.from(select.options).map((o) =>
            (o.textContent ?? '').trim().toLowerCase()
          );
          if (!(labels.includes('yes') && labels.includes('no'))) return false;
          const selected = (
            select.options[select.selectedIndex]?.textContent ?? ''
          )
            .trim()
            .toLowerCase();
          return selected !== 'yes';
        });
      }, [...alreadyAnswered])
      .catch(() => false);
  }

  async clickFinish(): Promise<void> {
    const finish = this.finishButton();
    await expect(finish.first()).toBeVisible({ timeout: 60_000 });
    await finish.first().click();
  }

  /** True when any visible enabled select has both Yes and No options. */
  private async hasEditableYesNoSelects(): Promise<boolean> {
    return this.page
      .locator('select:visible:enabled')
      .evaluateAll((els) => {
        const skip = /Political_Party|Election_Type/i;
        return els.some((el) => {
          const select = el as SelectLike;
          const name = select.getAttribute('name') ?? '';
          if (skip.test(name)) return false;
          const labels = Array.from(select.options).map((o) =>
            (o.textContent ?? '').trim().toLowerCase()
          );
          return labels.includes('yes') && labels.includes('no');
        });
      })
      .catch(() => false);
  }

  /**
   * Drive the Eligibility questionnaire until Finish:
   * party screen (optional) → every editable Yes/No = Yes → Finish.
   */
  async completeEligibilityQuestionnaireAllYes(): Promise<void> {
    if (
      await this.page
        .locator(Auditor1Page.PARTY_SELECT)
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await this.clickNext();
      await this.page.waitForTimeout(2_000);
    }

    for (let screen = 0; screen < 6; screen++) {
      const finish = this.finishButton();
      if (await finish.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await finish.first().click();
        return;
      }

      // Wait for Yes/No dropdowns (or Finish) after Next
      let foundQuestions = false;
      const deadline = Date.now() + 30_000;
      while (Date.now() < deadline) {
        if (await finish.first().isVisible({ timeout: 300 }).catch(() => false)) {
          await finish.first().click();
          return;
        }
        if (await this.hasEditableYesNoSelects()) {
          foundQuestions = true;
          break;
        }
        await this.page.waitForTimeout(500);
      }

      if (foundQuestions) {
        await this.answerEnabledQuestionSelectsYes();
        await this.page.waitForTimeout(1_000);
      }

      if (await finish.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await finish.first().click();
        return;
      }

      const next = this.nextButton();
      if (await next.first().isVisible({ timeout: 15_000 }).catch(() => false)) {
        await next.first().click();
        await this.page.waitForTimeout(2_000);
        continue;
      }

      const nextText = this.page.getByText('Next', { exact: true });
      if (await nextText.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
        await nextText.first().click();
        await this.page.waitForTimeout(2_000);
        continue;
      }

      throw new Error(
        'Eligibility questionnaire stuck: no Finish or Next after answering'
      );
    }

    throw new Error('Eligibility questionnaire did not reach Finish');
  }

  /**
   * Party picklist on the Case Flow screen.
   * Prefer select[name="Political_Party_Values"] — Election Type shares the
   * generic "Select Picklist Value" label.
   */
  async selectParty(party: string): Promise<void> {
    const key = party.replace(/\s+/g, '').toLowerCase();
    const optionValue =
      Auditor1Page.PARTY_OPTION_VALUES[key] ?? party;
    const optionLabel =
      Auditor1Page.PARTY_OPTION_LABELS[key] ?? party;

    const picklist = this.page
      .locator(Auditor1Page.PARTY_SELECT)
      .first();
    await expect(picklist).toBeVisible({ timeout: 90_000 });

    const byValue = await picklist
      .selectOption(optionValue)
      .then(() => true)
      .catch(() => false);
    if (byValue) {
      return;
    }

    await picklist.selectOption({ label: optionLabel });
  }

  /** Same as selectParty, but no-op when the Flow already passed that screen. */
  async selectPartyIfPresent(party: string): Promise<void> {
    const picklist = this.page
      .locator(Auditor1Page.PARTY_SELECT)
      .first();
    if (!(await picklist.isVisible({ timeout: 20_000 }).catch(() => false))) {
      return;
    }
    await this.selectParty(party);
  }

  /**
   * Lightning lookup: Edit → type name → wait 2s → click dropdown name → Save.
   * When a value is already selected the input is readonly — clear first.
   */
  async setPrimaryAuditor(auditorName: string): Promise<void> {
    const editBtn = this.page.getByRole('button', {
      name: /Edit Primary Auditor/i,
    });
    await expect(editBtn).toBeVisible({ timeout: 60_000 });
    await editBtn.click();

    const combo = this.page.getByRole('combobox', { name: /Primary Auditor/i });
    await expect(combo).toBeVisible({ timeout: 30_000 });

    const nameToken = auditorName.trim().split(/\s+/)[0] ?? auditorName;
    const current = (await combo.getAttribute('data-value')) ?? '';
    if (new RegExp(nameToken, 'i').test(current)) {
      const cancel = this.page.getByRole('button', { name: /^Cancel$/i });
      await expect(cancel).toBeVisible({ timeout: 15_000 });
      await cancel.click();
      await expect(editBtn).toBeVisible({ timeout: 60_000 });
      return;
    }

    if (current) {
      const clear = this.page.getByRole('button', {
        name: /Clear Primary Auditor Selection/i,
      });
      await expect(clear).toBeVisible({ timeout: 15_000 });
      await clear.click();
      await expect(combo).toBeEditable({ timeout: 15_000 });
    }

    await combo.click();
    await combo.fill('');
    // Type enough for Salesforce lookup (codegen used first 3 letters)
    const searchText =
      nameToken.length >= 3 ? nameToken.slice(0, 3).toLowerCase() : nameToken;
    await combo.fill(searchText);

    // Allow dropdown results to render before clicking the displayed name.
    // Match the listbox option: a bare getByText picks up the same name in the
    // Case History panel and leaves the lookup open with nothing selected.
    await this.page.waitForTimeout(2_000);

    const dropdownName = this.page
      .getByRole('option', { name: new RegExp(nameToken, 'i') })
      .or(
        this.page
          .getByRole('listbox')
          .getByText(auditorName, { exact: true })
      )
      .first();
    await expect(dropdownName).toBeVisible({ timeout: 15_000 });
    await dropdownName.click();

    const save = this.page.getByRole('button', { name: /^Save$/i });
    await expect(save.first()).toBeVisible({ timeout: 30_000 });
    await save.first().click();

    // Verify the value actually persisted — the edit button reappears whether
    // or not the save took effect, so assert on the field content instead.
    await expect(
      this.page
        .getByRole('listitem')
        .filter({ hasText: /Primary Auditor/i })
        .filter({ hasText: new RegExp(nameToken, 'i') })
        .first()
    ).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Value of a Details-tab field, read from the listitem holding its label.
   *
   * Some fields render without line breaks ("StatusMatching Claim ReviewEdit
   * Status"), so the value is isolated by subtracting the field's own button
   * labels and its label text rather than by splitting lines.
   */
  async caseFieldValue(
    labelPattern: RegExp,
    timeout = 30_000
  ): Promise<string> {
    const field = this.page
      .getByRole('listitem')
      .filter({ hasText: labelPattern })
      .first();
    await expect(field).toBeVisible({ timeout });

    let value = ((await field.innerText()) ?? '').replace(/\s*\n\s*/g, '\n');
    const buttons = await field
      .getByRole('button')
      .allInnerTexts()
      .catch(() => [] as string[]);

    for (const button of buttons) {
      const text = button.trim();
      if (text) value = value.split(text).join('\n');
    }
    value = value.replace(labelPattern, '\n');

    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== '*' && !/^preview$/i.test(line))
      .join(' ')
      .trim();
  }

  /** Election Year on the case record, e.g. "2025". */
  async readElectionYear(): Promise<string> {
    for (const label of [/Election Year/i, /Election/i]) {
      const raw = await this.caseFieldValue(label, 10_000).catch(() => '');
      const year = raw.match(/\b(19|20)\d{2}\b/)?.[0];
      if (year) return year;
    }

    throw new Error(
      'No Election Year found on the case Details tab. Fields read:\n' +
        (await this.detailsFieldDump())
    );
  }

  /**
   * Case Record Type + Status on the open case record. The Examples table says
   * "Eligibility Review Case" while the record field reads "Eligibility
   * Review", so the trailing word "Case" is optional.
   */
  async expectCaseRecordTypeAndStatus(
    recordType: string,
    status: string
  ): Promise<void> {
    const field = this.page
      .getByRole('listitem')
      .filter({ hasText: /Case Record Type/i })
      .first();
    await expect(field).toBeVisible({ timeout: 60_000 });

    const core = Auditor1Page.escape(recordType.trim().replace(/\s+case$/i, ''));
    await expect(field).toContainText(new RegExp(`${core}(\\s+Case)?`, 'i'), {
      timeout: 60_000,
    });

    await this.expectCaseStatus(status);
  }

  /**
   * Read the case Status from Details (Edit Status) or the highlights panel.
   * Do not match Approval History "Status" (e.g. Rejected) — that is a
   * different field and returns values like ": Rejected".
   */
  async readCaseStatus(): Promise<string> {
    const editStatusField = this.page
      .getByRole('listitem')
      .filter({ has: this.page.getByRole('button', { name: /^Edit Status$/i }) })
      .first();

    if (await editStatusField.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const value = await this.listitemFieldValue(editStatusField, /^Status\b/i);
      if (value) return value;
    }

    // Highlights panel only — never the Approval History related list.
    // Lightning sometimes keeps this field in the DOM but hidden after reload.
    const highlightsField = this.page
      .locator('records-highlights2, .slds-page-header')
      .locator("xpath=.//p[normalize-space()='Status']/following::p[1]")
      .first();

    await expect(highlightsField).toBeAttached({ timeout: 60_000 });
    const raw = (
      (await highlightsField.innerText().catch(() => '')) ||
      (await highlightsField.textContent().catch(() => '')) ||
      ''
    ).trim();
    if (!raw) {
      throw new Error('Case Status field is present but empty.');
    }
    return raw.replace(/\s+/g, ' ');
  }

  /** Strip label + button chrome from a known Details listitem. */
  private async listitemFieldValue(
    field: Locator,
    labelPattern: RegExp
  ): Promise<string> {
    let value = ((await field.innerText()) ?? '').replace(/\s*\n\s*/g, '\n');
    const buttons = await field
      .getByRole('button')
      .allInnerTexts()
      .catch(() => [] as string[]);

    for (const button of buttons) {
      const text = button.trim();
      if (text) value = value.split(text).join('\n');
    }
    value = value.replace(labelPattern, '\n');

    return value
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line && line !== '*' && !/^preview$/i.test(line))
      .join(' ')
      .trim();
  }

  async expectCaseStatus(status: string): Promise<void> {
    const expected = status.trim();
    let actual = await this.readCaseStatus();

    if (Auditor1Page.labelPattern(expected).test(actual)) {
      console.log(`Case status is "${actual}" (expected "${expected}")`);
      return;
    }

    console.log(
      `Case status initially "${actual}"; waiting for "${expected}"…`
    );

    // After approval actions Lightning may keep a stale highlights value —
    // poll with a soft reload until the expected status appears.
    try {
      await expect
        .poll(
          async () => {
            await this.page
              .reload({ waitUntil: 'domcontentloaded' })
              .catch(() => undefined);
            actual = await this.readCaseStatus().catch(() => actual);
            console.log(`  polled case status: "${actual}"`);
            return Auditor1Page.labelPattern(expected).test(actual);
          },
          { timeout: 90_000, intervals: [2_000, 3_000, 5_000] }
        )
        .toBeTruthy();
    } catch {
      throw new Error(
        `Expected case status "${expected}", but it is "${actual}".`
      );
    }

    console.log(`Case status is "${actual}" (expected "${expected}")`);
  }

  /** Label matcher tolerant of hyphen/slash/space differences. */
  private static labelPattern(label: string): RegExp {
    const words = label
      .trim()
      .split(/[\s\-/]+/)
      .filter(Boolean)
      .map((word) => Auditor1Page.escape(word));
    return new RegExp(words.join('[\\s\\-/]*'), 'i');
  }

  /**
   * Case Owner from the Details listitem (or highlights). Never use Approval
   * History "Assigned To" — that is a different field.
   */
  async readCaseOwner(): Promise<string> {
    // Details tab: "Case Owner | PCFB Admin Queue" listitem.
    // Do not anchor the label regex — hasText matches the whole listitem text.
    const detailsOwner = await this.caseFieldValue(/Case Owner/i, 15_000).catch(
      () => ''
    );
    if (detailsOwner && !/Approval|Status:|Comments:/i.test(detailsOwner)) {
      return detailsOwner.replace(/^Case\s*Owner\s*/i, '').trim() || detailsOwner;
    }

    const highlightsOwner = this.page
      .locator('records-highlights2, .slds-page-header')
      .locator(
        "xpath=.//p[normalize-space()='Owner' or normalize-space()='Case Owner']/following::p[1]"
      )
      .first();

    if (
      await highlightsOwner.isVisible({ timeout: 8_000 }).catch(() => false)
    ) {
      const value = ((await highlightsOwner.innerText()) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (value) return value;
    }

    const ownerField = await this.caseFieldValue(/^Owner$/i, 5_000).catch(
      () => ''
    );
    if (ownerField && !/Approval|Status:|Comments:/i.test(ownerField)) {
      return ownerField;
    }

    return '';
  }

  /**
   * "Assigned to you" — Case Owner (preferred) or Primary Auditor.
   * Do not match Approval History "Assigned To".
   */
  async expectCaseAssignedTo(name: string): Promise<void> {
    const read: string[] = [];
    const expected = new RegExp(Auditor1Page.escape(name), 'i');

    const owner = await this.readCaseOwner();
    if (owner) {
      read.push(`Case Owner = "${owner}"`);
      if (expected.test(owner)) return;
    }

    const primaryAuditor = await this.caseFieldValue(
      /Primary Auditor/i,
      8_000
    ).catch(() => '');
    if (primaryAuditor) {
      read.push(`Primary Auditor = "${primaryAuditor}"`);
      if (expected.test(primaryAuditor)) return;
    }

    throw new Error(
      `The case is not assigned to "${name}".\n` +
        `Assignment fields read: ${read.join(' | ') || 'none found'}\n` +
        `Details fields:\n${await this.detailsFieldDump()}`
    );
  }

  /** Election Type is display-only on the Eligibility flow screen. */
  async expectElectionTypeNotEditable(): Promise<void> {
    const byName = this.page.locator('select[name*="Election_Type"]').first();
    if ((await byName.count()) > 0) {
      if (!(await byName.isDisabled())) {
        const name = await byName.getAttribute('name');
        const options = await byName.locator('option').allInnerTexts();
        const value = await byName.inputValue().catch(() => '');

        throw new Error(
          'Election Type is editable on the Eligibility flow screen. ' +
            `<select name="${name}"> is enabled, currently "${value}", and ` +
            `offers ${JSON.stringify(options.map((o) => o.trim()))}.`
        );
      }
      return;
    }

    const field = this.page
      .locator(
        '.slds-form-element, flowruntime-input-select, flowruntime-screen-field'
      )
      .filter({ hasText: /Election Type/i })
      .last();
    await expect(field).toBeVisible({ timeout: 60_000 });

    await expect(
      field.locator(
        'select:enabled, input:enabled:not([readonly]), textarea:enabled'
      )
    ).toHaveCount(0, { timeout: 15_000 });
  }

  /** Committee Eligibility action back on the case header after review. */
  async expectCommitteeEligibilityButtonAvailable(): Promise<void> {
    const button = this.page
      .getByRole('button', { name: /Committee Eligibility/i })
      .first();
    await expect(button).toBeVisible({ timeout: 90_000 });
    await expect(button).toBeEnabled({ timeout: 30_000 });
  }

  /** The Eligibility flow screen is gone and the case record is back. */
  async expectEligibilityFlowClosed(): Promise<void> {
    await expect(this.page.locator(Auditor1Page.PARTY_SELECT)).toHaveCount(0, {
      timeout: 60_000,
    });
    await expect(this.nextButton().first()).toBeHidden({ timeout: 60_000 });
    await expect(this.finishButton().first()).toBeHidden({ timeout: 60_000 });
    await expect(
      this.page.getByRole('tab', { name: 'Details' }).first()
    ).toBeVisible({ timeout: 60_000 });
  }

  /** Labels + values currently on the Details tab, for failure messages. */
  private async detailsFieldDump(): Promise<string> {
    const lines = await this.page
      .getByRole('listitem')
      .allInnerTexts()
      .catch(() => [] as string[]);

    return lines
      .map((line) => line.replace(/\s*\n\s*/g, ' | ').trim())
      .filter(Boolean)
      .slice(0, 40)
      .join('\n');
  }

  private static escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async expectCaseVisible(caseNumber: string): Promise<void> {
    const recordId = Auditor1Page.caseIdFromInput(caseNumber);
    if (recordId) {
      await expect(this.page).toHaveURL(new RegExp(`/Case/${recordId}`), {
        timeout: 60_000,
      });
      return;
    }

    const caseMarker = this.page
      .getByRole('tab', { name: new RegExp(caseNumber) })
      .or(this.page.getByRole('link', { name: caseNumber }))
      .or(this.page.getByText(caseNumber, { exact: true }))
      .or(this.page.locator(`text=${caseNumber}`));

    await expect(caseMarker.first()).toBeAttached({ timeout: 60_000 });
  }
}
