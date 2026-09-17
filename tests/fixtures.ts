import { test as base, expect } from '@playwright/test';
import { AgreeAllErrorPage } from '../pages/AgreeAllErrorPage';
import { Auditor1Page } from '../pages/Auditor1Page';
import { AuditorDisagreeSupervisorPage } from '../pages/AuditorDisagreeSupervisorPage';
import { CommitteeCasesPage } from '../pages/CommitteeCasesPage';
import { DuplicateTransactionPage } from '../pages/DuplicateTransactionPage';
import { EmptyErrorMessagePage } from '../pages/EmptyErrorMessagePage';
import { HomePage } from '../pages/HomePage';
import { IsDistrictPage } from '../pages/IsDistrictPage';
import { RepeatContributorCodePage } from '../pages/RepeatContributorCodePage';
import { SalesforceLoginPage } from '../pages/SalesforceLoginPage';
import { SupervisorAgreeWithAuditorPage } from '../pages/SupervisorAgreeWithAuditorPage';
import { SupervisorStep1Page } from '../pages/SupervisorStep1Page';
import { VerificationAgreePage } from '../pages/VerificationAgreePage';

/**
 * Playwright Test harness over the same Page Objects the BDD suite drives.
 * The `.feature` files remain the source of truth for coverage; specs here
 * must reuse `pages/*` rather than hold their own locators.
 */
type Fixtures = {
  login: SalesforceLoginPage;
  /** Equivalent of "Given I am logged into NYselections Lightning". */
  nySession: SalesforceLoginPage;
  home: HomePage;
  agreeAllError: AgreeAllErrorPage;
  auditor1: Auditor1Page;
  auditorSupervisor: AuditorDisagreeSupervisorPage;
  /** Committee (Account) → Cases related list. */
  committeeCases: CommitteeCasesPage;
  duplicateTransaction: DuplicateTransactionPage;
  /** Global case search — lives on DuplicateTransactionPage, as in the steps. */
  caseSearch: DuplicateTransactionPage;
  emptyErrorMessage: EmptyErrorMessagePage;
  isDistrict: IsDistrictPage;
  repeatContributor: RepeatContributorCodePage;
  /** Supervisor Review Data report — answers the auditor's Disagree rows. */
  supervisorAgree: SupervisorAgreeWithAuditorPage;
  supervisorStep1: SupervisorStep1Page;
  verification: VerificationAgreePage;
};

export const test = base.extend<Fixtures>({
  login: async ({ page }, use) => {
    await use(new SalesforceLoginPage(page));
  },

  nySession: async ({ login }, use) => {
    await login.ensureLoggedIn();
    await login.persistSession();
    await use(login);
  },

  home: async ({ page }, use) => {
    await use(new HomePage(page));
  },

  agreeAllError: async ({ page }, use) => {
    await use(new AgreeAllErrorPage(page));
  },

  auditor1: async ({ page }, use) => {
    await use(new Auditor1Page(page));
  },

  auditorSupervisor: async ({ page }, use) => {
    await use(new AuditorDisagreeSupervisorPage(page));
  },

  committeeCases: async ({ page }, use) => {
    await use(new CommitteeCasesPage(page));
  },

  duplicateTransaction: async ({ page }, use) => {
    await use(new DuplicateTransactionPage(page));
  },

  caseSearch: async ({ duplicateTransaction }, use) => {
    await use(duplicateTransaction);
  },

  emptyErrorMessage: async ({ page }, use) => {
    await use(new EmptyErrorMessagePage(page));
  },

  isDistrict: async ({ page }, use) => {
    await use(new IsDistrictPage(page));
  },

  repeatContributor: async ({ page }, use) => {
    await use(new RepeatContributorCodePage(page));
  },

  supervisorAgree: async ({ page }, use) => {
    await use(new SupervisorAgreeWithAuditorPage(page));
  },

  supervisorStep1: async ({ page }, use) => {
    await use(new SupervisorStep1Page(page));
  },

  verification: async ({ page }, use) => {
    await use(new VerificationAgreePage(page));
  },
});

export { expect };
