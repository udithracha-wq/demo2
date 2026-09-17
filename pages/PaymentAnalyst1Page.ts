import { expect, type Locator } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Payment Analyst 1: take ownership of a Payment Analyst Review case and
 * verify Payment Transactions Report columns for Assembly / State Senator.
 *
 * Locators from codegen-output/payment-analyst-1.ts
 */
export class PaymentAnalyst1Page extends BasePage {
  /** Offices that require the full Assembly / Senator payment column set. */
  static readonly ASSEMBLY_SENATOR_OFFICES = [
    'Member of Assembly',
    'State Senator',
  ] as const;

  /**
   * Column headers expected on Payment Transactions Report when Office is
   * Member of Assembly or State Senator.
   */
  static readonly ASSEMBLY_SENATOR_FIELDS: readonly string[] = [
    'Navigation Mode',
    'Contributor Full Name',
    'Report Code',
    'Contribution Date',
    'Ready for Payment',
    'Contribution Amount',
    'Total Aggregate Amount',
    'Payment Amount',
    'Primary Matchable Amount',
    'Primary Tier 1 Contribution',
    'Primary Tier 1 Public Funds',
    'Primary Tier 2 Contribution',
    'Primary Tier 2 Public Funds',
    'Primary Tier 3 Contribution',
    'Primary Tier 3 Public Funds',
    'Primary Total Public Funds',
    'General Matchable Amount',
    'General Tier 1 Contribution',
    'General Tier 1 Public Funds',
    'General Tier 2 Contribution',
    'General Tier 2 Public Funds',
    'General Tier 3 Contribution',
    'General Tier 3 Public Funds',
    'General Total Public Funds',
    'Transaction Number',
    'Payment',
  ];

  /**
   * Change Owner → pick user by name → Submit.
   * Codegen: fill partial name, then click "<Name>User" suggestion.
   */
  async changeCaseOwnerTo(ownerName: string): Promise<void> {
    const changeOwner = this.page.getByRole('button', { name: 'Change Owner' });
    await expect(changeOwner).toBeVisible({ timeout: 60_000 });
    await changeOwner.click();

    const ownerSearch = this.page.getByRole('searchbox', {
      name: 'Select New Owner',
    });
    await expect(ownerSearch).toBeVisible({ timeout: 30_000 });
    await ownerSearch.click();

    const searchToken = ownerName.trim().split(/\s+/)[0] || ownerName;
    await ownerSearch.fill(searchToken);

    // Scope to the lookup dropdown — page-level getByText('Udith Racha') matches
    // the hidden Case Owner outputLookupLink on the record behind the modal.
    const ownerPattern = new RegExp(
      `${this.escape(ownerName)}(\\s*User)?`,
      'i'
    );
    const suggestion = this.page
      .getByRole('option', { name: ownerPattern })
      .or(
        this.page
          .locator(
            '[role="listbox"] [role="option"], .slds-listbox__option, ' +
              '.lookup__list li, .forceSearchInputLookupDesktop .slds-listbox__option'
          )
          .filter({ hasText: ownerPattern })
      )
      .or(
        this.page
          .getByRole('dialog')
          .getByText(new RegExp(`${this.escape(ownerName)}\\s*User`, 'i'))
      )
      .first();
    await expect(suggestion).toBeVisible({ timeout: 30_000 });
    await suggestion.click();

    const submit = this.page
      .getByRole('dialog')
      .getByRole('button', { name: 'Submit' })
      .or(this.page.getByRole('button', { name: 'Submit' }))
      .first();
    await expect(submit).toBeVisible({ timeout: 15_000 });
    await submit.click();

    await expect(changeOwner).toBeVisible({ timeout: 90_000 });
  }

  /** Case toolbar → Payment Transactions Report (workspace tab, not a modal). */
  async openPaymentTransactionsReport(): Promise<void> {
    const btn = this.page.getByRole('button', {
      name: 'Payment Transactions Report',
    });
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();

    await expect(this.reportTitle()).toBeVisible({ timeout: 90_000 });
  }

