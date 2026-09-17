import { test } from '../fixtures';

/** Mirrors the Examples table in features/supervisor-step-1.feature */
const cases = [
  {
    accountName: 'Committee to Elect Patrick Sheehan',
    caseRecordType: 'Eligibility Review',
    status: 'New',
    primaryAuditor: 'Udith Racha',
  },
];

test.describe('Supervisor Step 1', () => {
  for (const data of cases) {
    test(`assigns Primary Auditor on a new ${data.caseRecordType} case`, async ({
      nySession,
      supervisorStep1,
      auditor1,
    }) => {
      void nySession;

      await test.step(`open account "${data.accountName}"`, async () => {
        await supervisorStep1.searchAndOpenAccount(data.accountName);
      });

      const caseNumber = await test.step(
        `open the ${data.caseRecordType} case from the Cases panel`,
        async () => supervisorStep1.openCaseFromCasesCard(data.caseRecordType)
      );
      test.info().annotations.push({ type: 'case', description: caseNumber });

      await test.step('open the Details tab', async () => {
        await auditor1.openDetailsTab();
      });

      await test.step(
        `case reads record type "${data.caseRecordType}" and status "${data.status}"`,
        async () => {
          await supervisorStep1.expectCaseRecordTypeAndStatus(
            data.caseRecordType,
            data.status
          );
        }
      );

      await test.step('Primary Auditor is not already assigned', async () => {
        await supervisorStep1.expectPrimaryAuditorNotAlreadySet(
          data.primaryAuditor
        );
      });

      await test.step(`set Primary Auditor to "${data.primaryAuditor}"`, async () => {
        await auditor1.setPrimaryAuditor(data.primaryAuditor);
      });

      await test.step('Primary Auditor field reads back the new value', async () => {
        await supervisorStep1.expectPrimaryAuditorValue(data.primaryAuditor);
      });
    });
  }
});
