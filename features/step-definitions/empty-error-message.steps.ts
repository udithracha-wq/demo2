import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import {
  EmptyErrorMessagePage,
  type ApprovalAction,
} from '../../pages/EmptyErrorMessagePage';
import { VerificationAgreePage } from '../../pages/VerificationAgreePage';

function parseApprovalAction(value: string): ApprovalAction {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'reject') return 'Reject';
  if (normalized === 'accept' || normalized === 'approve') return 'Accept';
  throw new Error(
    `Unsupported Approval action "${value}". Use Accept or Reject.`
  );
}

When(
  'I verify empty Verifier Status fields are present',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const transactionNumbers =
      await page.findEmptyVerifierStatusTransactionNumbers();
    this.testData.emptyVerifierStatusCount = String(transactionNumbers.length);
    this.testData.emptyVerifierTransactionNumbers =
      transactionNumbers.join(',');
    this.testData.emptyVerifierReportPath = page.reportEmptyVerifierTransactions(
      this.testData.caseNumber || '',
      transactionNumbers
    );

    if (transactionNumbers.length < 1) {
      throw new Error(
        'Precondition failed: expected at least one empty Verifier Status ' +
          'field on Random Sampling Records so Accept/Reject from Approval ' +
          'History should show the incomplete review error.'
      );
    }

    console.log(
      `Confirmed ${transactionNumbers.length} empty Verifier Status field(s):`
    );
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
  }
);

When('I close Random Sampling Records', async function (this: CustomWorld) {
  const page = new EmptyErrorMessagePage(this.page!);
  await page.closeRandomSamplingRecords();
});

When(
  'I choose {string} from Approval History with comments {string}',
  async function (
    this: CustomWorld,
    approvalAction: string,
    comments: string
  ) {
    const action = parseApprovalAction(approvalAction);
    this.testData.approvalAction = action;
    const page = new EmptyErrorMessagePage(this.page!);
    await page.chooseApprovalActionWithComments(action, comments);
  }
);

Then(
  'I should see the incomplete review error message',
  async function (this: CustomWorld) {
    const page = new EmptyErrorMessagePage(this.page!);
    await page.expectIncompleteReviewError();
  }
);

Then(
  'I cancel and close the approval action dialog',
  async function (this: CustomWorld) {
    const page = new EmptyErrorMessagePage(this.page!);
    await page.cancelAndCloseApprovalDialog();
  }
);

Then(
  'I should report all empty Verifier Status transaction numbers',
  async function (this: CustomWorld) {
    const raw = this.testData.emptyVerifierTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      throw new Error(
        'No empty Verifier Status transaction numbers were recorded.'
      );
    }

    const reportPath =
      this.testData.emptyVerifierReportPath ||
      'reports/empty-verifier-status-transactions.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(`Empty Verifier Status report missing: ${reportPath}`);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      emptyCount: number;
      transactionNumbers: string[];
    };

    if (report.emptyCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.emptyCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log('Then: empty Verifier Status transaction numbers:');
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
