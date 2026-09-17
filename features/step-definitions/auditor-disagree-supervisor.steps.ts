import { When, Then } from '@cucumber/cucumber';
import * as fs from 'fs';
import { CustomWorld } from './world';
import {
  VerificationAgreePage,
  type VerifierStatusValue,
} from '../../pages/VerificationAgreePage';
import { AuditorDisagreeSupervisorPage } from '../../pages/AuditorDisagreeSupervisorPage';

function parseVerifierStatus(value: string): VerifierStatusValue {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'agree') return 'Agree';
  if (normalized === 'disagree') return 'Disagree';
  throw new Error(
    `Unsupported Verifier Status "${value}". Use Agree or Disagree.`
  );
}

When(
  'I verify Disagree Verifier Status fields with empty Auditor Response are present',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const transactionNumbers =
      await page.findDisagreeWithEmptyAuditorResponse();
    this.testData.disagreeEmptyAuditorCount = String(transactionNumbers.length);
    this.testData.disagreeEmptyAuditorTransactionNumbers =
      transactionNumbers.join(',');
    this.testData.disagreeEmptyAuditorReportPath =
      page.reportDisagreeEmptyAuditorResponse(
        this.testData.caseNumber || '',
        transactionNumbers
      );

    if (transactionNumbers.length < 1) {
      throw new Error(
        'Precondition failed: expected at least one Disagree Verifier Status ' +
          'row with empty Auditor Response so Request Supervisor Review should ' +
          'show the Auditor Response fields must be completed message.'
      );
    }

    console.log(
      `Confirmed ${transactionNumbers.length} Disagree + empty Auditor Response row(s):`
    );
    for (const id of transactionNumbers) {
      console.log(`  - ${id}`);
    }
  }
);

When(
  'I clear Auditor Response for all Disagree Verifier Status rows',
  async function (this: CustomWorld) {
    const page = new VerificationAgreePage(this.page!);
    const result = await page.clearAuditorResponseForDisagreeRows();
    this.testData.verifierUpdatedCount = String(result.changedCount);
    this.testData.disagreeEmptyAuditorCount = String(
      result.transactionNumbers.length
    );
    this.testData.disagreeEmptyAuditorTransactionNumbers =
      result.transactionNumbers.join(',');
    this.testData.disagreeEmptyAuditorReportPath =
      page.reportDisagreeEmptyAuditorResponse(
        this.testData.caseNumber || '',
        result.transactionNumbers
      );

    if (result.transactionNumbers.length < 1) {
      throw new Error(
        'Precondition failed: expected at least one Disagree Verifier Status ' +
          'row to clear Auditor Response.'
      );
    }
  }
);

When(
  'I set Auditor Response to {word} for all Disagree Verifier Status rows',
  async function (this: CustomWorld, status: string) {
    const target = parseVerifierStatus(status);
    const page = new VerificationAgreePage(this.page!);
    const result = await page.setAuditorResponseForDisagreeRows(target);
    this.testData.verifierUpdatedCount = String(result.changedCount);
    this.testData.disagreeAuditorResponseValue = target;
    this.testData.disagreeAuditorResponseTransactionNumbers =
      result.transactionNumbers.join(',');
    this.testData.disagreeAuditorResponseReportPath =
      page.reportDisagreeAuditorResponse(
        this.testData.caseNumber || '',
        result.transactionNumbers,
        target
      );

    if (result.transactionNumbers.length < 1) {
      throw new Error(
        'Precondition failed: expected at least one Disagree Verifier Status ' +
          `row to set Auditor Response to ${target}.`
      );
    }
  }
);

When('I return to the Case tab', async function (this: CustomWorld) {
  const page = new AuditorDisagreeSupervisorPage(this.page!);
  await page.returnToCaseTab();
});

When('I request Supervisor Review', async function (this: CustomWorld) {
  const page = new AuditorDisagreeSupervisorPage(this.page!);
  await page.requestSupervisorReview();
});

When('I send to verify', async function (this: CustomWorld) {
  const page = new AuditorDisagreeSupervisorPage(this.page!);
  await page.sendToVerify();
});

Then(
  'I should see the Auditor Response fields must be completed message',
  async function (this: CustomWorld) {
    const page = new AuditorDisagreeSupervisorPage(this.page!);
    await page.expectAuditorResponseMustBeCompletedMessage();
  }
);

Then(
  'I should see the Auditor Response agreement update error message',
  async function (this: CustomWorld) {
    const page = new AuditorDisagreeSupervisorPage(this.page!);
    await page.expectAuditorResponseAgreementError();
  }
);

Then(
  'I should see the rejected Audit Field must be updated error message',
  async function (this: CustomWorld) {
    const page = new AuditorDisagreeSupervisorPage(this.page!);
    await page.expectRejectedAuditFieldMustBeUpdatedError();
  }
);

Then(
  'I finish the Supervisor Review prompt',
  async function (this: CustomWorld) {
    const page = new AuditorDisagreeSupervisorPage(this.page!);
    await page.finishSupervisorReviewPrompt();
  }
);

Then(
  'I should report all Disagree Verifier Status transaction numbers with empty Auditor Response',
  async function (this: CustomWorld) {
    const raw = this.testData.disagreeEmptyAuditorTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      throw new Error(
        'No Disagree + empty Auditor Response transaction numbers were recorded.'
      );
    }

    const reportPath =
      this.testData.disagreeEmptyAuditorReportPath ||
      'reports/disagree-empty-auditor-response-transactions.json';

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Disagree + empty Auditor Response report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      count: number;
      transactionNumbers: string[];
    };

    if (report.count !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.count}, world has ${transactionNumbers.length}`
      );
    }

    console.log('');
    console.log(
      'Then: Disagree Verifier Status with empty Auditor Response transactions:'
    );
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);

Then(
  'I should report all Disagree Verifier Status transaction numbers with Auditor Response {word}',
  async function (this: CustomWorld, status: string) {
    const target = parseVerifierStatus(status);
    const raw = this.testData.disagreeAuditorResponseTransactionNumbers || '';
    const transactionNumbers = raw
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (transactionNumbers.length === 0) {
      throw new Error(
        `No Disagree + Auditor Response ${target} transaction numbers were recorded.`
      );
    }

    const slug = target.toLowerCase();
    const reportPath =
      this.testData.disagreeAuditorResponseReportPath ||
      `reports/disagree-auditor-response-${slug}-transactions.json`;

    if (!fs.existsSync(reportPath)) {
      throw new Error(
        `Disagree + Auditor Response ${target} report missing: ${reportPath}`
      );
    }

    const report = JSON.parse(fs.readFileSync(reportPath, 'utf8')) as {
      count: number;
      transactionNumbers: string[];
      auditorResponse?: string;
    };

    if (report.count !== transactionNumbers.length) {
      throw new Error(
        `Report count mismatch: file has ${report.count}, world has ${transactionNumbers.length}`
      );
    }

    if (
      report.auditorResponse &&
      report.auditorResponse.toLowerCase() !== target.toLowerCase()
    ) {
      throw new Error(
        `Report auditorResponse mismatch: file has ${report.auditorResponse}, expected ${target}`
      );
    }

    console.log('');
    console.log(
      `Then: Disagree Verifier Status with Auditor Response ${target} transactions:`
    );
    for (const id of report.transactionNumbers) {
      console.log(`  - ${id}`);
    }
    console.log(`Report file: ${reportPath}`);
  }
);
