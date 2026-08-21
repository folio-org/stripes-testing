/* eslint-disable no-console */
require('dotenv/config');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const { LAUNCHES } = require('./constants/constants');
const { getFlakyItems } = require('./services/itemService');
const {
  syncFlakyTickets,
  purgeBelowCriteriaTickets,
  purgeAllFeatureTickets,
} = require('./services/flakyTicketService');
const { createJiraClient } = require('../helpers/api.client');

/**
 * Runs runFailedTests.js for every launch x team combination and prints a single
 * consolidated summary at the end.
 *
 * Usage (from stripes-testing):
 *   node scripts/report-portal/runFailedTestsMatrix.js
 *   node scripts/report-portal/runFailedTestsMatrix.js --teams Firebird,Corsair --concurrency 2
 *   node scripts/report-portal/runFailedTestsMatrix.js --launches runNightlyCypressEurekaTests
 *   node scripts/report-portal/runFailedTestsMatrix.js --epic UXPROD-5976
 *   node scripts/report-portal/runFailedTestsMatrix.js --sync-only --epic UXPROD-5976
 *
 * Options:
 *   --teams              Comma-separated team names (default: TEAMS env or Firebird,Corsair)
 *   --launches           Comma-separated launch names (default: LAUNCHES env or all supported)
 *   --concurrency        Max runs in parallel (default: CONCURRENCY env or 4)
 *   --headed             Run Cypress in headed mode
 *   --auto-close-stable  Actually close flaky tickets whose test has been stable for
 *                        STABLE_STREAK_THRESHOLD runs. OFF by default (a stable ticket
 *                        is reported but left open) — must be opted into explicitly via
 *                        this flag or JIRA_FLAKY_AUTO_CLOSE=true, since closing Jira
 *                        tickets is a hard-to-reverse action.
 *
 * Precedence for teams / launches / concurrency / epic / auto-close-stable:
 *   CLI flag > env var (.env) > default.
 * Relevant .env vars: TEAMS, LAUNCHES, CONCURRENCY, JIRA_EPIC, JIRA_FLAKY_AUTO_CLOSE.
 *   --sync-only    Skip the Cypress reruns; only collect tests already marked flaky
 *                  in Report Portal and sync them to the epic. Useful to (re)create
 *                  tickets without re-running tests.
 *   --epic KEY     After runs, create/update one Jira task per flaky test case
 *                  under the given epic (summary matches the TestRail case name,
 *                  e.g. "C1385659 ... (Firebird)"). Existing tickets are not
 *                  duplicated; their description is enriched with fail dates,
 *                  counts, Report Portal links and the TestRail link.
 *                  Defaults to the JIRA_EPIC env var. Requires JIRA_API_KEY in
 *                  the environment / .env file.
 */

const DEFAULT_CONCURRENCY = 4;
const DEFAULT_TEAMS = ['Firebird', 'Corsair'];
const DEFAULT_LAUNCHES = [
  LAUNCHES.NIGHTLY,
  LAUNCHES.QG,
  LAUNCHES.RELEASE_NON_ECS,
  LAUNCHES.RELEASE_ECS,
];
const LOGS_DIR = path.resolve(process.cwd(), 'logs');
const SCRIPT = path.join(__dirname, 'runFailedTests.js');

