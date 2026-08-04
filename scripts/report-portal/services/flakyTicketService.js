/* eslint-disable no-console */
const {
  searchIssues,
  getIssue,
  createIssue,
  updateIssueFields,
  textToAdf,
  adfToText,
  postComment,
  transitionIssueTo,
  createIssueLink,
} = require('../../helpers/jira.helper');
const { getItemHistoryStats } = require('./itemService');
const { getLatestLaunch } = require('./launchService');

const TESTRAIL_CASE_URL = 'https://foliotest.testrail.io/index.php?/cases/view/';
const FLAKY_LABEL = 'flaky-automation';
// Flaky tickets are standalone tasks in the FAT project (the AQA standard), linked to
// the tracking feature (e.g. UXPROD-5976) rather than parented under it.
const TICKET_PROJECT_KEY = process.env.JIRA_FLAKY_PROJECT || 'FAT';
const TICKET_ISSUE_TYPE = process.env.JIRA_FLAKY_ISSUETYPE || 'Task';
// Issue link type used to associate each flaky task with the tracking feature.
const FEATURE_LINK_TYPE = process.env.JIRA_FLAKY_LINK_TYPE || 'Relates';
// Marker line kept in every managed description so runs can find & extend the log.
const LOG_HEADER = 'Flakiness log (auto-updated):';
const TOTAL_PREFIX = 'Total recorded flaky occurrences:';
// Machine-readable footer so a later run can resolve the RP test behind a ticket.
const META_PREFIX = 'RP-Meta:';
// A test passing this many consecutive most-recent runs is considered stable → close.
const STABLE_STREAK_THRESHOLD = 10;
// Status the ticket is moved to once the test is deemed stable.
const STABLE_TARGET_STATUS = 'Closed';

/**
 * Extract the TestRail case id (the number after the leading "C") from a test name.
 * e.g. "C1385659 Verify ... (firebird)" -> "1385659"
 * @param {string} name
 * @returns {string|null}
 */
function parseCaseId(name) {
  const match = /^\s*C(\d+)\b/.exec(name || '');
  return match ? match[1] : null;
}

/**
 * Build the Jira task summary in the required TestRail format:
 *   "[TC] Name (Team)"  e.g. "C1385659 Verify bulk delete ... (Firebird)"
 * The RP test name already carries the C-number and a trailing "(team)" suffix
 * (usually lower-case); we normalise the team suffix to the canonical team name.
 * @param {string} name - RP test name
 * @param {string} team - Canonical team name (e.g. "Firebird")
 * @returns {string}
 */
function buildSummary(name, team) {
  let base = (name || '').trim();
  // Strip a trailing "(team)" suffix (any case) so we can re-append the canonical one.
  const suffix = new RegExp(`\\s*\\(${team}\\)\\s*$`, 'i');
  base = base.replace(suffix, '').trim();
  return `${base} (${team})`;
}

const dayStamp = (value) => {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime())
    ? new Date().toISOString().slice(0, 10)
    : date.toISOString().slice(0, 10);
};

/**
 * Aggregate the per-launch/team flaky groups into one entry per unique flaky test.
 * A unique test is keyed by (caseId or summary) + team, matching the Jira summary.
 * @param {Array<{launchName: string, team: string, tests: Array}>} flakyGroups
 * @returns {Map<string, Object>} key -> { summary, team, caseId, name, observations[] }
 */
function aggregateFlakyTests(flakyGroups) {
  const byTest = new Map();

  for (const group of flakyGroups) {
    // Skip empty / errored groups.
    if (group && !group.error && group.tests?.length) {
      const { team, launchName } = group;

      for (const test of group.tests) {
        const caseId = parseCaseId(test.name);
        const summary = buildSummary(test.name, team);
        const key = `${team}::${caseId || summary}`;

        if (!byTest.has(key)) {
          byTest.set(key, {
            key,
            summary,
            team,
            caseId,
            name: test.name,
            uniqueId: test.uniqueId || null,
            launchId: test.launchId || null,
            launchName,
            latestObservedAt: test.startTime || 0,
            observations: [],
          });
        }

        const agg = byTest.get(key);
        // Keep the most recent launchId as the history baseline; uniqueId is stable.
        if ((test.startTime || 0) >= (agg.latestObservedAt || 0)) {
          agg.latestObservedAt = test.startTime || 0;
          if (test.launchId) agg.launchId = test.launchId;
          if (test.uniqueId) agg.uniqueId = test.uniqueId;
          agg.launchName = launchName;
        }

        agg.observations.push({
          date: dayStamp(test.startTime),
          launchName,
          rpLink: test.rpLink,
        });
      }
    }
  }

  return byTest;
}

