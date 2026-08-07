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
  deleteIssue,
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
// Sticky marker: once a ticket's test has met the flaky-create criteria it stays set,
// so the reconcile pass never deletes a test that was legitimately flaky — it closes it.
const QUALIFIED_PREFIX = 'Ever met flaky-create criteria:';
// Machine-readable footer so a later run can resolve the RP test behind a ticket.
const META_PREFIX = 'RP-Meta:';
// Only the last N Report Portal runs are considered for every decision below.
const HISTORY_DEPTH = 10;
// A test passing this many consecutive most-recent runs is considered stable → close.
const STABLE_STREAK_THRESHOLD = 3;
// Status the ticket is moved to once the test is deemed stable.
const STABLE_TARGET_STATUS = 'Closed';
// Status a closed ticket is reopened to when the test turns flaky again.
const REOPEN_TARGET_STATUS = process.env.JIRA_FLAKY_REOPEN_STATUS || 'Open';
// Ticket-creation criteria: a test must be flaky in at least this many of the last
// HISTORY_DEPTH runs (3/10 = 30% > 20%) to warrant a ticket. Tickets whose test no
// longer meets this bar are deleted.
const FLAKY_CREATE_MIN_COUNT = 3;

// FOLIO's "Development Team" single-select field; the team name (e.g. "Firebird")
// matches its option values exactly.
const TEAM_FIELD_ID = 'customfield_10057';

/**
 * Whether a test's Report Portal history qualifies for a flaky ticket:
 * flaky in >= FLAKY_CREATE_MIN_COUNT of the last HISTORY_DEPTH runs (flaky rate > 20%).
 * @param {Object|null} stats - getItemHistoryStats output
 * @returns {boolean}
 */
function meetsCreateCriteria(stats) {
  return !!stats && (stats.flaky || 0) >= FLAKY_CREATE_MIN_COUNT;
}

/**
 * Map a flaky rate (0..1 over the last HISTORY_DEPTH runs) to a Jira priority name:
 *   < 40% → P4, < 60% → P3, < 80% → P2, >= 80% → P1.
 * @param {number} flakyRate
 * @returns {string}
 */
function priorityForRate(flakyRate) {
  const pct = (flakyRate || 0) * 100;
  if (pct < 40) return 'P4';
  if (pct < 60) return 'P3';
  if (pct < 80) return 'P2';
  return 'P1';
}

/**
 * Build the Jira `fields` fragment that sets the ticket priority from a flaky rate.
 * @param {Object|null} stats - getItemHistoryStats output
 * @returns {Object}
 */
function buildPriorityField(stats) {
  if (!stats) return {};
  return { priority: { name: priorityForRate(stats.flakyRate) } };
}

/**
 * Build the Jira `fields` fragment that stores the team in the Development Team field.
 * Returns an empty object when no team is given so callers can spread it safely.
 * @param {string} team - team name (e.g. "Firebird")
 * @returns {Object}
 */
function buildTeamField(team) {
  return team ? { [TEAM_FIELD_ID]: { value: team } } : {};
}

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
    `Run statistics (last ${stats.totalRuns} of up to ${HISTORY_DEPTH} run(s), via Report Portal history):`,
    `- Passed: ${stats.passed}`,
    `- Flaky: ${stats.flaky} (flaky rate: ${pct}%)`,
    `- Failed: ${stats.failed}`,
    `- Priority: ${priorityForRate(stats.flakyRate)} (by flaky rate)`,
  ];
  if (stats.skipped) lines.push(`- Skipped: ${stats.skipped}`);
  if (stats.firstSeen) lines.push(`- First seen: ${dayStamp(stats.firstSeen)}`);
  if (stats.lastSeen) lines.push(`- Last seen: ${dayStamp(stats.lastSeen)}`);
  // Make the decision rule explicit so ticket readers understand the numbers above.
  lines.push(
    `- Flaky-ticket criteria: flaky in >= ${FLAKY_CREATE_MIN_COUNT} of the last ${HISTORY_DEPTH} runs (> 20%)`,
  );
  return lines;
}

/**
 * Build the full description text (later converted to ADF) for a flaky-test ticket.
 * @param {Object} entry - aggregated flaky test entry
 * @param {Set<string>} logLines - merged, de-duplicated observation lines
 * @param {Object|null} [stats] - Report Portal history statistics
 * @param {boolean} [everQualified] - whether the test has ever met the create criteria
 * @returns {string}
 */
function buildDescriptionText(entry, logLines, stats = null, everQualified = true) {
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
  // Sticky flag so the reconcile pass closes (not deletes) a once-legitimately-flaky test.
  parts.push(`${QUALIFIED_PREFIX} ${everQualified ? 'yes' : 'no'}`);
  // Machine-readable footer used by the auto-close pass to re-resolve the RP test.
  if (entry.uniqueId) {
    parts.push('');
    parts.push(`${META_PREFIX} uniqueId=${entry.uniqueId}; launch=${entry.launchName || ''}`);
  }
  return parts.join('\n');
}

