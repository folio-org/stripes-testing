# Daily scheduled matrix run (macOS)

Runs the Report Portal failed-tests matrix automatically once per day: pulls latest
`master`, installs deps, runs all launch × team combinations, and saves a timestamped
statistics report.

## Files

- `dailyMatrix.sh` — the runner (git pull → npm install → matrix → analyze logs)
- `com.folio.runFailedTestsMatrix.plist` — the `launchd` schedule
- `runFailedTestsMatrix.js` — runs all launches × teams
- `analyzeLogs.js` — builds the per-environment statistics report

## One-time setup

Test the script manually first:

```bash
cd /Users/vadymshchekotilin/IdeaProjects/epm/stripes-testing
./scripts/report-portal/dailyMatrix.sh
```

If that works, install the schedule (runs daily at 12:00 midday):

```bash
cp scripts/report-portal/com.folio.runFailedTestsMatrix.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.folio.runFailedTestsMatrix.plist
```

## Change the run time

Edit `~/Library/LaunchAgents/com.folio.runFailedTestsMatrix.plist`, update
`StartCalendarInterval` → `Hour` / `Minute` (24-hour clock), then reload:

```bash
launchctl unload ~/Library/LaunchAgents/com.folio.runFailedTestsMatrix.plist
launchctl load   ~/Library/LaunchAgents/com.folio.runFailedTestsMatrix.plist
```

## Useful commands

```bash
# Is it scheduled?
launchctl list | grep runFailedTestsMatrix

# Trigger a run right now (without waiting for the schedule)
launchctl start com.folio.runFailedTestsMatrix

# Stop scheduling it
launchctl unload ~/Library/LaunchAgents/com.folio.runFailedTestsMatrix.plist
```

## Where output goes

- `logs/reports/run-<timestamp>.log` — full run output (git, npm, matrix, analyzer)
- `logs/reports/summary-<timestamp>.txt` — the statistics report only
- `logs/reports/launchd.out.log` / `launchd.err.log` — launchd-level output
- `logs/<launch>-<team>.log` — per-combination Cypress logs (overwritten each run)
- `logs/flaky-tickets-<EPIC>.json` — audit copy of the flaky-ticket sync results

## Create/update one FAT task per flaky test (linked to a tracking feature)

After every daily/scheduled run, the matrix creates **one Jira task per flaky test
case** in the **FAT project** (the AQA standard) and **links** each task to a tracking
feature (e.g. `UXPROD-5976`) with a *Relates* link. The feature key defaults to
`JIRA_EPIC` (set in `dailyMatrix.sh` and in the plist `EnvironmentVariables`); override
it per run with `--epic`:

```bash
node scripts/report-portal/runFailedTestsMatrix.js --epic UXPROD-5976
```

Scheduled run — `JIRA_EPIC` is already defaulted to `UXPROD-5976`; just make sure
`JIRA_API_KEY` is available (in the plist `EnvironmentVariables` or the repo `.env`):

```bash
# uses the default JIRA_EPIC
./scripts/report-portal/dailyMatrix.sh

# or override the feature for this run
JIRA_EPIC=UXPROD-5976 ./scripts/report-portal/dailyMatrix.sh
```

Behaviour:

- Tasks are created in the **FAT** project as **Task** issues, each **linked** to the
  tracking feature and labelled `flaky-automation` + the feature key (e.g.
  `UXPROD-5976`) for precise scoping.
- The task **summary matches the TestRail test case name**, in the format
  `[TC] Name (Team)` — e.g.
  `C1385659 Verify bulk delete for large number of User records (10.000) (Firebird)`.
- **No duplicates**: if a task with that exact summary already exists, it is **not**
  re-created. Instead, on **every run its description is updated** with:
  - the **TestRail link** for the case,
  - a **Run statistics** block pulled live from **Report Portal history**
    (Passed / Flaky / Failed counts, flaky rate, first/last seen over the last 30 runs),
  - a **de-duplicated log of observations** (fail date + launch/environment + Report
    Portal link),
  - a running **total count** of recorded flaky occurrences.
- Flaky tests seen across multiple launches/teams are aggregated per case + team, so
  each ticket accumulates history over successive daily runs.
- **Auto-close when stable**: after syncing, the run scans open flaky tasks linked to
  the feature and, for each, re-checks the test's Report Portal history (last 10 runs).
  If the test has **passed cleanly for the last 3 consecutive runs**, the task is
  transitioned to **Closed** with an explanatory comment. (The threshold is
  `STABLE_STREAK_THRESHOLD` in `services/flakyTicketService.js`.)
