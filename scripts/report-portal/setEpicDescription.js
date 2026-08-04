/* eslint-disable no-console */
/**
 * One-off helper: set the description of the flaky-tests tracking epic from
 * scripts/report-portal/epic-description.md.
 *
 * Usage (from stripes-testing):
 *   node scripts/report-portal/setEpicDescription.js            # uses JIRA_EPIC (.env)
 *   node scripts/report-portal/setEpicDescription.js UXPROD-5976
 *
 * Requires JIRA_API_KEY in the environment / .env.
 */
require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { createJiraClient } = require('../helpers/api.client');
const { textToAdf, updateIssueFields } = require('../helpers/jira.helper');

async function main() {
  const epicKey = (process.argv[2] || process.env.JIRA_EPIC || '').trim();
  if (!epicKey) {
    throw new Error('No epic key given (pass as argument or set JIRA_EPIC)');
  }
  const jiraApiKey = process.env.JIRA_API_KEY;
  if (!jiraApiKey) {
    throw new Error('JIRA_API_KEY is not set (add it to your environment or .env)');
  }

  const mdPath = path.join(__dirname, 'epic-description.md');
  const text = fs.readFileSync(mdPath, 'utf8');

  const jira = createJiraClient(jiraApiKey);
  await updateIssueFields(jira, epicKey, { description: textToAdf(text) });
  console.log(`✔ Updated description of epic ${epicKey} from ${path.basename(mdPath)}`);
}

main().catch((err) => {
  const detail = err.response?.data ? JSON.stringify(err.response.data) : err.message;
  console.error(`✗ Failed: ${detail}`);
  process.exit(1);
});
