import { findMatchingRoute } from './requestMatcher';

let activeRegistration;
let observerRegistered = false;
let observedTestId;

const observeRequest = (request) => {
  if (!activeRegistration) return;

  const { aliases, matchers, routes, tracker } = activeRegistration;
  const route = findMatchingRoute({ request, routes, matchers });

  if (!route) return;

  request.alias = aliases[route.id].slice(1);
  tracker.routeCounts[route.id] = (tracker.routeCounts[route.id] || 0) + 1;
  tracker.lastActivity = Date.now();
  request.continue();
};

/** Installs one request observer per Cypress test. */
export const ensureRequestObserver = () => {
  const currentTestId = Cypress.currentTest?.titlePath?.join(' > ') || Cypress.currentTest?.title;

  if (currentTestId !== observedTestId) {
    observedTestId = currentTestId;
    observerRegistered = false;
  }

  if (observerRegistered) return;

  observerRegistered = true;
  cy.intercept({ url: '**' }, observeRequest);
};

/** Switches the singleton observer to the action about to execute. */
export const activateRegistration = (registration) => {
  activeRegistration = registration;
};
