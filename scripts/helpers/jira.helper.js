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

module.exports = { getIssue, getIssueStatus };
