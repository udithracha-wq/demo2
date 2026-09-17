import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import {
  VerificationAgreePage,
  type VerifierStatusValue,
} from '../../pages/VerificationAgreePage';

function parseVerifierStatus(value: string): VerifierStatusValue {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'agree') return 'Agree';
  if (normalized === 'disagree') return 'Disagree';
  throw new Error(
    `Unsupported Verifier Status "${value}". Use Agree or Disagree.`
  );
}

When('I open Random Sampling Records', async function (this: CustomWorld) {
  const page = new VerificationAgreePage(this.page!);
  await page.openRandomSamplingRecords();
});

When(
  'I set empty Verifier Status values to {word} on all pages',
  async function (this: CustomWorld, status: string) {
    const markedValue = parseVerifierStatus(status);
    const page = new VerificationAgreePage(this.page!);
    const transactionNumbers =
      await page.setEmptyVerifierStatusOnAllPages(markedValue);
    this.testData.verifierUpdatedCount = String(transactionNumbers.length);
    this.testData.verifierTransactionNumbers = transactionNumbers.join(',');
    this.testData.verifierMarkedValue = markedValue;
    this.testData.verifierReportPath = page.reportMarkedTransactions(
      this.testData.caseNumber || '',
      transactionNumbers,
      markedValue
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
  'I should report all Verifier Status transaction numbers marked {word}',
  async function (this: CustomWorld, status: string) {
    const markedValue = parseVerifierStatus(status);
    const raw = this.testData.verifierTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      console.log(
        `No transaction numbers were marked ${markedValue} (no empty Verifier Status cells).`
      );
      return;
    }

    const reportPath =
      this.testData.verifierReportPath ||
      `reports/verification-${markedValue.toLowerCase()}-marked.json`;

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Verifier Status ${markedValue} report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      markedValue: string;
      markedCount: number;
      transactionNumbers: string[];
    };

    if (report.markedCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.markedCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    if (report.markedValue !== markedValue) {
      throw new Error(
        `Report markedValue mismatch: file has ${report.markedValue}, ` +
          `expected ${markedValue}`
      );
    }

    console.log('');
    console.log(
      `Then: Verifier Status transaction numbers marked ${markedValue}:`
    );
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
