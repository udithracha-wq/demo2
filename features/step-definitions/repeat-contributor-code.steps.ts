import { When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';
import { RepeatContributorCodePage } from '../../pages/RepeatContributorCodePage';

When('I open the Repeat Contributor Report', async function (
  this: CustomWorld
) {
  const page = new RepeatContributorCodePage(this.page!);
  await page.openRepeatContributorReport();
});

When(
  'I align Repeat Contributor Codes for duplicate contributor names',
  { timeout: 600_000 },
  async function (this: CustomWorld) {
    const page = new RepeatContributorCodePage(this.page!);
    const changes = await page.alignCodesForDuplicateNames();
    this.contributorCodeChanges = changes;
    this.scannedContributorRows = page.getLastCollectedRows();
    this.testData.alignedRows = String(changes.length);
  }
);

Then(
  'I should see the Repeat Contributor Code changes report',
  async function (this: CustomWorld) {
    const page = new RepeatContributorCodePage(this.page!);
    const changes = this.contributorCodeChanges;
    const report = page.formatChangesReport(changes);

    console.log('\nFeature report — Contributor Full Name / Old Code / New Code:');
    console.log(report);

    await this.attach(report, 'text/plain');

    expect(Array.isArray(changes)).toBe(true);

    if (changes.length > 0) {
      for (const change of changes) {
        expect(change.contributorFullName.trim().length).toBeGreaterThan(0);
        // Align sets newCode; clear-shared leaves it empty and must have oldCode
        if (change.newCode.trim()) {
          expect(change.newCode.trim().length).toBeGreaterThan(0);
        } else {
          expect(change.oldCode.trim().length).toBeGreaterThan(0);
        }
      }
    }
  }
);

Then(
  'all duplicate contributor names should share the same Repeat Contributor Code',
  { timeout: 600_000 },
  async function (this: CustomWorld) {
    const page = new RepeatContributorCodePage(this.page!);
    await page.expectDuplicateNamesShareCodes({
      cachedRows: this.scannedContributorRows,
      skipRescanIfClean: this.contributorCodeChanges.length === 0,
    });
  }
);
