import { When } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PaymentAnalyst1VarianceRejectPage } from '../../pages/PaymentAnalyst1VarianceRejectPage';

function varianceOpened(world: CustomWorld): boolean {
  return world.testData.varianceReportOpened === 'true';
}

When(
  'I open the Variance Report if it is available',
  async function (this: CustomWorld) {
    const page = new PaymentAnalyst1VarianceRejectPage(this.page!);
    const opened = await page.openVarianceReportIfAvailable();
    this.testData.varianceReportOpened = opened ? 'true' : 'false';
  }
);

When(
  'I select Unreviewed transactions on the Variance Report',
  async function (this: CustomWorld) {
    if (!varianceOpened(this)) {
      console.log('Skipping Unreviewed filter — Variance Report not open');
      return;
    }
    const page = new PaymentAnalyst1VarianceRejectPage(this.page!);
    await page.selectUnreviewedTransactions();
  }
);

When(
  'I set Payment Analyst Status to {string} and Notes {string} for all Variance rows',
  async function (this: CustomWorld, status: string, notes: string) {
    if (!varianceOpened(this)) {
      console.log(
        `Skipping Status/Notes — Variance Report not open`
      );
      return;
    }
    const page = new PaymentAnalyst1VarianceRejectPage(this.page!);
    this.testData.varianceStatus = status;
    this.testData.paymentAnalystNotes = notes;
    const count = await page.setPaymentAnalystStatusAndNotesForAllRows(
      status,
      notes
    );
    this.testData.varianceStatusRowCount = String(count);
    this.testData.varianceNotesRowCount = String(count);
  }
);

When('I save and close the Variance Report', async function (
  this: CustomWorld
) {
  if (!varianceOpened(this)) {
    console.log('Skipping Save/Close — Variance Report not open');
    return;
  }
  const page = new PaymentAnalyst1VarianceRejectPage(this.page!);
  await page.saveAndCloseVarianceReport();
});
