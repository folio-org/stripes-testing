/* eslint-disable no-console */
/* eslint-disable camelcase */

// Copies "known defect" results from one TestRail run to another.
//
// For every test (filtered by dev team) in SOURCE_RUN_ID, looks at the most recent
// HISTORY_DEPTH results (the last result plus its previous ones). If any of those
// results has a "Defects" value (Jira key) set, the most recent one of those wins.
// That result's status + defects are then posted onto the matching case (by case_id)
// in TARGET_RUN_ID.
//
// Tests with no defect found in the inspected history window are left untouched.
//
// Both runs can be long-lived (e.g. a nightly run reused for months), so a plain bulk
// get_results_for_run would grow unboundedly over time. History is instead fetched hybrid-
// style: one bulk get_results_for_run call bounded by HISTORY_LOOKBACK_DAYS, and only cases
// with zero results in that window fall back to a direct per-case get_results_for_case call.
const { createTestRailClient } = require('./helpers/api.client');
const {
  getTestRunResults,
  getTestHistory,
  getResultsForRun,
  updateMultipleTestResults,
  team,
  status,
} = require('./helpers/test.rail.helper');
require('dotenv').config();

// ==================== CONFIG ====================
const SOURCE_RUN_ID = 3703;
const TARGET_RUN_ID = 3695;
const TEAMS = [
  team.Spitfire,
  team.Folijet,
  team.Promin,
  team.Firebird,
  team.Thunderjet,
  team.Vega,
  team.Volaris,
  team.Corsair,
  team.Eureka,
  team.Citation,
];
// How many of the most recent results per test to inspect for a Defects value
// (1 = last result only, 3 = last result + 2 previous ones, etc.)
const HISTORY_DEPTH = 1;
// How many days back the bulk history fetch (get_results_for_run) looks, for both runs.
// Cases with no results in that window get a per-case get_results_for_case fallback call.
const HISTORY_LOOKBACK_DAYS = 5;
// When true, only logs what would be posted - nothing is written to TestRail.
const ADVISORY_MODE = false;
// Skip tests whose target-run test already has a Defects value assigned - someone already
// reviewed/linked those, so they're left untouched.
const SKIP_TARGET_ALREADY_HAS_DEFECT = true;
// Skip a match when the found defect is one of these Jira keys - e.g. a defect known to be
// not applicable to the target run for technical reasons (specific env, temporary issue, etc.)
const SKIP_DEFECT_KEYS = [];
// When true, posted results use STATUS_FOR_OVERRIDE instead of the status found in the source
// run. Only applies to tests that already passed all the filtering above (not Passed in the
// target run, not already linked to a defect there, defect not excluded, etc.) - it does not
// widen which tests get touched, only what status is written for them.
const OVERRIDE_STATUS = false;
// Status name to use when OVERRIDE_STATUS is true - must be a value from the `status` dictionary
// (e.g. status.Retest, status.Failed, 5, 4). An invalid value disables the override and logs a warning.
const STATUS_FOR_OVERRIDE = null;
// ==================================================

const API_USER = process.env.TESTRAIL_API_USER;
const API_KEY = process.env.TESTRAIL_API_KEY;

if (!API_USER || !API_KEY) {
  console.error('Missing required environment variables: TESTRAIL_API_USER / TESTRAIL_API_KEY');
  process.exit(1);
}

const testRailClient = createTestRailClient(API_USER, API_KEY);

// TestRail returns 429 with a Retry-After header once its rate limit is hit; bulk history
// fetches can page through a lot of results, so retry instead of failing outright.
testRailClient.interceptors.response.use(undefined, async (error) => {
  const { response, config } = error;
  config.__retryCount = config.__retryCount || 0;
  if (response?.status === 429 && config.__retryCount < 4) {
    config.__retryCount += 1;
    const waitSeconds = Number(response.headers['retry-after']) || 5;
    console.log(`  (rate limited, waiting ${waitSeconds}s...)`);
    await new Promise((resolve) => {
      setTimeout(resolve, waitSeconds * 1000);
    });
    return testRailClient(config);
  }
  return Promise.reject(error);
});

