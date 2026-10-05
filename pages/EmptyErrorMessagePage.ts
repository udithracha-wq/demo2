import { expect } from '@playwright/test';
import { BasePage } from './BasePage';

export type ApprovalAction = 'Accept' | 'Reject';

/**
 * Incomplete-review error when Accept/Reject is chosen from Approval History
 * while Random Sampling Records still has empty Verifier Status fields.
 * Locators from codegen-output/empty-error-message.ts
 */
export class EmptyErrorMessagePage extends BasePage {
  private static readonly INCOMPLETE_REVIEW_ERROR =
    /Please complete the review of/i;
  private static readonly TOAST =
    '.forceToastMessage, .slds-notify_toast, .toastMessage, ' +
    '.toastContainer .slds-notify';

  async closeRandomSamplingRecords(): Promise<void> {
    const closeBtn = this.page.getByRole('button', {
      name: 'Close Random Sampling Records',
    });
    await expect(closeBtn).toBeVisible({ timeout: 90_000 });
    await closeBtn.click();
    await expect(closeBtn).toBeHidden({ timeout: 30_000 });
  }

  /**
   * Approval History → Accept/Approve or Reject → Comments → submit.
   * Accept maps to Salesforce "Approve" when that menuitem is shown.
   */
  async chooseApprovalActionWithComments(
    action: ApprovalAction,
    comments: string
  ): Promise<void> {
    await this.openApprovalAction(action);
    await this.submitApprovalActionWithComments(action, comments);
  }

  /** Fill Comments and submit an approval dialog that is already open. */
  async submitApprovalActionWithComments(
    action: ApprovalAction,
    comments: string
  ): Promise<void> {
    const dialog = this.approvalDialog(action);
    const commentsBox = dialog.getByRole('textbox', { name: 'Comments' });
    await expect(commentsBox).toBeVisible({ timeout: 15_000 });
    await commentsBox.fill(comments);

    const submitName = action === 'Reject' ? 'Reject' : /^(Approve|Accept)$/;
    const submitBtn = dialog.getByRole('button', {
      name: submitName,
      exact: action === 'Reject',
    });
    await expect(submitBtn.first()).toBeVisible({ timeout: 15_000 });
    await submitBtn.first().click();
  }

  /**
   * The dialog stays open when the submission is refused (for example the
   * incomplete-review error), so it closing is what proves it went through.
   */
  async expectApprovalActionSubmitted(action: ApprovalAction): Promise<void> {
    await expect(this.approvalDialog(action)).toBeHidden({ timeout: 60_000 });
  }

  /**
   * After Accept/Reject submit: success toast and/or dialog close.
   * Toasts auto-dismiss, so poll immediately after submit.
   */
  async expectApprovalSuccessMessage(action: ApprovalAction): Promise<string> {
    const successish =
      /success|saved|updated|submitted|complete|approved|reject|record/i;
    const errorish = /error|exception|failed|unable|incomplete|please complete/i;

    let message = '';
    await expect
      .poll(
        async () => {
          const toastTexts = (
            await this.page.locator(EmptyErrorMessagePage.TOAST).allInnerTexts()
          )
            .map((t) => t.replace(/\s+/g, ' ').trim())
            .filter(Boolean);

          if (toastTexts.length) {
            const joined = [...new Set(toastTexts)].join(' | ');
            if (toastTexts.some((t) => errorish.test(t))) {
              throw new Error(
                `Approval History ${action} failed with Salesforce error: ${joined}`
              );
            }
            if (toastTexts.some((t) => successish.test(t))) {
              message = joined;
              return true;
            }
          }

          const dialogGone = await this.approvalDialog(action)
            .isHidden()
            .catch(() => true);
          return dialogGone ? 'dialog-closed' : false;
        },
        { timeout: 90_000, intervals: [500, 1_000, 2_000] }
      )
      .toBeTruthy();

    if (message) {
      console.log(`Approval History ${action} success: ${message}`);
    } else {
      console.log(
        `Approval History ${action} dialog closed (no toast text captured)`
      );
    }
    return message;
  }

  /**
   * Approval History → actions dropdown → Accept/Approve or Reject, stopping
   * at the open dialog so callers can either fill it in or just assert it.
   */
  async openApprovalAction(action: ApprovalAction): Promise<void> {
    await this.openApprovalActionsMenu();

    const menuItem =
      action === 'Reject'
        ? this.page.getByRole('menuitem', { name: 'Reject', exact: true })
        : this.page
            .getByRole('menuitem', { name: 'Approve', exact: true })
            .or(this.page.getByRole('menuitem', { name: 'Accept', exact: true }));

    // Overflow menus (codegen: "Show more actions") may hide Reject/Approve.
    for (let i = 0; i < 2; i++) {
      if (await menuItem.first().isVisible().catch(() => false)) break;
      const more = this.page.getByRole('button', { name: 'Show more actions' });
      if (!(await more.first().isVisible().catch(() => false))) break;
      await more.first().click();
    }

    await expect(menuItem.first()).toBeVisible({ timeout: 15_000 });
    await menuItem.first().click();

    await expect(this.approvalDialog(action)).toBeVisible({ timeout: 30_000 });
  }

  async expectApprovalDialogVisible(action: ApprovalAction): Promise<void> {
    await expect(this.approvalDialog(action)).toBeVisible({ timeout: 30_000 });
  }

  private approvalDialog(action: ApprovalAction) {
    const title =
      action === 'Reject'
        ? /Reject Case/i
        : /Approve Case|Accept Case|Approve|Accept/i;
    return this.page.getByRole('dialog').filter({ hasText: title });
  }

  private async openApprovalActionsMenu(): Promise<void> {
    const approvalActions = this.page.getByRole('button', {
      name: 'Show actions for Approval',
    });
    await expect(approvalActions).toBeVisible({ timeout: 60_000 });
    await approvalActions.scrollIntoViewIfNeeded().catch(() => undefined);
    await approvalActions.click();
  }

  async expectIncompleteReviewError(): Promise<void> {
    const error = this.page.getByText(
      EmptyErrorMessagePage.INCOMPLETE_REVIEW_ERROR
    );
    await expect(error.first()).toBeVisible({ timeout: 30_000 });
  }

  async cancelAndCloseApprovalDialog(): Promise<void> {
    const dialog = this.page.getByRole('dialog').first();
    const cancel = dialog
      .getByRole('button', { name: 'Cancel and close' })
      .or(dialog.getByRole('button', { name: 'Cancel', exact: true }));
    await expect(cancel.first()).toBeVisible({ timeout: 15_000 });
    await cancel.first().click();
    await expect(dialog).toBeHidden({ timeout: 30_000 });
  }
}
