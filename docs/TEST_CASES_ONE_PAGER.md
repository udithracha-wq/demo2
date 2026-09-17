# NYselections Test Cases \- One\-Pager

Quick reference of BDD automation completed to date.

## Stack

Playwright \+ Cucumber (BDD\-only): Feature → Steps → Page Objects  
App: NYselections Lightning (Salesforce) · Reports: Allure \+ JSON side reports

## Run

| Command | Purpose |
|:--------|:--------|
| `npm run bdd` | All scenarios |
| `npm run bdd:tags "@Tag"` | By tag |
| `npm run bdd:headed` | Visible browser |
| `npm run report` | Allure report |

## Inventory (10 features)

| Feature | Tag | Case | What it does |
|:--------|:----|:-----|:-------------|
| Smoke | `@Smoke` | — | Framework launch check (example.com) |
| Auditor1 | `@Auditor1` | 00120464 | Login, case, party, Primary Auditor, eligibility Yes |
| Duplicate Transaction | `@DuplicateTransaction` | 00120877 | Clear all flagged duplicates; assert none remain |
| Repeat Contributor Code | `@RepeatContributorCode` | 00120859 | Align codes for same contributor name |
| Clear Shared Contributor Code | `@ClearSharedContributorCode` | 00120859 | Clear codes shared across different names |
| Is District (No) | `@IsDistrict` | 00120857 | Empty In District Confirmed → No; save |
| Is District Yes | `@IsDistrictYes` | 00120877 | Empty In District Confirmed → Yes; save |
| Verification Agree | `@VerificationAgree` | 00120861 | Empty Verifier Status → Agree; save |
| Verification Disagree | `@VerificationDisagree` | 00120861 | Empty Verifier Status → Disagree; save |
| Empty Error Message | `@EmptyErrorMessage` | 00120861 | Accept/Reject blocked when Verifier Status empty |

Shared tags on NYselections flows: `@Regression` `@NYselections` `@End_to_End`

## Key files

| Kind | Path |
|:-----|:-----|
| Features | `features/*.feature` |
| Steps | `features/step-definitions/*.steps.ts` |
| Pages | `pages/*.ts` |
| Full write\-up | `docs/TEST_CASES_SUMMARY.md` |

## Watch\-outs

* Case numbers are data\-dependent; refresh Examples if env data changes
* Empty Error Message needs at least one empty Verifier Status on 00120861
* Agree / Disagree / Empty Error share Random Sampling Records on the same case
* Contributor\-code flows write JSON under `reports/`
