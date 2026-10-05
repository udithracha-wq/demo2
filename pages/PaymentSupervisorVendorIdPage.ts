import { expect } from '@playwright/test';
import { BasePage } from './BasePage';
import { Auditor1Page } from './Auditor1Page';
import { DuplicateTransactionPage } from './DuplicateTransactionPage';
import { EmptyErrorMessagePage } from './EmptyErrorMessagePage';

/**
 * Supervisor Approve after Payment Supervisor checks:
 * - SFS Vendor Id populated → Approve succeeds → Voucher Review
 * - SFS Vendor Id empty → Vendor ID required error → stays Supervisor Review
 */
export class PaymentSupervisorVendorIdPage extends BasePage {
  private static readonly VENDOR_ID_REQUIRED_ERROR =
    /Cannot approve Payment Case\.\s*Vendor ID must be populated for the committee/i;

  /**
   * After Depository/Bank on the committee, return to the payment case
   * (workspace Case tab if still open, otherwise global search).
   */
  async returnToCase(caseNumber: string): Promise<void> {
    const caseTab = this.page
      .getByRole('tab', { name: new RegExp(caseNumber, 'i') })
      .or(this.page.getByRole('tab', { name: '| Case', exact: true }))
      .or(this.page.getByRole('tab', { name: /\|\s*Case/i }))
      .or(
        this.page
          .getByRole('tab')
          .filter({ hasText: /\bCase\b/i })
          .filter({ hasNotText: /Committee|Account|Depository/i })
      )
      .first();

    if (await caseTab.isVisible({ timeout: 8_000 }).catch(() => false)) {
      await caseTab.click();
      console.log(`Returned to case via workspace tab (${caseNumber})`);
      return;
    }

    console.log(
      `Case tab not visible; searching for and opening case ${caseNumber}`
    );
    const searchPage = new DuplicateTransactionPage(this.page);
    await searchPage.searchAndOpenCase(caseNumber);
  }

  /**
   * Reload, then re-open the case so Status is read from the Case record
   * (not a leftover Account tab where Status can show "Active").
   */
  async refreshAndReopenCase(caseNumber: string): Promise<void> {
    await this.page
      .reload({ waitUntil: 'domcontentloaded' })
      .catch(() => undefined);

    const searchPage = new DuplicateTransactionPage(this.page);
    await searchPage.searchAndOpenCase(caseNumber);

    const detailsTab = this.page
      .getByRole('tab', { name: /^Details$/i })
      .first();
    if (await detailsTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await detailsTab.click().catch(() => undefined);
    }

    console.log(`Refreshed and reopened case ${caseNumber}`);
  }

  async expectVendorIdRequiredError(): Promise<void> {
    const error = this.page.getByText(
      PaymentSupervisorVendorIdPage.VENDOR_ID_REQUIRED_ERROR
    );
    await expect(error.first()).toBeVisible({ timeout: 30_000 });
    console.log(
      'Vendor ID required error visible: Cannot approve Payment Case. ' +
        'Vendor ID must be populated for the committee'
    );
  }

  /**
   * Dismiss the Vendor ID alert (blue X / Close). If the Approve dialog is
   * still open underneath, cancel that as well.
   */
  async closeVendorIdRequiredError(): Promise<void> {
    const alert = this.page
      .getByRole('dialog')
      .filter({
        hasText: PaymentSupervisorVendorIdPage.VENDOR_ID_REQUIRED_ERROR,
      })
      .or(
        this.page.locator('.slds-modal, .forceModal, .modal-container').filter({
          hasText: PaymentSupervisorVendorIdPage.VENDOR_ID_REQUIRED_ERROR,
        })
      )
      .first();

    if (await alert.isVisible({ timeout: 5_000 }).catch(() => false)) {
      const close = alert
        .getByRole('button', { name: /^Close$/i })
        .or(alert.getByRole('button', { name: /Cancel and close/i }))
        .or(alert.getByRole('button', { name: /^Cancel$/i }))
        .or(alert.locator('button.slds-modal__close'))
        .first();
      await expect(close).toBeVisible({ timeout: 10_000 });
      await close.click();
      await expect(alert).toBeHidden({ timeout: 30_000 });
      console.log('Closed Vendor ID required error alert');
    }

    const approval = new EmptyErrorMessagePage(this.page);
    const approveDialog = this.page
      .getByRole('dialog')
      .filter({ hasText: /Approve Case|Accept Case|Approve|Accept/i });
    if (await approveDialog.first().isVisible().catch(() => false)) {
      await approval.cancelAndCloseApprovalDialog();
      console.log('Cancelled Approve dialog after Vendor ID error');
    }
  }

  /**
   * SFS Vendor Id was populated: Approve must complete without the Vendor ID
   * required error (dialog closes / success toast).
   */
  async expectApproveSucceedsWithoutVendorIdError(): Promise<void> {
    const error = this.page.getByText(
      PaymentSupervisorVendorIdPage.VENDOR_ID_REQUIRED_ERROR
    );
    const approval = new EmptyErrorMessagePage(this.page);

    try {
      await approval.expectApprovalActionSubmitted('Accept');
    } catch (err) {
      if (await error.first().isVisible().catch(() => false)) {
        throw new Error(
          'Approve showed the Vendor ID required error, but SFS Vendor Id ' +
            'was populated on Depository/Bank.'
        );
      }
      throw err;
    }

    if (await error.first().isVisible().catch(() => false)) {
      throw new Error(
        'Unexpected Vendor ID required error after Approve while SFS Vendor ' +
          'Id was populated.'
      );
    }

    console.log(
      'Approve completed without Vendor ID required error (SFS Vendor Id present)'
    );
  }

  /**
   * Branch after Approve submit:
   * - populated → no Vendor ID error → refresh → Voucher Review
   * - empty → Vendor ID error → close → refresh → Supervisor Review
   */
  async expectApproveOutcomeForVendorId(
    caseNumber: string,
    sfsVendorIdPopulated: boolean
  ): Promise<void> {
    const auditor = new Auditor1Page(this.page);

    if (sfsVendorIdPopulated) {
      console.log(
        'SFS Vendor Id populated → expecting Approve success → Voucher Review'
      );
      await this.expectApproveSucceedsWithoutVendorIdError();
      await this.refreshAndReopenCase(caseNumber);
      await auditor.expectCaseStatus('Voucher Review');
      return;
    }

    console.log(
      'SFS Vendor Id not populated → expecting Vendor ID error → Supervisor Review'
    );
    await this.expectVendorIdRequiredError();
    await this.closeVendorIdRequiredError();
    await this.refreshAndReopenCase(caseNumber);
    await auditor.expectCaseStatus('Supervisor Review');
  }
}
