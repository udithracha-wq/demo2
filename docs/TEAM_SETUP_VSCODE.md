# Team Setup — Run BDD Scripts in VS Code

This project is a **Playwright + Cucumber (BDD)** automation suite.  
You do **not** need Cursor. VS Code is enough.

Architecture:

```
Feature Files → Step Definitions → Page Objects
```

---

## Step 1 — Install tools

1. Install [VS Code](https://code.visualstudio.com/)
2. Install [Node.js LTS](https://nodejs.org/)
3. Confirm in a terminal:

```bash
node -v
npm -v
code --version
```

---

## Step 2 — Bring the project from Git to your machine, then open it in VS Code

Repository link:

```text
https://github.com/udithracha-wq/demo2.git
```

You need Git installed. In a terminal, run `git --version`. If that fails, install Git from [https://git-scm.com/](https://git-scm.com/), then close and reopen the terminal.

If GitHub asks you to sign in, use the GitHub account that was given access to this repository.

### Option A — Clone in a terminal, then open VS Code

**Mac / Linux**

```bash
cd ~
mkdir -p Projects
cd Projects
git clone https://github.com/udithracha-wq/demo2.git
cd demo2
code .
```

**Windows (PowerShell)**

```powershell
cd $HOME
mkdir Projects -ErrorAction SilentlyContinue
cd Projects
git clone https://github.com/udithracha-wq/demo2.git
cd demo2
code .
```

`code .` opens the `demo2` folder in VS Code. That folder is the project root. It contains `package.json`.

If `code` is not recognized, open VS Code yourself: **File → Open Folder…** and select the `demo2` folder that Git just created.

### Option B — Clone from inside VS Code

1. Open VS Code
2. Open the Command Palette: `Ctrl+Shift+P` (Windows) or `Cmd+Shift+P` (Mac)
3. Type **Git: Clone** and press Enter
4. Paste this link and press Enter:

```text
https://github.com/udithracha-wq/demo2.git
```

5. Choose the local folder where the project should be saved (for example `Documents` or `Projects`)
6. When VS Code asks whether to open the cloned repository, choose **Open**

You should then see `package.json` in the Explorer. Stay in that `demo2` folder for every later step.

---

## Step 3 — Install VS Code extensions

In the VS Code terminal:

```bash
code --install-extension ms-playwright.playwright
code --install-extension alexkrechik.cucumberautocomplete
```

Or install from Extensions (`Ctrl+Shift+X` / `Cmd+Shift+X`):

* **Playwright Test for VSCode** (Microsoft)
* **Cucumber (Gherkin) Full Support** (`alexkrechik.cucumberautocomplete`)

The repo already includes `.vscode/settings.json` for Gherkin autocomplete.

---

## Step 4 — Install project dependencies

Open the VS Code terminal at the project root (**Terminal → New Terminal**, or `` Ctrl+` `` / `` Cmd+` ``).

```bash
npm install
npx playwright install
```

---

## Step 5 — Configure environment (`.env`)

Tests need the Salesforce org URL and login details. Each person creates a local `.env` file.

### 5.1 Create `.env` from the template

In the **VS Code terminal** at the project root:

**Mac / Linux**

```bash
cp .env.example .env
```

**Windows (PowerShell)**

```powershell
Copy-Item .env.example .env
```

### 5.2 Edit `.env`

Open `.env` in VS Code and fill in real values (example shape only):

```env
BASE_URL=https://your-org.sandbox.lightning.force.com
HEADLESS=true
SLOW_MO=0

SF_USERNAME=your.user@company.com
SF_PASSWORD=your-password
SF_MFA_CODE=
```

| Variable | Meaning |
|:---------|:--------|
| `BASE_URL` | Salesforce Lightning org root URL (**no** trailing `/`) |
| `HEADLESS` | `true` = background (no browser window); `false` = show browser |
| `SLOW_MO` | Delay in ms between actions (`0` = normal speed) |
| `SF_USERNAME` | Salesforce username |
| `SF_PASSWORD` | Salesforce password |
| `SF_MFA_CODE` | MFA code if login requires it (leave empty if not needed) |

### 5.3 Security

* Do **not** commit `.env` to git
* Do **not** share passwords in the repo or chat that is checked in
* Share credentials through your team’s secure channel only

### 5.4 Save the login once

After `.env` is filled in, you can store the Salesforce login so later runs reuse it. You do this once (and again if the session expires).

In the VS Code terminal at the project root:

```bash
npm run auth:save
```

A Chrome window opens. Sign in with your username and password, and complete MFA if it appears. Leave that window open until the terminal prints `Saved session`.

The login is stored in `.auth/nyselections.json`. The next `npm run bdd` or `npm run bdd:tags` command reuses that session.

* Do **not** commit `.auth/` to git
* Do **not** close the browser before `Saved session` appears
* If login fails later, run `npm run auth:save` again

---

## Step 6 — Run the scripts

In the VS Code terminal at the project root:

| Goal | Command |
|:-----|:--------|
| Run all BDD scenarios | `npm run bdd` |
| Run by tag | `npm run bdd:tags "@YourTag"` |
| Run with visible browser | `npm run bdd:headed` |

### How to run by tag

The first line of each `.feature` file is its tags. Use the unique tag (the one that matches the feature name).

In the VS Code terminal at the project root, keep the quotes:

```bash
npm run bdd:tags "@AgreeAllError"
```

That runs only `features/Auditor/agree-all-error.feature`.

More than one tag:

```bash
npm run bdd:tags "@Regression and @AgreeAllError"
npm run bdd:tags "@Auditor1 or @AgreeAllError"
```

Visible browser for one tag:

**Mac / Linux**

```bash
HEADLESS=false npm run bdd:tags "@AgreeAllError"
```

**Windows (PowerShell)**

```powershell
$env:HEADLESS="false"; npm run bdd:tags "@AgreeAllError"
```

Shared tags on most features: `@Regression`, `@NYselections`, `@End_to_End`.  
`@Regression` runs the regression set. `@Smoke` runs the smoke check only.

### Feature tags

| Feature | Command |
|:--------|:--------|
| Agree All Error | `npm run bdd:tags "@AgreeAllError"` |
| Auditor1 | `npm run bdd:tags "@Auditor1"` |
| Auditor Accept and Reject Report | `npm run bdd:tags "@AuditorAcceptAndRejectReport"` |
| Auditor Agree Audit Fields Change | `npm run bdd:tags "@AuditorAgreeAuditFieldsChange"` |
| Auditor Disagree Supervisor | `npm run bdd:tags "@AuditorDisagreeSupervisor"` |
| Auditor Final | `npm run bdd:tags "@AuditorFinal"` |
| Prepayment Matching Claims Negative | `npm run bdd:tags "@AuditorPrepaymentMatchingClaimsNegative"` |
| Prepayment Matching Claims Positive | `npm run bdd:tags "@AuditorPrepaymentMatchingClaimsPositive"` |
| Auditor Response Agree | `npm run bdd:tags "@AuditorResponseAgree"` |
| Clear Shared Contributor Code | `npm run bdd:tags "@ClearSharedContributorCode"` |
| Duplicate Transaction | `npm run bdd:tags "@DuplicateTransaction"` |
| Is District | `npm run bdd:tags "@IsDistrict"` |
| Is District Yes | `npm run bdd:tags "@IsDistrictYes"` |
| PostGrid Selecting All | `npm run bdd:tags "@PostGridSelectingAll"` |
| Repeat Contributor Code | `npm run bdd:tags "@RepeatContributorCode"` |
| Supporting Docs Yes | `npm run bdd:tags "@SupportingDocsYes"` |
| Empty Error Message | `npm run bdd:tags "@EmptyErrorMessage"` |
| Verification Agree | `npm run bdd:tags "@VerificationAgree"` |
| Verification Disagree | `npm run bdd:tags "@VerificationDisagree"` |
| Payment Supervisor | `npm run bdd:tags "@PaymentSupervisor"` |
| Payment Supervisor Vendor Id | `npm run bdd:tags "@PaymentSupervisorVendorId"` |
| Supervisor Agree With Auditor | `npm run bdd:tags "@SupervisorAgreeWithAuditor"` |
| Supervisor Disagree With Auditor | `npm run bdd:tags "@SupervisorDisagreeWithAuditor"` |
| Supervisor Payment Reject | `npm run bdd:tags "@SupervisorPaymentReject"` |
| Supervisor Step 1 | `npm run bdd:tags "@SupervisorStep1"` |
| Payment Analyst 1 | `npm run bdd:tags "@PaymentAnalyst1"` |
| Payment Analyst 1 Reject | `npm run bdd:tags "@PaymentAnalyst1Reject"` |
| Payment Analyst 1 Variance Reject | `npm run bdd:tags "@PaymentAnalyst1VarianceReject"` |
| PCFB Admin Generate Voucher | `npm run bdd:tags "@PcfbAdminGenerateVoucher"` |
| PCFB Admin Resend To Payment Analyst | `npm run bdd:tags "@PcfbAdminResendPaymentAnalyst"` |
| PCFB Admin Resend To Supervisor | `npm run bdd:tags "@PcfbAdminResendSupervisor"` |
| Co Director 1 | `npm run bdd:tags "@CoDirector1"` |
| Co Director 1 Reject | `npm run bdd:tags "@CoDirector1Reject"` |
| Co Director 2 | `npm run bdd:tags "@CoDirector2"` |
| Co Director 2 Reject | `npm run bdd:tags "@CoDirector2Reject"` |
| Smoke check | `npm run bdd:tags "@Smoke"` |

### Background vs visible browser

| How you run | Browser |
|:------------|:--------|
| `HEADLESS=true` + `npm run bdd` | Background (recommended for normal runs) |
| `HEADLESS=false` or `npm run bdd:headed` | Visible Chrome window (for debugging) |

To match the usual local setup, keep `HEADLESS=true` and run `npm run bdd`.

---

## Step 7 — View reports

* **Cucumber HTML:** open `reports/cucumber-report.html` in a browser
* **Allure:**

```bash
npm run report
```

---

## Quick checklist

1. VS Code + Node.js installed  
2. Project opened in VS Code  
3. Playwright + Cucumber extensions installed  
4. `npm install` and `npx playwright install` done  
5. `.env` created from `.env.example` and filled in  
6. `npm run bdd` (or `npm run bdd:tags "@Tag"`)  

---

## What you do **not** need

* Cursor  
* Anything under `.cursor/` (agent skills/rules only)

---

## Troubleshooting

| Problem | What to check |
|:--------|:--------------|
| Login fails | `BASE_URL`, `SF_USERNAME`, `SF_PASSWORD` in `.env`; MFA if required |
| Browser opens unexpectedly | Set `HEADLESS=true` and use `npm run bdd` (not `bdd:headed`) |
| Command not found / scripts fail | Confirm you are in the project root (`package.json` visible) and ran `npm install` |
| Playwright browser missing | Run `npx playwright install` again |
| Steps not recognized in `.feature` | Install Cucumber extension; reload VS Code window |

---

## Common commands (reference)

```bash
# Install
npm install
npx playwright install

# Env
cp .env.example .env          # Mac/Linux
# Copy-Item .env.example .env # Windows PowerShell

# Run
npm run bdd
npm run bdd:tags "@Auditor1"
npm run bdd:headed

# Reports
npm run report
```
