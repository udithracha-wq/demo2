import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { CoDirector1Page } from '../../pages/CoDirector1Page';

When('I open the committee for the case', async function (this: CustomWorld) {
  const page = new CoDirector1Page(this.page!);
  this.testData.committeeName = await page.openCommitteeFromCase();
});

When('I open the Depository Bank tab', async function (this: CustomWorld) {
  console.log('STEP start: I open the Depository Bank tab (beside Committee)');
  try {
    const page = new CoDirector1Page(this.page!);
    await page.openDepositoryBankSection();
    console.log('STEP done: I open the Depository Bank tab');
  } catch (err) {
    console.error('STEP failed: I open the Depository Bank tab', err);
    throw err;
  }
});

Then('the SFS Vendor Id should be present', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.expectSfsVendorIdPresent();
});

When('I open the Cases tab and view all cases', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.openCasesTabAndViewAll();
});

When(
  'I open the Payment data as of link for status {string}',
  async function (this: CustomWorld, status: string) {
    const page = new CoDirector1Page(this.page!);
    await page.openPaymentDataAsOfForStatus(status);
  }
);

When('I open the Co-Director Approval tab', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.openCoDirectorApprovalTab();
});

Then(
  'the Co-Director Approval Status and Commissioner Approval Date should be empty',
  async function (this: CustomWorld) {
    const page = new CoDirector1Page(this.page!);
    await page.expectApprovalFieldsEmpty(this.testData.committeeName || '');
  }
);

Then(
  'the Co-Director Approval Status and Commissioner Approval Date should be filled',
  async function (this: CustomWorld) {
    const page = new CoDirector1Page(this.page!);
    await page.expectApprovalFieldsFilled(this.testData.committeeName || '');
  }
);

When('I select the Co Director 1 Approval record', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.selectCoDirector1ApprovalRecord(this.testData.committeeName || '');
});

When('I select the Co Director 2 Approval record', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.selectCoDirector2ApprovalRecord(this.testData.committeeName || '');
});

When('I accept Co Director 1 Approval', async function (this: CustomWorld) {
  const page = new CoDirector1Page(this.page!);
  await page.acceptCoDirector1Approval();
});

When('I accept Co Director 2 Approval', async function (this: CustomWorld) {
  const page = new CoDirector1Page(this.page!);
  await page.acceptCoDirector2Approval();
});

When('I reject Co Director 1 Approval', async function (this: CustomWorld) {
  const page = new CoDirector1Page(this.page!);
  await page.rejectCoDirector1Approval();
});

When('I reject Co Director 2 Approval', async function (this: CustomWorld) {
  const page = new CoDirector1Page(this.page!);
  await page.rejectCoDirector2Approval();
});

Then('I should see a Co Director 1 Approval success message', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.expectApprovalSuccessMessage(1);
});

Then('I should see a Co Director 2 Approval success message', async function (
  this: CustomWorld
) {
  const page = new CoDirector1Page(this.page!);
  await page.expectApprovalSuccessMessage(2);
});