function parseArgs() {
  const argv = process.argv.slice(2);
  const parseList = (value) => value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  // Precedence: CLI flag > env var (.env) > built-in default.
  const args = {
    teams: process.env.TEAMS ? parseList(process.env.TEAMS) : DEFAULT_TEAMS,
    launches: process.env.LAUNCHES ? parseList(process.env.LAUNCHES) : DEFAULT_LAUNCHES,
    concurrency: process.env.CONCURRENCY
      ? Math.max(1, parseInt(process.env.CONCURRENCY, 10) || 1)
      : DEFAULT_CONCURRENCY,
    headed: false,
    epic: null,
    syncOnly: false,
    resetBelowCriteria: false,
    resetAll: false,
    // Off by default: closing Jira tickets is hard to reverse, so it must be opted
    // into via JIRA_FLAKY_AUTO_CLOSE=true or --auto-close-stable.
    autoCloseStable: /^(1|true)$/i.test(process.env.JIRA_FLAKY_AUTO_CLOSE || ''),
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--headed') {
      args.headed = true;
    } else if (arg === '--sync-only') {
      args.syncOnly = true;
    } else if (arg === '--auto-close-stable') {
      args.autoCloseStable = true;
    } else if (arg === '--reset-below-criteria') {
      args.resetBelowCriteria = true;
    } else if (arg === '--reset-all') {
      args.resetAll = true;
    } else if (arg === '--teams' && argv[i + 1]) {
      args.teams = parseList(argv[++i]);
    } else if (arg === '--launches' && argv[i + 1]) {
      args.launches = parseList(argv[++i]);
    } else if (arg === '--concurrency' && argv[i + 1]) {
      args.concurrency = Math.max(1, parseInt(argv[++i], 10) || 1);
    } else if (arg === '--epic' && argv[i + 1]) {
      args.epic = argv[++i].trim();
    }
  }

  // Fall back to the JIRA_EPIC env var so flaky-test tickets are created/updated
  // even when --epic is not passed on the command line.
  if (!args.epic && process.env.JIRA_EPIC) {
    args.epic = process.env.JIRA_EPIC.trim();
  }

  return args;
}

/**
 * Run a single launch/team combination as a child process.
 * @returns {Promise<Object>} Result summary for the combo
 */
function runCombo({ launchName, team, headed }) {
  return new Promise((resolve) => {
    const logFile = path.join(LOGS_DIR, `${launchName}-${team}.log`);
    const logStream = fs.createWriteStream(logFile);

    const cliArgs = [SCRIPT, '--launchName', launchName, '--team', team];
    if (headed) cliArgs.push('--headed');

    const label = `${launchName} / ${team}`;
    console.log(`▶ Starting: ${label}  (log: ${path.relative(process.cwd(), logFile)})`);

    const child = spawn('node', cliArgs, { cwd: process.cwd() });

    let stdout = '';

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
      logStream.write(chunk);
    });
    child.stderr.on('data', (chunk) => logStream.write(chunk));

    child.on('close', (code) => {
      logStream.end();

      // Parse the RESULT_SUMMARY line emitted by runFailedTests.js
      const match = stdout.match(/RESULT_SUMMARY (\{.*})/);
      let summary = null;
      if (match) {
        try {
          summary = JSON.parse(match[1]);
        } catch {
          summary = null;
        }
      }

      // Parse the "Test files to rerun: X spec file(s)" line for the specs count
      const specsMatch = stdout.match(/Test files to rerun:\s*(\d+)\s*spec file/);
      const specs = specsMatch ? parseInt(specsMatch[1], 10) : null;

      const status = code === 0 ? 'done' : `FAILED (exit ${code})`;
      const found = summary?.failed ?? specs ?? '?';
      console.log(
        `✔ Finished: ${label}  → ${status}  (found ${found} test(s), ${specs ?? '?'} spec file(s))`,
      );

      resolve({
        launchName,
        team,
        exitCode: code,
        failed: summary?.failed ?? null,
        specs,
        marked: summary?.marked ?? null,
        stillFailing: summary?.stillFailing ?? null,
        logFile,
      });
    });
  });
}

/**
 * Run tasks with a bounded concurrency.
 */
