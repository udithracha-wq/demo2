import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

/**
 * Auditor Disagree → Request Supervisor Review / Send To Reverify validations.
 * Locators from codegen-output/auditor-disagree-supervisor.ts
 * + failure screenshots (Request Supervisor Review modal, case header).
 */
export class AuditorDisagreeSupervisorPage extends BasePage {
  private static readonly AUDITOR_RESPONSE_MUST_COMPLETE =
    /The Auditor Response fields must be completed for all the transactions marked ['"]?Disagree['"]? by the Verifier/i;

  private static readonly AUDITOR_RESPONSE_AGREEMENT_ERROR =
    /Please update the Auditor Response to Agree on all transactions where you previously disagreed with the Verifier, but have now come to an agreement and updated the audit fields\.?/i;

  private static readonly REJECTED_AUDIT_FIELD_ERROR =
    /Please update the Audit Field that was rejected on all Transactions that you have agreed to the Verifier'?s? disagreements\.?/i;

  /** Workspace / case tab after Random Sampling Records. */
  async returnToCaseTab(): Promise<void> {
    const caseTab = this.page
      .getByRole('tab', { name: '| Case', exact: true })
      .or(this.page.getByRole('tab', { name: /^Case$/i }))
      .or(this.page.getByRole('tab', { name: /\|\s*Case/i }))
      .or(
        this.page
          .getByRole('tab')
          .filter({ hasText: /\bCase\b/i })
          .filter({ hasNotText: /Random Sampling/i })
      )
      .first();

    if (await caseTab.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await caseTab.click();
      return;
    }

    // Fallback: close the Random Sampling report tab / dialog
    const closeBtn = this.page
      .getByRole('button', { name: 'Close Random Sampling Records' })
      .or(this.page.getByRole('button', { name: /^Close$/i }))
      .first();
    if (await closeBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
      await closeBtn.click();
      return;
    }

    await expect(caseTab).toBeVisible({ timeout: 60_000 });
    await caseTab.click();
  }

  async requestSupervisorReview(): Promise<void> {
    const moreActions = this.page.getByRole('button', {
      name: 'Show more actions',
    });
    await expect(moreActions).toBeVisible({ timeout: 60_000 });
    await moreActions.scrollIntoViewIfNeeded().catch(() => undefined);
    await moreActions.click();

    const menuItem = this.page.getByRole('menuitem', {
      name: 'Request Supervisor Review',
    });
    await expect(menuItem).toBeVisible({ timeout: 15_000 });
    await menuItem.click();
  }

  /**
   * Case header action: "Send To Reverify" (also accepts "Send to Verify").
   */
  async sendToVerify(): Promise<void> {
    const headerBtn = this.page
      .getByRole('button', { name: /Send To Reverify/i })
      .or(this.page.getByRole('button', { name: /Send to Verify/i }))
      .first();

    if (await headerBtn.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await headerBtn.scrollIntoViewIfNeeded().catch(() => undefined);
      await headerBtn.click();
      return;
    }

    const moreActions = this.page.getByRole('button', {
      name: 'Show more actions',
    });
    await expect(moreActions).toBeVisible({ timeout: 60_000 });
    await moreActions.click();

    const menuItem = this.page
      .getByRole('menuitem', { name: /Send To Reverify/i })
      .or(this.page.getByRole('menuitem', { name: /Send to Verify/i }))
      .first();
    await expect(menuItem).toBeVisible({ timeout: 15_000 });
    await menuItem.click();
  }

  async expectAuditorResponseMustBeCompletedMessage(): Promise<void> {
    const message = this.page.getByText(
      AuditorDisagreeSupervisorPage.AUDITOR_RESPONSE_MUST_COMPLETE
    );
    await expect(message.first()).toBeVisible({ timeout: 30_000 });
  }

  async expectAuditorResponseAgreementError(): Promise<void> {
    const message = this.page.getByText(
      AuditorDisagreeSupervisorPage.AUDITOR_RESPONSE_AGREEMENT_ERROR
    );
    await expect(message.first()).toBeVisible({ timeout: 30_000 });
  }

  async expectRejectedAuditFieldMustBeUpdatedError(): Promise<void> {
    const message = this.page.getByText(
      AuditorDisagreeSupervisorPage.REJECTED_AUDIT_FIELD_ERROR
    );
    await expect(message.first()).toBeVisible({ timeout: 30_000 });
  }

  async finishSupervisorReviewPrompt(): Promise<void> {
    const finish = this.page.getByRole('button', { name: /^Finish$/i });
    await expect(finish.first()).toBeVisible({ timeout: 30_000 });
    await finish.first().click();
  }
}
