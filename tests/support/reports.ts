import * as fs from 'fs';

/**
 * Glue that the Cucumber "I should report all ..." steps carry inline.
 * Page Objects write the JSON; these helpers re-read it and confirm it
 * agrees with what the run collected.
 */
export type TransactionReport = {
  transactionNumbers: string[];
  [key: string]: unknown;
};

/** Count key names differ per report file; the first numeric key wins. */
function reportedCount(report: TransactionReport, countKeys: string[]): number {
  for (const key of countKeys) {
    const value = report[key];
    if (typeof value === 'number') return value;
  }
  return 0;
}

export function verifyTransactionReport(options: {
  label: string;
  reportPath: string;
  recorded: string[];
  countKeys: string[];
  expectField?: { key: string; value: string; optional?: boolean };
}): TransactionReport {
  const { label, reportPath, recorded, countKeys, expectField } = options;

  if (!fs.existsSync(reportPath)) {
    throw new Error(`${label} report missing: ${reportPath}`);
  }

  const report = JSON.parse(
    fs.readFileSync(reportPath, 'utf8')
  ) as TransactionReport;

  const count = reportedCount(report, countKeys);
  if (count !== recorded.length) {
    throw new Error(
      `${label} count mismatch: file has ${count}, run collected ${recorded.length}`
    );
  }

  if (expectField) {
    const actual = report[expectField.key];
    const absent = actual === undefined || actual === null || actual === '';
    const skip = absent && expectField.optional;
    if (
      !skip &&
      String(actual).toLowerCase() !== expectField.value.toLowerCase()
    ) {
      throw new Error(
        `${label} ${expectField.key} mismatch: file has ${String(actual)}, ` +
          `expected ${expectField.value}`
      );
    }
  }

  console.log('');
  console.log(`${label}:`);
  for (const id of report.transactionNumbers) {
    console.log(`  - ${id}`);
  }
  console.log(`Report file: ${reportPath}`);

  return report;
}

/** Mirrors the precondition guards the When steps raise. */
export function requireAtLeastOne(ids: string[], message: string): void {
  if (ids.length === 0) {
    throw new Error(`Precondition failed: ${message}`);
  }
}
