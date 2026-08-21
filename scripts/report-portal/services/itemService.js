const { getLatestLaunch } = require('./launchService');
const { rpClient } = require('../client');
const { ITEM_V2_API, ITEM_API, ITEM_HISTORY_API } = require('../constants/api');
const { SPEC_TYPES } = require('../constants/constants');

const LIMIT = 1000;
const TO_INVESTIGATE_ISSUE_TYPE = 'ti001';
const FLAKY_ISSUE_TYPE = 'ab_uvbcfwkvo3e8';
const LAUNCH_PROVIDER_TYPE = 'launch';

// Report Portal project used for building UI links (matches rpClient baseURL project)
const RP_UI_BASE = 'https://report-portal.ci.folio.org/ui/#cypress-nightly';

/**
 * Build a Report Portal UI deep-link to a test item within its launch.
 *
 * The RP UI URL includes the full ancestor path of item IDs, e.g.:
 *   /launches/all/<launchId>/<ancestor1>/<ancestor2>/<itemId>/log
 * RP items expose their ancestors in the dot-separated `path` field
 * (e.g. "5466329.5466330"), which does NOT include the item itself.
 *
 * @param {string|number} launchId
 * @param {Object} item - Report Portal item (needs `id` and optionally `path`)
 * @returns {string}
 */
const buildRpLink = (launchId, item) => {
  const ancestors = item.path ? String(item.path).split('.').filter(Boolean) : [];
  // `path` already ends with the item's own id in RP; de-duplicate just in case.
  const idStr = String(item.id);
  if (ancestors[ancestors.length - 1] !== idStr) {
    ancestors.push(idStr);
  }
  const segments = [launchId, ...ancestors].join('/');
  return `${RP_UI_BASE}/launches/all/${segments}/log`;
};

const getItemsV2 = async ({ params } = {}) => {
  const { data } = await rpClient.get(ITEM_V2_API, { params });

  return { data };
};

/**
 * Fetch items for a launch filtered by an RP issue type and map them to a
 * normalized shape (with a Report Portal UI link).
 * @param {Object} opts
 * @param {string} opts.launchName
 * @param {string} [opts.team]
 * @param {string} opts.issueType - RP issue type id (e.g. ti001, flaky)
 * @returns {Promise<{launchId: (string|number), items: Object[]}>}
 */
const getItemsByIssueType = async ({ launchName, team, issueType }) => {
  const latestLaunch = await getLatestLaunch({ name: launchName });

  const params = {
    sort: 'startTime,asc',
    launchId: latestLaunch.id,
    providerType: LAUNCH_PROVIDER_TYPE,
    'page.size': LIMIT,
    ...(team && { 'filter.cnt.name': team }),
    'filter.in.issueType': issueType,
    'filter.eq.hasStats': true,
  };

  const { data } = await getItemsV2({ params });

  const items = data.content
    // When the UI filters tests by a team name, it displays only STEP type tests,
    // but the API without filtering by team returns both SUITE and STEP tests.
    // So we need to re-run the displayed (STEP) tests first.
    .toSorted((a, b) => {
      // Sort by type first (STEP before SUITE)
      if (a.type !== b.type) {
        return a.type === SPEC_TYPES.STEP ? -1 : 1;
      }

      return 0;
    })
    .map((item) => ({
      id: item.id,
      name: item.name,
      testPath: item.codeRef.replace(/\.cy\.(js|ts).*$/, '.cy.$1'),
      codeRef: item.codeRef,
      type: item.type,
      path: item.path,
      startTime: item.startTime,
      // Stable cross-launch identifier + current-launch outcome, used for history stats.
      uniqueId: item.uniqueId,
      status: item.status,
      statistics: item.statistics,
      rpLink: buildRpLink(latestLaunch.id, item),
    }));

  return { launchId: latestLaunch.id, items };
};

const getItemsToInvestigate = async ({ launchName, team }) => {
  const { launchId, items } = await getItemsByIssueType({
    launchName,
    team,
    issueType: TO_INVESTIGATE_ISSUE_TYPE,
  });

  return {
    launchId,
    launchName,
    itemsToInvestigate: items,
    uniqTestPaths: Array.from(new Set(items.map((item) => item.testPath))),
  };
};

const getFlakyItems = async ({ launchName, team }) => {
  const { launchId, items } = await getItemsByIssueType({
    launchName,
    team,
    issueType: FLAKY_ISSUE_TYPE,
  });

  return {
    launchId,
    launchName,
    flakyItems: items,
    uniqTestPaths: Array.from(new Set(items.map((item) => item.testPath))),
  };
};

/**
 * Classify one historical execution of a test into a single outcome bucket.
 * Report Portal keeps the raw PASSED/FAILED status even after a defect type is
 * assigned, so a test "marked flaky" stays FAILED but carries the flaky defect
 * subtype (ab_uvbcfwkvo3e8) inside statistics.defects.<group>.
 * @param {Object} resource - one item from item/history resources[]
 * @returns {'passed'|'flaky'|'failed'|'skipped'}
 */
const classifyHistoryResource = (resource) => {
  const defects = resource.statistics?.defects || {};
  const isFlaky = Object.values(defects).some(
    (group) => group && typeof group === 'object' && FLAKY_ISSUE_TYPE in group,
  );
  if (isFlaky) return 'flaky';
  if (resource.status === 'PASSED') return 'passed';
  if (resource.status === 'SKIPPED' || resource.status === 'INTERRUPTED') return 'skipped';
  return 'failed';
};

/**
 * Fetch a test's execution history from Report Portal and aggregate pass/flaky/fail
 * statistics across the last `historyDepth` launches. The history line is keyed by the
 * test's stable `uniqueId`, using a recent `launchId` as the baseline.
 * @param {Object} opts
 * @param {string|number} opts.launchId - a recent launch id containing the test (baseline)
 * @param {string} opts.uniqueId - RP stable test identifier (e.g. "auto:154cea4d...")
 * @param {number} opts.historyDepth - how many past runs to inspect (callers must pass
 *   this explicitly; e.g. HISTORY_DEPTH in flakyTicketService.js)
 * @returns {Promise<Object>} aggregated stats + per-run timeline
 */
const getItemHistoryStats = async ({ launchId, uniqueId, historyDepth }) => {
  const params = {
    'filter.eq.launchId': launchId,
    'filter.eq.uniqueId': uniqueId,
    historyDepth,
  };

  const { data } = await rpClient.get(ITEM_HISTORY_API, { params });
  const resources = data.content?.[0]?.resources || [];

  const counts = { totalRuns: 0, passed: 0, flaky: 0, failed: 0, skipped: 0 };
  const timeline = [];

  for (const resource of resources) {
    const outcome = classifyHistoryResource(resource);
    counts.totalRuns += 1;
    counts[outcome] += 1;
    timeline.push({
      outcome,
      status: resource.status,
      launchName: resource.pathNames?.launchPathName?.name || null,
      launchNumber: resource.pathNames?.launchPathName?.number || null,
      startTime: resource.startTime || null,
    });
  }

  timeline.sort((a, b) => (a.startTime || 0) - (b.startTime || 0));

  // Flaky rate is computed over meaningful runs (exclude skipped/interrupted).
  const meaningful = counts.passed + counts.flaky + counts.failed;
  const flakyRate = meaningful ? counts.flaky / meaningful : 0;

  return {
    ...counts,
    flakyRate,
    firstSeen: timeline[0]?.startTime || null,
    lastSeen: timeline[timeline.length - 1]?.startTime || null,
    timeline,
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
  getFlakyItems,
  markTestsAsFlaky,
  getItemHistoryStats,
};
