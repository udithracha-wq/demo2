import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { CoDirector1Page } from '../../pages/CoDirector1Page';
import { PaymentAnalyst1Page } from '../../pages/PaymentAnalyst1Page';
import { PaymentSupervisorVendorIdPage } from '../../pages/PaymentSupervisorVendorIdPage';

Then(
  'I check Payment Transactions Report fields or report the message and continue',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1Page(this.page!);
    await page.checkPaymentFieldsOrReportMessageAndContinue(this.testData.office);
  }
);

Then('the SFS Vendor Id should not be populated', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.expectSfsVendorIdNotPopulated();
});

When(
  'I capture whether the SFS Vendor Id is populated',
  async function (this: CustomWorld) {
    const page = new CoDirector1Page(this.page!);
    const value = await page.readSfsVendorIdValue();
    const populated = Boolean(value);
    this.testData.sfsVendorIdPopulated = populated ? 'true' : 'false';
    this.testData.sfsVendorIdValue = value;
    console.log(
      populated
        ? `Captured SFS Vendor Id: ${value}`
        : 'Captured SFS Vendor Id: (not populated)'
    );
  }
);

When('I return to case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  this.testData.caseNumber = caseNumber;
  const page = new PaymentSupervisorVendorIdPage(this.page!);
  await page.returnToCase(caseNumber);
});

When('I refresh and reopen case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  this.testData.caseNumber = caseNumber;
  const page = new PaymentSupervisorVendorIdPage(this.page!);
  await page.refreshAndReopenCase(caseNumber);
});

Then(
  'I should see the Vendor ID required error message',
  async function (this: CustomWorld) {
    const page = new PaymentSupervisorVendorIdPage(this.page!);
    await page.expectVendorIdRequiredError();
  }
);

Then(
  'I close the Vendor ID required error message',
  async function (this: CustomWorld) {
    const page = new PaymentSupervisorVendorIdPage(this.page!);
    await page.closeVendorIdRequiredError();
  }
);

Then(
  'the Approve outcome should match the SFS Vendor Id presence for case {string}',
  async function (this: CustomWorld, caseNumber: string) {
    const populated = this.testData.sfsVendorIdPopulated === 'true';
    const page = new PaymentSupervisorVendorIdPage(this.page!);
    await page.expectApproveOutcomeForVendorId(caseNumber, populated);
  }
);
