# Report Portal Team Email Report

## Overview

The `teamEmailReport.js` script fetches the latest launch data from Report Portal and generates a ready-to-send email for each team. For every team that has **"To Investigate"** failures, it prints the email subject, a formatted plain-text body, and a clickable `mailto:` link to the console. Ctrl+Click / Cmd+Click the link to open a pre-filled draft in your local mail client.

## Arguments

- `--team`: Team name to generate an email for (e.g., `Promin`). Optional — if not provided, emails are generated for all teams sequentially.

## Execution

Run the command from the `stripes-testing` folder:

```bash
node scripts/report-portal/teamEmailReport.js [--team <TeamName>]
```

Examples:
- All teams: `node scripts/report-portal/teamEmailReport.js`
- Single team: `node scripts/report-portal/teamEmailReport.js --team Promin`

## Required Environment Variables

The following environment variable must be set in the `.env` file:

- `CI_API_KEY`: The API token for authenticating with Report Portal

```
CI_API_KEY=report-portal-token-here
```

See `doc/report-portal-runFailedTests.md` for instructions on generating an API key.

## Configuration

### Team Emails

Recipient addresses are loaded from `scripts/report-portal/team-emails/team-emails.js`, which is gitignored. Create the file by copying the example:

```bash
cp scripts/report-portal/team-emails/team-emails.example.js \
   scripts/report-portal/team-emails/team-emails.js
```

Fill in the `to` and `cc` fields for each team:

```javascript
module.exports = {
  Athena:     { to: 'athena-team@example.com',     cc: '' },
  Eureka:     { to: 'eureka-team@example.com',     cc: '' },
  Promin:     { to: 'promin-team@example.com',     cc: '' },
  Thunderjet: { to: 'thunderjet-team@example.com', cc: '' },
  Vega:       { to: 'vega-team@example.com',       cc: '' },
  Helios:     { to: 'helios-team@example.com',     cc: '' },
};
```

If the file is absent, `to` and `cc` default to empty strings and the `mailto:` link is still generated without recipients.

### Email Content

All static text in the email body and subject is defined in the `EMAIL_CONTENT` constant at the top of `teamEmailReport.js`. Edit the strings there to change the email template without touching the logic:

- `subject` — subject line template; receives `teamName`
- `greeting` — opening line; receives `teamName`
- `intro` — fixed paragraph describing the report purpose
- `outro` — fixed closing paragraph
- `signoff` — final line

### Constants

The following constants from `scripts/report-portal/constants/constants.js` drive the report:

- `REPORT_LAUNCHES` — ordered list of launch names to query
- `TEAMS` — full team list used for per-team failure counts
- `TEAM_NAMES` — canonical team name values; defines which teams receive emails
- `TEAM_EMAILS` — loaded from the gitignored `team-emails.js` file
- `RP_UI_BASE_URL` — base URL for Report Portal deep-links
- `RP_TO_INVESTIGATE_PARAMS` — pre-encoded filter query string for deep-links

## Flow Summary

1. **Parse arguments**: Read `--team` from the command line. Validate against `TEAM_NAMES` and exit with an error if unknown.
2. **Fetch launch data**: For each launch in `REPORT_LAUNCHES`, query Report Portal for the latest run and count **"To Investigate"** (STEP-type) failures per team.
3. **Filter runs**: Only launches where at least one team has failures are retained. Launches not yet run are silently skipped.
4. **Generate emails**: For each team to process, filter to runs where that team specifically has failures, then build the subject, body, and `mailto:` link.
5. **Print to console**: Output the subject, body, and `mailto:` link for each team. If a team has no failures across all runs, a "No failed tests to report." message is printed instead.

Each Report Portal link opens the launch pre-filtered to that team's "To Investigate" failures.
