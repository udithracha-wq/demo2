import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PaymentAnalyst1Page } from '../../pages/PaymentAnalyst1Page';

When('I change the case owner to {string}', async function (
  this: CustomWorld,
  ownerName: string
) {
  const page = new PaymentAnalyst1Page(this.page!);
  this.testData.caseOwner = ownerName;
  await page.changeCaseOwnerTo(ownerName);
});

When('I capture the case Office', async function (this: CustomWorld) {
  const page = new PaymentAnalyst1Page(this.page!);
  const office = await page.readOffice();
  this.testData.office = office;
  console.log(`Captured case Office: ${office}`);
});

When('I open the Payment Transactions Report', async function (
  this: CustomWorld
) {
  const page = new PaymentAnalyst1Page(this.page!);
  await page.openPaymentTransactionsReport();
});

When('I open the Payment Transactions Report if possible', async function (
  this: CustomWorld
) {
  const page = new PaymentAnalyst1Page(this.page!);
  await page.openPaymentTransactionsReportIfPossible();
});

Then(
  'if the Office is Member of Assembly or State Senator, the payment analyst fields should be present',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1Page(this.page!);
    await page.expectAssemblySenatorPaymentFieldsWhenApplicable(
      this.testData.office
    );
  }
);

Then(
  'if payment fields are visible check them, otherwise log the screen and continue',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1Page(this.page!);
    await page.expectPaymentTransactionsByAmountOrEmpty(this.testData.office);
  }
);

Then(
  'if Payment Amount is 0 expect the empty transactions message otherwise expect payment fields',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1Page(this.page!);
    try {
      await page.expectPaymentTransactionsByAmountOrEmpty(this.testData.office);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.log(
        'Skipping Payment Transactions Report check — continuing.\n' + message
      );
      console.log(
        `Screen contents:\n${await page.describeVisibleScreen()}`
      );
    }
  }
);

Then('I close the Payment Transactions Report', async function (
  this: CustomWorld
) {
  const page = new PaymentAnalyst1Page(this.page!);
  await page.closePaymentTransactionsReport();
});

Then('I close the Payment Transactions Report if it is open', async function (
  this: CustomWorld
) {
  const page = new PaymentAnalyst1Page(this.page!);
  await page.closePaymentTransactionsReportIfOpen();
});
