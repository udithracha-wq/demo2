# NYselections BDD Automation \- Test Cases Summary

Document of all automation work completed so far for the Playwright \+ Cucumber BDD framework.

## Framework Overview

| Item | Detail |
|:-----|:-------|
| Stack | Playwright \+ Cucumber (BDD\-only) |
| Pattern | Feature → Step Definitions → Page Objects |
| App under test | NYselections Lightning (Salesforce) |
| Reporting | Allure \+ console / JSON side reports for some flows |
| Auth | Salesforce login via env credentials \+ optional saved session (`npm run auth:save`) |

### Architecture

```
features/*.feature          → WHAT (business scenarios)
features/step-definitions/  → GLUE (Cucumber steps)
pages/*.ts                  → HOW (locators & UI actions)
```

### How to Run

| Command | Purpose |
|:--------|:--------|
| `npm run bdd` | Run all scenarios |
| `npm run bdd:tags "@TagName"` | Run by tag (e.g. `@DuplicateTransaction`) |
| `npm run bdd:headed` | Run headed (visible browser) |
| `npm run report` | Generate \& open Allure report |

---

## Test Inventory

Total: **10 features**, **11 scenario examples** (Empty Error Message has 2 Examples rows).

| \# | Feature | Tag(s) | Case \# | Status |
|:---|:--------|:-------|:--------|:-------|
| 1 | Framework smoke check | `@Sanity` `@Smoke` | N/A (example.com) | Done |
| 2 | NYselections Auditor1 | `@Auditor1` `@End_to_End` | 00120464 | Done |
| 3 | Duplicate Transaction | `@DuplicateTransaction` | 00120877 | Done |
| 4 | Repeat Contributor Code | `@RepeatContributorCode` | 00120859 | Done |
| 5 | Clear Shared Contributor Code | `@ClearSharedContributorCode` | 00120859 | Done |
| 6 | Is District (No) | `@IsDistrict` | 00120857 | Done |
| 7 | Is District Yes | `@IsDistrictYes` | 00120877 | Done |
| 8 | Verification Agree | `@VerificationAgree` | 00120861 | Done |
| 9 | Verification Disagree | `@VerificationDisagree` | 00120861 | Done |
| 10 | Empty Error Message | `@EmptyErrorMessage` | 00120861 | Done |

All NYselections features also carry `@Regression` `@NYselections` `@End_to_End`.

---

## Feature Details

### 1. Framework smoke check

**File:** `features/smoke.feature`

Verifies the BDD framework can launch a browser and open a page (example.com). Not an app business test.

### Scenario

* Open application home page
* Assert title, heading, and URL

---

### 2. NYselections Auditor1

**File:** `features/auditor1.feature`  
**Page Object:** `pages/Auditor1Page.ts`  
**Steps:** `features/step-definitions/auditor1.steps.ts`

Log into Lightning, open a case, select party, set Primary Auditor, and complete the Eligibility Dashboard questionnaire (all Yes).

### Scenario Outline data

| CaseNumber | Party | PrimaryAuditor |
|:-----------|:------|:---------------|
| 00120464 | Republican | Udith Racha |

### Flow

* Login to NYselections Lightning
* Open case
* Select party (if present) → Next (if present)
* Details tab → set Primary Auditor
* Eligibility Dashboard → party again if needed
* Complete eligibility questionnaire answering Yes
* Assert case is visible

---

### 3. Duplicate Transaction

**File:** `features/duplicate-transaction.feature`  
**Page Object:** `pages/DuplicateTransactionPage.ts`  
**Steps:** `features/step-definitions/duplicate-transaction.steps.ts`

Search a case, open the duplicate transaction report, clear flags on all flagged rows across pages, Finish so removals persist, refresh, and assert no Flagged rows remain.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120877 |

### Flow

* Login → search \& open case
* Open duplicate transaction report
* Clear duplicate flags on all flagged transactions (all pages)
* Next → close dialog
* Assert case visible, report affected transaction numbers
* Assert no flagged transactions remain

---

### 4. Repeat Contributor Code

**File:** `features/repeat-contributor-code.feature`  
**Page Object:** `pages/RepeatContributorCodePage.ts`  
**Steps:** `features/step-definitions/repeat-contributor-code.steps.ts`

Rows that share the same Contributor Full Name must share the same Repeat Contributor Code. Mixed codes are aligned via the edit icon and save.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120859 |

### Side report

* Console output
* `reports/repeat-contributor-code-changes.json` (Contributor Full Name, Old Code, New Code)

### Flow

* Login → search \& open case
* Open Repeat Contributor Report
* Align codes for duplicate contributor names
* Assert change report \& all duplicate names share the same code

---

### 5. Clear Shared Repeat Contributor Code

**File:** `features/clear-shared-contributor-code.feature`  
**Page Object:** `pages/RepeatContributorCodePage.ts` (shared)  
**Steps:** `features/step-definitions/clear-shared-contributor-code.steps.ts`

A Repeat Contributor Code that appears on different Contributor Full Name groups must be cleared from minority name group(s). Majority name keeps the code. Scans every report page.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120859 |

### Side report

* Console output
* `reports/clear-shared-contributor-code-changes.json`

