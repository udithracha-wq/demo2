# Script Generation (Master Prompt for Any AI Model)

Use this document as the **single source of truth** for how we generate new automation in this repository.

## Context Files (Always Refer)

- `automation_setup_prompt.md`: framework setup + architecture rules
- `test_debugging_prompt.md`: debugging + locator strategy + auto-healing workflow

## Framework Architecture (Non-Negotiable)

This repo is **BDD-only**:

Feature Files → Step Definitions → Page Objects  
**WHAT** → **GLUE** → **HOW**

### Hard Rules

- **Do not create new Playwright `.spec.ts` tests** for new coverage. Add `.feature` + step defs + page objects.
- Step definitions should **not** contain raw CSS/XPath selectors for UI interactions.  
  They should **call Page Object methods**.
- **Codegen output is the primary source of truth** for element roles and locator intent.
- **Ask for codegen or HTML** (DevTools → Copy outerHTML) if a locator is unclear.
- Prefer **fluent waits** (Playwright auto-wait + `expect().toBeVisible()`), not hard `waitForTimeout()`.

## Folder / File Conventions

- Feature files: `features/*.feature`
- Step definitions: `features/step-definitions/*.steps.ts`
- World + hooks: `features/step-definitions/world.ts`, `features/step-definitions/hooks.ts`
- Page Objects: `pages/*.ts`

## Standard Process to Add a New Test (AI Checklist)

### 1) Clarify the Test Scope (Ask the Tester)

Ask the user for:
- **Which page/flow** is being automated (URL + navigation path)
- **Happy path steps** (business language)
- **Valid test data** (user, IDs, example input values)
- **Expected results** (what should be verified)

### 2) Capture Reliable Locators (Prefer Codegen)

If user can provide it:
- Run `npx playwright codegen <URL>`
- Ask them to perform the flow once
- Use the generated code to infer:
  - roles (button/menuitem/textbox)
  - labels/names (exact text + whitespace behavior)
  - element hierarchy (e.g., span inside button)

If codegen is not available:
- Ask user to provide **outerHTML** for critical elements.

### 3) Write the Gherkin Scenario First

Prefer:
- Clear business language
- Minimal UI implementation details
- Tags for filtering:
  - `@Regression`, `@Sanity`, `@End_to_End`
  - Feature-specific tag, e.g. `@WorkOrderCreation`

### 4) Parameterize with Scenario Outline (When Needed)

When the same flow must run with different data (like Entity Types):
- Use **Scenario Outline** with an **Examples** table.
- Keep values human-readable in Examples.
- Use tags per Example block if you want targeted runs (e.g. `@BusinessCRA`).

### 5) Implement/Reuse Page Objects

Before writing anything new:
- Scan `pages/` for an existing method you can reuse.
- Add new locators/methods only if there is no existing equivalent.

Locator preferences:
1) `getByRole()` / `getByLabel()` / `getByText()` (most stable)
2) XPath with `normalize-space()` if needed
3) CSS as a last resort

### 6) Step Definitions Should Call Page Objects

Step definitions:
- Create the page object with `new SomePage(this.page!)`
- Call methods like `await page.selectEntityType(entityType)`
- Keep logic minimal (no complex selectors here)

### 7) Run, Debug, Heal (If Failures)

When a test fails:
- First analyze failure output / report
- Explain root cause
- Ask user permission before making bigger changes
- If locator is unclear: request HTML (outerHTML) or fresh codegen

## Step Definition Design Rule (General)

If two steps would perform the **same underlying action** (example: “start” vs “restart”, “open” vs “open again”), **do not create a new step** just for wording.

Instead:

- Make the existing step **idempotent** (safe to call multiple times).
- Reuse the same step in the feature file wherever you need it.

This keeps:

- feature files simple (reuse instead of new vocabulary)
- step definitions small and maintainable
- less duplication and fewer bugs

## Network/API Status Test Pattern (Network Tab → “All APIs return 200”)

When the user wants: “From Network tab, verify every API returns 200”:

**Approach**
- Capture Playwright `page.on('response')` events
- Filter to **XHR/fetch** only (ignore images/js/fonts)
- Exclude **OPTIONS** (CORS preflight) by default
- Assert every captured API response status equals expected (usually 200)

**Where it lives**
- Feature: `features/api-status.feature`
- Step defs: `features/step-definitions/api-status.steps.ts`
- Storage: `CustomWorld` (captured responses stored per scenario)

**Required tester input**
- What URL path or flow triggers the APIs?
- What substring/pattern identifies an API URL? (e.g. `/api/`, `/services/`, `/rest/`)

## How to Run Tests

- Run all BDD: `npm run bdd`
- Run by tag: `npm run bdd:tags "@TagName"`

## What to Avoid

- Don’t hardcode long waits.
- Don’t duplicate step definitions if a common step exists in `common.steps.ts`.
- Don’t push to `main` automatically. User will handle pushing/PR workflow.

