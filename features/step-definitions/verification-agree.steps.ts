import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { VerificationAgreePage } from '../../pages/VerificationAgreePage';

When('I open Random Sampling Records', async function (this: CustomWorld) {
  const page = new VerificationAgreePage(this.page!);
  await page.openRandomSamplingRecords();
});

When(
  'I set empty Verifier Status values to Agree on all pages',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const transactionNumbers =
      await page.setEmptyVerifierStatusToAgreeOnAllPages();
    this.testData.verifierUpdatedCount = String(transactionNumbers.length);
    this.testData.verifierTransactionNumbers = transactionNumbers.join(',');
    this.testData.verifierReportPath = page.reportMarkedTransactions(
      this.testData.caseNumber || '',
      transactionNumbers
    );
  }
);

When('I save Random Sampling Records', async function (this: CustomWorld) {
  const page = new VerificationAgreePage(this.page!);
  const updated = Number(this.testData.verifierUpdatedCount || '0');
  await page.save({ requireEdits: updated > 0 });
});

Then(
  'Random Sampling Records should be saved successfully',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const updated = Number(this.testData.verifierUpdatedCount || '0');
    await page.expectSavedSuccessfully({ requireToast: updated > 0 });
  }
);

Then(
  'I should report all Verifier Status transaction numbers marked Agree',
  async function (this: CustomWorld) {
    const raw = this.testData.verifierTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      console.log(
        'No transaction numbers were marked Agree (no empty Verifier Status cells).'
      );
      return;
    }

    const reportPath =
      this.testData.verifierReportPath ||
      'reports/verification-agree-marked.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(`Verifier Status Agree report missing: ${reportPath}`);
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      markedCount: number;
      transactionNumbers: string[];
    };

    if (report.markedCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.markedCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log('Then: Verifier Status transaction numbers marked Agree:');
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
