import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { SupervisorAgreeWithAuditorPage } from '../../pages/SupervisorAgreeWithAuditorPage';
import {
  EmptyErrorMessagePage,
  type ApprovalAction,
} from '../../pages/EmptyErrorMessagePage';

function parseApprovalAction(value: string): ApprovalAction {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'reject') return 'Reject';
  if (normalized === 'accept' || normalized === 'approve') return 'Accept';
  throw new Error(
    `Unsupported Approval action "${value}". Use Accept or Reject.`
  );
}

When('I close Supervisor Review Data', async function (this: CustomWorld) {
  const page = new SupervisorAgreeWithAuditorPage(this.page!);
  await page.closeSupervisorReviewData();
});

When(
  'I select {string} from the Approval History actions menu',
  async function (this: CustomWorld, approvalAction: string) {
    const action = parseApprovalAction(approvalAction);
    this.testData.approvalAction = action;
    const page = new EmptyErrorMessagePage(this.page!);
    await page.openApprovalAction(action);
  }
);

Then(
  'I should see the {string} approval dialog',
  async function (this: CustomWorld, approvalAction: string) {
    const action = parseApprovalAction(approvalAction);
    const page = new EmptyErrorMessagePage(this.page!);
    await page.expectApprovalDialogVisible(action);
  }
);

When(
  'I submit the approval action with comments {string}',
  async function (this: CustomWorld, comments: string) {
    const action = parseApprovalAction(this.testData.approvalAction || '');
    const page = new EmptyErrorMessagePage(this.page!);
    await page.submitApprovalActionWithComments(action, comments);
  }
);

Then(
  'the approval action should be submitted',
  async function (this: CustomWorld) {
    const action = parseApprovalAction(this.testData.approvalAction || '');
    const page = new EmptyErrorMessagePage(this.page!);
    await page.expectApprovalActionSubmitted(action);
  }
);
