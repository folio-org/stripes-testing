# Cypress Concurrent Repeat Runner

## Overview

The `cypress-concurrent-repeat-runner.ts` script repeatedly runs one or more Cypress spec files. It is intended for reproducing intermittent failures and collecting isolated logs and statistics from repeated executions.

Specs are placed in a FIFO queue and processed one by one. For the active spec, repeated runs are distributed across a bounded worker pool. This means `--threads` controls concurrent repetitions of one spec; it does not run different specs concurrently.

## Prerequisites

Install the repository dependencies and configure the Cypress target environment as described in the project README.

```bash
yarn install
```

Run all commands from the repository root.

## Usage

Use the package command:

```bash
yarn cypress:repeat [options]
```

Display the built-in help:

```bash
yarn cypress:repeat --help
```

Exactly one input option is required: `--spec` or `--specs-file`. They cannot be used together.

## Options

| Option                    | Description                                       | Default                                |
| ------------------------- | ------------------------------------------------- | -------------------------------------- |
| `-s, --spec <paths>`      | One spec or a comma-separated list of specs       | Required unless `--specs-file` is used |
| `-f, --specs-file <path>` | Text file containing one spec path per line       | Required unless `--spec` is used       |
| `-r, --runs <number>`     | Number of repetitions for each spec               | `10`                                   |
| `-t, --threads <number>`  | Maximum concurrent repetitions of the active spec | `1`                                    |
| `-b, --browser <name>`    | Cypress browser                                   | `chrome`                               |
| `--timeout-sec <seconds>` | Timeout for each run; `0` disables the timeout    | `0`                                    |
| `-o, --out-dir <path>`    | Directory for logs and summaries                  | `.local/cypress-run-logs`              |
| `-h, --help`              | Display command help                              |                                        |

`--runs` and `--threads` must be positive integers. `--timeout-sec` must be a non-negative integer.

## Examples

Run one spec ten times using the defaults:

```bash
yarn cypress:repeat \
  --spec cypress/e2e/invoices/approve-and-pay-more-than-one-invoice.cy.js
```

Run one spec 20 times with four concurrent Cypress processes:

```bash
yarn cypress:repeat \
  --spec cypress/e2e/invoices/approve-and-pay-more-than-one-invoice.cy.js \
  --runs 20 \
  --threads 4
```

Run several comma-separated specs:

```bash
yarn cypress:repeat \
  --spec cypress/e2e/invoices/first.cy.js,cypress/e2e/invoices/second.cy.js \
  --runs 10 \
  --threads 2
```

The first spec completes all ten runs before the second spec starts.

Run specs listed in a file:

```text
cypress/e2e/invoices/first.cy.js
cypress/e2e/invoices/second.cy.js
cypress/e2e/orders/third.cy.js
```

```bash
yarn cypress:repeat \
  --specs-file .local/specs.txt \
  --runs 5 \
  --threads 2
```

Leading and trailing whitespace is removed from each row, and empty rows are ignored. Specs retain their file order.

Set a five-minute timeout for every individual run:

```bash
yarn cypress:repeat \
  --spec cypress/e2e/invoices/example.cy.js \
  --timeout-sec 300
```

A timed-out process is killed and reported with exit code `124`.

Use Electron and a custom output directory:

```bash
yarn cypress:repeat \
  --spec cypress/e2e/invoices/example.cy.js \
  --browser electron \
  --out-dir .local/my-repeat-run
```

Disable colored console output:

```bash
NO_COLOR=1 yarn cypress:repeat --spec cypress/e2e/invoices/example.cy.js
```

## Execution Model

For this command:

```bash
yarn cypress:repeat \
  --spec first.cy.js,second.cy.js \
  --runs 10 \
  --threads 3
```

execution proceeds as follows:

1. Add `first.cy.js` and `second.cy.js` to the spec queue in that order.
2. Start up to three concurrent runs of `first.cy.js` until all ten repetitions finish.
3. Write the summary for `first.cy.js`.
4. Start up to three concurrent runs of `second.cy.js` until all ten repetitions finish.
5. Write the summary for `second.cy.js`.
6. Write the aggregate execution summary.

The effective concurrency is `min(threads, runs)`. Each worker launches the Cypress executable installed in this repository.

## Console Progress

In an interactive terminal, the runner updates a live status line every second:

```text
[Progress] elapsed 00:02:14 | completed 3/10 | active 2 (4, 5)
```

Completed runs print their status and duration:

```text
[Run 4/10] PASSED (00:00:42)
[Run 5/10] FAILED (exit 1, 00:00:45)
  Reason: AssertionError: expected ...
```

The live updating line is disabled when standard output is not a TTY, such as redirected or most CI output.

## Output Files

The default output directory is:

```text
.local/cypress-run-logs/
```

For each spec, the runner creates:

- One complete Cypress output log per run: `<spec>-run-<number>.log`
- One per-spec report: `<spec>-summary.txt`

When multiple specs are provided, filenames receive a queue-position prefix such as `001-` and `002-` to prevent collisions.

The runner also creates one aggregate report:

```text
execution-summary.txt
```

Before a spec starts, existing run logs with the same generated prefix are removed. Summary files and `execution-summary.txt` are rewritten for the current invocation.

## Per-Run Statistics

Each run entry in a spec summary includes:

- Run number and pass/fail status
- Process exit code on failure
- Start and end timestamps
- Duration in `HH:MM:SS` and milliseconds
- Termination signal, when present
- Parsed failure reason
- Path to the complete Cypress log

The runner retains the complete process output in the run log. Failure-reason parsing uses the latest bounded portion of that output to avoid unbounded memory usage.

## Per-Spec Statistics

Each spec summary includes:

- Spec path and queue position
- Configured runs, threads, browser, and timeout
- Spec start and end timestamps
- Total duration
- Peak concurrency
- Passed and failed counts
- Pass rate
- Classification: `ALL PASSED`, `ALL FAILED`, or `MIXED RESULTS`
- Failure reasons grouped by occurrence count
- Details and log path for every run

## Aggregate Statistics

`execution-summary.txt` includes:

- Execution start and end timestamps
- Total duration
- Number of specs and runs
- Configured threads and observed peak concurrency
- Overall passed and failed counts
- Overall pass rate
- Statistics and summary path for every spec
- Failure reasons grouped across the complete queue

## Exit Status

The command exits with:

- `0` when every run of every spec passes
- `1` when at least one run fails or the runner encounters an error

A failed spec does not stop the queue. Remaining specs still run, and the final exit status reflects failures across the complete execution.
