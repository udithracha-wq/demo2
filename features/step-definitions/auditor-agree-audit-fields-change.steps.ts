import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { VerificationAgreePage } from '../../pages/VerificationAgreePage';

When(
  'I flip In District Confirmed for all Disagree Verifier Status rows',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const result = await page.flipInDistrictConfirmedForDisagreeRows();

    const prior = Number(this.testData.verifierUpdatedCount || '0');
    this.testData.verifierUpdatedCount = String(prior + result.changedCount);
    this.testData.inDistrictFlippedCount = String(result.changedCount);
    this.testData.inDistrictFlippedTransactionNumbers =
      result.transactionNumbers.join(',');
    this.testData.inDistrictFlippedReportPath =
      page.reportFlippedInDistrictConfirmed(
        this.testData.caseNumber || '',
        result.flips
      );

    if (result.changedCount < 1) {
      throw new Error(
        'Precondition failed: expected at least one Disagree Verifier Status ' +
          'row with In District Confirmed? set to Yes or No to flip.'
      );
    }
  }
);

Then(
  'I should report all flipped In District Confirmed transaction numbers',
  async function (this: CustomWorld) {
    const raw = this.testData.inDistrictFlippedTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      throw new Error(
        'No In District Confirmed? flips were recorded for Disagree rows.'
      );
    }

    const reportPath =
      this.testData.inDistrictFlippedReportPath ||
      'reports/auditor-agree-in-district-flipped.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `In District Confirmed? flip report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      flippedCount: number;
      flips: Array<{
        transactionNumber: string;
        from: string;
        to: string;
      }>;
    };

    if (report.flippedCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.flippedCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log(
      'Then: In District Confirmed? flips for Disagree Verifier Status:'
    );
    for (const f of report.flips) {
      console.log(`  - ${f.transactionNumber}: ${f.from} → ${f.to}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
