import { expect, test } from '@playwright/test';
import type {
  ContributorCodeChange,
  RepeatContributorCodePage,
} from '../../pages/RepeatContributorCodePage';

/**
 * Shared by the align and clear-shared contributor specs: print the change
 * report, attach it, and sanity-check each recorded change.
 *
 * Align sets newCode; clear-shared leaves newCode empty and must have oldCode.
 */
export async function expectContributorChangesReport(
  repeatContributor: RepeatContributorCodePage,
  changes: ContributorCodeChange[]
): Promise<void> {
  const report = repeatContributor.formatChangesReport(changes);

  console.log('\nReport — Contributor Full Name / Old Code / New Code:');
  console.log(report);

  await test
    .info()
    .attach('repeat-contributor-code-changes', {
      body: report,
      contentType: 'text/plain',
    });

  for (const change of changes) {
    expect(change.contributorFullName.trim().length).toBeGreaterThan(0);
    if (change.newCode.trim()) {
      expect(change.newCode.trim().length).toBeGreaterThan(0);
    } else {
      expect(change.oldCode.trim().length).toBeGreaterThan(0);
    }
  }
}