/**
 * Parse the sticky "ever met flaky-create criteria" flag from a ticket description.
 * Tickets that predate the flag return null (unknown) so callers can fall back safely.
 * @param {string} text - plain-text description (adfToText output)
 * @returns {boolean|null}
 */
function parseEverQualified(text) {
  const line = (text || '').split('\n').find((l) => l.trim().startsWith(QUALIFIED_PREFIX));
  if (!line) return null;
  return /:\s*yes\b/i.test(line);
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

  // Pull pass/flaky/fail statistics from Report Portal history (best-effort), scoped to
  // the last HISTORY_DEPTH runs — these drive the create/priority decisions below.
  let stats = null;
  if (entry.uniqueId && entry.launchId) {
    try {
      stats = await getItemHistoryStats({
        launchId: entry.launchId,
        uniqueId: entry.uniqueId,
        historyDepth: HISTORY_DEPTH,
      });
    } catch (err) {
      console.warn(`  ! Could not fetch RP history for "${entry.summary}": ${err.message}`);
    }
  }

  const existing = await findExistingTicket(jiraClient, entry);

  // Only tests that are flaky in >= FLAKY_CREATE_MIN_COUNT of the last HISTORY_DEPTH
  // runs (flaky rate > 20%) warrant a ticket. When history is unavailable we fall back
  // to trusting the current-run flaky mark so we never silently drop a real signal.
  const qualifies = stats ? meetsCreateCriteria(stats) : true;
  if (!existing && !qualifies) {
    return { action: 'skipped', summary: entry.summary };
  }

  const priorityField = buildPriorityField(stats);
  const teamField = buildTeamField(entry.team);

  if (existing) {
    // Merge previous log lines (read the full issue for its ADF description + status).
    const full = await getIssue(jiraClient, existing.key);
    const existingText = adfToText(full.fields?.description);
    const merged = parseExistingLogLines(existingText);
    newLines.forEach((line) => merged.add(line));

    // Sticky flag: once true it stays true, so a once-flaky test is never deleted later.
    const priorQualified = parseEverQualified(existingText);
    const everQualified = priorQualified === true || qualifies;

    const descriptionText = buildDescriptionText(entry, merged, stats, everQualified);
    await updateIssueFields(jiraClient, existing.key, {
      description: textToAdf(descriptionText),
      ...teamField,
      ...priorityField,
    });

    // Reopen a previously-closed ticket when the test is flaky again and still qualifies.
    const isDone = (full.fields?.status?.statusCategory?.key || '').toLowerCase() === 'done';
    if (isDone && qualifies) {
      const outcome = await transitionIssueTo(jiraClient, existing.key, REOPEN_TARGET_STATUS);
      if (outcome.transitioned) {
        await postComment(
          jiraClient,
          existing.key,
          'Reopened by flaky-test automation: the test was detected flaky again and matches ' +
            `the create criteria (>= ${FLAKY_CREATE_MIN_COUNT} flaky of the last ${HISTORY_DEPTH} runs).`,
        );
        return { action: 'reopened', key: existing.key, summary: entry.summary };
      }
      console.warn(`  ! ${existing.key}: flaky again but not reopened — ${outcome.reason}`);
    }

    return { action: 'updated', key: existing.key, summary: entry.summary };
  }

  const merged = new Set(newLines);
  // A ticket only reaches creation when the create criteria are met, so mark it qualified.
  const descriptionText = buildDescriptionText(entry, merged, stats, true);

  const fields = {
    project: { key: TICKET_PROJECT_KEY },
    summary: entry.summary,
    issuetype: { name: TICKET_ISSUE_TYPE },
    // Label with the flaky marker + the feature key so the close pass can scope precisely.
    labels: [FLAKY_LABEL, featureKey],
    description: textToAdf(descriptionText),
    ...teamField,
    ...priorityField,
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
      if (result.action === 'skipped') {
        console.log(`  – Skipped (below criteria): ${result.summary}`);
      } else {
        const verbs = {
          created: '＋ Created',
          updated: '↻ Updated',
          reopened: '↺ Reopened',
        };
        console.log(`  ${verbs[result.action]} ${result.key}: ${result.summary}`);
      }
      results.push(result);
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Failed for "${entry.summary}": ${detail}`);
      results.push({ action: 'error', summary: entry.summary, error: detail });
    }
  }

  // After syncing the currently-flaky tests, reconcile the remaining open tickets:
  // close the ones whose test became stable and delete the ones that no longer meet
  // the flaky-create criteria (a stale/no-longer-flaky test drops out of the flaky set,
  // so it must be re-checked here rather than in the sync loop above).
  // eslint-disable-next-line no-use-before-define
  const { closed, deleted } = await reconcileTickets(jiraClient, { featureKey });

  return { synced: results, closed, deleted };
}

/**
 * Reconcile open flaky tickets linked to the feature against fresh Report Portal
 * history (last HISTORY_DEPTH runs). For each open ticket:
 *   - if the test passed the last STABLE_STREAK_THRESHOLD consecutive runs → close it;
 *   - else if the test no longer meets the flaky-create criteria → delete it;
 *   - otherwise leave it open (still legitimately flaky).
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.featureKey - tracking feature (used as a scoping label)
 * @param {number} [opts.threshold] - consecutive clean passes required to close
 * @returns {Promise<{closed: Array, deleted: Array}>}
 */
async function reconcileTickets(jiraClient, { featureKey, threshold = STABLE_STREAK_THRESHOLD }) {
  const closed = [];
  const deleted = [];
  const jql =
    `project = "${TICKET_PROJECT_KEY}" AND labels = "${FLAKY_LABEL}" AND labels = "${featureKey}" ` +
    'AND statusCategory != Done ORDER BY created ASC';

  let openTickets;
  try {
    openTickets = await searchIssues(jiraClient, jql, 100);
  } catch (err) {
    console.error(`  ✗ Could not list open flaky tickets: ${err.message}`);
    return { closed, deleted };
  }

  if (!openTickets.length) return { closed, deleted };

  console.log(
    `\nReconciling ${openTickets.length} open flaky ticket(s) ` +
      `(close ever-flaky tests after ${threshold} clean runs, delete tickets that never ` +
      'met the create criteria)...',
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

  const closeTicket = async (key, summary, streak) => {
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
  };

  const removeTicket = async (key, summary, stats) => {
    await deleteIssue(jiraClient, key);
    const flaky = stats?.flaky ?? 0;
    console.log(
      `  ✗ Deleted ${key} (never met create criteria; ${flaky}/${HISTORY_DEPTH} flaky): ${summary}`,
    );
    return { action: 'deleted', key, summary, flaky };
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

      const stats = await getItemHistoryStats({ launchId, uniqueId, historyDepth: HISTORY_DEPTH });
      const streak = trailingStablePasses(stats.timeline);

      // A test is "legitimate" if it ever met the create criteria: the sticky flag in the
      // description, or (for pre-flag / current) meeting the criteria in the last runs.
      const priorQualified = parseEverQualified(text);
      const everQualified = priorQualified === true || meetsCreateCriteria(stats);

      // Never legitimately flaky → delete (a false-positive ticket that shouldn't exist).
      if (!everQualified) {
        return { bucket: 'deleted', result: await removeTicket(key, summary, stats) };
      }
      // Was flaky before: keep it, and only close once it's been stable long enough.
      if (streak >= threshold) {
        return { bucket: 'closed', result: await closeTicket(key, summary, streak) };
      }
      // Legitimately flaky and not yet stable → leave the ticket open.
      return null;
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Reconcile failed for ${key}: ${detail}`);
      return { bucket: 'closed', result: { action: 'error', key, summary, error: detail } };
    }
  };

  for (const ticket of openTickets) {
    // eslint-disable-next-line no-await-in-loop
    const evaluated = await evaluateTicket(ticket);
    if (evaluated) {
      if (evaluated.bucket === 'deleted') deleted.push(evaluated.result);
      else closed.push(evaluated.result);
    }
  }

  return { closed, deleted };
}

