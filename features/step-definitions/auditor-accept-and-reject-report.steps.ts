import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { AuditorAcceptAndRejectReportPage } from '../../pages/AuditorAcceptAndRejectReportPage';

When(
  'I open the Accepted and Rejected Claims Data report',
  async function (this: CustomWorld) {
    const page = new AuditorAcceptAndRejectReportPage(this.page!);
    await page.openAcceptedAndRejectedClaimsDataReport();
  }
);

When(
  'I select Payment Disagreed Transactions on the Accept Reject report',
  async function (this: CustomWorld) {
    const page = new AuditorAcceptAndRejectReportPage(this.page!);
    await page.selectPaymentDisagreedTransactions();
  }
);

When(
  'I set In District Confirmed to {string} for all Payment Analyst Status Disagree rows',
  async function (this: CustomWorld, value: string) {
    const page = new AuditorAcceptAndRejectReportPage(this.page!);
    const transactionNumbers =
      await page.setInDistrictConfirmedForPaymentAnalystDisagreeRows(value);
    this.testData.acceptRejectInDistrictValue = value;
    this.testData.acceptRejectUpdatedCount = String(transactionNumbers.length);
    this.testData.acceptRejectTransactionNumbers =
      transactionNumbers.join(',');
  }
);

When(
  'I save the Accepted and Rejected Claims Data report',
  async function (this: CustomWorld) {
    const page = new AuditorAcceptAndRejectReportPage(this.page!);
    const updated = Number(this.testData.acceptRejectUpdatedCount || '0');
    await page.saveReport({ requireEdits: updated > 0 });
  }
);

Then(
  'the Accepted and Rejected Claims Data report should be saved successfully',
  async function (this: CustomWorld) {
    const page = new AuditorAcceptAndRejectReportPage(this.page!);
    const updated = Number(this.testData.acceptRejectUpdatedCount || '0');
    await page.expectSavedSuccessfully({ requireToast: updated > 0 });
  }
);
