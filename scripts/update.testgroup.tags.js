/* eslint-disable no-console */
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const { glob } = require('glob');
require('dotenv').config();

const teamCodesToUse = {
  // team codes in TestRail; comment out specific teams to not handle data for them
  Firebird: 3,
  Folijet: 4,
  Spitfire: 6,
  Thunderjet: 8,
  Vega: 9,
  Volaris: 13,
  Corsair: 19,
  Eureka: 21,
};

const testGroups = [
  { tag: 'smoke', code: 1 },
  { tag: 'criticalPath', code: 2 },
  { tag: 'extendedPath', code: 3 },
];

const dirPath = path.resolve(__dirname, '../cypress/e2e'); // directory with spec files

const testRailConfig = {
  // IDs will not change for our TestRail ptoject
  auth: {
    username: process.env.TESTRAIL_API_USER,
    password: process.env.TESTRAIL_API_KEY,
  },
  baseUrl: 'https://foliotest.testrail.io/index.php?/api/v2',
  projectId: 14,
  suiteId: 21,
};

const fileCache = new Map();

axios.defaults.baseURL = testRailConfig.baseUrl;

async function getTeamsTestCases() {
  let next = true;
  let url = `/get_cases/${testRailConfig.projectId}&suite_id=${testRailConfig.suiteId}&limit=250`;
  const teamsTestCases = [];

  while (next) {
    const response = await axios({
      method: 'get',
      url,
      auth: testRailConfig.auth,
    });
    response.data.cases.forEach((testCase) => {
      if (
        Object.values(teamCodesToUse).includes(testCase.custom_dev_team) &&
        testCase.custom_automation_type === 1
      ) {
        teamsTestCases.push(testCase);
      }
    });

    next = response.data._links.next;
    if (next) {
      url = next.split('/v2')[1];
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }
  console.log(`\nTotal automated TCs for teams in TestRail: ${teamsTestCases.length}`);
  Object.entries(teamCodesToUse).forEach(([name, code]) => {
    console.log(
      `  - ${name}: ${teamsTestCases.filter((testCase) => testCase.custom_dev_team === code).length}`,
    );
  });
  return teamsTestCases;
}

async function getAllTestFilePaths(directory) {
  try {
    const pattern = path.join(directory, '**/*.cy.js').replace(/\\/g, '/');
    const files = await glob(pattern, {
      absolute: true,
    });

    return files;
  } catch (error) {
    console.error('Error finding test files:', error);
    return [];
  }
}

async function processFile(filePath, testId, newTag) {
  try {
    let content;
    if (fileCache.has(filePath)) {
      content = fileCache.get(filePath);
    } else {
      content = await fs.readFile(filePath, 'utf-8');
      fileCache.set(filePath, content);
    }

    if (!content.includes(testId)) {
      return;
    }

    let updatedContent = content;
    let changesMade = false;

    // Regular expression to find `it()` blocks with the given test ID
    const testRegex = new RegExp(
      `it\\(\\s*['"\`](${testId})\\s+.+[^'"\`]*['"\`]\\s*,\\s*{\\s*tags:\\s*\\[(.*?)\\]\\s*}`,
      'gm',
    );
    updatedContent = updatedContent.replace(testRegex, (match, id, tags) => {
      const tagArray = tags.split(',').map((tag) => tag.trim().replace(/['"\s]/g, ''));
      // Identify the current test group tag (with potential postfix)
      const existingTag = tagArray.find((tag) => testGroups.some((group) => tag.startsWith(group.tag)));
      if (!existingTag) {
        console.log(`[WARNING] ${id} - No recognized test group tag found.`);
        return match;
      }
      // Extract postfix, if any (e.g., "criticalPathBroken" → "Broken")
      const postfix = existingTag
        .replace(new RegExp(`^(${testGroups.map((group) => group.tag).join('|')})`), '')
        .trim();
      // Construct the new tag while keeping postfix
      const updatedTag = newTag + postfix;
      if (existingTag === updatedTag) {
        // console.log(`[SKIP] ${id} - Tag already set to "${newTag}"${newTag === existingTag ? '' : ` ("${existingTag}")`}`);
        return match;
      }
      // Replace the old test group tag with the updated one
      changesMade = true;
      console.log(`[UPDATE] ${id} - Replacing "${existingTag}" with "${updatedTag}"`);
      return match.replace(existingTag, updatedTag);
    });

    // Only write if content actually changed
    if (changesMade) {
      await fs.writeFile(filePath, updatedContent, 'utf-8');
      fileCache.set(filePath, updatedContent);
    }
  } catch (error) {
    console.error(`Error processing ${filePath}:`, error.message);
  }
}

async function updateTestGroupTag(testFilePaths, testId, newTag) {
  if (testFilePaths.length === 0) {
    console.log(`[ERROR] No test files found in ${dirPath}`);
    process.exit();
  }

  const BATCH_SIZE = 15;
  const batches = [];

  for (let i = 0; i < testFilePaths.length; i += BATCH_SIZE) {
    batches.push(testFilePaths.slice(i, i + BATCH_SIZE));
  }

  for (const batch of batches) {
    await Promise.all(batch.map((filePath) => processFile(filePath, testId, newTag)));
  }
}

async function updateTestGroupTagsForTeams() {
  console.log('Getting all test cases from TestRail...');
  const teamTestCases = await getTeamsTestCases();
  console.log('\nGetting spec file paths...');
  const testFilePaths = await getAllTestFilePaths(dirPath);
  console.log(`Found ${testFilePaths.length} spec files`);

  console.log('\nProcessing test group tags in spec files...\n');
  for (const testCase of teamTestCases) {
    if (testGroups.map((group) => group.code).includes(testCase.custom_test_group)) {
      await updateTestGroupTag(
        testFilePaths,
        `C${testCase.id}`,
        testGroups.filter((group) => group.code === testCase.custom_test_group)[0].tag,
      );
    } else console.log(`[WARNING] C${testCase.id} - Obsolete/Draft/Backend test group in TestRail.`);
  }

  fileCache.clear();

  console.log('\nAll DONE! Please review updates before committing.');
}

// Run the script
(async () => {
  await updateTestGroupTagsForTeams();
})();
