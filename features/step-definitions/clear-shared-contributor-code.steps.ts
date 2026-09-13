import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';
import { RepeatContributorCodePage } from '../../pages/RepeatContributorCodePage';

When(
  'I clear Repeat Contributor Codes shared across different names',
  { timeout: 600_000 },
  async function (this: CustomWorld) {
    const page = new RepeatContributorCodePage(this.page!);
    const changes = await page.clearCodesSharedAcrossDifferentNames();
    this.contributorCodeChanges = changes;
    this.scannedContributorRows = page.getLastCollectedRows();
    this.testData.clearedSharedRows = String(changes.length);
  }
);

Then(
  'no Repeat Contributor Code should be shared across different names',
  { timeout: 600_000 },
  async function (this: CustomWorld) {
    const page = new RepeatContributorCodePage(this.page!);
    await page.expectCodesNotSharedAcrossDifferentNames({
      cachedRows: this.scannedContributorRows,
      skipRescanIfClean: this.contributorCodeChanges.length === 0,
    });
  }
);