/**
 * Render a single log line for one observation.
 * Format: "- <date> | <launch> | RP: <link>"
 */
const observationLine = (obs) => `- ${obs.date} | ${obs.launchName} | RP: ${obs.rpLink}`;

/**
 * Parse the existing "Flakiness log" lines out of a plain-text description so we can
 * merge previous observations with the ones detected in this run (de-duplicated).
 * @param {string} text
 * @returns {Set<string>} existing log lines
 */
function parseExistingLogLines(text) {
  const lines = new Set();
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim();
    if (/^- \d{4}-\d{2}-\d{2} \| /.test(line)) {
      lines.add(line);
    }
  }
  return lines;
}

/**
 * Render the Report Portal history statistics as description lines.
 * @param {Object|null} stats - output of getItemHistoryStats (or null if unavailable)
 * @returns {string[]}
 */
function buildStatsLines(stats) {
  if (!stats || !stats.totalRuns) return [];
  const pct = (stats.flakyRate * 100).toFixed(1);
  const lines = [
    `Run statistics (last ${stats.totalRuns} run(s), via Report Portal history):`,
    `- Passed: ${stats.passed}`,
    `- Flaky: ${stats.flaky} (flaky rate: ${pct}%)`,
    `- Failed: ${stats.failed}`,
  ];
  if (stats.skipped) lines.push(`- Skipped: ${stats.skipped}`);
  if (stats.firstSeen) lines.push(`- First seen: ${dayStamp(stats.firstSeen)}`);
  if (stats.lastSeen) lines.push(`- Last seen: ${dayStamp(stats.lastSeen)}`);
  return lines;
}

/**
 * Build the full description text (later converted to ADF) for a flaky-test ticket.
 * @param {Object} entry - aggregated flaky test entry
 * @param {Set<string>} logLines - merged, de-duplicated observation lines
 * @param {Object|null} [stats] - Report Portal history statistics
 * @returns {string}
 */
function buildDescriptionText(entry, logLines, stats = null) {
  const sortedLines = Array.from(logLines).sort();
  const parts = [];
  parts.push(
    'This ticket tracks a flaky automated test detected by the Report Portal flaky-test automation.',
  );
  parts.push('');
  if (entry.caseId) {
    parts.push(`Test case: C${entry.caseId}`);
    parts.push(`TestRail: ${TESTRAIL_CASE_URL}${entry.caseId}`);
  }
  parts.push(`Team: ${entry.team}`);
  parts.push('');
  const statsLines = buildStatsLines(stats);
  if (statsLines.length) {
    parts.push(...statsLines);
    parts.push('');
  }
  parts.push(LOG_HEADER);
  parts.push(...sortedLines);
  parts.push('');
  parts.push(`${TOTAL_PREFIX} ${sortedLines.length}`);
  // Machine-readable footer used by the auto-close pass to re-resolve the RP test.
  if (entry.uniqueId) {
    parts.push('');
    parts.push(`${META_PREFIX} uniqueId=${entry.uniqueId}; launch=${entry.launchName || ''}`);
  }
  return parts.join('\n');
}

/**
 * Parse the RP-Meta footer (uniqueId + launch name) out of a ticket description.
 * @param {string} text - plain-text description (adfToText output)
 * @returns {{uniqueId: string|null, launch: string|null}}
 */
function parseMeta(text) {
  const line = (text || '').split('\n').find((l) => l.trim().startsWith(META_PREFIX));
  if (!line) return { uniqueId: null, launch: null };
  const uid = /uniqueId=([^;]+)/.exec(line);
  const launch = /launch=([^;]*)/.exec(line);
  return {
    uniqueId: uid ? uid[1].trim() : null,
    launch: launch ? launch[1].trim() : null,
  };
}

/**
 * Count how many of the most-recent consecutive runs were clean passes (not flaky,
 * not failed). The timeline is ordered oldest → newest, so we scan from the end.
 * @param {Array<{outcome: string}>} timeline
 * @returns {number}
 */
