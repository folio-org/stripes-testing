/* eslint-disable no-console */
const axios = require('axios');
const {
  hasConfig,
  getTestRailConfig,
  getAuthorization,
  getTestRunId,
} = require('cypress-testrail-simple/src/get-config');
const { getCasesInTestRun } = require('cypress-testrail-simple/src/testrail-api');
const { getTestCases } = require('cypress-testrail-simple/src/find-cases');

/**
 * Local replacement for the `cypress-testrail-simple` after:spec reporter.
 *
 * Behaves identically to the upstream plugin (same status mapping, same
 * "only report cases that belong to the run" filtering), with one addition:
 * failed results carry a `comment` containing the spec path and the Cypress
 * error text, so the failure reason is visible in TestRail itself instead of
 * only in ReportPortal / Allure.
 *
 * TestRail results are append-only, so this must be the ONLY thing posting
 * results for a spec - do not also register the upstream plugin, or every
 * test will get two result rows.
 */

const MAX_COMMENT_LENGTH = 4000;

/**
 *  Cypress to TestRail Status Mapping (kept identical to the upstream plugin)
 *
 *  | Cypress status | TestRail Status | TestRail Status ID |
 *  | -------------- | --------------- | ------------------ |
 *  | Passed         | Passed          | 1                  |
 *  | Pending        | Blocked         | 2                  |
 *  | Skipped        | Retest          | 4                  |
 *  | Failed         | Failed          | 5                  |
 */
const DEFAULT_STATUS = {
  passed: 1,
  pending: 2,
  skipped: 4,
  failed: 5,
};

const FAILED_STATUS_ID = DEFAULT_STATUS.failed;

// Cypress colorizes error output; those escape codes are noise in TestRail
// eslint-disable-next-line no-control-regex
const ANSI_PATTERN = /\[[0-9;]*m/g;

function stripAnsi(text) {
  return String(text).replace(ANSI_PATTERN, '');
}

/**
 * Pulls the most useful error text Cypress exposes for a failed test.
 * `displayError` is the formatted message and is present across Cypress 10+;
 * the per-attempt error is used as a fallback.
 */
function getErrorText(test) {
  if (test.displayError) {
    return test.displayError;
  }

  const attempts = Array.isArray(test.attempts) ? test.attempts : [];
  const failedAttempt = [...attempts].reverse().find((attempt) => attempt && attempt.error);

  if (!failedAttempt) {
    return '';
  }

  const { error } = failedAttempt;
  if (typeof error === 'string') {
    return error;
  }

  return [error.message, error.stack].filter(Boolean).join('\n');
}

function buildComment(spec, test) {
  const errorText = stripAnsi(getErrorText(test)).trim();

  const lines = [`Spec: ${spec.relative}`, `Test: ${test.title.join(' > ')}`];

  if (errorText) {
    lines.push('', 'Error:', errorText);
  } else {
    lines.push('', 'Error: (no error text reported by Cypress)');
  }

  const comment = lines.join('\n');

  return comment.length > MAX_COMMENT_LENGTH
    ? `${comment.slice(0, MAX_COMMENT_LENGTH)}\n...(truncated)`
    : comment;
}

function buildSpecResults(spec, results, { caseIds, statusOverride }) {
  const status = { ...DEFAULT_STATUS, ...statusOverride };
  const testRailResults = [];

  results.tests.forEach((test) => {
    // only look at the test name, not at the suite titles
    const testName = test.title[test.title.length - 1];
    const statusId = status[test.state] || FAILED_STATUS_ID;

    // there might be multiple test case IDs per test title
    getTestCases(testName).forEach((caseId) => {
      if (caseIds.length && !caseIds.includes(caseId)) {
        return;
      }

      const testRailResult = { case_id: caseId, status_id: statusId };

      if (statusId === FAILED_STATUS_ID) {
        testRailResult.comment = buildComment(spec, test);
      }

      testRailResults.push(testRailResult);
    });
  });

  return testRailResults;
}

async function sendTestResults(testRailInfo, runId, testResults) {
  const addResultsUrl = `${testRailInfo.host}/index.php?/api/v2/add_results_for_cases/${runId}`;

  await axios.post(
    addResultsUrl,
    { results: testResults },
    {
      headers: {
        'Content-Type': 'application/json',
        authorization: getAuthorization(testRailInfo),
      },
    },
  );
}

/**
 * Builds the after:spec reporter. Returns `null` when TestRail reporting is not
 * configured, so callers can skip it exactly like the upstream plugin does.
 *
 * @param {Cypress.PluginConfigOptions} config
 * @returns {Promise<null | ((spec: object, results: object) => Promise<void>)>}
 */
async function createTestRailReporter(config) {
  if (!hasConfig(process.env)) {
    return null;
  }

  const testRailInfo = getTestRailConfig();
  const runId = getTestRunId(config);

  if (!runId) {
    throw new Error('Missing test rail run ID');
  }

  const caseIds = await getCasesInTestRun(runId, testRailInfo);

  return async function reportSpecResults(spec, results) {
    if (!results || !Array.isArray(results.tests)) {
      return;
    }

    const testRailResults = buildSpecResults(spec, results, {
      caseIds,
      statusOverride: testRailInfo.statusOverride,
    });

    if (!testRailResults.length) {
      return;
    }

    console.log('TestRail results in %s', spec.relative);
    console.table(
      testRailResults.map(({ case_id: caseId, status_id: statusId, comment }) => ({
        case_id: caseId,
        status_id: statusId,
        has_comment: Boolean(comment),
      })),
    );

    try {
      await sendTestResults(testRailInfo, runId, testRailResults);
    } catch (err) {
      console.error('Error sending TestRail results');
      console.error(err && err.message ? err.message : err);

      // Comments are an enhancement - never let them cost us the statuses.
      // Retry once with the plain payload the upstream plugin would have sent.
      const hasComments = testRailResults.some((result) => result.comment);
      if (!hasComments) {
        return;
      }

      console.error('Retrying TestRail results without comments...');
      const plainResults = testRailResults.map(({ case_id: caseId, status_id: statusId }) => ({
        case_id: caseId,
        status_id: statusId,
      }));

      try {
        await sendTestResults(testRailInfo, runId, plainResults);
        console.error('Retry succeeded - statuses reported, comments dropped');
      } catch (retryErr) {
        console.error('Retry without comments also failed');
        console.error(retryErr && retryErr.message ? retryErr.message : retryErr);
      }
    }
  };
}

module.exports = {
  createTestRailReporter,
  // exported for unit-level checks
  buildComment,
  buildSpecResults,
};
