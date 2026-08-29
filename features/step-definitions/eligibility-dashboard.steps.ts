import { Given, When, Then } from '@cucumber/cucumber';
import { CustomWorld } from './world';
import { SalesforceLoginPage } from '../../pages/SalesforceLoginPage';
import { EligibilityDashboardPage } from '../../pages/EligibilityDashboardPage';

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
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  this.testData.caseNumber = caseNumber;
  await eligibilityPage.openCase(caseNumber);
});

When('I open the Details tab', async function (this: CustomWorld) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.openDetailsTab();
});

When('I set Primary Auditor to {string}', async function (
  this: CustomWorld,
  auditorName: string
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.setPrimaryAuditor(auditorName);
});

When('I open the Eligibility Dashboard tab', async function (
  this: CustomWorld
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.openEligibilityDashboardTab();
});

When('I select {string} for party selection', async function (
  this: CustomWorld,
  party: string
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.selectParty(party);
});

When('I select {string} for party selection if present', async function (
  this: CustomWorld,
  party: string
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.selectPartyIfPresent(party);
});

When('I click Next', async function (this: CustomWorld) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.clickNext();
});

When('I click Next if present', async function (this: CustomWorld) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.clickNextIfPresent();
});

When('I complete the eligibility questionnaire answering Yes', async function (
  this: CustomWorld
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.completeEligibilityQuestionnaireAllYes();
});

Then('I should see case {string}', async function (
  this: CustomWorld,
  caseNumber: string
) {
  const eligibilityPage = new EligibilityDashboardPage(this.page!);
  await eligibilityPage.expectCaseVisible(caseNumber);
});
