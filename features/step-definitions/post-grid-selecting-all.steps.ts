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
  'I select all PostGrid checkboxes and Confirm and Next until all transactions are completed',
  async function (this: CustomWorld) {
    const page = new PostGridSelectingAllPage(this.page!);
    const result = await page.selectAllAndConfirmUntilCompleted();
    this.testData.postGridBatches = String(result.batches);
    this.testData.postGridLastMessage = result.lastMessage;
  }
);

Then(
  'I should see that all PostGrid transactions are completed',
  async function (this: CustomWorld) {
    const page = new PostGridSelectingAllPage(this.page!);
    await page.expectAllTransactionsCompleted();
  }
);