const statusNameById = Object.fromEntries(Object.entries(status).map(([name, id]) => [id, name]));

// Resolved once at startup: null means "post the source run's status as-is".
const overrideStatusId = (() => {
  if (!OVERRIDE_STATUS) {
    return null;
  }
  const id = STATUS_FOR_OVERRIDE;
  const key = Object.entries(status).find((entry) => entry[1] === id)?.[0];
  if (!key) {
    console.error(
      `OVERRIDE_STATUS is true but STATUS_FOR_OVERRIDE ('${id}') is not a valid status id. ` +
        `Valid ids: ${Object.entries(status)
          .map((entry) => `${entry[0]}: ${entry[1]}`)
          .join(', ')}. Ignoring the override - posting each test's source run status instead.`,
    );
    return null;
  }
  console.log(
    `OVERRIDE_STATUS is enabled: every posted result will use status '${key}' (id ${id}) instead of the source run's status.`,
  );
  return id;
})();

// Unix seconds - the bulk history fetch only asks TestRail for results created on/after this.
const createdAfterTimestamp = Math.floor(Date.now() / 1000) - HISTORY_LOOKBACK_DAYS * 24 * 60 * 60;

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function hasDefect(defectsValue) {
  return typeof defectsValue === 'string' && defectsValue.trim().length > 0;
}

// Expects results sorted newest-first (see groupResultsByCaseId), so within the inspected
// window the first entry that has a defect is the most recent one - it wins.
function findResultWithDefect(results) {
  return results.slice(0, HISTORY_DEPTH).find((result) => hasDefect(result.defects)) || null;
}

function extractDefectKeys(defectsValue) {
  return (defectsValue || '')
    .split(',')
    .map((key) => key.trim())
    .filter(Boolean);
}

function isExcludedDefect(defectsValue) {
  const keys = extractDefectKeys(defectsValue);
  return keys.some((key) => SKIP_DEFECT_KEYS.includes(key));
}

// Groups get_results_for_run output by case_id (via a test_id -> case_id map), newest-first
// per group - the same shape get_results_for_case used to return for a single case.
function groupResultsByCaseId(results, testIdToCaseId) {
  const byCaseId = new Map();
  results.forEach((result) => {
    const caseId = testIdToCaseId.get(result.test_id);
    if (caseId !== undefined) {
      if (!byCaseId.has(caseId)) {
        byCaseId.set(caseId, []);
      }
      byCaseId.get(caseId).push(result);
    }
  });
  byCaseId.forEach((history) => {
    history.sort((a, b) => (b.created_on || 0) - (a.created_on || 0));
  });
  return byCaseId;
}

// Hybrid history fetch for one run, scoped to `caseIds`: one bulk get_results_for_run call
// bounded by createdAfterTimestamp, then a direct per-case get_results_for_case fallback for
// any case with zero results in that window (so long-lived runs don't silently lose an
// older-but-still-relevant result). Both sources end up in the same case_id -> result[]
// shape (newest-first), so downstream analysis (findResultWithDefect, latest-result checks)
// doesn't need to know which path a given case's history came from.
async function fetchHistoryByCaseId(runId, runTests, caseIds) {
  const testIdToCaseId = new Map(runTests.map((test) => [test.id, test.case_id]));
  const bulkResults = await getResultsForRun(testRailClient, runId, createdAfterTimestamp);
  const historyByCaseId = groupResultsByCaseId(bulkResults, testIdToCaseId);

  const missingCaseIds = caseIds.filter((caseId) => !historyByCaseId.has(caseId));
  if (missingCaseIds.length > 0) {
    console.log(
      `  ${missingCaseIds.length} case(s) had no results in the last ${HISTORY_LOOKBACK_DAYS} day(s) in run #${runId}; ` +
        'falling back to direct history calls for those.',
    );
  }
  for (const caseId of missingCaseIds) {
    const fallbackHistory = (await getTestHistory(testRailClient, caseId, runId)).results || [];
    historyByCaseId.set(caseId, fallbackHistory);
  }

  return historyByCaseId;
}

