/* eslint-disable no-console */
/* eslint-disable camelcase */
const axios = require('axios');
const { glob } = require('glob');
const fs = require('fs');
const { getTestNames } = require('find-test-names');

const TESTRAIL_HOST = 'https://foliotest.testrail.io/';
const API_USER = 'SpecialEBS-FOLKaratetestsfailure@epam.com';
const API_KEY = 'Folio-lsp11';

const JIRA_API_KEY =
  'dmFkeW1feWVyZW1pY2hldkBlcGFtLmNvbTpBVEFUVDN4RmZHRjBKR2Nka0JmSEZpWUdLdXIzcE5TZXhhb1FjdWIycUJOVUU5TkhDQl95WlVVOEtLWjR2bkRrRFJQTnVWYkxZWi05VU5rX3JOLTA1SG8tNElKdVFfcFdnTE95OHhwc1dpR2dWVFJabUtDMjhXOFNmcG5JN0VHSXFETU0xZ05YcUo3bnNTd20tOW1hemZxaWZYR0ZWOEg3MVRFczlESU9VQ05najhkU3VCMnNJb0k9MDZGMDk3Q0U=';

const RUN_ID = 2108; // Set your test run ID

const status = {
  Passed: 1,
  Blocked: 2,
  Untested: 3,
  Retest: 4,
  Failed: 5,
};

const team = {
  Firebird: 3,
  Folijet: 4,
  Spitfire: 6,
  Thunderjet: 8,
  Vega: 9,
  Volaris: 13,
  Corsair: 19,
};

// TestRail API client setup
const api = axios.create({
  baseURL: `${TESTRAIL_HOST}/index.php?/api/v2/`,
  auth: {
    username: API_USER,
    password: API_KEY,
  },
});

// TestRail API client setup
const jiraApi = axios.create({
  baseURL: 'https://folio-org.atlassian.net/rest/api/2/',
  headers: {
    Authorization: `Basic ${JIRA_API_KEY}`,
  },
});

async function getIssue(key) {
  const response = await jiraApi.get(`issue/${key}`);
  if (response.status !== 200) {
    throw new Error('Error fetching issue: ' + key);
  }
  return response.data;
}

async function getIssueStatus(key) {
  this.issues = this.issues || {};
  if (!this.issues[key]) {
    this.issues[key] = (await getIssue(key)).fields.status.name;
  }
  return this.issues[key];
}

function removeRootPath(path) {
  return path.substring(path.indexOf('cypress\\e2e\\'));
}
function titleContainsId(title, testCaseIds) {
  if (title === undefined) {
    return false;
  }
  for (let i = 0; i < testCaseIds.length; i++) {
    if (title.includes(testCaseIds[i])) {
      return true;
    }
  }
  return false;
}

// Fetch test run results
async function getTestRunResults(runId) {
  async function getTest(offset) {
    const response = await api.get(`get_tests/${runId}`, {
      params: {
        offset,
      },
    });
    return response.data;
  }

  const tests = [];
  try {
    let offset = 0;
    let resp;
    do {
      resp = await getTest(offset);
      tests.push(...resp.tests);
      offset += resp.size;
    } while (resp._links.next != null);
  } catch (error) {
    console.error('Error fetching test results:', error);
  }
  return tests;
}

// Fetch test result history for a test case
async function getTestHistory(caseId) {
  try {
    const response = await api.get(`get_results_for_case/${RUN_ID}/${caseId}`, {
      params: {
        limit: 20,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    return [];
  }
}

async function updateTestResult(testId, statusId, comment, defects) {
  // eslint-disable-next-line no-unreachable
  try {
    await api.post(`add_result/${testId}`, {
      status_id: statusId,
      comment,
      defects,
    });
    console.log(`Test ${testId} updated successfully.`);
  } catch (error) {
    console.error('Error updating test result:', error);
  }
}

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
  const allTests = await getTestRunResults(runId);

  // Get only Failed tests
  const failedTests = allTests.filter(
    (test) => test.status_id === 5 && test.custom_dev_team === team.Spitfire,
  );

  /**
   * Test categories:
   * Regression - test that pass fail on the last run
   * KnownIssue - failed test with known linked deffetc in the history
   * Flaky - test that pass and fail several times for the last 5 runs
   * UnknownFailed - failed test several times in a row for unknown reason
   */
  const resultsList = { regression: [], knownFailed: [], flaky: [], unknownFailed: [] };

  for (const test of failedTests) {
    const { case_id, id: testId, status_id } = test;

    // Get test history from 2 days ago
    const startDate =
      Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 4) / 1000;
    const endDate =
      Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 1000;
    const history = (await getTestHistory(case_id)).results.filter(
      (result) => result.created_on >= startDate && result.created_on <= endDate,
    );

    const joinedHistory = getJoinedHistory(history);

    // Check the historical data for the current test
    const passedInHistory = joinedHistory[0].status_id === status.Passed;
    const failedInHistory = joinedHistory.some((result) => result.status_id === status.Failed);

    if (status_id === status.Failed && passedInHistory) {
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
    }
  }
  return resultsList;
}

async function analyzeTestResults(runId) {
  const resultsList = await classifyTestResults(runId);

  // Update the tests with linked defects TestRail
  for (const test of resultsList.knownFailed) {
    const { testId, defects } = test;
    const defectStatus = await getIssueStatus(defects);
    if (defectStatus !== 'Closed') {
      await updateTestResult(testId, status.Failed, `Linked issues: ${defects}`, defects);
    } else {
      console.log(`Defect ${defects} is closed. Skipping...`);
    }
  }

  // Collect files for re-execution
  const ids = [];
  for (const { caseId } of [...resultsList.regression, ...resultsList.flaky]) {
    ids.push(`C${caseId}`);
  }

  const testFilesList = (await glob('cypress/e2e/**/*'))
    .filter((file) => file.includes('.cy.js'))
    .map((file) => removeRootPath(file).replace(/\\/g, '/'));

  let filteredFiles = [];
  testFilesList.forEach((file) => {
    const fileContent = fs.readFileSync(file, { encoding: 'utf8' });
    const names = getTestNames(fileContent).tests.filter(
      (test) => test.type === 'test' && titleContainsId(test.name, ids),
    );
    if (names.length > 0) {
      filteredFiles.push(file);
    }
  });
  filteredFiles = Array.from(new Set(filteredFiles));
  filteredFiles.sort();

  console.log(JSON.stringify(resultsList, null, 2));
  console.log(
    `To run tests use the following command: \n\n npx cypress run -b chrome --spec "${filteredFiles.join(',')}"`,
  );
  fs.writeFileSync('./test-to-rerun.txt', filteredFiles.join(','));
}

// Run the analysis
analyzeTestResults(RUN_ID);
