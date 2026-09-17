import { test } from './fixtures';
import { requireAtLeastOne, verifyTransactionReport } from './support/reports';

/** Port of features/auditor-disagree-supervisor.feature (both scenarios) */
const cases = [{ caseNumber: '00121023' }];

test.describe('Auditor Disagree Supervisor', () => {
  for (const data of cases) {
    test('Request Supervisor Review is blocked when Auditor Response is empty for Disagree', async ({
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

      await test.step('Disagree Verifier Status fields are present', async () => {
        const found =
          await verification.findVerifierStatusTransactionNumbers('Disagree');
        requireAtLeastOne(
          found,
          'expected at least one Disagree Verifier Status field on Random ' +
            'Sampling Records.'
        );
      });

      const cleared = await test.step(
        'clear Auditor Response for all Disagree rows',
        async () => {
          const result =
            await verification.clearAuditorResponseForDisagreeRows();
          requireAtLeastOne(
            result.transactionNumbers,
            'expected at least one Disagree Verifier Status row to clear ' +
              'Auditor Response.'
          );
          return result;
        }
      );
      const reportPath = verification.reportDisagreeEmptyAuditorResponse(
        data.caseNumber,
        cleared.transactionNumbers
      );

      await test.step('save and request Supervisor Review', async () => {
        await verification.save({ requireEdits: cleared.changedCount > 0 });
        await auditorSupervisor.returnToCaseTab();
        await auditorSupervisor.requestSupervisorReview();
      });

      await test.step(
        'the Auditor Response fields must be completed message is shown',
        async () => {
          await auditorSupervisor.expectAuditorResponseMustBeCompletedMessage();
          await auditorSupervisor.finishSupervisorReviewPrompt();
        }
      );

      await test.step(
        'report Disagree transactions with empty Auditor Response',
        () => {
          verifyTransactionReport({
            label:
              'Disagree Verifier Status transactions with empty Auditor Response',
            reportPath,
            recorded: cleared.transactionNumbers,
            countKeys: ['count'],
          });
        }
      );
    });

    test('Send to Verify is blocked when Auditor Response is Disagree for Disagree Verifier Status', async ({
      nySession,
      caseSearch,
      verification,
      auditorSupervisor,
    }) => {
      void nySession;
      const RESPONSE = 'Disagree' as const;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await verification.openRandomSamplingRecords();
      });

      await test.step('Disagree Verifier Status fields are present', async () => {
        const found =
          await verification.findVerifierStatusTransactionNumbers('Disagree');
        requireAtLeastOne(
          found,
          'expected at least one Disagree Verifier Status field on Random ' +
            'Sampling Records.'
        );
      });

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
      const reportPath = verification.reportDisagreeAuditorResponse(
        data.caseNumber,
        response.transactionNumbers,
        RESPONSE
      );

      await test.step('save and send to verify', async () => {
        await verification.save({ requireEdits: response.changedCount > 0 });
        await auditorSupervisor.returnToCaseTab();
        await auditorSupervisor.sendToVerify();
      });

      await test.step(
        'the Auditor Response agreement update error is shown',
        async () => {
          await auditorSupervisor.expectAuditorResponseAgreementError();
        }
      );

      await test.step(
        `report Disagree transactions with Auditor Response ${RESPONSE}`,
        () => {
          verifyTransactionReport({
            label: `Disagree Verifier Status transactions with Auditor Response ${RESPONSE}`,
            reportPath,
            recorded: response.transactionNumbers,
            countKeys: ['count'],
            expectField: {
              key: 'auditorResponse',
              value: RESPONSE,
              optional: true,
            },
          });
        }
      );
    });
  }
});
