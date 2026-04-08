// Load repo .env file if present (Node 22 built-in — no dotenv needed)
try {
  process.loadEnvFile();
} catch {
  /* .env not found — rely on shell env */
}
const { createTestRailClient } = require('./api.client');
const { getTestCase } = require('./test.rail.helper');

const API_USER = process.env.TESTRAIL_API_USER;
const API_KEY = process.env.TESTRAIL_API_KEY;

const TEAM = {
  3: 'Firebird',
  4: 'Folijet',
  6: 'Spitfire',
  8: 'Thunderjet',
  9: 'Vega',
  13: 'Volaris',
  18: 'Citation',
  19: 'Corsair',
  21: 'Eureka',
};

const TEST_GROUP = {
  1: 'smoke',
  2: 'criticalPath',
  3: 'extendedPath',
};

const getTestCaseData = async () => {
  const [, caseId] = process.argv.slice(2);

  const api = createTestRailClient(API_USER, API_KEY);

  const caseData = await getTestCase(api, caseId);
  return caseData;
};

if (require.main === module) {
  getTestCaseData()
    .then((caseData) => {
      const newCaseData = {
        id: caseData.id,
        title: caseData.title,
        custom_dev_team: TEAM[caseData.custom_dev_team],
        custom_test_group: TEST_GROUP[caseData.custom_test_group],
        custom_preconds: caseData.custom_preconds,
        custom_steps_separated: caseData.custom_steps_separated,
      };

      if (caseData) {
        console.log(JSON.stringify(newCaseData, null, 2));
      }
    })
    .catch((error) => {
      console.error('Error fetching test case data:', error);
      process.exitCode = 1;
    });
}