function trailingStablePasses(timeline) {
  let streak = 0;
  for (let i = (timeline || []).length - 1; i >= 0; i -= 1) {
    if (timeline[i].outcome === 'passed') streak += 1;
    else break;
  }
  return streak;
}

/**
 * Find an already-existing Jira ticket for a flaky test (avoid duplicates).
 * Matches by the exact summary within the ticket project; when a TestRail case id is
 * present the JQL is narrowed with the C-number token for a cheaper search.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} entry - aggregated flaky test entry
 * @returns {Promise<Object|null>} the matching issue (summary search fields) or null
 */
async function findExistingTicket(jiraClient, entry) {
  const token = entry.caseId ? `C${entry.caseId}` : entry.summary;
  // Escape double quotes for JQL string literals.
  const safeToken = token.replace(/"/g, '\\"');
  const jql =
    `project = "${TICKET_PROJECT_KEY}" AND labels = "${FLAKY_LABEL}" ` +
    `AND summary ~ "${safeToken}" ORDER BY created DESC`;

  const issues = await searchIssues(jiraClient, jql, 50);
  return (
    issues.find((issue) => (issue.fields?.summary || '').trim() === entry.summary.trim()) || null
  );
}

/**
 * Create a new flaky-test task in the FAT project (linked to the tracking feature), or
 * update the description of the existing one with fresh flakiness information.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.featureKey - tracking feature to link tasks to (e.g. "UXPROD-5976")
 * @param {Object} entry - aggregated flaky test entry
 * @returns {Promise<{action: 'created'|'updated', key: string, summary: string}>}
 */
async function createOrUpdateTicket(jiraClient, { featureKey }, entry) {
  const newLines = entry.observations.map(observationLine);

  // Pull pass/flaky/fail statistics from Report Portal history (best-effort).
  let stats = null;
  if (entry.uniqueId && entry.launchId) {
    try {
      stats = await getItemHistoryStats({
        launchId: entry.launchId,
        uniqueId: entry.uniqueId,
      });
    } catch (err) {
      console.warn(`  ! Could not fetch RP history for "${entry.summary}": ${err.message}`);
    }
  }

  const existing = await findExistingTicket(jiraClient, entry);

  if (existing) {
    // Merge previous log lines (read the full issue for its ADF description).
    const full = await getIssue(jiraClient, existing.key);
    const existingText = adfToText(full.fields?.description);
    const merged = parseExistingLogLines(existingText);
    newLines.forEach((line) => merged.add(line));

    const descriptionText = buildDescriptionText(entry, merged, stats);
    await updateIssueFields(jiraClient, existing.key, {
      description: textToAdf(descriptionText),
    });
    return { action: 'updated', key: existing.key, summary: entry.summary };
  }

  const merged = new Set(newLines);
  const descriptionText = buildDescriptionText(entry, merged, stats);

  const fields = {
    project: { key: TICKET_PROJECT_KEY },
    summary: entry.summary,
    issuetype: { name: TICKET_ISSUE_TYPE },
    // Label with the flaky marker + the feature key so the close pass can scope precisely.
    labels: [FLAKY_LABEL, featureKey],
    description: textToAdf(descriptionText),
  };

  const created = await createIssue(jiraClient, fields);

  // Link the new task to the tracking feature (best-effort; ticket still created if this fails).
  try {
    await createIssueLink(jiraClient, {
      type: FEATURE_LINK_TYPE,
      inwardKey: created.key,
      outwardKey: featureKey,
    });
  } catch (err) {
    console.warn(`  ! Created ${created.key} but could not link to ${featureKey}: ${err.message}`);
  }

  return { action: 'created', key: created.key, summary: entry.summary };
}

/**
 * Process all flaky groups: one Jira task per unique flaky test under the epic.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.epicKey
 * @param {Array} flakyGroups - output of collectFlakyTests (per launch/team)
 * @returns {Promise<Array>} per-test results
 */
async function syncFlakyTickets(jiraClient, { epicKey }, flakyGroups) {
  const featureKey = epicKey;
  const byTest = aggregateFlakyTests(flakyGroups);
  const entries = Array.from(byTest.values());
  const results = [];

  console.log(
    `\nSyncing ${entries.length} unique flaky test(s) to ${TICKET_PROJECT_KEY}, linked to ${featureKey}...`,
  );

  for (const entry of entries) {
    try {
      // eslint-disable-next-line no-await-in-loop
      const result = await createOrUpdateTicket(jiraClient, { featureKey }, entry);
      const verb = result.action === 'created' ? '＋ Created' : '↻ Updated';
      console.log(`  ${verb} ${result.key}: ${result.summary}`);
      results.push(result);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Failed for "${entry.summary}": ${detail}`);
      results.push({ action: 'error', summary: entry.summary, error: detail });
    }
  }

  // After syncing the currently-flaky tests, close tickets whose test has since
  // become stable (a now-stable test drops out of the flaky set, so it must be
  // re-checked here rather than in the sync loop above).
  // eslint-disable-next-line no-use-before-define
  const closed = await closeStableTickets(jiraClient, { featureKey });

  return { synced: results, closed };
}

/**
 * Scan open flaky tickets linked to the feature and close any whose underlying test
 * has passed cleanly for the last STABLE_STREAK_THRESHOLD consecutive runs.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.featureKey - tracking feature (used as a scoping label)
 * @param {number} [opts.threshold]
 * @returns {Promise<Array>} per-ticket close results
 */
async function closeStableTickets(jiraClient, { featureKey, threshold = STABLE_STREAK_THRESHOLD }) {
  const results = [];
  const jql =
    `project = "${TICKET_PROJECT_KEY}" AND labels = "${FLAKY_LABEL}" AND labels = "${featureKey}" ` +
    'AND statusCategory != Done ORDER BY created ASC';

  let openTickets;
  try {
    openTickets = await searchIssues(jiraClient, jql, 100);
  } catch (err) {
    console.error(`  ✗ Could not list open flaky tickets: ${err.message}`);
    return results;
  }

  if (!openTickets.length) return results;

  console.log(
    `\nChecking ${openTickets.length} open flaky ticket(s) for ${threshold}-run stability...`,
  );

  // Cache latest launch id per launch name to avoid repeated lookups.
  const launchIdCache = new Map();
  const resolveLaunchId = async (launchName) => {
    if (!launchName) return null;
    if (launchIdCache.has(launchName)) return launchIdCache.get(launchName);
    let id = null;
    try {
      const launch = await getLatestLaunch({ name: launchName });
      id = launch?.id || null;
    } catch {
      id = null;
    }
    launchIdCache.set(launchName, id);
    return id;
  };

  const evaluateTicket = async (ticket) => {
    const key = ticket.key;
    const summary = ticket.fields?.summary || key;
    try {
      const text = adfToText(ticket.fields?.description);
      const { uniqueId, launch } = parseMeta(text);
      // Ticket predates metadata footer; skip (will gain a footer on next flaky run).
      if (!uniqueId) return null;

      const launchId = await resolveLaunchId(launch);
      if (!launchId) return null;

      const stats = await getItemHistoryStats({ launchId, uniqueId, historyDepth: threshold });
      const streak = trailingStablePasses(stats.timeline);
      if (streak < threshold) return null;

      const outcome = await transitionIssueTo(jiraClient, key, STABLE_TARGET_STATUS);
      if (!outcome.transitioned) {
        console.warn(`  ! ${key}: stable but not closed — ${outcome.reason}`);
        return { action: 'close-skipped', key, summary, reason: outcome.reason };
      }

      await postComment(
        jiraClient,
        key,
        'Auto-closed by flaky-test automation: this test passed cleanly for the last ' +
          `${streak} consecutive Report Portal runs, so it is considered stable.`,
      );
      console.log(`  ✓ Closed ${key} (stable ${streak} runs): ${summary}`);
      return { action: 'closed', key, summary, streak };
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Stability check failed for ${key}: ${detail}`);
      return { action: 'error', key, summary, error: detail };
    }
  };

  for (const ticket of openTickets) {
    // eslint-disable-next-line no-await-in-loop
    const result = await evaluateTicket(ticket);
    if (result) results.push(result);
  }

  return results;
}

module.exports = {
  syncFlakyTickets,
  closeStableTickets,
  aggregateFlakyTests,
  buildSummary,
  parseCaseId,
  buildDescriptionText,
  parseExistingLogLines,
  buildStatsLines,
  parseMeta,
  trailingStablePasses,
};