async function buildResultsToPost() {
  console.log(`Fetching tests from source run #${SOURCE_RUN_ID}...`);
  const sourceTests = await getTestRunResults(testRailClient, SOURCE_RUN_ID);
  const teamTests = sourceTests.filter((test) => TEAMS.includes(test.custom_dev_team));
  console.log(
    `Found ${teamTests.length} tests for teams [${TEAMS.join(', ')}] out of ${sourceTests.length} total in run #${SOURCE_RUN_ID}.`,
  );

  console.log(`Fetching tests from target run #${TARGET_RUN_ID}...`);
  const targetTests = await getTestRunResults(testRailClient, TARGET_RUN_ID);
  const targetTestByCaseId = new Map(targetTests.map((test) => [test.case_id, test]));

  const resultsToPost = [];
  const skippedNoDefect = [];
  const skippedNoTargetCase = [];
  const skippedTargetPassed = [];
  const skippedTargetHasDefect = [];
  const skippedDefectKeyExcluded = [];

  // First pass - purely from already-fetched get_tests data: which team tests have a
  // corresponding, not-yet-Passed test in the target run.
  const candidates = [];
  teamTests.forEach((test) => {
    const { case_id: caseId } = test;
    const targetTest = targetTestByCaseId.get(caseId);
    if (!targetTest) {
      skippedNoTargetCase.push(caseId);
    } else if (targetTest.status_id === status.Passed) {
      skippedTargetPassed.push(caseId);
    } else {
      candidates.push({ caseId, targetTest });
    }
  });

  // Second pass: of those candidates, which already have a defect assigned in the target run.
  let toCheck = candidates;
  if (SKIP_TARGET_ALREADY_HAS_DEFECT) {
    console.log(
      `Fetching results from target run #${TARGET_RUN_ID} (last ${HISTORY_LOOKBACK_DAYS} day(s), bulk + fallback) ` +
        `to find already-assigned defects for ${candidates.length} candidate(s)...`,
    );
    const targetHistoryByCaseId = await fetchHistoryByCaseId(
      TARGET_RUN_ID,
      targetTests,
      candidates.map(({ caseId }) => caseId),
    );

    toCheck = [];
    candidates.forEach(({ caseId, targetTest }) => {
      const latestTargetResult = (targetHistoryByCaseId.get(caseId) || [])[0];
      if (hasDefect(latestTargetResult?.defects)) {
        skippedTargetHasDefect.push(caseId);
      } else {
        toCheck.push({ caseId, targetTest });
      }
    });
  }

  console.log(
    `Checking history for ${toCheck.length} tests eligible in run #${TARGET_RUN_ID} ` +
      `(skipped ${skippedTargetPassed.length} already Passed, ${skippedTargetHasDefect.length} already linked to a defect, ` +
      `${skippedNoTargetCase.length} not present there).`,
  );

  console.log(
    `Fetching results from source run #${SOURCE_RUN_ID} (last ${HISTORY_LOOKBACK_DAYS} day(s), bulk + fallback) ` +
      `for ${toCheck.length} eligible test(s)...`,
  );
  const sourceHistoryByCaseId = await fetchHistoryByCaseId(
    SOURCE_RUN_ID,
    sourceTests,
    toCheck.map(({ caseId }) => caseId),
  );

  toCheck.forEach(({ caseId, targetTest }) => {
    const history = sourceHistoryByCaseId.get(caseId) || [];
    const matched = findResultWithDefect(history);

    if (!matched) {
      skippedNoDefect.push(caseId);
    } else if (isExcludedDefect(matched.defects)) {
      skippedDefectKeyExcluded.push(caseId);
    } else {
      const finalStatusId = overrideStatusId !== null ? overrideStatusId : matched.status_id;
      const comment =
        overrideStatusId !== null
          ? `Copied from run #${SOURCE_RUN_ID} (case C${caseId}, defect ${matched.defects}); ` +
            `status overridden to '${STATUS_FOR_OVERRIDE}' (source run status was '${statusNameById[matched.status_id] || matched.status_id}').`
          : `Copied from run #${SOURCE_RUN_ID} (case C${caseId}, defect ${matched.defects}).`;
      resultsToPost.push({
        caseId,
        test_id: targetTest.id,
        status_id: finalStatusId,
        defects: matched.defects,
        comment,
      });
    }
  });

  console.log(
    `Matched ${resultsToPost.length} test(s) with a defect out of ${toCheck.length} checked.`,
  );

  return {
    resultsToPost,
    skippedNoDefect,
    skippedNoTargetCase,
    skippedTargetPassed,
    skippedTargetHasDefect,
    skippedDefectKeyExcluded,
    teamTestsCount: teamTests.length,
  };
}

