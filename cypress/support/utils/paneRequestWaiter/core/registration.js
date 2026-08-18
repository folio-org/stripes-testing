import { PANE_REQUEST_PHASES } from '../constants';
import { createFilterTracker, installFetchTracker } from './filterWaiter';
import { getRegisteredRoutes, getRoutes } from './profileRegistry';
import { activateRegistration, ensureRequestObserver } from './requestObserver';
import { resetRuntimeState } from './runtimeState';

let invocation = 0;

/** Registers all primary and potential dependency routes before an action. */
export const registerPaneRequests = ({ pane, phase, matchers, trackFilters = false }) => {
  const sequence = ++invocation;
  const routes = getRoutes(pane, phase);
  const registeredRoutes = getRegisteredRoutes(pane, phase);
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

    activateRegistration({ aliases, matchers, routes: registeredRoutes, tracker });
  });

  if (phase === PANE_REQUEST_PHASES.FILTERS && trackFilters) {
    installFetchTracker({ routes: registeredRoutes, matchers, tracker });
  }

  return { aliases, routes, tracker };
};
