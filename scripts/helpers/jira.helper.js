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

/**
 * Split a single line of text into ADF inline nodes, turning any embedded URLs
 * (http/https) into clickable link nodes while keeping the surrounding text.
 * @param {string} line
 * @returns {Array<Object>} ADF inline nodes
 */
function inlineNodes(line) {
  const nodes = [];
  const urlRe = /(https?:\/\/[^\s]+)/g;
  let lastIndex = 0;
  for (const match of line.matchAll(urlRe)) {
    if (match.index > lastIndex) {
      nodes.push({ type: 'text', text: line.slice(lastIndex, match.index) });
    }
    const url = match[0];
    nodes.push({ type: 'text', text: url, marks: [{ type: 'link', attrs: { href: url } }] });
    lastIndex = match.index + url.length;
  }
  if (lastIndex < line.length) {
    nodes.push({ type: 'text', text: line.slice(lastIndex) });
  }
  return nodes;
}

/**
 * Convert plain text (with newlines) into a minimal Atlassian Document Format (ADF)
 * document. URLs embedded anywhere in a line become clickable links. Blank lines are
 * dropped (Jira already spaces paragraphs) so the result stays compact.
 * @param {string} text
 * @returns {Object} ADF document
 */
function textToAdf(text) {
  const content = (text || '')
    .split('\n')
    .filter((line) => line.trim() !== '')
    .map((line) => ({ type: 'paragraph', content: inlineNodes(line) }));

  // Jira rejects an empty doc; ensure at least one (empty) paragraph.
  if (!content.length) {
    content.push({ type: 'paragraph', content: [] });
  }

  return { type: 'doc', version: 1, content };
}

/**
 * Flatten a minimal Atlassian Document Format (ADF) document back into plain text.
 * Only the node types produced by textToAdf (paragraphs / text / link marks) are
 * handled, which is enough to round-trip descriptions maintained by this automation.
 * @param {Object} adf - ADF document (issue `description` field)
 * @returns {string} Plain text with newlines between paragraphs
 */
function adfToText(adf) {
  if (!adf || typeof adf === 'string') {
    return typeof adf === 'string' ? adf : '';
  }
  const walkInline = (nodes = []) => nodes.map((n) => n.text || '').join('');
  const lines = (adf.content || []).map((block) => {
    if (block.type === 'paragraph') {
      return walkInline(block.content);
    }
    if (Array.isArray(block.content)) {
      return walkInline(block.content);
    }
    return '';
  });
  return lines.join('\n');
}

/**
 * Create a Jira issue (Jira Cloud REST API v3).
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {Object} fields - Jira issue `fields` object (project, summary, issuetype, ...)
 * @returns {Promise<Object>} Created issue ({ id, key, self })
 */
async function createIssue(api, fields) {
  const response = await api.post('issue', { fields });
  if (response.status !== 201) {
    throw new Error(`Error creating issue (status ${response.status})`);
  }
  return response.data;
}

/**
 * Update fields on an existing Jira issue (Jira Cloud REST API v3).
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {string} issueKey - e.g. "FAT-1234"
 * @param {Object} fields - Jira issue `fields` object to update (e.g. { description })
 * @returns {Promise<void>}
 */
async function updateIssueFields(api, issueKey, fields) {
  const response = await api.put(`issue/${issueKey}`, { fields });
  if (response.status !== 204) {
    throw new Error(`Error updating issue ${issueKey} (status ${response.status})`);
  }
}

/**
 * Post a comment to a Jira issue (Jira Cloud REST API v3, ADF body).
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {string} issueKey - e.g. "FAT-1234"
 * @param {string|Object} body - Plain text (converted to ADF) or a ready ADF doc
 * @returns {Promise<Object>} Created comment
 */
async function postComment(api, issueKey, body) {
  const adf = typeof body === 'string' ? textToAdf(body) : body;
  const response = await api.post(`issue/${issueKey}/comment`, { body: adf });
  if (response.status !== 201) {
    throw new Error(`Error posting comment to ${issueKey} (status ${response.status})`);
  }
  return response.data;
}

/**
 * List the transitions currently available for an issue.
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {string} issueKey - e.g. "UXPROD-5976"
 * @returns {Promise<Array<{id: string, name: string, to: {name: string}}>>}
 */
async function getTransitions(api, issueKey) {
  const response = await api.get(`issue/${issueKey}/transitions`);
  if (response.status !== 200) {
    throw new Error(`Error fetching transitions for ${issueKey} (status ${response.status})`);
  }
  return response.data.transitions || [];
}

/**
 * Move an issue to a target status by name (case-insensitive). Resolves the correct
 * transition id from the issue's currently-available transitions.
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {string} issueKey - e.g. "UXPROD-5976"
 * @param {string} targetStatusName - e.g. "Closed" / "Done"
 * @returns {Promise<{transitioned: boolean, to?: string, reason?: string}>}
 */
async function transitionIssueTo(api, issueKey, targetStatusName) {
  const target = (targetStatusName || '').trim().toLowerCase();
  const transitions = await getTransitions(api, issueKey);
  const match = transitions.find(
    (t) => (t.to?.name || '').trim().toLowerCase() === target ||
      (t.name || '').trim().toLowerCase() === target,
  );
  if (!match) {
    const available = transitions.map((t) => t.to?.name || t.name).join(', ');
    return {
      transitioned: false,
      reason: `no "${targetStatusName}" transition (available: ${available})`,
    };
  }

  const response = await api.post(`issue/${issueKey}/transitions`, {
    transition: { id: match.id },
  });
  if (response.status !== 204) {
    throw new Error(`Error transitioning ${issueKey} (status ${response.status})`);
  }
  return { transitioned: true, to: match.to?.name || targetStatusName };
}

/**
 * Create an issue link between two issues.
 * @param {import('axios').AxiosInstance} api - Jira axios client (createJiraClient)
 * @param {Object} opts
 * @param {string} opts.type - link type name (e.g. "Relates")
 * @param {string} opts.inwardKey - issue on the inward side (e.g. the new task)
 * @param {string} opts.outwardKey - issue on the outward side (e.g. the feature)
 * @returns {Promise<void>}
 */
async function createIssueLink(api, { type, inwardKey, outwardKey }) {
  const response = await api.post('issueLink', {
    type: { name: type },
    inwardIssue: { key: inwardKey },
    outwardIssue: { key: outwardKey },
  });
  if (response.status !== 201) {
    throw new Error(`Error linking ${inwardKey} -> ${outwardKey} (status ${response.status})`);
  }
}

module.exports = {
  getIssue,
  getIssueStatus,
  searchIssues,
  postComment,
  textToAdf,
  adfToText,
  createIssue,
  updateIssueFields,
  getTransitions,
  transitionIssueTo,
  createIssueLink,
};