async function run() {
  const {
    resultsToPost,
    skippedNoDefect,
    skippedNoTargetCase,
    skippedTargetPassed,
    skippedTargetHasDefect,
    skippedDefectKeyExcluded,
    teamTestsCount,
  } = await buildResultsToPost();

  const checkedCount =
    resultsToPost.length + skippedNoDefect.length + skippedDefectKeyExcluded.length;

  console.log('\n=== Summary ===');
  console.log(`Tests checked (source run, selected teams): ${teamTestsCount}`);
  console.log(
    `  -> skipped, already Passed in run #${TARGET_RUN_ID}: ${skippedTargetPassed.length}`,
  );
  console.log(
    `  -> skipped, already linked to a defect in run #${TARGET_RUN_ID}: ${skippedTargetHasDefect.length}`,
  );
  console.log(
    `  -> skipped, case not found in run #${TARGET_RUN_ID}: ${skippedNoTargetCase.length}`,
  );
  console.log(`  -> history checked: ${checkedCount}`);
  console.log(
    `    -> defect found in last ${HISTORY_DEPTH} results, to be posted: ${resultsToPost.length}`,
  );
  console.log(
    `    -> defect found but key is excluded (SKIP_DEFECT_KEYS): ${skippedDefectKeyExcluded.length}`,
  );
  console.log(`    -> no defect found: ${skippedNoDefect.length}`);

  if (skippedNoTargetCase.length > 0) {
    console.log(
      `  Cases missing from target run: ${skippedNoTargetCase.map((id) => `C${id}`).join(', ')}`,
    );
  }

  if (resultsToPost.length === 0) {
    console.log('\nNothing to post. Exiting.');
    return;
  }

  console.log(
    `\n${ADVISORY_MODE ? '[ADVISORY MODE] Would post' : 'Will post'} the following results to run #${TARGET_RUN_ID}:`,
  );
  resultsToPost.forEach(({ caseId, status_id, defects }) => {
    console.log(
      `  C${caseId}: status=${statusNameById[status_id] || status_id}, defects=${defects}`,
    );
  });

  if (ADVISORY_MODE) {
    console.log('\n[ADVISORY MODE] Nothing was written to TestRail.');
    return;
  }

  const timeout = 10; // seconds
  for (let i = 1; i <= timeout; i++) {
    console.log(`Posting in ${timeout - i} seconds... To abort press CTRL+C!`);
    await sleep(1000);
  }

  const blockSize = 500;
  for (let i = 0; i < resultsToPost.length; i += blockSize) {
    const block = resultsToPost
      .slice(i, i + blockSize)
      .map(({ test_id, status_id, defects, comment }) => ({
        test_id,
        status_id,
        defects,
        comment,
      }));
    console.log(
      `Posting block ${Math.floor(i / blockSize) + 1} (${block.length} results) to run #${TARGET_RUN_ID}...`,
    );
    await updateMultipleTestResults(testRailClient, TARGET_RUN_ID, block);
  }

  console.log('Done.');
}

run().catch((error) => {
  console.error('Fatal error:', error?.response?.data || error.message);
  process.exit(1);
});
