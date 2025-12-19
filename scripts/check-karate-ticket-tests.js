/*
This script's goal is to find Karate tickets for tests which were already automated by AQA.
(So that we can close them in Jira)
Script does the following:
- retrieves all Karate tickets for specified team(s)
- extracts TestRail case IDs from ticket descriptions
- fetches TestRail cases to check their automation type
- outputs list of Jira tickets for test cases which have "Automated" execution type in TestRail,
  excluding those which are already closed (with any resolution)
*/

/* eslint-disable no-console */
require('dotenv').config();

const devTeams = [
  'Firebird',
  'Folijet',
  'Spitfire',
  'Thunderjet',
  'Vega',
  'Volaris',
  'Citation',
  'Corsair',
  'Eureka',
];
// Map TestRail automation type values
const automationTypeMap = {
  1: 'Automated',
  2: 'Manual',
  3: 'Karate',
  4: 'Unit',
};

const karateEpic = 'FAT-20607';
const targetAutomationType = 1; // Automated

const { createJiraClient, createTestRailClient } = require('./helpers/api.client');
const { searchIssues } = require('./helpers/jira.helper');
const { getTestCase } = require('./helpers/test.rail.helper');

const JIRA_API_KEY = process.env.JIRA_API_KEY;
const API_USER = process.env.TESTRAIL_API_USER;
const API_KEY = process.env.TESTRAIL_API_KEY;

const jiraClient = createJiraClient(JIRA_API_KEY);
const testrailClient = createTestRailClient(API_USER, API_KEY);

// JQL query for Karate tickets under FAT-20607 for all dev teams
const JQL = `parent=${karateEpic} and "Development Team[Dropdown]" in (${devTeams.join(', ')}) and summary ~ Karate`;

// Regex to extract TestRail case ID from URL
const TESTRAIL_LINK_REGEX = /https:\/\/foliotest\.testrail\.io\/index\.php\?\/cases\/view\/(\d+)/g;

/**
 * Recursively extract text from Atlassian Document Format
 */
function extractTextFromADF(node, texts = []) {
  if (!node) return texts;

  if (node.type === 'text' && node.text) {
    texts.push(node.text);
  }

  if (node.marks && Array.isArray(node.marks)) {
    node.marks.forEach((mark) => {
      if (mark.type === 'link' && mark.attrs && mark.attrs.href) {
        texts.push(mark.attrs.href);
      }
    });
  }

  if (node.content && Array.isArray(node.content)) {
    node.content.forEach((child) => extractTextFromADF(child, texts));
  }

  return texts;
}

/**
 * Extract TestRail case IDs from issue description
 */
function extractTestRailLinks(issue) {
  const links = [];
  const { description } = issue.fields;

  // Search in description (Atlassian Document Format)
  if (description) {
    const texts = extractTextFromADF(description);
    const descriptionText = texts.join(' ');
    const matches = [...descriptionText.matchAll(TESTRAIL_LINK_REGEX)];
    matches.forEach((match) => links.push(match[1]));
  }

  return [...new Set(links)]; // Remove duplicates
}

/**
 * Main function to process Jira tickets and extract TestRail execution types
 */
async function processJiraTickets() {
  try {
    console.log('Fetching Jira tickets...');
    const issues = await searchIssues(jiraClient, JQL, 200);
    console.log(`Found ${issues.length} Jira tickets\n`);

    const automatedTickets = [];

    for (const issue of issues) {
      const { key, fields } = issue;
      const caseIds = extractTestRailLinks(issue);

      console.log(`Processing ${key}: ${fields.summary}`);
      console.log(
        `  Status: ${fields.status.name}, Resolution: ${fields.resolution?.name || 'None'}`,
      );
      console.log(`  Found ${caseIds.length} TestRail link(s)`);

      for (const caseId of caseIds) {
        const testCase = await getTestCase(testrailClient, caseId);

        if (testCase) {
          const executionType = automationTypeMap[testCase.custom_automation_type] || 'Not set';

          console.log(`    Case C${caseId}: Execution type = ${executionType}`);

          // Check if automation type is "Automated"
          if (testCase.custom_automation_type === targetAutomationType) {
            const status = fields.status.name;
            const resolution = fields.resolution?.name;
            const isClosed = status === 'Closed';
            const jiraLink = `https://folio-org.atlassian.net/browse/${key}`;

            automatedTickets.push({
              jiraKey: key,
              jiraLink,
              status,
              resolution: resolution || 'None',
              isClosed,
            });
          }
        } else {
          console.log(`    Case C${caseId}: Failed to fetch`);
        }
      }
      console.log('');
    }

    // Separate tickets into included and excluded
    const includedTickets = automatedTickets.filter((t) => !t.isClosed);
    const excludedTickets = automatedTickets.filter((t) => t.isClosed);

    // Output excluded tickets (for reference)
    if (excludedTickets.length > 0) {
      console.log('\n=== EXCLUDED TICKETS (Automated but closed) ===');
      excludedTickets.forEach((ticket) => {
        console.log(
          `${ticket.jiraKey} (${ticket.status}, ${ticket.resolution}): ${ticket.jiraLink}`,
        );
      });
      console.log(`Total excluded: ${excludedTickets.length}\n`);
    }

    // Output final list
    console.log('\n=== FINAL OUTPUT (Automated tickets that are NOT closed) ===');
    if (includedTickets.length > 0) {
      includedTickets.forEach((ticket) => {
        console.log(ticket.jiraLink);
      });
      console.log(`\nTotal: ${includedTickets.length} tickets`);
    } else {
      console.log('No tickets match the criteria.');
    }
  } catch (error) {
    console.error('Error processing tickets:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run the script
processJiraTickets();
