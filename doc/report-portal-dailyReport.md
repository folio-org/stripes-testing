# Report Portal Daily Report

## Overview

The `dailyReport.js` script fetches the latest launch for each configured Report Portal run, counts **"To Investigate"** (STEP-type) items per team, and prints a formatted summary to the console ready to paste into a team chat.

## Execution

Run the command from the `stripes-testing` folder:

```bash
node scripts/report-portal/dailyReport.js
```

No arguments are required.

## Required Environment Variables

The following environment variable must be set in the `.env` file:

- `CI_API_KEY`: The API token for authenticating with Report Portal

```
CI_API_KEY=report-portal-token-here
```

See `doc/report-portal-runFailedTests.md` for instructions on generating an API key.

## Configuration

All report content is driven by constants in `scripts/report-portal/constants/constants.js`:

| Constant | Purpose |
|---|---|
| `REPORT_LAUNCHES` | Ordered list of launch names to include |
| `TEAMS` | Team names and responsible Slack mentions |
| `GREETING` | Two greeting lines at the top of the report |
| `CONCLUSION` | Two conclusion lines at the bottom |
| `RP_UI_BASE_URL` | Base URL for the Report Portal deep-link |
| `RP_TO_INVESTIGATE_PARAMS` | Pre-encoded filter query string for the deep-link |

Launches that return no result from Report Portal (e.g. not yet run that day) are silently skipped.
