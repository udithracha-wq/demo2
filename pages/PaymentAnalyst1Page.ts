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
   * Empty-state copy when Payment Amount is $0 / no eligible transactions
   * (Payment Transactions Report shows no grid columns).
   * Match flexibly — the red banner may wrap/truncate mid-sentence.
   */
  static readonly NO_PAYMENT_TRANSACTIONS_MESSAGE =
    /No payment transactions found|no eligible transactions to pay|maximum funding allowed/i;

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
    await this.clickPaymentTransactionsReportEntry();
    await expect(this.reportReadyLocator()).toBeVisible({ timeout: 90_000 });
  }

  /**
   * Open Payment Transactions Report when possible. If neither the report
   * title nor the zero-payment empty message appears, log the screen.
   */
  async openPaymentTransactionsReportIfPossible(): Promise<void> {
    const opened = await this.clickPaymentTransactionsReportEntry().then(
      () => true,
      () => false
    );

    if (!opened) {
      console.log(
        'Payment Transactions Report control not found. Logging screen.'
      );
      console.log(`Screen contents:\n${await this.describeVisibleScreen()}`);
      return;
    }

    const ready = await this.reportReadyLocator()
      .or(this.page.getByText(/^Payment Amount$/i))
      .first()
      .isVisible({ timeout: 45_000 })
      .catch(() => false);

    if (!ready) {
      console.log(
        'Opened Payment Transactions Report but summary/empty state did not ' +
          'appear. Logging screen.'
      );
      console.log(`Screen contents:\n${await this.describeVisibleScreen()}`);
    }
  }

  /**
   * Prefer the record tab "Payment Transactions Report"; fall back to the
   * header action button with the same name.
   */
  private async clickPaymentTransactionsReportEntry(): Promise<void> {
    const tab = this.page
      .getByRole('tab', { name: /^Payment Transactions Report$/i })
      .first();
    if (await tab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await tab.click();
      return;
    }

    const btn = this.page
      .getByRole('button', { name: 'Payment Transactions Report' })
      .first();
    await expect(btn).toBeVisible({ timeout: 60_000 });
    await btn.click();
  }

  /** Close Payment Transactions (codegen). */
  async closePaymentTransactionsReport(): Promise<void> {
    const close = this.closePaymentTransactionsButton();
    await expect(close).toBeVisible({ timeout: 30_000 });
    await close.click();
    await expect(close).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Close the Payment Transactions workspace tab when it is open; no-op if
   * already closed (so soft report checks can continue).
   */
  async closePaymentTransactionsReportIfOpen(): Promise<void> {
    const close = this.closePaymentTransactionsButton();
    const visible = await close
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    if (!visible) {
      console.log(
        'Close Payment Transactions not visible — report may already be closed.'
      );
      return;
    }
    await close.click();
    await expect(close).toBeHidden({ timeout: 30_000 });
  }

  private closePaymentTransactionsButton(): Locator {
    return this.page
      .getByRole('button', { name: /^Close Payment Transactions( Report)?$/i })
      .first();
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
   * Soft check for Payment Supervisor: verify Assembly/Senator columns when
   * present; if the report is empty or fields are missing, log what is on
   * screen and continue (do not fail the scenario).
   */
  async checkAssemblySenatorPaymentFieldsOrDescribeScreen(
    capturedOffice?: string
  ): Promise<void> {
    await this.expectPaymentTransactionsByAmountOrEmpty(capturedOffice);
  }

  /**
   * Payment Transactions Report field check:
   * - No grid fields / empty-state banner → log the on-screen message and continue
   * - Grid column fields present but any expected field missing → fail
   * - All expected grid fields present → pass
   *
   * Summary labels like "Payment Amount: $0.00" are NOT treated as report fields.
   */
  async checkPaymentFieldsOrReportMessageAndContinue(
    capturedOffice?: string
  ): Promise<void> {
    const office =
      this.normalizeOffice(capturedOffice || '') ||
      (await this.readOffice().catch(() => ''));
    console.log(`Office on case: ${office || '(unknown)'}`);

    const reportTab = this.page
      .getByRole('tab', { name: /Payment Transactions Report/i })
      .first();
    if (await reportTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reportTab.click().catch(() => undefined);
    }

    // Wait until empty banner text OR real grid columns appear.
    let emptyMessage = '';
    let hasGridColumns = false;
    try {
      await expect
        .poll(
          async () => {
            emptyMessage = await this.extractEmptyReportMessageFromScreen();
            hasGridColumns = await this.hasTransactionGridColumns();
            return Boolean(emptyMessage) || hasGridColumns;
          },
          { timeout: 25_000, intervals: [500, 1_000, 2_000] }
        )
        .toBeTruthy();
    } catch {
      emptyMessage = await this.extractEmptyReportMessageFromScreen();
      hasGridColumns = await this.hasTransactionGridColumns();
    }

    if (emptyMessage || !hasGridColumns) {
      const message =
        emptyMessage || (await this.readDisplayedReportMessage());
      console.log(
        'Payment Transactions Report fields are not present — reporting ' +
          'message and continuing:\n' +
          `  "${message}"`
      );
      return;
    }

    const { present, missing } = await this.scanGridPaymentFields(
      PaymentAnalyst1Page.ASSEMBLY_SENATOR_FIELDS
    );

    if (present.length === 0) {
      const message = await this.readDisplayedReportMessage();
      console.log(
        'Payment Transactions Report fields are not present — reporting ' +
          'message and continuing:\n' +
          `  "${message}"`
      );
      return;
    }

    if (missing.length > 0) {
      throw new Error(
        'Payment Transactions Report fields differ from expected.\n' +
          `Present (${present.length}):\n` +
          present.map((f) => `  ✓ ${f}`).join('\n') +
          '\nMissing / different:\n' +
          missing.map((f) => `  ✗ ${f}`).join('\n')
      );
    }

    console.log(
      `All ${present.length} expected Payment Transactions Report fields are present.`
    );
  }

  /** True when real grid column headers (not summary labels) are present. */
  private async hasTransactionGridColumns(): Promise<boolean> {
    const markers = [
      'Contributor Full Name',
      'Report Code',
      'Contribution Date',
      'Transaction Number',
    ];
    for (const field of markers) {
      if (await this.gridFieldLocator(field).first().isVisible().catch(() => false)) {
        return true;
      }
      if (
        await this.gridFieldLocator(field)
          .first()
          .waitFor({ state: 'attached', timeout: 800 })
          .then(() => true)
          .catch(() => false)
      ) {
        return true;
      }
    }
    return false;
  }

  /** Columnheader / data-label only — ignores summary "Payment Amount" text. */
  private gridFieldLocator(field: string): Locator {
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
      .or(
        this.page
          .locator('[role="columnheader"] span.slds-truncate')
          .filter({ hasText: exactText })
      );
  }

  private async scanGridPaymentFields(
    fields: readonly string[]
  ): Promise<{ present: string[]; missing: string[] }> {
    const present: string[] = [];
    const missing: string[] = [];

    for (const field of fields) {
      const found = await this.gridFieldLocator(field)
        .first()
        .waitFor({ state: 'attached', timeout: 5_000 })
        .then(() => true)
        .catch(() => false);

      if (found) {
        console.log(`  ✓ ${field}`);
        present.push(field);
      } else {
        missing.push(field);
      }
    }

    return { present, missing };
  }

  /** Pull empty-state copy from locator or body text. */
  private async extractEmptyReportMessageFromScreen(): Promise<string> {
    const empty = this.noPaymentTransactionsMessage();
    if (await empty.isVisible({ timeout: 1_000 }).catch(() => false)) {
      const text = ((await empty.innerText().catch(() => '')) ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (text) return text;
    }

    const body = ((await this.page.locator('body').innerText().catch(() => '')) ??
      '')
      .replace(/\r/g, '');
    const match = body.match(
      /No payment transactions found\.[^\n]*(?:\n[^\n]*){0,2}/i
    );
    if (match?.[0]) return match[0].replace(/\s+/g, ' ').trim();

    const loose = body.match(
      /no eligible transactions to pay[^\n]*|maximum funding allowed[^\n]*/i
    );
    if (loose?.[0]) return loose[0].replace(/\s+/g, ' ').trim();

    return '';
  }

  /** Empty-state banner text, or a short screen snapshot when no fields. */
  private async readDisplayedReportMessage(): Promise<string> {
    const fromScreen = await this.extractEmptyReportMessageFromScreen();
    if (fromScreen) return fromScreen;
    return (await this.describeVisibleScreen(1_200)) || '(no message captured)';
  }

  /**
   * Payment Transactions Report branch (hard fail if invalid):
   * - empty-state banner visible → pass
   * - Payment Amount = $0.00 with no empty banner but a transaction grid →
   *   Assembly/Senator fields must be present
   * - Payment Amount ≠ 0 → Assembly/Senator fields must be present
   */
  async expectPaymentTransactionsByAmountOrEmpty(
    capturedOffice?: string
  ): Promise<void> {
    const office =
      this.normalizeOffice(capturedOffice || '') ||
      (await this.readOffice().catch(() => ''));
    console.log(`Office on case: ${office || '(unknown)'}`);

    // Activate the report workspace tab if present, then wait for content.
    const reportTab = this.page
      .getByRole('tab', { name: /Payment Transactions Report/i })
      .first();
    if (await reportTab.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await reportTab.click().catch(() => undefined);
    }

    await expect
      .poll(
        async () => {
          const amount = await this.readPaymentAmountText();
          const empty = await this.noPaymentTransactionsMessage()
            .isVisible()
            .catch(() => false);
          const grid = await this.reportTitle()
            .isVisible()
            .catch(() => false);
          return Boolean(amount) || empty || grid;
        },
        { timeout: 20_000, intervals: [500, 1_000, 2_000] }
      )
      .toBeTruthy();

    const amountText = await this.readPaymentAmountText();
    const amountIsZero = this.isZeroMoney(amountText);
    const emptyVisible = await this.noPaymentTransactionsMessage()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);
    const gridVisible = await this.reportTitle()
      .isVisible({ timeout: 5_000 })
      .catch(() => false);

    console.log(
      `Payment Amount on report: "${amountText || '(not found)'}"` +
        ` (zero=${amountIsZero}, emptyMessage=${emptyVisible}, grid=${gridVisible})`
    );

    // True empty state — banner only.
    if (emptyVisible && !gridVisible) {
      const message = (
        (await this.noPaymentTransactionsMessage().innerText().catch(() => '')) ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      console.log(
        'Empty-state message is present (expected):\n' + `  "${message}"`
      );
      return;
    }

    if (amountIsZero && emptyVisible) {
      const message = (
        (await this.noPaymentTransactionsMessage().innerText().catch(() => '')) ??
        ''
      )
        .replace(/\s+/g, ' ')
        .trim();
      console.log(
        'Payment Amount is $0.00 — empty-state message is present (expected):\n' +
          `  "${message}"`
      );
      return;
    }

    if (!amountText && !gridVisible) {
      throw new Error(
        'Could not read Payment Amount on the Payment Transactions Report, ' +
          'and neither the empty message nor the transaction grid was visible.\n' +
          `Screen contents:\n${await this.describeVisibleScreen()}`
      );
    }

    if (office && !this.isAssemblyOrSenatorOffice(office)) {
      throw new Error(
        `Payment Amount is "${amountText || '(unknown)'}", but Office is ` +
          `"${office}". Expected Member of Assembly or State Senator to ` +
          'verify payment fields.'
      );
    }

    console.log(
      amountIsZero
        ? 'Payment Amount is $0.00 with transaction grid — verifying Assembly/Senator payment fields.'
        : `Payment Amount is "${amountText}" (not $0) — verifying Assembly/Senator payment fields.`
    );
    await this.expectPaymentFieldsPresent([
      ...PaymentAnalyst1Page.ASSEMBLY_SENATOR_FIELDS,
    ]);
  }

  /** Summary-panel Payment Amount value (e.g. "$0.00"), not the grid column header. */
  private paymentAmountValueLocator(): Locator {
    return this.page
      .locator(
        "xpath=//*[normalize-space()='Payment Amount']/following::*[contains(normalize-space(.),'$')][1]"
      )
      .or(
        this.page
          .getByRole('listitem')
          .filter({ hasText: /^Payment Amount\b/i })
      )
      .first();
  }

  private async readPaymentAmountText(): Promise<string> {
    const labeled = this.page
      .locator(
        "xpath=//*[normalize-space()='Payment Amount']/following::*[1]"
      )
      .first();

    if (await labeled.isVisible({ timeout: 8_000 }).catch(() => false)) {
      const raw = ((await labeled.innerText()) ?? '').replace(/\s+/g, ' ').trim();
      const money = raw.match(/\$?\s*-?[\d,]+\.\d{2}/)?.[0];
      if (money) return money.replace(/\s+/g, '');
      if (raw) return raw;
    }

    const listItem = this.page
      .getByRole('listitem')
      .filter({ hasText: /Payment Amount/i })
      .first();
    if (await listItem.isVisible({ timeout: 3_000 }).catch(() => false)) {
      const raw = ((await listItem.innerText()) ?? '')
        .replace(/Payment Amount/i, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      const money = raw.match(/\$?\s*-?[\d,]+\.\d{2}/)?.[0];
      if (money) return money.replace(/\s+/g, '');
    }

    // Visible page text often lays out as "Payment Amount\n$0.00"
    // or "Payment Amount:\n$0.00"
    const body = ((await this.page.locator('body').innerText().catch(() => '')) ??
      '')
      .replace(/\r/g, '');
    const block = body.match(
      /Payment Amount\s*:?\s*[\n\r\t ]*(\$?\s*-?[\d,]+\.\d{2})/i
    );
    if (block?.[1]) return block[1].replace(/\s+/g, '');

    return '';
  }

  private isZeroMoney(amountText: string): boolean {
    if (!amountText) return false;
    const normalized = amountText.replace(/[$,\s]/g, '');
    const value = Number.parseFloat(normalized);
    return Number.isFinite(value) && value === 0;
  }

  /** Snapshot of visible page text for soft-failure diagnostics. */
  async describeVisibleScreen(maxChars = 2_500): Promise<string> {
    const reportRegion = this.page
      .locator(
        '.oneWorkspaceTabWrapper, .tabContent.active, ' +
          '[role="main"], .forceWorkspaceTabContent'
      )
      .filter({ visible: true })
      .first();

    let text = '';
    if (await reportRegion.count().catch(() => 0)) {
      text = ((await reportRegion.innerText().catch(() => '')) ?? '').trim();
    }
    if (!text) {
      text = ((await this.page.locator('body').innerText().catch(() => '')) ?? '')
        .trim();
    }

    text = text.replace(/\s+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if (text.length > maxChars) {
      return text.slice(0, maxChars) + '\n… (truncated)';
    }
    return text || '(no visible text captured)';
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
    return this.page
      .getByText(/Payment Transactions Report\s*\(/i)
      .or(this.page.getByText(/^Payment Transactions Report$/i))
      .first();
  }

  /** Empty-state banner when Payment Amount is $0 / no eligible transactions. */
  private noPaymentTransactionsMessage(): Locator {
    return this.page
      .getByText(PaymentAnalyst1Page.NO_PAYMENT_TRANSACTIONS_MESSAGE)
      .first();
  }

  /** Report is ready when either the grid title or the empty-state message shows. */
  private reportReadyLocator(): Locator {
    return this.page
      .getByText(/Payment Transactions Report\s*\(/i)
      .or(this.page.getByText(/^Payment Transactions Report$/i))
      .or(
        this.page.getByText(PaymentAnalyst1Page.NO_PAYMENT_TRANSACTIONS_MESSAGE)
      )
      .first();
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
