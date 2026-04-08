import { recurse } from 'cypress-recurse';

/**
 * Repeatedly fetches data until validateFn returns true.
 * Handles 401 authentication errors by refreshing the token and retrying.
 * Works with Cypress command chains and returns the final fetch result.
 * @param {Function} fetchFn - Function returning a Cypress chainable with fetched data
 * @param {Function} validateFn - Function that checks whether response is ready
 * @param {Object} options - recurse options
 * @param {number} options.timeout - Total timeout in milliseconds (default: 420000)
 * @param {number} options.delay - Delay between retries in milliseconds (default: 5000)
 * @param {string} options.errorMessage - Error message on timeout
 * @param {boolean} options.log - Whether to log recurse steps (default: true)
 * @returns {Cypress.Chainable<any>} The successful fetch result
 */
export const poll = (
  fetchFn,
  validateFn,
  {
    timeout = 420000,
    delay = 5000,
    errorMessage = `Data not available within ${timeout}ms`,
    log = true,
  } = {},
) => {
  // '⚠️ Warning: poll() detects 401 errors. Set `failOnStatusCode: false` in your fetchFn API calls so that the cy.okapiRequest does not fail on 401 errors.'

  const fetchWithTokenRefresh = () => {
    return fetchFn().then((response) => {
      if (response.status === 401) {
        return cy.getAdminToken().then(() => fetchWithTokenRefresh());
      }
      return response;
    });
  };

  return recurse(
    () => fetchWithTokenRefresh(),
    (response) => Boolean(validateFn(response)),
    {
      timeout,
      delay,
      log,
      error: errorMessage,
    },
  );
};
