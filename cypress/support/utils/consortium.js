import { PUBLISH_COORDINATOR_STATUSES } from '../constants';

/*
  Helper function to normalize publication results by separating successful results and errors, and parsing the response body of successful results.
 */
export const normalizePublicationResults = ({ publicationResults, totalRecords }) => {
  const results = [];
  const errors = [];

  for (const item of publicationResults) {
    if (item.statusCode >= 200 && item.statusCode < 300) {
      results.push(item);
    } else {
      errors.push(item);
    }
  }

  const normalizedResults = results.map(({ response, ...rest }) => ({
    response: JSON.parse(response),
    ...rest,
  }));

  return {
    publicationResults: normalizedResults,
    publicationErrors: errors,
    totalRecords,
  };
};

/*
  Polling function to get publication results when publication is still in progress.
 */
export function getPublicationResults(id, retryCount = 0) {
  const TIMEOUT = 1000;
  const MAX_RETRIES = 10;

  if (retryCount >= MAX_RETRIES) {
    throw new Error(`Exceeded maximum retries (${MAX_RETRIES}) for publication ID: ${id}`);
  }

  return cy.getPublicationDetails(id).then(({ status }) => {
    if (status !== PUBLISH_COORDINATOR_STATUSES.IN_PROGRESS) {
      return cy.getPublicationResults(id).then(normalizePublicationResults);
    }

    cy.wait(TIMEOUT * (retryCount + 1)); // Exponential backoff

    return getPublicationResults(id, retryCount + 1);
  });
}