  /** Close Payment Transactions (codegen). */
  async closePaymentTransactionsReport(): Promise<void> {
    const close = this.page.getByRole('button', {
      name: 'Close Payment Transactions',
    });
    await expect(close).toBeVisible({ timeout: 30_000 });
    await close.click();
    await expect(close).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Read Office from the case Details / highlights. Used to decide whether
   * the Assembly / Senator column set is required.
   */
  async readOffice(): Promise<string> {
    const detailsField = this.page
      .getByRole('listitem')
      .filter({ hasText: /^Office\b/i })
      .or(
        this.page
          .getByRole('listitem')
          .filter({
            has: this.page.getByRole('button', { name: /^Edit Office$/i }),
          })
      )
      .first();

    const highlightsField = this.page
      .locator("xpath=//p[normalize-space()='Office']/following::p[1]")
      .first();

    let raw = '';

    if (await detailsField.isVisible({ timeout: 8_000 }).catch(() => false)) {
      let value = ((await detailsField.innerText()) ?? '').replace(
        /\s*\n\s*/g,
        '\n'
      );
      const buttons = await detailsField
        .getByRole('button')
        .allInnerTexts()
        .catch(() => [] as string[]);
      for (const button of buttons) {
        const text = button.trim();
        if (text) value = value.split(text).join('\n');
      }
      value = value.replace(/^Office\b/i, '\n');
      raw = value
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line && line !== '*' && !/^preview$/i.test(line))
        .join(' ')
        .trim();
    } else if (
      await highlightsField.isVisible({ timeout: 8_000 }).catch(() => false)
    ) {
      raw = ((await highlightsField.innerText()) ?? '').trim();
    }

    if (!raw) {
      throw new Error(
        'Office field was not found on the case Details or highlights panel.'
      );
    }

    return this.normalizeOffice(raw);
  }

  private normalizeOffice(office: string): string {
    return office
      .replace(/\bPreview\b/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private isAssemblyOrSenatorOffice(office: string): boolean {
    const normalized = this.normalizeOffice(office).toLowerCase();
    return PaymentAnalyst1Page.ASSEMBLY_SENATOR_OFFICES.some(
      (label) => label.toLowerCase() === normalized
    );
  }

  /**
   * When Office is Member of Assembly or State Senator, assert every expected
   * Payment Transactions Report field/column is present. Otherwise fail with
   * a clear message naming the Office that was found.
   *
   * Prefer `capturedOffice` from the case Details step (before the report opens).
   */
  async expectAssemblySenatorPaymentFieldsWhenApplicable(
    capturedOffice?: string
  ): Promise<void> {
    const office =
      this.normalizeOffice(capturedOffice || '') || (await this.readOffice());

    console.log(`Office on case: ${office}`);

    if (!this.isAssemblyOrSenatorOffice(office)) {
      throw new Error(
        `Office is "${office}". This scenario expects Member of Assembly or ` +
          'State Senator so the Assembly/Senator payment fields can be verified.'
      );
    }

    await this.expectPaymentFieldsPresent([
      ...PaymentAnalyst1Page.ASSEMBLY_SENATOR_FIELDS,
    ]);
  }

  /**
   * Assert each expected column/control is present on the Payment Transactions
   * Report. Use attached (not visible) so horizontally virtualized headers count.
   * Do not global-scroll between fields — that unloads early columns.
   */
  async expectPaymentFieldsPresent(fields: string[]): Promise<void> {
    await expect(this.reportTitle()).toBeVisible({ timeout: 60_000 });

    const missing: string[] = [];

    for (const field of fields) {
      const locator = this.fieldLocator(field);
      const found = await locator
        .first()
        .waitFor({ state: 'attached', timeout: 12_000 })
        .then(() => true)
        .catch(() => false);

      if (found) {
        console.log(`  ✓ ${field}`);
      } else {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new Error(
        'Payment Transactions Report is missing expected field(s):\n' +
          missing.map((f) => `  - ${f}`).join('\n')
      );
    }
  }

  private reportTitle(): Locator {
    return this.page.getByText(/Payment Transactions Report\s*\(/i).first();
  }

  /**
   * Column header / data-label / exact label text. Name match is substring-based
   * because Lightning aria-labels look like "SortContributor Full NameShow…".
   * Short label "Payment" stays exact so it does not match "Payment Amount".
   */
  private fieldLocator(field: string): Locator {
    const escaped = this.escape(field);

    if (/^payment$/i.test(field)) {
      return this.page
        .locator('[data-label="Payment"]')
        .or(this.page.getByRole('columnheader', { name: /^Payment$/i }))
        .or(
          this.page
            .locator('[role="columnheader"] span.slds-truncate')
            .filter({ hasText: /^Payment$/i })
        );
    }

    const nameMatch = new RegExp(escaped, 'i');
    const exactText = new RegExp(`^\\s*${escaped}\\s*$`, 'i');

    return this.page
      .getByRole('columnheader', { name: nameMatch })
      .or(this.page.locator(`[data-label="${field}"]`))
      .or(this.page.locator(`[title="${field}"]`))
      .or(
        this.page
          .locator('[role="columnheader"] span.slds-truncate')
          .filter({ hasText: exactText })
      )
      .or(this.page.getByLabel(nameMatch))
      .or(this.page.getByText(exactText));
  }

  private escape(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
