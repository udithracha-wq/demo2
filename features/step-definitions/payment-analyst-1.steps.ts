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

Then(
  'if the Office is Member of Assembly or State Senator, the payment analyst fields should be present',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1Page(this.page!);
    await page.expectAssemblySenatorPaymentFieldsWhenApplicable(
      this.testData.office
    );
  }
);

Then('I close the Payment Transactions Report', async function (
  this: CustomWorld
) {
  const page = new PaymentAnalyst1Page(this.page!);
  await page.closePaymentTransactionsReport();
});