/**
 * One-time reset: delete every flaky ticket linked to the feature whose test does NOT
 * currently meet the create criteria (flaky in < FLAKY_CREATE_MIN_COUNT of the last
 * HISTORY_DEPTH runs). Unlike reconcileTickets this ignores the sticky "ever qualified"
 * flag on purpose — it wipes stale tickets so a fresh sync can recreate them with new,
 * correctly-scoped statistics. Tickets without resolvable RP history are left untouched.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.featureKey - tracking feature (used as a scoping label)
 * @returns {Promise<{deleted: Array, kept: Array}>}
 */
async function purgeBelowCriteriaTickets(jiraClient, { featureKey }) {
  const deleted = [];
  const kept = [];
  const jql =
    `project = "${TICKET_PROJECT_KEY}" AND labels = "${FLAKY_LABEL}" AND labels = "${featureKey}" ` +
    'ORDER BY created ASC';

  let tickets;
  try {
    tickets = await searchIssues(jiraClient, jql, 200);
  } catch (err) {
    console.error(`  ✗ Could not list flaky tickets: ${err.message}`);
    return { deleted, kept };
  }

  if (!tickets.length) return { deleted, kept };

  console.log(
    '\nPurging flaky tickets below criteria ' +
      `(< ${FLAKY_CREATE_MIN_COUNT} flaky of the last ${HISTORY_DEPTH} runs) among ${tickets.length}...`,
  );

  const launchIdCache = new Map();
  const resolveLaunchId = async (launchName) => {
    if (!launchName) return null;
    if (launchIdCache.has(launchName)) return launchIdCache.get(launchName);
    let id;
    try {
      const launch = await getLatestLaunch({ name: launchName });
      id = launch?.id || null;
    } catch {
      id = null;
    }
    launchIdCache.set(launchName, id);
    return id;
  };

  for (const ticket of tickets) {
    const key = ticket.key;
    const summary = ticket.fields?.summary || key;
    try {
      const text = adfToText(ticket.fields?.description);
      const { uniqueId, launch } = parseMeta(text);
      // eslint-disable-next-line no-await-in-loop
      const launchId = uniqueId ? await resolveLaunchId(launch) : null;
      // eslint-disable-next-line no-await-in-loop
      const stats = launchId
        ? await getItemHistoryStats({ launchId, uniqueId, historyDepth: HISTORY_DEPTH })
        : null;

      if (stats && meetsCreateCriteria(stats)) {
        kept.push({ action: 'kept', key, summary, flaky: stats.flaky });
      } else {
        const flaky = stats?.flaky ?? '?';
        // eslint-disable-next-line no-await-in-loop
        await deleteIssue(jiraClient, key);
        console.log(
          `  ✗ Deleted ${key} (below criteria; ${flaky}/${HISTORY_DEPTH} flaky): ${summary}`,
        );
        deleted.push({ action: 'deleted', key, summary, flaky });
      }
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Purge failed for ${key}: ${detail}`);
    }
  }

  console.log(`\n✔ Purge complete: ${deleted.length} deleted, ${kept.length} kept.`);
  return { deleted, kept };
}

/**
 * Hard reset: delete EVERY ticket associated with the feature, regardless of label,
 * history or the sticky flag. Association is resolved two ways and unioned:
 *   1) issues linked to the feature (e.g. "Relates") — read from the feature's issuelinks;
 *   2) FAT tickets carrying the flaky label + the feature key label (our managed set).
 * This is the nuclear option to wipe stale/mismatched tickets before a clean re-sync.
 * @param {import('axios').AxiosInstance} jiraClient
 * @param {Object} opts
 * @param {string} opts.featureKey - tracking feature (e.g. "UXPROD-5976")
 * @returns {Promise<{deleted: Array}>}
 */
async function purgeAllFeatureTickets(jiraClient, { featureKey }) {
  const deleted = [];
  const keys = new Set();

  // 1) Everything linked to the feature (any link type, e.g. "Relates").
  try {
    const feature = await getIssue(jiraClient, featureKey);
    for (const link of feature.fields?.issuelinks || []) {
      const linked = link.inwardIssue || link.outwardIssue;
      const linkedKey = linked?.key;
      // Only wipe tickets in the flaky project to avoid touching unrelated links.
      if (linkedKey && linkedKey.startsWith(`${TICKET_PROJECT_KEY}-`)) {
        keys.add(linkedKey);
      }
    }
  } catch (err) {
    console.error(`  ✗ Could not read links on ${featureKey}: ${err.message}`);
  }

  // 2) Any FAT tickets our automation labelled for this feature (linked or not).
  const jql =
    `project = "${TICKET_PROJECT_KEY}" AND labels = "${FLAKY_LABEL}" AND labels = "${featureKey}" ` +
    'ORDER BY created ASC';
  try {
    const labelled = await searchIssues(jiraClient, jql, 500);
    labelled.forEach((issue) => keys.add(issue.key));
  } catch (err) {
    console.error(`  ✗ Could not list labelled flaky tickets: ${err.message}`);
  }

  if (!keys.size) {
    console.log(`\nNo tickets found associated with ${featureKey}.`);
    return { deleted };
  }

  console.log(`\nHard-deleting ${keys.size} ticket(s) associated with ${featureKey}...`);

  for (const key of keys) {
    try {
      // eslint-disable-next-line no-await-in-loop
      await deleteIssue(jiraClient, key);
      console.log(`  ✗ Deleted ${key}`);
      deleted.push({ action: 'deleted', key });
    } catch (err) {
      const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
      console.error(`  ✗ Failed to delete ${key}: ${detail}`);
    }
  }

  console.log(`\n✔ Hard reset complete: ${deleted.length} deleted.`);
  return { deleted };
}

module.exports = {
  syncFlakyTickets,
  reconcileTickets,
  purgeBelowCriteriaTickets,
  purgeAllFeatureTickets,
  aggregateFlakyTests,
  buildSummary,
  parseCaseId,
  meetsCreateCriteria,
  priorityForRate,
  buildDescriptionText,
  parseExistingLogLines,
  buildStatsLines,
  parseMeta,
  parseEverQualified,
  trailingStablePasses,
};
