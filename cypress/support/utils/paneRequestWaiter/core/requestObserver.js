import { findMatchingRoute } from './requestMatcher';
import { isSuccessfulResponse } from './responseAssertions';

let activeRegistration;
let observerRegistered = false;
let observedTestId;

const observeRequest = (request) => {
  if (!activeRegistration) return;

  const { aliases, matchers, routes, tracker, trackResponses } = activeRegistration;
  const route = findMatchingRoute({ request, routes, matchers });

  if (!route) return;

  request.alias = aliases[route.id].slice(1);
  tracker.routeCounts[route.id] = (tracker.routeCounts[route.id] || 0) + 1;
  tracker.lastActivity = Date.now();

  if (trackResponses) {
    const requestId = ++tracker.nextRequestId;

    tracker.pending += 1;
    tracker.pendingUrls[requestId] = request.url;
    // Observe completion without calling request.continue(). Returning from an
    // intercept handler lets later test intercepts still inspect or stub the
    // same request; continue() would end Cypress's request-handler chain.
    request.on('after:response', (response) => {
      const interception = { request, response };

      if (!isSuccessfulResponse(response, route)) tracker.errors.push(interception);

      tracker.completedUrls.push(request.url);
      tracker.pending -= 1;
      delete tracker.pendingUrls[requestId];
      tracker.lastActivity = Date.now();
    });
  }
};

/** Installs one request observer per Cypress test. */
export const ensureRequestObserver = () => {
  const currentTestId = Cypress.currentTest?.titlePath?.join(' > ') || Cypress.currentTest?.title;
  const currentRetry = cy.state('runnable')?.currentRetry?.() || 0;
  const testAttemptId = `${currentTestId}::retry-${currentRetry}`;

  // Cypress clears intercepts before a retry, while this module's variables
  // survive. Include the retry number so the same test title reinstalls its
  // observer for every attempt.
  if (testAttemptId !== observedTestId) {
    observedTestId = testAttemptId;
    observerRegistered = false;
    activeRegistration = undefined;
  }

  if (observerRegistered) return;

  observerRegistered = true;
  cy.intercept({ url: '**' }, observeRequest);
};

/** Switches the singleton observer to the action about to execute. */
export const activateRegistration = (registration) => {
  activeRegistration = registration;
};