- **Create criteria**: a ticket is only created for tests that are **flaky in ≥ 3 of the
  last 10 runs** (flaky rate > 20%, `FLAKY_CREATE_MIN_COUNT`).
- **Priority by flaky rate**: `< 40% → P4`, `< 60% → P3`, `< 80% → P2`, `≥ 80% → P1`
  (`priorityForRate`); refreshed on every update.
- **Reopen when flaky again**: a previously-closed ticket whose test turns flaky again
  and still meets the create criteria is transitioned back to **Open** with a comment.
- **Delete only false positives**: an open ticket is **deleted** only if its test
  **never** met the create criteria (a sticky `Ever met flaky-create criteria: yes`
  marker is kept in the description). A test that **was** flaky enough is never deleted —
  it is **closed** once it reaches the pass threshold above.
- Requires `JIRA_API_KEY`. A local audit copy is saved to
  `logs/flaky-tickets-<FEATURE>.json`.

### One-time reset of stale tickets

To wipe flaky tickets that no longer meet the create criteria (e.g. old tickets that
still carry 30-run statistics) so a fresh sync can recreate them with correct 10-run
history, run the reset once, then a normal sync:

```bash
# Deletes every flaky ticket under the epic whose test is currently below criteria
node scripts/report-portal/runFailedTestsMatrix.js --reset-below-criteria --epic UXPROD-5976

# Then recreate fresh tickets
node scripts/report-portal/runFailedTestsMatrix.js --sync-only --epic UXPROD-5976
```

The reset ignores the sticky "ever qualified" flag on purpose — it only keeps tickets
whose test currently meets the criteria and deletes the rest. Tickets without resolvable
Report Portal history are left untouched.

### Nuke everything under the feature and re-sync

If tickets are stale/mismatched (old descriptions, missing labels, only attached via the
"Relates" link), wipe **every** ticket associated with the feature and recreate them
from scratch:

```bash
# Deletes ALL tickets linked to the feature (via "Relates") + any this automation
# labelled for it — regardless of history, labels or the sticky flag
node scripts/report-portal/runFailedTestsMatrix.js --reset-all --epic UXPROD-5976

# Then recreate fresh tickets from Report Portal
node scripts/report-portal/runFailedTestsMatrix.js --sync-only --epic UXPROD-5976
```

`--reset-all` collects keys two ways and unions them: (1) the feature's `issuelinks`
(only `FAT-*` issues are touched, to avoid unrelated links), and (2) a label search for
`flaky-automation` + the epic key. It then deletes each and exits.

Environment variables (in the plist `EnvironmentVariables` or the repo `.env`):

- `JIRA_API_KEY` — Base64 of `email:api_token` for Jira Cloud (same value used by the
  other repo scripts).
- `JIRA_EPIC` — the tracking **feature** key that tasks are linked to, e.g. `UXPROD-5976`.
- `CI_API_KEY` — Report Portal API token (used for the flaky detection + history stats).
- `JIRA_FLAKY_PROJECT` — *(optional)* target project for the tasks (default `FAT`).
- `JIRA_FLAKY_LINK_TYPE` — *(optional)* issue link type name (default `Relates`).
- `TEAMS` — *(optional)* comma-separated team names, e.g. `Vega` or `Firebird,Corsair`.
- `LAUNCHES` — *(optional)* comma-separated launch names (default: all supported).
- `CONCURRENCY` — *(optional)* max parallel runs (default `4`).

> Precedence for teams / launches / concurrency / epic is **CLI flag > `.env` var >
> built-in default**, so a teammate can set `TEAMS=Vega` once in `.env` and just run
> `node scripts/report-portal/runFailedTestsMatrix.js` without repeating `--teams`.

> If `JIRA_EPIC` is ever empty the run logs a loud warning that flaky-test tasks were
> **not** created/updated, so it's easy to notice.

## Notes / gotchas

- **The Mac must be awake at the scheduled time.** `launchd` will run the job at the
  next wake if the machine was asleep, but a fully powered-off Mac won't run it.
  To wake the Mac for it, add a schedule in **System Settings → Energy / Battery →
  Schedule**, or via `sudo pmset repeat wakeorpoweron MTWRFSU 11:55:00`.
- The script does `git reset --hard origin/master`, so any local changes are stashed
  first (look for `dailyMatrix-autostash-*` in `git stash list`).
- `node` is loaded via `nvm` inside the script, so the correct version is used even
  though `launchd` starts with a minimal environment.
- The first run may prompt for Git credentials if the HTTPS remote isn't cached.
  Make sure `git pull` works non-interactively (credential helper / SSH) beforehand.

