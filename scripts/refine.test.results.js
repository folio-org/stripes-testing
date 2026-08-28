/* eslint-disable no-console */
/* eslint-disable camelcase */

const fs = require('fs');
const { createJiraClient, createTestRailClient } = require('./helpers/api.client');
const {
  getTestHistory,
  getTestRunResults,
  updateTestResult,
  team,
  status,
} = require('./helpers/test.rail.helper');
const { getIssueStatus } = require('./helpers/jira.helper');
require('dotenv').config();

const API_USER = process.env.TESTRAIL_API_USER;
const API_KEY = process.env.TESTRAIL_API_KEY;
const JIRA_API_KEY = process.env.JIRA_API_KEY;
const RUN_ID = process.env.TESTRAIL_RUN_ID;

if (!API_USER || !API_KEY || !JIRA_API_KEY || !RUN_ID) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const jiraClient = createJiraClient(JIRA_API_KEY);
const testrailClient = createTestRailClient(API_USER, API_KEY);

const teams = [
  team.Spitfire,
  team.Firebird,
  team.Folijet,
  team.Thunderjet,
  team.Vega,
  team.Volaris,
];

function getJoinedHistory(history) {
  const historyByDay = history.reduce((acc, result) => {
    const date = new Date(result.created_on * 1000).toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(result);
    return acc;
  }, {});

  const joinedHistory = Object.entries(historyByDay).map(([date, items]) => {
    const dayStatus = items.some((item) => item.status_id === status.Passed)
      ? status.Passed
      : status.Failed;
    // reset defects if day status passed
    const defects =
      dayStatus === status.Passed ? null : items.find((item) => item.defects)?.defects || null;
    return {
      date,
      status_id: dayStatus,
      defects,
    };
  });
  return joinedHistory;
}

function isTestFlaky(history, threshold = 2) {
  const hasFlakyPattern = (hist) => {
    let patternChanged = 0;
    if (hist.length < 1) return false;
    for (let i = 1; i < hist.length; i++) {
      if (hist[i].status_id !== hist[i - 1].status_id) {
        patternChanged++;
      }
    }
    const isFlaky = patternChanged > threshold;
    return isFlaky;
  };
  const hasFlakyPassrate = (hist) => {
    let passed = 0;
    for (const historyItem of hist) {
      if (historyItem.status_id === status.Passed) {
        passed++;
      }
    }
    const passRate = passed / hist.length;
    const isFlaky = passRate > 0.2 && passRate < 0.8;
    return isFlaky;
  };

  return hasFlakyPassrate(history) && hasFlakyPattern(history);
}

async function classifyTestResults(runId) {
  const allTests = await getTestRunResults(testrailClient, runId);

  // Get only Failed tests
  const failedTests = allTests.filter(
    (test) => (test.status_id === status.Failed || test.status_id === status.Retest) &&
      teams.includes(test.custom_dev_team),
  );

  /**
   * Test categories:
   * Regression - test that pass fail on the last run
   * KnownIssue - failed test with known linked deffetc in the history
   * Flaky - test that pass and fail several times for the last 5 runs
   * UnknownFailed - failed test several times in a row for unknown reason
   */
  const resultsList = { regression: [], knownFailed: [], flaky: [], unknownFailed: [], retest: [] };

  for (const test of failedTests) {
    const { case_id, id: testId, status_id } = test;

    // Get test history from 7 days ago
    const endDate = Math.floor(Date.now() / 1000);
    const startDate = endDate - 7 * 24 * 60 * 60;

    const history = (await getTestHistory(testrailClient, case_id, RUN_ID)).results.filter(
      (result) => result.created_on >= startDate && result.created_on <= endDate,
    );

    const joinedHistory = getJoinedHistory(history);

    // Check the historical data for the current test
    const passedInHistory = joinedHistory[0]?.status_id === status.Passed;
    const failedInHistory = joinedHistory.some((result) => result.status_id === status.Failed);
    if (status_id === status.Retest) {
      resultsList.retest.push({ testId, caseId: case_id });
    } else if (status_id === status.Failed && passedInHistory) {
      // If current test failed but passed in the past, mark as potential regression
      resultsList.regression.push({ testId, caseId: case_id });
    } else if (status_id === status.Failed && failedInHistory) {
      // If current test failed and failed in the past, check for linked issues
      const linkedIssue = joinedHistory.find(({ defects }) => defects);
      if (linkedIssue) {
        resultsList.knownFailed.push({ testId, caseId: case_id, defects: linkedIssue.defects });
      } else if (isTestFlaky(joinedHistory)) {
        resultsList.flaky.push({ testId, caseId: case_id });
      } else {
        resultsList.unknownFailed.push({ testId, caseId: case_id });
      }
    } else {
      // If no historical data available, mark as unknown
      resultsList.unknownFailed.push({ testId, caseId: case_id });
    }
  }
  return resultsList;
}

async function analyzeTestResults(runId) {
  const resultsList = await classifyTestResults(runId);

  // Update the tests with linked defects TestRail
  for (const test of resultsList.knownFailed) {
    const { testId, defects } = test;
    const defectStatus = await getIssueStatus(jiraClient, defects);
    if (defectStatus !== 'Closed') {
      await updateTestResult(
        testrailClient,
        testId,
        status.Failed,
        `Linked issues: ${defects}`,
        defects,
      );
    } else {
      resultsList.unknownFailed.push({ testId, caseId: test.caseId });
      resultsList.knownFailed = resultsList.knownFailed.filter((t) => t.testId !== testId);
      console.log(`Defect ${defects} is closed. Skipping...`);
    }
  }

  // Collect files for re-execution
  const ids = [];
  for (const { caseId } of [
    ...resultsList.regression,
    ...resultsList.unknownFailed,
    ...resultsList.retest,
    ...resultsList.flaky,
  ]) {
    ids.push(`C${caseId}`);
  }
  console.log('\n=== Test Classification Summary ===');
  console.log(`Regression: ${resultsList.regression.length}`);
  console.log(`Known Failed: ${resultsList.knownFailed.length}`);
  console.log(`Flaky: ${resultsList.flaky.length}`);
  console.log(`Unknown Failed: ${resultsList.unknownFailed.length}`);
  console.log(`Retest: ${resultsList.retest.length}`);
  console.log(`Total for rerun: ${ids.length}`);
  fs.writeFileSync('./rerun.out', ids.join(' '));
}

// Run the analysis
analyzeTestResults(RUN_ID);
