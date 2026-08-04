# Flaky Automated Tests — Tracking Feature

This feature is **tracked automatically** by the Report Portal flaky-test automation
(`scripts/report-portal/runFailedTestsMatrix.js`). Each **linked FAT task** represents a
single flaky automated test case. Please do not create these tasks by hand — they are
created, updated, and closed by the daily job.

## What counts as "flaky"

A test is considered flaky when it **fails in the nightly Report Portal (RP) run but
passes when automatically re-run**. The daily matrix job re-runs every "To Investigate"
failure and marks the ones that pass on rerun as **flaky** in Report Portal.

## How tickets are collected

The job runs once per day, after the nightly RP launches complete, and for every
launch × team combination it:

1. Fetches the tests marked **flaky** in the latest RP launch.
2. Aggregates them into **one entry per unique test case + team** (keyed by the
   TestRail C-number, or the test name when there is none).
3. For each unique flaky test, **creates or updates** a task in the **FAT** project and
   **links** it to this feature (a *Relates* link).

## One FAT task per flaky test

- Tasks live in the **FAT** project (the AQA standard) and are **linked** to this
  feature, labelled `flaky-automation` + this feature's key.
- **Summary** matches the TestRail case name in the format `[TC] Name (Team)` —
  e.g. `C1385659 Verify bulk delete for large number of User records (Firebird)`.
- **No duplicates**: if a task with that exact summary already exists, it is **updated**
  rather than re-created.

## What each task's description contains

On every run the task description is refreshed with:

- **Test case / TestRail link** for the case.
- **Run statistics** pulled live from Report Portal history (last 30 runs):
  Passed / Flaky / Failed counts, the **flaky rate**, and first/last-seen dates.
- **Flakiness log**: a de-duplicated list of observations (fail date + launch /
  environment + Report Portal deep link), which grows over successive runs.
- **Total recorded flaky occurrences**.
- A machine-readable `RP-Meta:` footer (test uniqueId + launch) used by the automation
  — please leave it in place.

## Auto-close when a test becomes stable

After syncing, the job re-checks the RP history of **every open FAT task linked to this
feature**. If a test has **passed cleanly for the last 10 consecutive runs**, its task is
transitioned to **Closed** with an explanatory comment. A now-stable test no longer
appears in the flaky set, so this dedicated pass is what eventually closes it.

## Summary of the lifecycle

| Event | Automation action |
| --- | --- |
| Test newly detected as flaky | Creates a linked FAT task |
| Test still flaky on later runs | Updates the task (stats + flakiness log) |
| Test passes cleanly 10 runs in a row | Moves the task to **Closed** |

---
*Maintained by `scripts/report-portal/runFailedTestsMatrix.js` (epic sync). See
`scripts/report-portal/README-dailyMatrix.md` for operational details.*

