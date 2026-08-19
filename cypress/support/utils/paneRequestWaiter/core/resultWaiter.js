import { PANE_REQUEST_PHASES } from '../constants';
import { getResponseDependencies } from './profileRegistry';
import { assertSuccessfulResponses } from './responseAssertions';
import { getRuntimeState } from './runtimeState';

const mapResponsesByRouteId = (routes, interceptions) => {
  const completedRequests = Array.isArray(interceptions) ? interceptions : [interceptions];

  return routes.reduce(
    (responses, route, index) => ({ ...responses, [route.id]: completedRequests[index] }),
    {},
  );
};

const waitForCompletedAlias = (alias, timeout) => {
  const wait = timeout ? cy.wait(alias, { timeout }) : cy.wait(alias);

  return wait.then((interception) => {
    // Query-state updates can cancel an in-flight request and immediately
    // issue its replacement. Wait for the replacement response as well.
    if (!interception.response) return waitForCompletedAlias(alias, timeout);

    return interception;
  });
};

const waitForAlias = (alias, requestCount, timeout) => {
  return Cypress._.range(requestCount).reduce((chain) => {
    return chain.then((completedRequests) => {
      return waitForCompletedAlias(alias, timeout).then((interception) => [
        ...completedRequests,
        interception,
      ]);
    });
  }, cy.wrap([]));
};

const waitForResponseDependencies = ({ pane, aliases, conditions, responses, timeout }) => {
  const dependencies = getResponseDependencies(pane, PANE_REQUEST_PHASES.RESULTS);
  const state = getRuntimeState(pane);

  return (
    dependencies
      // Profile order is topological. Each completed dependency is inserted into
      // the shared response map so later predicates can depend on it.
      .reduce((chain, dependency) => {
        return chain.then(() => {
          const hasDependencies = dependency.dependsOn.every((routeId) => responses[routeId]);
          const context = { conditions, responses, state };

          if (!hasDependencies || !dependency.when(context)) return null;

          const requestCount = dependency.requestCount ? dependency.requestCount(context) : 1;

          if (!Number.isInteger(requestCount) || requestCount < 1) {
            throw new Error(
              `Invalid request count for ${pane}.${dependency.route.id}: ${requestCount}`,
            );
          }

          return waitForAlias(aliases[dependency.route.id], requestCount, timeout).then(
            (interceptions) => {
              assertSuccessfulResponses(interceptions, Array(requestCount).fill(dependency.route));
              responses[dependency.route.id] = interceptions;
              dependency.remember?.(context);
            },
          );
        });
      }, cy.wrap(null))
      .then(() => responses)
  );
};

/** Waits for primary results and then resolves their response dependency graph. */
export const waitForResultRequests = ({ pane, aliases, conditions, routes, timeout }) => {
  const wait = routes.reduce((chain, { id }) => {
    return chain.then((interceptions) => {
      return waitForCompletedAlias(aliases[id], timeout).then((interception) => [
        ...interceptions,
        interception,
      ]);
    });
  }, cy.wrap([]));

  return wait.then((interceptions) => {
    assertSuccessfulResponses(interceptions, routes);

    return waitForResponseDependencies({
      pane,
      aliases,
      conditions,
      responses: mapResponsesByRouteId(routes, interceptions),
      timeout,
    }).then(() => interceptions);
  });
};
