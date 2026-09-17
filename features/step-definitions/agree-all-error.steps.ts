import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { AgreeAllErrorPage } from '../../pages/AgreeAllErrorPage';
import { VerificationAgreePage } from '../../pages/VerificationAgreePage';

When(
  'I verify Disagree Verifier Status fields are present',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const transactionNumbers =
      await page.findVerifierStatusTransactionNumbers('Disagree');
    this.testData.disagreeVerifierStatusCount = String(
      transactionNumbers.length
    );
    this.testData.disagreeVerifierTransactionNumbers =
      transactionNumbers.join(',');
    this.testData.disagreeVerifierReportPath =
      page.reportDisagreeVerifierTransactions(
        this.testData.caseNumber || '',
        transactionNumbers
      );

    if (transactionNumbers.length < 1) {
      throw new Error(
        'Precondition failed: expected at least one Disagree Verifier Status ' +
          'field on Random Sampling Records so Accept from Approval History ' +
          'should show the Verifier update error.'
      );
    }

    console.log(
      `Confirmed ${transactionNumbers.length} Disagree Verifier Status field(s):`
    );
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
  }
);

Then(
  'I should see the Verifier update error message',
  async function (this: CustomWorld) {
    const page = new AgreeAllErrorPage(this.page!);
    await page.expectVerifierUpdateError();
  }
);

Then(
  'I should report all Disagree Verifier Status transaction numbers',
  async function (this: CustomWorld) {
    const raw = this.testData.disagreeVerifierTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      throw new Error(
        'No Disagree Verifier Status transaction numbers were recorded.'
      );
    }

    const reportPath =
      this.testData.disagreeVerifierReportPath ||
      'reports/disagree-verifier-status-transactions.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Disagree Verifier Status report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      disagreeCount: number;
      transactionNumbers: string[];
    };

    if (report.disagreeCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.disagreeCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log('Then: Disagree Verifier Status transaction numbers:');
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
