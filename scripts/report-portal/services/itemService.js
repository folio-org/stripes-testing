const { getLatestLaunch } = require('./launchService');
const { rpClient } = require('../client');
const { ITEM_V2_API, ITEM_API } = require('../constants/api');
const { SPEC_TYPES } = require('../constants/constants');

const LIMIT = 1000;
const TO_INVESTIGATE_ISSUE_TYPE = 'ti001';
const FLAKY_ISSUE_TYPE = 'ab_uvbcfwkvo3e8';
const LAUNCH_PROVIDER_TYPE = 'launch';

const getItemsV2 = async ({ params } = {}) => {
  const { data } = await rpClient.get(ITEM_V2_API, { params });

  return { data };
};

const getItemsToInvestigate = async ({ launchName, team }) => {
  const latestLaunch = await getLatestLaunch({ name: launchName });

  const params = {
    sort: 'startTime,asc',
    launchId: latestLaunch.id,
    providerType: LAUNCH_PROVIDER_TYPE,
    'page.size': LIMIT,
    ...(team && { 'filter.cnt.name': team }),
    'filter.in.issueType': TO_INVESTIGATE_ISSUE_TYPE,
    'filter.eq.hasStats': true,
  };

  const { data } = await getItemsV2({ params });

  const itemsToInvestigate = data.content
    // When the UI filters the "to investigate" tests by a team name, it displays only STEP type tests,
    // but the API without filtering by team returns both SUITE and STEP tests.
    // So we need to re-run the displayed (STEP) tests first.
    .toSorted((a, b) => {
      // Sort by type first (STEP before SUITE)
      if (a.type !== b.type) {
        return a.type === SPEC_TYPES.STEP ? -1 : 1;
      }

      if (a.name.toLowerCase().includes('volaris')) return -1;
      if (b.name.toLowerCase().includes('volaris')) return 1;
      return 0;
    })
    .map((item) => ({
      id: item.id,
      testPath: item.codeRef.replace(/\.cy\.(js|ts).*$/, '.cy.$1'),
      codeRef: item.codeRef,
      type: item.type,
    }));

  return {
    itemsToInvestigate,
    uniqTestPaths: Array.from(new Set(itemsToInvestigate.map((item) => item.testPath))),
  };
};

const markTestsAsFlaky = async ({ testItemIds }) => {
  const issues = testItemIds.map((id) => ({
    id,
    testItemId: id,
    issue: {
      issueType: FLAKY_ISSUE_TYPE,
      autoAnalyzed: false,
      ignoreAnalyzer: false,
      externalSystemIssues: [],
    },
  }));

  const payload = { issues };

  await rpClient.put(ITEM_API, payload);

  return {
    success: true,
    updatedCount: testItemIds.length,
  };
};

module.exports = {
  getItemsToInvestigate,
  markTestsAsFlaky,
};
