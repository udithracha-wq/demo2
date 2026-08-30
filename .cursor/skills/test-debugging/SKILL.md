---
name: test-debugging
description: Debugs and auto-heals Playwright BDD failures (locators, timeouts, assertions, navigation). Use when tests fail, flaky steps appear, locators break, or the user asks to fix/heal automation.
---

# Test Debugging & Auto-Healing

Full guide: [`test_debugging_prompt.md`](../../../test_debugging_prompt.md)

## Before changing code

Ask for:

1. Failure output / error message
2. Which feature step failed
3. Whether it worked before and what changed

## Categorize

| Type | Signals |
|------|---------|
| Element not found | `Timeout`, waiting for selector |
| Timeout | `Timeout 30000ms exceeded` |
| Assertion | `expect(...).toBeVisible()`, wrong text |
| Navigation | `page.goto`, `net::ERR_` |
| Stale element | not attached to DOM |

Locate failure in: step def, page object, feature syntax, or config.

## Inspect locator

Priority: `getByRole` → `getByText` → `getByLabel` → `getByTestId` → CSS → XPath

Common fixes:

* Exact vs partial text / leading spaces → `{ exact: true }` or regex
* Multiple matches → `.first()` / tighten selector
* Hidden / iframe → wait for visibility or frame context

**When unsure:** ask for DevTools **outerHTML**, or re-run:

```bash
npx playwright codegen <URL>
```

## Healing loop

```
- [ ] Analyze failure
- [ ] Inspect PO locator vs HTML/codegen
- [ ] Apply minimal locator/wait fix
- [ ] Re-run failing scenario/tag
- [ ] If still failing: ask user before large refactors
```

Prefer smallest change that restores the step. Do not rewrite architecture unless asked.

## BDD reminders

* Fix belongs in Page Object when the issue is a locator/action
* Keep step defs free of raw selectors
* World `baseURL` missing → "Cannot navigate to invalid URL" under Cucumber

## After fix

Summarize root cause + what changed (file + method). Suggest a targeted re-run tag.
