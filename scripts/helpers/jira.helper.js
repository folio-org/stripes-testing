async function getIssue(api, key) {
  const response = await api.get(`issue/${key}`);
  if (response.status !== 200) {
    throw new Error('Error fetching issue: ' + key);
  }
  return response.data;
}

async function getIssueStatus(api, key) {
  this.issues = this.issues || {};
  if (!this.issues[key]) {
    this.issues[key] = (await getIssue(api, key)).fields.status.name;
  }
  return this.issues[key];
}

async function searchIssues(api, jql, maxResults = 100) {
  const allIssues = [];
  let next = true;
  const requestBody = {
    fields: ['summary', 'description', 'status', 'resolution'],
    jql,
    maxResults,
  };
  while (next) {
    const response = await api.post('search/jql', requestBody);
    if (response.status !== 200) {
      throw new Error('Error searching issues with JQL: ' + jql);
    }
    if (response.data.issues && response.data.issues.length) {
      allIssues.push(...response.data.issues);
    }
    if (response.data.isLast) {
      next = false;
    } else {
      requestBody.nextPageToken = response.data.nextPageToken;
    }
  }
  return allIssues;
}

module.exports = { getIssue, getIssueStatus, searchIssues };
