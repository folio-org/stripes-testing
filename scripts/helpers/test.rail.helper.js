/* eslint-disable no-console */
const status = {
  Passed: 1,
  Blocked: 2,
  Untested: 3,
  Retest: 4,
  Failed: 5,
  Unassigned: 6,
  Claimed: 7,
  Deferred: 8,
  NotApplicable: 10,
  DeferredHotFix: 9,
  Flaky: 11,
  ToInvestigate: 12,
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
  Athena: 26,
  Promin: 27,
  Helios: 28,

  Concorde: 1,
  Bienenvolk: 2,
  Gutenberg: 16,
  Odin: 17,
  Prokopovych: 5,
  Sif: 20,
  Thor: 7,
  Leipzig: 10,
  Scout: 11,
  Reporting: 12,
  BAMA: 14,
  MOL: 15,
  Klemming: 22,
  BigFC: 23,
  Dresden: 24,
  KInt: 25,
  Fenrir: 29,
};

const testTypes = {
  Smoke: 1,
  CriticalPath: 2,
  ExtendedPath: 3,
  Obsolete: 4,
  Draft: 5,
  Backend: 6,
  EdgeCases: 7,
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

async function updateTestCasesInTestRun(api, testId, testCases) {
  try {
    await api.post(`update_run/${testId}`, { 'case_ids': testCases });
    console.log(`Test run ${testId} updated successfully.`);
  } catch (error) {
    console.error('Error updating test run:', error);
  }
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
      console.log(`${new Date().toISOString()} Fetched ${offset} test results...`);
      tests.push(...resp.tests);
      offset += resp.size;
    } while (resp._links.next != null);
  } catch (error) {
    console.error('Error fetching test results:', error);
  }
  return tests;
}

async function getResultsForRun(api, runId, createdAfter) {
  async function getResults(offset) {
    const params = { offset };
    if (createdAfter) {
      params.created_after = createdAfter;
    }
    const response = await api.get(`get_results_for_run/${runId}`, { params });
    return response.data;
  }

  const results = [];
  try {
    let offset = 0;
    let resp;
    do {
      resp = await getResults(offset);
      console.log(`${new Date().toISOString()} Fetched ${offset} results...`);
      results.push(...resp.results);
      offset += resp.size;
    } while (resp._links.next != null);
  } catch (error) {
    console.error('Error fetching results for run:', error);
  }
  return results;
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

async function updateMultipleTestResults(api, testId, results) {
  try {
    await api.post(`add_results/${testId}`, { results });
    console.log(`Test run ${testId} updated successfully.`);
  } catch (error) {
    console.error('Error updating test run results:', error);
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
  updateTestCasesInTestRun,
  getTestHistory,
  getCaseHistory,
  getTestRunResults,
  getResultsForRun,
  updateTestResult,
  updateMultipleTestResults,
  getTestCase,
  team,
  status,
  testTypes,
};
