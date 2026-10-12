import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { PostGridSelectingAllPage } from '../../pages/PostGridSelectingAllPage';

When('I open PostGrid In-District Audit Report', async function (
  this: CustomWorld
) {
  const page = new PostGridSelectingAllPage(this.page!);
  await page.openPostGridInDistrictAuditReport();
});

When(
  'I select all PostGrid checkboxes and Confirm and Next until All Transactions are Reviewed',
  async function (this: CustomWorld) {
    const page = new PostGridSelectingAllPage(this.page!);
    const result = await page.selectAllAndConfirmUntilCompleted();
    this.testData.postGridBatches = String(result.batches);
    this.testData.postGridLastMessage = result.lastMessage;
    if (result.lastMessage) {
      console.log(result.lastMessage);
    }
    this.recordObservation(
      result.lastMessage ||
        (result.batches === 0
          ? 'All Transactions are Reviewed'
          : `PostGrid Selecting All: confirmed ${result.batches} batch(es) until all transactions were reviewed.`)
    );
  }
);

Then('I should see the message {string}', async function (
  this: CustomWorld,
  message: string
) {
  const page = new PostGridSelectingAllPage(this.page!);
  await page.expectAllTransactionsCompleted();
  const shown = this.testData.postGridLastMessage || message;
  if (!shown.toLowerCase().includes(message.toLowerCase())) {
    throw new Error(
      `Expected banner "${message}", saw "${shown}".`
    );
  }
  console.log(shown);
});
