import { test } from '../fixtures';
import { requireAtLeastOne, verifyTransactionReport } from '../support/reports';

/** Port of features/empty-error-message.feature */
const cases = [
  { caseNumber: '00121013', approvalAction: 'Reject' as const, comments: 'test' },
  { caseNumber: '00121013', approvalAction: 'Accept' as const, comments: 'test' },
];

test.describe('Empty Error Message', () => {
  for (const data of cases) {
    test(`${data.approvalAction} is blocked when Verifier Status is empty`, async ({
      nySession,
      caseSearch,
      verification,
      emptyErrorMessage,
    }) => {
      void nySession;

      await test.step(`open case ${data.caseNumber}`, async () => {
        await caseSearch.searchAndOpenCase(data.caseNumber);
        await verification.openRandomSamplingRecords();
      });

      const empty = await test.step(
        'empty Verifier Status fields are present',
        async () => {
          const found =
            await verification.findEmptyVerifierStatusTransactionNumbers();
          requireAtLeastOne(
            found,
            'expected at least one empty Verifier Status field on Random ' +
              'Sampling Records so Accept/Reject from Approval History shows ' +
              'the incomplete review error.'
          );
          return found;
        }
      );
      const reportPath = verification.reportEmptyVerifierTransactions(
        data.caseNumber,
        empty
      );

      await test.step(
        `choose ${data.approvalAction} from Approval History`,
        async () => {
          await emptyErrorMessage.closeRandomSamplingRecords();
          await emptyErrorMessage.chooseApprovalActionWithComments(
            data.approvalAction,
            data.comments
          );
        }
      );

      await test.step('the incomplete review error is shown', async () => {
        await emptyErrorMessage.expectIncompleteReviewError();
        await emptyErrorMessage.cancelAndCloseApprovalDialog();
      });

      await test.step('report empty Verifier Status transactions', () => {
        verifyTransactionReport({
          label: 'Empty Verifier Status transaction numbers',
          reportPath,
          recorded: empty,
          countKeys: ['emptyCount'],
        });
      });
    });
  }
});
