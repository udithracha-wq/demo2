import { expect, test } from './fixtures';

/**
 * Port of features/smoke.feature.
 * The feature opens baseURL "/", but BASE_URL points at the Salesforce org,
 * so this harness check uses the example.com URL the assertions expect.
 */
const SMOKE_URL = 'https://example.com';

test.describe('Framework smoke check', () => {
  test('opens the example.com home page', async ({ page, home }) => {
    await home.open(SMOKE_URL);
    await home.expectTitleContains('Example Domain');
    await home.expectHeadingVisible('Example Domain');
    expect(page.url()).toContain('example.com');
  });
});
