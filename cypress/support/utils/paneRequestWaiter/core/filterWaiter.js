import { FILTER_NETWORK_IDLE_MS } from '../constants';
import { findMatchingRoute } from './requestMatcher';
import { assertSuccessfulResponses } from './responseAssertions';

export const createFilterTracker = () => ({
  completedUrls: [],
  errors: [],
  lastActivity: Date.now(),
  pending: 0,
  routeCounts: {},
});

/**
 * Tracks only matching application fetches and restores the original function
 * after `waitForTrackedRequests` observes completion.
 */
export const installFetchTracker = ({ routes, matchers, tracker }) => {
  cy.window({ log: false }).then((window) => {
    const originalFetch = window.fetch;

    tracker.restore = () => {
      window.fetch = originalFetch;
    };
    window.fetch = (...args) => {
      const [input, init = {}] = args;
      const url = typeof input === 'string' ? input : input.url || input.toString();
      const request = {
        method: (init.method || input.method || 'GET').toUpperCase(),
        url: new URL(url, window.location.origin).href,
      };
      const trackedRoute = findMatchingRoute({
        request,
        routes,
        matchers,
        baseUrl: window.location.origin,
      });

      if (!trackedRoute) return originalFetch.apply(window, args);

      tracker.pending += 1;
      tracker.lastActivity = Date.now();

      return originalFetch
        .apply(window, args)
        .then((response) => {
          if (!response.ok) {
            tracker.errors.push({
              request: { url: request.url },
              response: { statusCode: response.status },
            });
          }

          return response;
        })
        .finally(() => {
          tracker.completedUrls.push(request.url);
          tracker.pending -= 1;
          tracker.lastActivity = Date.now();
        });
    };
  });
};

/** Waits for every matching filter fetch that was actually sent. */
export const waitForTrackedRequests = (tracker, timeout) => {
  const maximumWait = timeout || Cypress.config('requestTimeout');
  let startedAt;

  const waitUntilIdle = () => {
    const isQuiet = Date.now() - tracker.lastActivity >= FILTER_NETWORK_IDLE_MS;

    if (isQuiet && tracker.pending === 0) {
      tracker.restore?.();
      assertSuccessfulResponses(tracker.errors);

      return tracker.completedUrls;
    }

    if (Date.now() - startedAt >= maximumWait) {
      tracker.restore?.();
      throw new Error(`Pane filter requests did not settle within ${maximumWait}ms`);
    }

    return cy.wait(100, { log: false }).then(waitUntilIdle);
  };

  return cy.then({ log: false }, () => {
    startedAt = Date.now();

    return waitUntilIdle();
  });
};
