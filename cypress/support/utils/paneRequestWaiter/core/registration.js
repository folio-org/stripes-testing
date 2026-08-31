import { PANE_REQUEST_PHASES } from '../constants';
import { createFilterTracker } from './filterWaiter';
import { getRegisteredRoutes, getRoutes } from './profileRegistry';
import { activateRegistration, ensureRequestObserver } from './requestObserver';
import { resetRuntimeState } from './runtimeState';

let invocation = 0;

/** Registers all primary and potential dependency routes before an action. */
export const registerPaneRequests = ({
  pane,
  phase,
  conditions = {},
  matchers = {},
  trackFilters = false,
}) => {
  const sequence = ++invocation;
  const routes = getRoutes(pane, phase, conditions);
  const registeredRoutes = getRegisteredRoutes(pane, phase, conditions);
  const routeIds = new Set(registeredRoutes.map(({ id }) => id));
  const invalidMatcher = Object.entries(matchers).find(
    ([routeId, matcher]) => !routeIds.has(routeId) || typeof matcher !== 'function',
  );

  if (invalidMatcher) {
    throw new Error(`Invalid matcher for ${pane}.${invalidMatcher[0]}`);
  }

  const aliases = registeredRoutes.reduce(
    (routeAliases, route) => ({
      ...routeAliases,
      [route.id]: `@pane-${pane}-${route.id}-${sequence}`,
    }),
    {},
  );
  const tracker = createFilterTracker();

  ensureRequestObserver();
  cy.then({ log: false }, () => {
    if (phase === PANE_REQUEST_PHASES.FILTERS) resetRuntimeState(pane);

    // Registration is created while the test queues commands, potentially
    // long before this command executes. Start the idle window now so a pane
    // whose resources are already cached still gets a full render-settle
    // interval after its trigger instead of returning immediately.
    tracker.lastActivity = Date.now();
    activateRegistration({
      aliases,
      matchers,
      routes: registeredRoutes,
      trackResponses: phase === PANE_REQUEST_PHASES.FILTERS && trackFilters,
      tracker,
    });
  });

  return { aliases, routes, tracker };
};
