/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { glob } = require('glob');
const { team, getAllTestCases } = require('./helpers/test.rail.helper');
const { createTestRailClient } = require('./helpers/api.client');
require('dotenv').config();

/**
 * This script finds test cases that exist as automated tests in this TAF
 * but are NOT marked as automated (custom_automation_type !== 1) in TestRail.
 * Tests with tags containing 'broken', 'draft', 'exclude' or with no tags are excluded.
 */

const testUsername = process.env.TESTRAIL_API_USER;
const testPassword = process.env.TESTRAIL_API_KEY;

const TESTRAIL_BASE = 'https://foliotest.testrail.io/index.php?/cases/view/';
const projectId = 14;
const excludeTagPatterns = ['broken', 'draft', 'exclude'];

const aqaTeamCodes = new Set(Object.values(team));
const dirPath = path.resolve(__dirname, '../cypress/e2e');

async function getDevTeamNames(api) {
  const response = await api.get('get_case_fields');
  const devTeamField = response.data.find((f) => f.system_name === 'custom_dev_team');
  if (!devTeamField) return {};
  const items = devTeamField.configs?.[0]?.options?.items;
  if (!items) return {};
  const nameMap = {};
  items.split('\n').forEach((line) => {
    const [code, name] = line.split(',').map((s) => s.trim());
    if (code && name) nameMap[Number(code)] = name;
  });
  return nameMap;
}

async function getAllTestFilePaths(directory) {
  const pattern = path.join(directory, '**/*.cy.js').replace(/\\/g, '/');
  return glob(pattern, { absolute: true });
}

function extractTestIdsFromFiles(testFilePaths) {
  const testIdRegex = /it\(\s*['"`](C\d+)\s+.+?['"`]\s*,\s*\{[^}]*tags:\s*\[([^\]]*)\]/gm;
  const testsInTaf = [];

  for (const filePath of testFilePaths) {
    const content = fs.readFileSync(filePath, 'utf-8');
    let match = testIdRegex.exec(content);

    while (match !== null) {
      const testId = match[1];
      const tagsStr = match[2];
      const tags = tagsStr
        .split(',')
        .map((tag) => tag.trim().replace(/['"` ]/g, ''))
        .filter(Boolean);
      let excludeReason = null;
      if (tags.length === 0) {
        excludeReason = 'no tags';
      } else {
        const matchedTag = tags.find((tag) => excludeTagPatterns.some((p) => tag.toLowerCase().includes(p)));
        if (matchedTag) excludeReason = matchedTag;
      }

      testsInTaf.push({
        testId,
        numericId: parseInt(testId.replace('C', ''), 10),
        tags,
        excludeReason,
        filePath: filePath.substring(filePath.indexOf('cypress')).replace(/\\/g, '/'),
      });
      match = testIdRegex.exec(content);
    }
  }

  return testsInTaf;
}

async function run() {
  console.log('Step 1: Scanning spec files in the TAF...');
  const testFilePaths = await getAllTestFilePaths(dirPath);
  console.log(`Found ${testFilePaths.length} spec files`);

  const testsInTaf = extractTestIdsFromFiles(testFilePaths);
  console.log(`Found ${testsInTaf.length} test cases (it blocks) in the TAF`);

  const activeTests = testsInTaf.filter((t) => !t.excludeReason);
  const excludedTests = testsInTaf.filter((t) => t.excludeReason);
  console.log(`  - Active: ${activeTests.length}`);
  console.log(`  - Excluded (broken/draft/exclude/no tags): ${excludedTests.length}`);

  console.log('\nStep 2: Fetching all test cases from TestRail...');
  const testRailClient = createTestRailClient(testUsername, testPassword);
  const teamNames = await getDevTeamNames(testRailClient);
  const allTestRailCases = await getAllTestCases(testRailClient, projectId);
  console.log(`Fetched ${allTestRailCases.length} test cases from TestRail`);

  const testRailMap = new Map();
  allTestRailCases.forEach((tc) => testRailMap.set(tc.id, tc));

  console.log('\nStep 3: Finding mismatches...');
  const notMarkedAutomated = [];
  const notFoundInTestRail = [];

  for (const tafTest of activeTests) {
    const trCase = testRailMap.get(tafTest.numericId);

    if (!trCase) {
      notFoundInTestRail.push(tafTest);
    } else if (trCase.custom_automation_type !== 1) {
      const devTeamCode = trCase.custom_dev_team;
      const isAqaTeam = aqaTeamCodes.has(devTeamCode);
      notMarkedAutomated.push({
        testId: tafTest.testId,
        numericId: tafTest.numericId,
        devTeam: isAqaTeam ? teamNames[devTeamCode] || `Unknown (${devTeamCode})` : 'Other teams',
        teamLabel: !isAqaTeam ? teamNames[devTeamCode] || 'N/A' : null,
      });
    }
  }

  // Print results
  console.log('\n========================================');
  console.log('RESULTS');
  console.log('========================================');
  console.log(
    `\nTest cases in TAF but NOT marked as Automated in TestRail: ${notMarkedAutomated.length}`,
  );

  if (notMarkedAutomated.length > 0) {
    // Group by team
    const byTeam = {};
    notMarkedAutomated.forEach((t) => {
      if (!byTeam[t.devTeam]) byTeam[t.devTeam] = [];
      byTeam[t.devTeam].push(t);
    });

    // Sort: AQA/Mriya-scope teams alphabetically, then "Other teams" at the end
    const sortedTeams = Object.entries(byTeam).sort(([a], [b]) => {
      if (a === 'Other teams') return 1;
      if (b === 'Other teams') return -1;
      return a.localeCompare(b);
    });

    for (const [teamName, tests] of sortedTeams) {
      console.log(`\n--- ${teamName} (${tests.length}) ---`);
      tests.forEach((t) => {
        const prefix = t.teamLabel ? `(${t.teamLabel}) ` : '';
        console.log(`  ${prefix}${TESTRAIL_BASE}${t.numericId}`);
      });
    }
  }

  if (notFoundInTestRail.length > 0) {
    console.log(
      `\n--- Test IDs in TAF but not found in TestRail: ${notFoundInTestRail.length} ---`,
    );
    notFoundInTestRail.forEach((t) => {
      console.log(`  ${t.testId} | File: ${t.filePath}`);
    });
  }

  // Process excluded tests
  const excludedNotMarked = [];
  for (const tafTest of excludedTests) {
    const trCase = testRailMap.get(tafTest.numericId);
    if (trCase && trCase.custom_automation_type !== 1) {
      excludedNotMarked.push({
        numericId: tafTest.numericId,
        devTeam: teamNames[trCase.custom_dev_team] || 'N/A',
        excludeReason: tafTest.excludeReason,
      });
    }
  }

  if (excludedNotMarked.length > 0) {
    console.log('\n========================================');
    console.log(`EXCLUDED tests NOT marked as Automated in TestRail: ${excludedNotMarked.length}`);
    console.log('========================================');
    excludedNotMarked.forEach((t) => {
      console.log(`  (${t.devTeam}, ${t.excludeReason}) ${TESTRAIL_BASE}${t.numericId}`);
    });
  }

  console.log('\nDone.');
}

run().catch((err) => {
  console.error('Script failed:', err);
  process.exit(1);
});
