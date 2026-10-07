import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import { SupportingDocsYesPage } from '../../pages/SupportingDocsYesPage';

When(
  'I set Contribution Supporting Docs Received to Yes on all pages',
  async function (this: CustomWorld) {
    const page = new SupportingDocsYesPage(this.page!);
    const transactionNumbers =
      await page.setAllContributionSupportingDocsToYesOnAllPages();
    this.testData.supportingDocsUpdatedCount = String(
      transactionNumbers.length
    );
    this.testData.supportingDocsTransactionNumbers =
      transactionNumbers.join(',');
    this.testData.supportingDocsReportPath = page.reportMarkedTransactions(
      this.testData.caseNumber || '',
      transactionNumbers
    );
  }
);

Then(
  'I should report all Contribution Supporting Docs Received transaction numbers marked Yes',
  async function (this: CustomWorld) {
    const raw = this.testData.supportingDocsTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      console.log(
        'No transaction numbers were marked Yes (all Contribution Supporting Docs Received? cells were already Yes).'
      );
      return;
    }

    const reportPath =
      this.testData.supportingDocsReportPath ||
      'reports/supporting-docs-marked-yes.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Supporting Docs marked-Yes report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      caseNumber: string;
      markedCount?: number;
      markedYesCount?: number;
      transactionNumbers: string[];
    };

    const reportCount =
      report.markedCount ?? report.markedYesCount ?? 0;

    if (reportCount !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${reportCount}, ` +
          `world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log(
      'Then: Contribution Supporting Docs Received? transaction numbers marked Yes:'
    );
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
