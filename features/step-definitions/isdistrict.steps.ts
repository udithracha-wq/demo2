import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { IsDistrictPage } from '../../pages/IsDistrictPage';

When('I open Audit Matching Claim Data', async function (this: CustomWorld) {
  const page = new IsDistrictPage(this.page!);
  await page.openAuditMatchingClaimData();
});

When(
  'I set empty In District Confirmed values to {word} on all pages',
  async function (this: CustomWorld, value: string) {
    const page = new IsDistrictPage(this.page!);
    const transactionNumbers =
      await page.setEmptyInDistrictConfirmedOnAllPages(value);
    this.testData.isDistrictValue = /^yes$/i.test(value.trim()) ? 'Yes' : 'No';
    this.testData.isDistrictUpdatedCount = String(transactionNumbers.length);
    this.testData.isDistrictTransactionNumbers = transactionNumbers.join(',');
    this.testData.isDistrictReportPath = page.reportMarkedTransactions(
      this.testData.caseNumber || '',
      transactionNumbers,
      value
    );
  }
);

When('I save Audit Matching Claim Data', async function (this: CustomWorld) {
  const page = new IsDistrictPage(this.page!);
  const updated = Number(this.testData.isDistrictUpdatedCount || '0');
  await page.saveAuditMatchingClaimData({ requireEdits: updated > 0 });
});

Then('Audit Matching Claim Data should be saved successfully', async function (
  this: CustomWorld
) {
  const page = new IsDistrictPage(this.page!);
  const updated = Number(this.testData.isDistrictUpdatedCount || '0');
  await page.expectSavedSuccessfully({ requireToast: updated > 0 });
});

Then(
  'I should report all In District Confirmed transaction numbers marked {word}',
  async function (this: CustomWorld, value: string) {
    const marked = /^yes$/i.test(value.trim()) ? 'Yes' : 'No';
    const raw = this.testData.isDistrictTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      console.log(
        `No transaction numbers were marked ${marked} (no empty In District Confirmed? cells).`
      );
      return;
    }

    const reportPath =
      this.testData.isDistrictReportPath ||
      `reports/isdistrict-marked-${marked.toLowerCase()}.json`;

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `In District marked-${marked} report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      markedValue?: string;
      markedCount?: number;
      markedNoCount?: number;
      markedYesCount?: number;
      transactionNumbers: string[];
    };

    const reportCount =
      report.markedCount ??
      report.markedNoCount ??
      report.markedYesCount ??
      0;

    if (reportCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${reportCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log(
      `Then: In District Confirmed? transaction numbers marked ${marked}:`
    );
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
