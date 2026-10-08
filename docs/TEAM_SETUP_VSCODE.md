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

## Step 2 — Get the project

1. Clone or copy this repository to your machine
2. In VS Code: **File → Open Folder…**
3. Select the project root (the folder that contains `package.json`)

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

---

## Step 6 — Run the scripts

In the VS Code terminal at the project root:

| Goal | Command |
|:-----|:--------|
| Run all BDD scenarios | `npm run bdd` |
| Run by tag | `npm run bdd:tags "@YourTag"` |
| Run with visible browser | `npm run bdd:headed` |

### Tag examples

Feature files use tags such as `@Auditor1`, `@Regression`, `@NYselections`. Example:

```bash
npm run bdd:tags "@Auditor1"
```

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
