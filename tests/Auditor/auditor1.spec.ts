import { expect, test } from '../fixtures';
import {
  CommitteeCasesPage,
  type CommitteeCase,
} from '../../pages/CommitteeCasesPage';

/** Port of features/auditor1.feature */
const cases = [
  {
    committee: 'David for Queens 2026',
    caseRecordType: 'Eligibility Review Case',
    status: 'New',
    party: 'Republican',
    primaryAuditor: 'Udith Racha',
    // The org's exact labels, not "Prepayment Review" / "Matching Claims Review".
    followOnCaseRecordType: 'Pre-Payment Review',
    followOnStatus: 'Matching Claim Review',
  },
];

test.describe('NYselections Auditor1', () => {
  for (const data of cases) {
    test(`Eligibility Review on ${data.committee} creates a ${data.followOnCaseRecordType} case`, async ({
      nySession,
      auditor1,
      committeeCases,
      supervisorStep1,
    }) => {
      void nySession;

      let caseNumber = '';
      let electionYear = '';
      let listedBefore: CommitteeCase[] = [];
      let casesBefore: string[] = [];

      await test.step(`open Cases for committee "${data.committee}"`, async () => {
        await committeeCases.openCommittee(data.committee);
        // Snapshot so the post-review check proves a case was created.
        listedBefore = await committeeCases.casesOnCommitteePage();
        casesBefore = listedBefore.map((c) => c.caseNumber);
        await committeeCases.openCasesListFromCard();
      });

      await test.step(`open the ${data.status} ${data.caseRecordType}`, async () => {
        caseNumber = await committeeCases.openCaseByRecordTypeAndStatus(
          data.caseRecordType,
          data.status
        );
        await auditor1.openDetailsTab();

        // The case record carries Election Type but not Election Year — the
        // year only shows on the committee's related list cards.
        electionYear =
          listedBefore.find((c) => c.caseNumber === caseNumber)
            ?.electionYear ||
          (await auditor1.readElectionYear());
      });

      // Check 1
      await test.step(`case is a ${data.status} ${data.caseRecordType} assigned to "${data.primaryAuditor}"`, async () => {
        await auditor1.expectCaseRecordTypeAndStatus(
          data.caseRecordType,
          data.status
        );
        await supervisorStep1.expectPrimaryAuditorValue(data.primaryAuditor);
      });

      await test.step(`select party "${data.party}" in the Committee Eligibility flow`, async () => {
        await auditor1.openEligibilityDashboardTab();
        await auditor1.selectParty(data.party);
      });

      // Check 2 — soft-fail so later steps still run; rethrow at the end.
      let electionTypeSoftFail: string | null = null;
      await test.step('Election Type is not editable', async () => {
        try {
          await auditor1.expectElectionTypeNotEditable();
        } catch (err) {
          electionTypeSoftFail =
            err instanceof Error ? err.message : String(err);
          console.warn(`SOFT FAIL — Election Type check:\n${electionTypeSoftFail}`);
        }
      });

      await test.step('complete the eligibility questionnaire answering Yes', async () => {
        await auditor1.completeEligibilityQuestionnaireAllYes();
        await auditor1.expectCommitteeEligibilityButtonAvailable();
        await auditor1.expectEligibilityFlowClosed();
      });

      await test.step(`a new ${data.followOnCaseRecordType} case exists for election year ${electionYear}`, async () => {
        await committeeCases.openCommittee(data.committee);
        const listed = await committeeCases.casesOnCommitteePage();
        await committeeCases.openCasesListFromCard();

        const created = listed.filter(
          (c) => !casesBefore.includes(c.caseNumber)
        );
        expect(
          created,
          `No new case appeared on the committee after reviewing case ` +
            `${caseNumber}.\nBefore: ${casesBefore.join(', ') || 'none'}` +
            `\nNow: ${listed.map((c) => c.caseNumber).join(', ') || 'none'}`
        ).not.toHaveLength(0);

        const typePattern = CommitteeCasesPage.recordTypePattern(
          data.followOnCaseRecordType
        );
        const byCard = created.filter(
          (c) =>
            typePattern.test(c.recordType) && c.electionYear === electionYear
        );
        const candidates: CommitteeCase[] =
          byCard.length > 0 ? byCard : created;
        const rejected: string[] = [];

        for (const candidate of candidates) {
          await committeeCases.openCaseRecord(candidate);
          await auditor1.openDetailsTab();

          // The Pre-Payment Review layout shows neither Case Record Type nor
          // Election Year, so fall back to the related list card values.
          const actualType = await auditor1
            .caseFieldValue(/Case Record Type/i, 15_000)
            .catch(() => candidate.recordType);
          const year =
            candidate.electionYear ||
            (await auditor1.readElectionYear().catch(() => ''));

          if (typePattern.test(actualType) && year === electionYear) {
            await auditor1.expectCaseStatus(data.followOnStatus);
            await auditor1.expectCaseAssignedTo(data.primaryAuditor);
            return;
          }

          rejected.push(
            `${candidate.caseNumber} (${actualType || 'unknown record type'}, ` +
              `election year ${year || 'unknown'})`
          );
        }

        throw new Error(
          `New cases appeared, but none is a ${data.followOnCaseRecordType} ` +
            `case for election year ${electionYear}: ${rejected.join(', ')}`
        );
      });

      if (electionTypeSoftFail) {
        throw new Error(
          `1 soft-failed check(s) after the rest of the scenario ran:\n\n` +
            electionTypeSoftFail
        );
      }
    });
  }
});
