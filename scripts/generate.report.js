/* eslint-disable no-console */
const fs = require('fs');
const { createTestRailClient } = require('./helpers/api.client');
const { getTestHistory, getTestRunResults, status } = require('./helpers/test.rail.helper');
require('dotenv').config();

const API_USER = process.env.TESTRAIL_API_USER;
const API_KEY = process.env.TESTRAIL_API_KEY;
const RUN_ID = process.env.TESTRAIL_RUN_ID;

const api = createTestRailClient(API_USER, API_KEY);

async function generateReport(runId) {
  const results = (await getTestRunResults(api, runId)).filter(
    (test) => test.status_id === status.Failed,
  );

  const defectsCount = {};
  const fixesCount = {};
  for (const result of results) {
    const historyItem = (await getTestHistory(api, result.case_id, RUN_ID)).results[0];
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

  const defectsList = Object.entries(defectsCount).map(([defect, count]) => ({
    defect,
    count,
  }));
  const fixesList = Object.entries(fixesCount).map(([defect, count]) => ({
    defect,
    count,
  }));

  defectsList.sort((a, b) => b.count - a.count);
  fixesList.sort((a, b) => b.defect - a.defect);

  const reportDefects = defectsList.map(({ defect, count }) => `${defect}\t${count}`).join('\n');
  const reportFixes = fixesList.map(({ defect, count }) => `${defect}\t${count}`).join('\n');

  const summary = `Bugs caught by autotests: \n${reportDefects}\nTickets to fix autotests by AQA engineers: \n${reportFixes}`;
  console.log(summary);
  fs.writeFileSync('./report.txt', summary);
}

generateReport(RUN_ID);
