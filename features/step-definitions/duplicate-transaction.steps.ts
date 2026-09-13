import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { DuplicateTransactionPage } from '../../pages/DuplicateTransactionPage';

When('I search for and open case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const page = new DuplicateTransactionPage(this.page!);
  this.testData.caseNumber = caseNumber;
  await page.searchAndOpenCase(caseNumber);
});

When('I open the duplicate transaction report', async function (
  this: CustomWorld
) {
  const page = new DuplicateTransactionPage(this.page!);
  await page.openDuplicateTransactionReport();
});

When('I clear duplicate flags on all flagged transactions', async function (
  this: CustomWorld
) {
  const page = new DuplicateTransactionPage(this.page!);
  const processed = await page.clearAllFlaggedTransactions();
  this.testData.processedTransactions = processed.join(',');
  this.testData.affectedReportPath = page.reportAffectedTransactions(
    this.testData.caseNumber || '',
    processed
  );
});

When('I click Next on the duplicate transaction report', async function (
  this: CustomWorld
) {
  const page = new DuplicateTransactionPage(this.page!);
  await page.clickNext();
});

When('I close the duplicate transaction dialog', async function (
  this: CustomWorld
) {
  const page = new DuplicateTransactionPage(this.page!);
  await page.closeDuplicateTransactionDialog();
});

Then(
  'I should see case {string} after duplicate transaction',
  async function (this: CustomWorld, caseNumber: string) {
    const page = new DuplicateTransactionPage(this.page!);
    await page.expectCaseVisible(caseNumber);
  }
);

Then('I should report all affected transaction numbers', async function (
  this: CustomWorld
) {
  const raw = this.testData.processedTransactions || '';
  const transactionNumbers = raw
    .split(',')
    .map((id) => id.trim())
    .filter(Boolean);

  if (transactionNumbers.length === 0) {
    throw new Error(
      'No affected transaction numbers were recorded. ' +
        'Expected clear step to store processedTransactions.'
    );
  }

  const reportPath =
    this.testData.affectedReportPath ||
    'reports/duplicate-transaction-affected.json';

  if (!fs.existsSync(reportPath)) {
    throw new Error(`Affected transactions report missing: ${reportPath}`);
  }

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
    caseNumber: string;
    clearedCount: number;
    transactionNumbers: string[];
  };

  if (report.clearedCount !== transactionNumbers.length) {
    throw new Error(
      `Report count mismatch: file has ${report.clearedCount}, ` +
        `world has ${transactionNumbers.length}`
    );
  }

  console.log('');
  console.log('Then: confirmed affected transaction numbers:');
  for (const id of report.transactionNumbers) {
    console.log(`  - ${id}`);
  }
  console.log(`Report file: ${reportPath}`);
});

Then('no flagged transactions should remain on the report', async function (
  this: CustomWorld
) {
  const page = new DuplicateTransactionPage(this.page!);
  await page.expectNoFlaggedTransactionsRemain();
});
