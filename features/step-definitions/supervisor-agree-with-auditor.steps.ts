import { When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import {
  SupervisorAgreeWithAuditorPage,
  type SupervisorStatusValue,
} from '../../pages/SupervisorAgreeWithAuditorPage';

function parseSupervisorStatus(value: string): SupervisorStatusValue {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'agree with auditor') return 'Agree with Auditor';
  if (normalized === 'disagree with auditor') return 'Disagree with Auditor';
  throw new Error(
    `Unsupported Supervisor Status "${value}". ` +
      'Use "Agree with Auditor" or "Disagree with Auditor".'
  );
}

When('I open Supervisor Review Data', async function (this: CustomWorld) {
  const page = new SupervisorAgreeWithAuditorPage(this.page!);
  await page.openSupervisorReviewData();
});

When(
  'I verify Disagree Auditor Response fields are present',
  async function (this: CustomWorld) {
    const page = new SupervisorAgreeWithAuditorPage(this.page!);
    const transactionNumbers =
      await page.findDisagreeAuditorResponseTransactions();

    if (transactionNumbers.length === 0) {
      throw new Error(
        'Precondition failed: Supervisor Review Data has no rows with ' +
          'Auditor Response = Disagree, so there is nothing for the ' +
          'supervisor to agree with.'
      );
    }

    this.testData.disagreeAuditorResponseCount = String(
      transactionNumbers.length
    );
    this.testData.disagreeAuditorResponseTransactions =
      transactionNumbers.join(',');
  }
);

When(
  'I set Supervisor Status to {string} for all Disagree Auditor Response rows',
  async function (this: CustomWorld, status: string) {
    const markedValue = parseSupervisorStatus(status);
    const page = new SupervisorAgreeWithAuditorPage(this.page!);
    const { transactionNumbers, changedCount } =
      await page.setSupervisorStatusForDisagreeRows(markedValue);

    this.testData.supervisorStatusChangedCount = String(changedCount);
    this.testData.supervisorStatusTransactions = transactionNumbers.join(',');
    this.testData.supervisorStatusMarkedValue = markedValue;
  }
);

When('I save Supervisor Review Data', async function (this: CustomWorld) {
  const page = new SupervisorAgreeWithAuditorPage(this.page!);
  const changed = Number(this.testData.supervisorStatusChangedCount || '0');
  // The toast auto-dismisses, so carry its text to the Then step.
  this.testData.supervisorSaveMessage = await page.save({
    requireEdits: changed > 0,
  });
});

Then(
  'I should see the Record Updated success message',
  function (this: CustomWorld) {
    const page = new SupervisorAgreeWithAuditorPage(this.page!);
    page.expectRecordUpdatedToast(this.testData.supervisorSaveMessage || '');
  }
);