### Flow

* Login → search \& open case
* Open Repeat Contributor Report
* Clear codes shared across different names
* Assert change report \& no code shared across different names

---

### 6. Is District (set to No)

**File:** `features/isdistrict.feature`  
**Page Object:** `pages/IsDistrictPage.ts`  
**Steps:** `features/step-definitions/isdistrict.steps.ts`

Open Audit Matching Claim Data, set empty In District Confirmed values to **No** on every report page, Save, and report transaction numbers marked No.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120857 |

### Flow

* Login → search \& open case
* Open Audit Matching Claim Data
* Set empty In District Confirmed → No (all pages)
* Save → assert success
* Report transaction numbers marked No

---

### 7. Is District Yes

**File:** `features/isdistrict-yes.feature`  
**Page Object:** `pages/IsDistrictPage.ts` (shared)  
**Steps:** `features/step-definitions/isdistrict.steps.ts` (shared)

Same flow as Is District, but empty values are set to **Yes**.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120877 |

---

### 8. Verification Agree

**File:** `features/verification-agree.feature`  
**Page Object:** `pages/VerificationAgreePage.ts`  
**Steps:** `features/step-definitions/verification-agree.steps.ts`

Open Random Sampling Records, set every empty Verifier Status to **Agree** on all pages, Save, confirm success, and report transaction numbers.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120861 |

---

### 9. Verification Disagree

**File:** `features/verification-disagree.feature`  
**Page Object:** `pages/VerificationAgreePage.ts` (shared)  
**Steps:** `features/step-definitions/verification-agree.steps.ts` (shared Agree/Disagree)

Same flow as Verification Agree, but empty Verifier Status is set to **Disagree**.

### Scenario Outline data

| CaseNumber |
|:-----------|
| 00120861 |

---

### 10. Empty Error Message

**File:** `features/empty-error-message.feature`  
**Page Objects:** `pages/EmptyErrorMessagePage.ts` \+ `pages/VerificationAgreePage.ts`  
**Steps:** `features/step-definitions/empty-error-message.steps.ts`

When Random Sampling Records still has empty Verifier Status fields, Accept or Reject from Approval History must show the incomplete review error. Covers both approval actions via Examples.

### Scenario Outline data

| CaseNumber | ApprovalAction | Comments |
|:-----------|:---------------|:---------|
| 00120861 | Reject | test |
| 00120861 | Accept | test |

### Flow

* Login → search \& open case
* Open Random Sampling Records
* Verify empty Verifier Status fields exist (precondition)
* Close Random Sampling Records
* Choose Accept or Reject from Approval History with comments
* Assert incomplete review error message
* Cancel \& close approval dialog
* Report all empty Verifier Status transaction numbers

---

## Page Object Map

| Page Object | Used by features |
|:------------|:-----------------|
| `BasePage.ts` | Shared base (goto, waits) |
| `HomePage.ts` | Smoke |
| `SalesforceLoginPage.ts` | All NYselections login |
| `Auditor1Page.ts` | Auditor1 |
| `DuplicateTransactionPage.ts` | Duplicate Transaction (also provides shared case search helpers) |
| `RepeatContributorCodePage.ts` | Repeat Contributor Code, Clear Shared Contributor Code |
| `IsDistrictPage.ts` | Is District, Is District Yes |
| `VerificationAgreePage.ts` | Verification Agree, Verification Disagree, Empty Error Message (empty\-status scan) |
| `EmptyErrorMessagePage.ts` | Empty Error Message (Approval History actions) |

---

## Supporting Files

| Path | Role |
|:-----|:-----|
| `features/step-definitions/world.ts` | Cucumber World (browser, page, testData) |
| `features/step-definitions/hooks.ts` | Before/After hooks |
| `features/step-definitions/common.steps.ts` | Shared steps (e.g. login) |
| `cucumber.js` | Cucumber config |
| `scripts/save-sf-session.ts` | Persist Salesforce session |

---

## Conventions Followed

* BDD\-only — no Playwright `.spec.ts` for coverage
* Steps call Page Object methods only (no raw selectors in steps)
* Prefer `getByRole` / `getByLabel` / `getByText`; XPath with `normalize-space()` when needed
* Fluent waits; avoid hard `waitForTimeout()`
* Scenario Outline \+ Examples for case\-driven data
* Shared Page Objects reused across related Agree/Disagree and Yes/No variants

---

## Suggested Tag Runs

| Goal | Command |
|:-----|:--------|
| Smoke only | `npm run bdd:tags "@Smoke"` |
| All regression | `npm run bdd:tags "@Regression"` |
| One flow | `npm run bdd:tags "@VerificationAgree"` |
| All district flows | `npm run bdd:tags "@IsDistrict"` |
| Verification family | `npm run bdd:tags "@VerificationAgree or @VerificationDisagree or @EmptyErrorMessage"` |

---

## Notes

* Case numbers in Examples are environment\-specific and may need updating if data is refreshed.
* Empty Error Message depends on case **00120861** still having at least one empty Verifier Status.
* Verification Agree / Disagree mutate the same Random Sampling Records area on the same case — run order / data state matters.
* Contributor\-code scenarios write JSON change reports under `reports/`.
