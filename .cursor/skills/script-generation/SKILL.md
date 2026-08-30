---
name: script-generation
description: Generates new BDD automation (Gherkin feature, Cucumber step definitions, Page Objects) from codegen or HTML. Use when the user asks to add a test, write a scenario, generate scripts, create feature/steps/pages, or automate a new flow.
---

# Script Generation

Single source of truth: [`script_generation.md`](../../../script_generation.md)

Also follow: `automation_setup_prompt.md`, `test_debugging_prompt.md`

## Non-negotiable

* BDD-only: Feature → Steps → Page Objects
* No new `.spec.ts` for coverage
* Steps call Page Objects only (no raw UI selectors in steps)
* Codegen (or outerHTML) drives locators
* Fluent waits; no hard `waitForTimeout()`

## Paths

| Kind | Path |
|------|------|
| Features | `features/*.feature` |
| Step defs | `features/step-definitions/*.steps.ts` |
| World / hooks | `world.ts`, `hooks.ts` |
| Page Objects | `pages/*.ts` |

## Checklist to add a test

```
- [ ] 1. Clarify scope: URL/flow, happy path, data, expected results
- [ ] 2. Capture locators: codegen or outerHTML
- [ ] 3. Write Gherkin first (business language + tags)
- [ ] 4. Scenario Outline + Examples when data varies
- [ ] 5. Reuse/extend Page Objects before inventing new APIs
- [ ] 6. Step defs: `new SomePage(this.page!)` then call methods
- [ ] 7. Run; on failure use test-debugging skill
```

## Locator preference

1. `getByRole()` / `getByLabel()` / `getByText()`
2. XPath + `normalize-space()` if needed
3. CSS last

## Step design

If two phrasings mean the same action (start/restart, open/open again):

* Do **not** add a second step
* Make the existing step idempotent and reuse it

## Tags

Prefer `@Regression`, `@Sanity`, `@End_to_End`, plus a feature-specific tag (e.g. `@WorkOrderCreation`).

## API status pattern

When verifying Network tab APIs return 200:

* Capture `page.on('response')`, XHR/fetch only, skip OPTIONS
* Store on `CustomWorld`; assert expected status
* Ask for trigger URL/path and API URL pattern filter

## Run

```bash
npm run bdd
npm run bdd:tags "@TagName"
```

## Avoid

* Long hardcoded waits
* Duplicate steps already in `common.steps.ts`
* Auto-pushing to `main`
