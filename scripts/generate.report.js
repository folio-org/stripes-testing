/* eslint-disable no-console */
const axios = require('axios');
const fs = require('fs');

const TESTRAIL_HOST = 'https://foliotest.testrail.io/';
const API_USER = 'SpecialEBS-FOLKaratetestsfailure@epam.com';
const API_KEY = 'Folio-lsp11';
const RUN_ID = 2108; // Set your test run ID

const api = axios.create({
  baseURL: `${TESTRAIL_HOST}/index.php?/api/v2/`,
  auth: {
    username: API_USER,
    password: API_KEY,
  },
});
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

async function generateReport(runId) {
  const results = (await getTestRunResults(runId)).filter((test) => test.status_id === 5);

  const defectsCount = {};
  const fixesCount = {};
  for (const result of results) {
    const historyItem = (await getTestHistory(result.case_id)).results[0];
    if (historyItem.defects) {
      historyItem.defects.split(',').forEach((defect) => {
        if (/^FAT-/.test(defect)) {
          fixesCount[defect] = (fixesCount[defect] || 0) + 1;
        } else {
          defectsCount[defect] = (defectsCount[defect] || 0) + 1;
        }
      });
    } else {
      console.warn(`No defects found for test C${result.case_id}`);
    }
  }

  const reportDefects = Object.entries(defectsCount)
    .map(([defect, count]) => `${defect} - ${count}`)
    .join('\n');
  const reportFixes = Object.entries(fixesCount)
    .map(([defect, count]) => `${defect} - ${count}`)
    .join('\n');

  const summary = `Bugs caught by autotests: \n${reportDefects}\nTickets to fix autotests by AQA engineers: \n${reportFixes}`;
  console.log(summary);
  fs.writeFileSync('./report.txt', summary);
}

generateReport(RUN_ID);
