import { FILTER_NETWORK_IDLE_MS } from '../constants';
import { assertSuccessfulResponses } from './responseAssertions';

export const createFilterTracker = () => ({
  completedUrls: [],
  errors: [],
  lastActivity: Date.now(),
  nextRequestId: 0,
  pending: 0,
  pendingUrls: {},
  routeCounts: {},
});

/** Waits for every matching filter fetch that was actually sent. */
export const waitForTrackedRequests = (tracker, timeout) => {
  const maximumWait = timeout || Cypress.config('requestTimeout');
  let startedAt;

  const waitUntilIdle = () => {
    // Pending protects slow responses; the quiet window catches requests that
    // React schedules shortly after another filter resource completes.
    const isQuiet = Date.now() - tracker.lastActivity >= FILTER_NETWORK_IDLE_MS;

    if (isQuiet && tracker.pending === 0) {
      assertSuccessfulResponses(tracker.errors);

      return tracker.completedUrls;
    }

    if (Date.now() - startedAt >= maximumWait) {
      const pendingUrls = Object.values(tracker.pendingUrls);
      const pendingDetails = pendingUrls.length ? ` Pending: ${pendingUrls.join(', ')}` : '';

      throw new Error(
        `Pane filter requests did not settle within ${maximumWait}ms.${pendingDetails}`,
      );
    }

    return cy.wait(100, { log: false }).then(waitUntilIdle);
  };

  return cy.then({ log: false }, () => {
    startedAt = Date.now();

    return waitUntilIdle();
  });
};
