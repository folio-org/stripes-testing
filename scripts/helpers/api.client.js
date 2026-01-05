const axios = require('axios');

function createTestRailClient(API_USER, API_KEY) {
  return axios.create({
    baseURL: 'https://foliotest.testrail.io/index.php?/api/v2/',
    auth: {
      username: API_USER,
      password: API_KEY,
    },
  });
}

function createJiraClient(JIRA_API_KEY) {
  return axios.create({
    baseURL: 'https://folio-org.atlassian.net/rest/api/3/',
    headers: {
      Authorization: `Basic ${JIRA_API_KEY}`,
    },
  });
}

module.exports = { createTestRailClient, createJiraClient };
