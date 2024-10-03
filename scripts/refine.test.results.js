/* eslint-disable no-console */
/* eslint-disable camelcase */
const axios = require('axios');

const TESTRAIL_HOST = 'https://foliotest.testrail.io/';
const API_USER = 'SpecialEBS-FOLKaratetestsfailure@epam.com';
const API_KEY = 'Folio-lsp11';

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

  try {
    const tests = [];
    let offset = 0;
    let resp;
    do {
      resp = await getTest(offset);
      tests.push(...resp.tests);
      offset += resp.size;
    } while (resp._links.next != null);

    return tests;
  } catch (error) {
    console.error('Error fetching test results:', error);
    return [];
  }
}

// Fetch test result history for a test case
async function getTestHistory(caseId) {
  try {
    const response = await api.get(`get_results_for_case/${RUN_ID}/${caseId}`, {
      params: {
        limit: 10,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    return [];
  }
}

// Update test result in TestRail
// eslint-disable-next-line no-unused-vars
async function updateTestResult(testId, statusId, comment) {
  try {
    await api.post(`add_result/${testId}`, {
      status_id: statusId,
      comment,
    });
    console.log(`Test ${testId} updated successfully.`);
  } catch (error) {
    console.error('Error updating test result:', error);
  }
}

async function analyzeTestResults(runId) {
  const allTests = await getTestRunResults(runId);

  // Get only Failed tests
  const failedTests = allTests.filter(
    (test) => test.status_id === 5 && test.custom_dev_team === team.Spitfire,
  );

  const resultsList = { rerun: [], regression: [], failed: [] };

  for (const test of failedTests) {
    const { case_id, id: testId, status_id } = test;

    // Get test history from 2 days ago
    const startDate =
      Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate() - 5) / 1000;
    const endDate =
      Date.UTC(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) / 1000;
    const history = (await getTestHistory(case_id)).results.filter(
      (result) => result.created_on >= startDate && result.created_on <= endDate,
    );

    const historyByDay = history.reduce((acc, result) => {
      const date = new Date(result.created_on * 1000).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = [];
      }
      acc[date].push(result);
      return acc;
    }, {});

    // eslint-disable-next-line no-unused-vars
    const joinedHistory = Object.entries(historyByDay).map(([date, items]) => {
      const dayStatus = items.some((item) => item.status_id === 1) ? status.Passed : status.Failed;
      return {
        date,
        status_id: dayStatus,
        defects: items.find((item) => item.defects)
          ? items.find((item) => item.defects).defects
          : [],
      };
    });

    // Check the historical data for the current test
    const passedInHistory = joinedHistory[0].status_id === status.Passed;
    const failedInHistory = history.some((result) => result.status_id === status.Failed);

    if (status_id === status.Failed && passedInHistory) {
      // If current test failed but passed in the past, mark for re-execution
      resultsList.rerun.push(testId);
    } else if (status_id === 5 && failedInHistory) {
      // If current test failed and failed in the past, check for linked issues
      const linkedIssue = history.find((result) => result.defects);
      if (linkedIssue) {
        resultsList.failed.push({ testId, defects: linkedIssue.defects });
      } else {
        resultsList.regression.push(testId);
      }
    }
  }
  console.log(JSON.stringify(resultsList, null, 2));
}

// Run the analysis
analyzeTestResults(RUN_ID);
