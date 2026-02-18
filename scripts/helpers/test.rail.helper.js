/* eslint-disable no-console */
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
  Citation: 18,
  Corsair: 19,
  Eureka: 21,
};

async function getTestHistory(api, caseId, runId) {
  try {
    const response = await api.get(`get_results_for_case/${runId}/${caseId}`, {
      params: {
        limit: 20,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    return { results: [] };
  }
}

async function getCaseHistory(api, caseId) {
  try {
    const response = await api.get(`get_history_for_case/${caseId}`, {
      params: {
        limit: 20,
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching test history:', error);
    return { results: [] };
  }
}

async function getAllTestCases(api, projectId) {
  async function getCases(offset) {
    const response = await api.get(`get_cases/${projectId}`, {
      params: {
        offset,
        limit: 250,
      },
    });
    return response.data;
  }

  const tests = [];
  try {
    let offset = 0;
    let resp;
    do {
      resp = await getCases(offset);
      tests.push(...resp.cases);
      offset += resp.size;
      console.log(`${new Date().toISOString()} Fetched ${offset} test cases...`);
    } while (resp._links.next != null);
  } catch (error) {
    console.error('Error fetching test cases:', error);
  }
  return tests;
}

async function getTestRunResults(api, runId) {
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

async function updateTestResult(api, testId, statusId, comment, defects) {
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

async function getTestCase(api, caseId) {
  try {
    const response = await api.get(`get_case/${caseId}`);
    return response.data;
  } catch (error) {
    console.error(`Error fetching test case ${caseId}:`, error);
    return null;
  }
}

module.exports = {
  getAllTestCases,
  getTestHistory,
  getCaseHistory,
  getTestRunResults,
  updateTestResult,
  getTestCase,
  team,
  status,
};
