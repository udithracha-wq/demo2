import { expect, type Page } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Case record + Eligibility Dashboard wizard.
 * Locators from codegen-output/codegen-nyselections-20260828-214339.ts
 */
export class EligibilityDashboardPage extends BasePage {
  /**
   * Stable Flow field name (ids like #select-746 change every load).
   * Live DOM: select[name="Political_Party_Values"] options use
   * value=RepublicanParty / visible text=Republican
   */
  private static readonly PARTY_SELECT = 'select[name="Political_Party_Values"]';

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
    const recentLink = this.page.getByRole('link', { name: caseNumber }).first();
    if (await recentLink.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await recentLink.click();
      await this.expectCaseRecordLoaded(caseNumber);
      return;
    }

    await this.page.goto(
      'https://nyselections--mtxqa.sandbox.lightning.force.com/lightning/o/Case/list',
      { waitUntil: 'domcontentloaded' }
    );
    const listLink = this.page.getByRole('link', { name: caseNumber }).first();
    await expect(listLink).toBeVisible({ timeout: 90_000 });
    await listLink.click();
    await this.expectCaseRecordLoaded(caseNumber);
  }

  private async expectCaseRecordLoaded(caseNumber: string): Promise<void> {
    await expect(
      this.page
        .locator(EligibilityDashboardPage.PARTY_SELECT)
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

    // Case 00001352 (and similar): Flow is launched from a record action, not a tab
    const launch = this.page
      .getByRole('button', { name: /Committee Eligibility/i })
      .or(this.page.getByRole('button', { name: /Candidate Eligibility/i }))
      .or(this.page.getByRole('button', { name: /Eligibility/i }));
    await expect(launch.first()).toBeVisible({ timeout: 60_000 });
    await launch.first().click();
    await this.waitForEligibilityFlow();
  }

  private async waitForEligibilityFlow(): Promise<void> {
    await this.page
      .locator(EligibilityDashboardPage.PARTY_SELECT)
      .or(this.page.locator('select:visible:enabled[name*="question"]'))
      .or(this.page.getByRole('button', { name: /^Next$/i }))
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
   * Answer every enabled Yes/No (and Decision) select on the current Flow screen.
   */
  async answerEnabledQuestionSelectsYes(): Promise<number> {
    const questionSelects = this.page.locator(
      'select:visible:enabled[name*="question"], select:visible:enabled[name*="Yes_No"], select:visible:enabled[name*="Decision"]'
    );
    await expect(questionSelects.first()).toBeVisible({ timeout: 60_000 });

    const names = await questionSelects.evaluateAll((els) =>
      els
        .map((el) => (el as HTMLSelectElement).getAttribute('name'))
        .filter((n): n is string => !!n)
    );

    for (const name of names) {
      const select = this.page.locator(`select[name="${name}"]`);
      if (await select.isDisabled().catch(() => true)) {
        continue;
      }
      await select.selectOption({ label: 'Yes' }).catch(async () => {
        await select.selectOption('Yes');
      });
    }
    return names.length;
  }

  async clickFinish(): Promise<void> {
    const finish = this.finishButton();
    await expect(finish.first()).toBeVisible({ timeout: 60_000 });
    await finish.first().click();
  }

  /**
   * Drive the Eligibility questionnaire until Finish:
   * party screen (optional) → question screens (all enabled = Yes) → Finish.
   */
  async completeEligibilityQuestionnaireAllYes(): Promise<void> {
    if (
      await this.page
        .locator(EligibilityDashboardPage.PARTY_SELECT)
        .isVisible({ timeout: 5_000 })
        .catch(() => false)
    ) {
      await this.clickNext();
      // Flow needs a beat to render the first question screen
      await this.page.waitForTimeout(2_000);
    }

    for (let screen = 0; screen < 6; screen++) {
      const finish = this.finishButton();
      if (await finish.first().isVisible({ timeout: 3_000 }).catch(() => false)) {
        await finish.first().click();
        return;
      }

      const questionSelects = this.page.locator(
        'select:visible:enabled[name*="question"], select:visible:enabled[name*="Yes_No"], select:visible:enabled[name*="Decision"]'
      );
      const hasQuestions = await questionSelects
        .first()
        .isVisible({ timeout: 30_000 })
        .catch(() => false);

      if (hasQuestions) {
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

      // Last resort: codegen-style text click
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
      EligibilityDashboardPage.PARTY_OPTION_VALUES[key] ?? party;
    const optionLabel =
      EligibilityDashboardPage.PARTY_OPTION_LABELS[key] ?? party;

    const picklist = this.page
      .locator(EligibilityDashboardPage.PARTY_SELECT)
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
      .locator(EligibilityDashboardPage.PARTY_SELECT)
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

    // Allow dropdown results to render before clicking the displayed name
    await this.page.waitForTimeout(2_000);

    const dropdownName = this.page.getByText(auditorName, { exact: true }).last();
    await expect(dropdownName).toBeVisible({ timeout: 15_000 });
    await dropdownName.click();

    const save = this.page.getByRole('button', { name: /^Save$/i });
    await expect(save.first()).toBeVisible({ timeout: 30_000 });
    await save.first().click();

    await expect(
      editBtn
        .or(this.page.getByRole('link', { name: new RegExp(nameToken, 'i') }))
        .first()
    ).toBeVisible({ timeout: 60_000 });
  }

  async expectCaseVisible(caseNumber: string): Promise<void> {
    const caseMarker = this.page
      .getByRole('tab', { name: new RegExp(caseNumber) })
      .or(this.page.getByRole('link', { name: caseNumber }))
      .or(this.page.getByText(caseNumber, { exact: true }))
      .or(this.page.locator(`text=${caseNumber}`));

    await expect(caseMarker.first()).toBeAttached({ timeout: 60_000 });
  }
}
