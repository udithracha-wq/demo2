import { test } from './fixtures';
import { requireAtLeastOne, verifyTransactionReport } from './support/reports';

/** Port of features/auditor-response-agree.feature */
const cases = [{ caseNumber: '00121027' }];
const RESPONSE = 'Agree' as const;

test.describe('Auditor Response Agree', () => {
  for (const data of cases) {
    test(`Send to Reverify is blocked when Auditor Response is ${RESPONSE} but rejected Audit Fields are empty`, async ({
      nySession,
      caseSearch,
      verification,
      auditorSupervisor,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await verification.openRandomSamplingRecords();
      });

      const disagree = await test.step(
        'Disagree Verifier Status fields are present',
        async () => {
          const found =
            await verification.findVerifierStatusTransactionNumbers('Disagree');
          requireAtLeastOne(
            found,
            'expected at least one Disagree Verifier Status field on Random ' +
              'Sampling Records.'
          );
          return found;
        }
      );
      const disagreeReportPath =
        verification.reportDisagreeVerifierTransactions(
          data.caseNumber,
          disagree
        );

      const response = await test.step(
        `set Auditor Response to ${RESPONSE} for all Disagree rows`,
        async () => {
          const result =
            await verification.setAuditorResponseForDisagreeRows(RESPONSE);
          requireAtLeastOne(
            result.transactionNumbers,
            'expected at least one Disagree Verifier Status row to set ' +
              `Auditor Response to ${RESPONSE}.`
          );
          return result;
        }
      );
      const responseReportPath = verification.reportDisagreeAuditorResponse(
        data.caseNumber,
        response.transactionNumbers,
        RESPONSE
      );

      await test.step('save Random Sampling Records', async () => {
        await verification.save({ requireEdits: response.changedCount > 0 });
      });

      await test.step('return to the Case tab and send to verify', async () => {
        await auditorSupervisor.returnToCaseTab();
        await auditorSupervisor.sendToVerify();
      });

      await test.step(
        'the rejected Audit Field must be updated error is shown',
        async () => {
          await auditorSupervisor.expectRejectedAuditFieldMustBeUpdatedError();
        }
      );

      await test.step('report the Disagree transactions', () => {
        verifyTransactionReport({
          label: 'Disagree Verifier Status transaction numbers',
          reportPath: disagreeReportPath,
          recorded: disagree,
          countKeys: ['disagreeCount'],
        });

        verifyTransactionReport({
          label: `Disagree Verifier Status transactions with Auditor Response ${RESPONSE}`,
          reportPath: responseReportPath,
          recorded: response.transactionNumbers,
          countKeys: ['count'],
          expectField: {
            key: 'auditorResponse',
            value: RESPONSE,
            optional: true,
          },
        });
      });
    });
  }
});