async function runWithConcurrency(tasks, concurrency) {
  const results = [];
  let index = 0;

  async function worker() {
    while (index < tasks.length) {
      const current = index++;
      results[current] = await tasks[current]();
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, tasks.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function printSummary(results) {
  const col = (v, w) => String(v ?? '-').padEnd(w);
  const num = (v, w) => String(v ?? '-').padStart(w);

  const L = Math.max(20, ...results.map((r) => r.launchName.length));
  const T = Math.max(6, ...results.map((r) => r.team.length));

  const lines = [];
  const push = (s = '') => lines.push(s);

  push('='.repeat(L + T + 50));
  push('  CONSOLIDATED SUMMARY (all runs)');
  push('='.repeat(L + T + 50));
  push(
    `  ${col('LAUNCH', L)}  ${col('TEAM', T)}  ${num('FAILED', 7)}  ${num('SPECS', 7)}  ${num('MARKED', 7)}  ${num('STILL', 7)}  STATUS`,
  );
  push(`  ${'-'.repeat(L + T + 48)}`);

  let totFailed = 0;
  let totSpecs = 0;
  let totMarked = 0;
  let totStill = 0;

  for (const r of results) {
    if (typeof r.failed === 'number') totFailed += r.failed;
    if (typeof r.specs === 'number') totSpecs += r.specs;
    if (typeof r.marked === 'number') totMarked += r.marked;
    if (typeof r.stillFailing === 'number') totStill += r.stillFailing;

    const status = r.exitCode === 0 ? 'OK' : `ERR(${r.exitCode})`;
    push(
      `  ${col(r.launchName, L)}  ${col(r.team, T)}  ${num(r.failed, 7)}  ${num(r.specs, 7)}  ${num(r.marked, 7)}  ${num(r.stillFailing, 7)}  ${status}`,
    );
  }

  push(`  ${'-'.repeat(L + T + 48)}`);
  push(
    `  ${col('TOTAL', L)}  ${col('', T)}  ${num(totFailed, 7)}  ${num(totSpecs, 7)}  ${num(totMarked, 7)}  ${num(totStill, 7)}`,
  );
  push('='.repeat(L + T + 50));

  const table = lines.join('\n');
  console.log(`\n${table}`);
  console.log(
    '\nColumns: FAILED = to-investigate found, SPECS = spec files rerun, MARKED = marked flaky, STILL = still failing.',
  );
  console.log(`Per-run logs are in: ${path.relative(process.cwd(), LOGS_DIR)}/\n`);

  return table;
}

/**
 * After all runs, query Report Portal for the tests marked as FLAKY per launch x team,
 * returning them grouped with their RP UI links.
 */
async function collectFlakyTests(launches, teams) {
  const groups = [];
  for (const launchName of launches) {
    for (const team of teams) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const { flakyItems, launchId } = await getFlakyItems({ launchName, team });
        const tests = flakyItems
          .filter((it) => it.type === 'STEP')
          .map((it) => ({
            name: it.name,
            rpLink: it.rpLink,
            startTime: it.startTime,
            uniqueId: it.uniqueId,
            launchId,
          }));
        groups.push({ launchName, team, tests });
      } catch (err) {
        groups.push({ launchName, team, tests: [], error: err.message });
      }
    }
  }
  return groups;
}

async function main() {
  const {
    teams,
    launches,
    concurrency,
    headed,
    epic,
    syncOnly,
    resetBelowCriteria,
    resetAll,
    autoCloseStable,
  } = parseArgs();

  fs.mkdirSync(LOGS_DIR, { recursive: true });

  // Hard reset: delete EVERY ticket associated with the feature (linked via "Relates" or
  // labelled by this automation), regardless of history/criteria, then exit so a fresh
  // sync can recreate them cleanly from Report Portal.
  if (resetAll) {
    if (!epic) {
      console.error('✗ --reset-all requires an epic (pass --epic KEY or set JIRA_EPIC).');
      process.exit(1);
    }
    const jiraApiKey = process.env.JIRA_API_KEY;
    if (!jiraApiKey) {
      console.error('✗ JIRA_API_KEY is not set (add it to your environment or .env).');
      process.exit(1);
    }
    const jiraClient = createJiraClient(jiraApiKey);
    const { deleted } = await purgeAllFeatureTickets(jiraClient, { featureKey: epic });
    console.log(
      `\n✔ Hard reset done under ${epic}: ${deleted.length} deleted. ` +
        'Re-run with --sync-only to recreate fresh tickets from Report Portal.',
    );
    process.exit(0);
  }

  // One-time reset: delete stale flaky tickets whose test no longer meets the create
  // criteria (e.g. old tickets carrying 30-run statistics), then exit so a subsequent
  // normal sync can recreate them fresh with correctly-scoped 10-run history.
  if (resetBelowCriteria) {
    if (!epic) {
      console.error(
        '✗ --reset-below-criteria requires an epic (pass --epic KEY or set JIRA_EPIC).',
      );
      process.exit(1);
    }
    const jiraApiKey = process.env.JIRA_API_KEY;
    if (!jiraApiKey) {
      console.error('✗ JIRA_API_KEY is not set (add it to your environment or .env).');
      process.exit(1);
    }
    const jiraClient = createJiraClient(jiraApiKey);
    const { deleted, kept } = await purgeBelowCriteriaTickets(jiraClient, { featureKey: epic });
    console.log(
      `\n✔ Reset done under ${epic}: ${deleted.length} deleted, ${kept.length} kept. ` +
        'Re-run without --reset-below-criteria to recreate fresh tickets.',
    );
    process.exit(0);
  }

  let results = [];
  if (syncOnly) {
    console.log(
      'Sync-only mode: skipping Cypress reruns; collecting tests already marked flaky in Report Portal.\n',
    );
    if (!epic) {
      console.error('✗ --sync-only requires an epic (pass --epic KEY or set JIRA_EPIC).');
      process.exit(1);
    }
  } else {
    const combos = [];
    for (const launchName of launches) {
      for (const team of teams) {
        combos.push({ launchName, team, headed });
      }
    }

    console.log(
      `Running ${combos.length} combination(s): ${launches.length} launch(es) x ${teams.length} team(s), concurrency=${concurrency}\n`,
    );

    const tasks = combos.map((combo) => () => runCombo(combo));
    results = await runWithConcurrency(tasks, concurrency);

    printSummary(results);
  }

  // Optionally create/update one Jira task per flaky test case under an epic.
  if (epic) {
    try {
      const jiraApiKey = process.env.JIRA_API_KEY;
      if (!jiraApiKey) {
        throw new Error('JIRA_API_KEY is not set (add it to your environment or .env)');
      }

      console.log('\nCollecting flaky tests from Report Portal for epic tickets...');
      const flakyGroups = await collectFlakyTests(launches, teams);

      const jiraClient = createJiraClient(jiraApiKey);
      const ticketResults = await syncFlakyTickets(
        jiraClient,
        { epicKey: epic, autoCloseStable },
        flakyGroups,
      );
      const { synced, closed, deleted, stableSkipped, reconcileErrors } = ticketResults;

      const created = synced.filter((r) => r.action === 'created').length;
      const updated = synced.filter((r) => r.action === 'updated').length;
      const reopened = synced.filter((r) => r.action === 'reopened').length;
      const skipped = synced.filter((r) => r.action === 'skipped').length;
      const syncErrored = synced.filter((r) => r.action === 'error').length;
      const reconcileErrored = (reconcileErrors || []).length;
      const errored = syncErrored + reconcileErrored;
      const closedCount = closed.length;
      const deletedCount = (deleted || []).length;
      const stableSkippedCount = (stableSkipped || []).length;
      console.log(
        `\n✔ Flaky tickets synced under ${epic}: ${created} created, ${updated} updated, ` +
          `${reopened} reopened, ${skipped} skipped, ${closedCount} closed (stable), ` +
          `${deletedCount} deleted (below criteria), ${stableSkippedCount} stable but not ` +
          `closed (auto-close disabled), ${errored} failed.`,
      );
      if (stableSkippedCount && !autoCloseStable) {
        console.log(
          '  (pass --auto-close-stable or set JIRA_FLAKY_AUTO_CLOSE=true to close stable tickets)',
        );
      }

      // Save a local audit copy of what was synced.
      const ticketsFile = path.join(LOGS_DIR, `flaky-tickets-${epic}.json`);
      fs.writeFileSync(ticketsFile, JSON.stringify(ticketResults, null, 2));
      console.log(`  (saved a copy to ${path.relative(process.cwd(), ticketsFile)})`);
    } catch (err) {
      console.error(`✗ Failed to sync flaky tickets: ${err.message}`);
    }
  }

  const anyFailed = results.some((r) => r.exitCode !== 0);
  process.exit(anyFailed ? 1 : 0);
}

main();
