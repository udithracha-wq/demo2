import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { CustomWorld } from './world';
import { SalesforceLoginPage } from '../../pages/SalesforceLoginPage';
import { Auditor1Page } from '../../pages/Auditor1Page';
import {
  CommitteeCasesPage,
  type CommitteeCase,
} from '../../pages/CommitteeCasesPage';

/** Election Year for a case, as listed on the committee's related list cards. */
function listedElectionYear(world: CustomWorld, caseNumber: string): string {
  const listed: CommitteeCase[] = JSON.parse(
    world.testData.committeeCases || '[]'
  );
  return listed.find((c) => c.caseNumber === caseNumber)?.electionYear ?? '';
}

Given('I am logged into NYselections Lightning', async function (
  this: CustomWorld
) {
  const loginPage = new SalesforceLoginPage(this.page!);
  await loginPage.ensureLoggedIn();
  await loginPage.persistSession();
});

When('I open case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  this.testData.caseNumber = caseNumber;
  await auditor1Page.openCase(caseNumber);
});

When('I open the Details tab', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.openDetailsTab();
});

When('I set Primary Auditor to {string}', async function (
  this: CustomWorld,
  auditorName: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.setPrimaryAuditor(auditorName);
});

When('I open the Eligibility Dashboard tab', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.openEligibilityDashboardTab();
});

When('I select {string} for party selection', async function (
  this: CustomWorld,
  party: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.selectParty(party);
});

When('I select {string} for party selection if present', async function (
  this: CustomWorld,
  party: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.selectPartyIfPresent(party);
});

When('I click Next', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.clickNext();
});

When('I click Next if present', async function (this: CustomWorld) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.clickNextIfPresent();
});

When('I complete the eligibility questionnaire answering Yes', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.completeEligibilityQuestionnaireAllYes();
});

Then('I should see case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectCaseVisible(caseNumber);
});

When(
  'I open the Cases list for committee {string}',
  async function (this: CustomWorld, committee: string) {
    const casesPage = new CommitteeCasesPage(this.page!);
    this.testData.committee = committee;

    await casesPage.openCommittee(committee);

    // The Cases card is filtered by record type, so the follow-on case is
    // looked up across every related list card on the committee page.
    const listed = await casesPage.casesOnCommitteePage();
    this.testData.committeeCases = JSON.stringify(listed);

    // First visit is pre-review: snapshot the cases already on the committee
    // so the post-review check can prove one was actually created.
    if (!('casesBefore' in this.testData)) {
      this.testData.casesBefore = listed.map((c) => c.caseNumber).join(',');
      console.log(
        `Cases on the committee before review: ${
          this.testData.casesBefore || 'none'
        }`
      );
    }

    await casesPage.openCasesListFromCard();
  }
);

When(
  'I open the case with record type {string} and status {string}',
  async function (this: CustomWorld, recordType: string, status: string) {
    const casesPage = new CommitteeCasesPage(this.page!);
    const auditor1Page = new Auditor1Page(this.page!);

    const caseNumber = await casesPage.openCaseByRecordTypeAndStatus(
      recordType,
      status
    );
    this.testData.caseNumber = caseNumber;
    this.testData.caseRecordType = recordType;

    await auditor1Page.openDetailsTab();

    // The case record carries Election Type but not Election Year — the year
    // only shows on the committee's related list cards.
    this.testData.electionYear =
      listedElectionYear(this, caseNumber) ||
      (await auditor1Page.readElectionYear());

    console.log(
      `Opened ${recordType} case ${caseNumber} (status ${status}, ` +
        `election year ${this.testData.electionYear}).`
    );
  }
);

When('I open the Committee Eligibility flow', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.openEligibilityDashboardTab();
});

Then('Election Type should not be editable', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectElectionTypeNotEditable();
});

Then(
  'the Committee Eligibility button should be available on the case',
  async function (this: CustomWorld) {
    const auditor1Page = new Auditor1Page(this.page!);
    await auditor1Page.expectCommitteeEligibilityButtonAvailable();
  }
);

Then('the eligibility flow should be closed', async function (
  this: CustomWorld
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectEligibilityFlowClosed();
});

Then(
  'a new {string} case should exist for the same election year',
  async function (this: CustomWorld, recordType: string) {
    const casesPage = new CommitteeCasesPage(this.page!);
    const auditor1Page = new Auditor1Page(this.page!);

    const listed: CommitteeCase[] = JSON.parse(
      this.testData.committeeCases || '[]'
    );
    const before = (this.testData.casesBefore || '').split(',').filter(Boolean);
    const electionYear = this.testData.electionYear;
    const created = listed.filter((c) => !before.includes(c.caseNumber));

    expect(
      created,
      `No new case appeared on committee "${this.testData.committee}" after ` +
        `reviewing case ${this.testData.caseNumber}.\n` +
        `Cases before: ${before.join(', ') || 'none'}\n` +
        `Cases now: ${listed.map((c) => c.caseNumber).join(', ') || 'none'}`
    ).not.toHaveLength(0);

    // Prefer the related list card fields; fall back to opening each new case
    // for cards that do not show Case Record Type / Election Year.
    const typePattern = CommitteeCasesPage.recordTypePattern(recordType);
    const byCard = created.filter(
      (c) => typePattern.test(c.recordType) && c.electionYear === electionYear
    );
    const candidates = byCard.length > 0 ? byCard : created;
    const rejected: string[] = [];

    for (const candidate of candidates) {
      await casesPage.openCaseRecord(candidate);
      await auditor1Page.openDetailsTab();

      const actualType = await auditor1Page
        .caseFieldValue(/Case Record Type/i, 15_000)
        .catch(() => candidate.recordType);
      const year =
        candidate.electionYear ||
        (await auditor1Page.readElectionYear().catch(() => ''));

      if (typePattern.test(actualType) && year === electionYear) {
        this.testData.newCaseNumber = candidate.caseNumber;
        this.testData.newCaseRecordType = actualType;
        console.log(
          `New ${actualType} case ${candidate.caseNumber} created for ` +
            `election year ${year}.`
        );
        return;
      }

      rejected.push(
        `${candidate.caseNumber} (${actualType || 'unknown record type'}, ` +
          `election year ${year || 'unknown'})`
      );
    }

    throw new Error(
      `New cases appeared on committee "${this.testData.committee}", but none ` +
        `is a ${recordType} case for election year ${electionYear}: ` +
        rejected.join(', ')
    );
  }
);

Then(
  'the case should show record type {string} and status {string}',
  async function (this: CustomWorld, recordType: string, status: string) {
    const auditor1Page = new Auditor1Page(this.page!);
    await auditor1Page.expectCaseRecordTypeAndStatus(recordType, status);
  }
);

Then('the case status should be {string}', async function (
  this: CustomWorld,
  status: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectCaseStatus(status);
});

Then('the case should be assigned to {string}', async function (
  this: CustomWorld,
  name: string
) {
  const auditor1Page = new Auditor1Page(this.page!);
  await auditor1Page.expectCaseAssignedTo(name);
});
