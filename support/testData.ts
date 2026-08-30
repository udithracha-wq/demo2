/**
 * Shared test data defaults.
 * Prefer Scenario Outline Examples or env vars for secrets.
 * Org URL comes from BASE_URL in .env (see SalesforceLoginPage).
 */
export const testData = {
  defaultTimeoutMs: 30_000,
  nyselections: {
    defaultCaseNumber: '00001144',
  },
};
