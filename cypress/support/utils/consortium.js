import { recurse } from 'cypress-recurse';
import { PUBLISH_COORDINATOR_STATUSES } from '../constants';

/*
  Helper function to normalize publication results by separating successful results and errors, and parsing the response body of successful results.
 */
export const normalizePublicationResults = ({ publicationResults = [], totalRecords }) => {
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

/**
 * Waits for a publish-coordinator publication to leave the in-progress state,
 * then retrieves and normalizes its publication results.
 *
 * @param {string} id - Publication identifier returned by the publish-coordinator request.
 * @param {Object} [options] - Polling options passed to `cypress-recurse`.
 * @param {number} [options.delay=1000] - Delay between publication-status requests in milliseconds.
 * @param {number} [options.timeout=600000] - Maximum time to wait for a terminal publication status in milliseconds.
 * @returns {Cypress.Chainable<Object>} Normalized publication results and publication errors.
 */
export function getPublicationResults(
  id,
  { delay = 1000, timeout = 600000, failOnStatusCode = true } = {},
) {
  return recurse(
    () => cy.getPublicationDetails(id, { failOnStatusCode }),
    (publication) => Boolean(publication && publication.status !== PUBLISH_COORDINATOR_STATUSES.IN_PROGRESS),
    {
      delay,
      timeout,
      error: `Publication ${id} did not finish within ${timeout}ms`,
    },
  ).then(() => cy.getPublicationResults(id, { failOnStatusCode }).then(normalizePublicationResults));
}
