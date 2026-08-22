import { waitForTrackedRequests } from './core/filterWaiter';
import { registerPaneRequests } from './core/registration';
import { waitForResultRequests } from './core/resultWaiter';
import { NO_REQUEST_QUIET_PERIOD_MS, PANE_REQUEST_PHASES } from './constants';

export { PANE_REQUEST_PHASES, PANE_REQUEST_PROFILE_NAMES } from './constants';
export { PANE_REQUEST_PROFILES } from './profiles';

/**
 * Information captured for a request that belongs to the active pane action.
 *
 * @typedef {Object} PaneRequestDetails
 * @property {string} url - Complete request URL, including its query string.
 * @property {string} pathname - Request path without query parameters.
 * @property {Object.<string, string>} query - Parsed query parameters.
 */

/**
 * Predicate used to distinguish an action's request from unrelated traffic to
 * the same endpoint.
 *
 * @callback PaneRequestMatcher
 * @param {PaneRequestDetails} request - Parsed information about the request.
 * @returns {boolean} Whether the request belongs to the current UI action.
 */

/**
 * Registers action-scoped Cypress aliases for a pane's known requests.
 *
 * Use this directly only when registration and waiting must be separate. In
 * normal tests, prefer `waitForPaneRequests` so dependency and filter behavior
 * is handled by the utility.
 *
 * @param {Object} options - Interception options.
 * @param {string} options.pane - A value from `PANE_REQUEST_PROFILE_NAMES`.
 * @param {string} [options.phase=PANE_REQUEST_PHASES.RESULTS] - A value from
 * `PANE_REQUEST_PHASES`: filter resources loaded while rendering, or result
 * resources loaded by search, filter, sort, and pagination actions.
 * @param {Object.<string, boolean>} [options.conditions={}] - Runtime facts
 * used to select a result variant. This matters when aliases are registered
 * separately for a conditional action such as ISBN conversion.
 * @param {Object.<string, PaneRequestMatcher>} [options.matchers={}] - Custom
 * predicates keyed by route ID for excluding unrelated endpoint traffic.
 * @returns {Object.<string, string>} Route IDs mapped to Cypress aliases.
 */
export const interceptPaneRequests = ({
  pane,
  phase = PANE_REQUEST_PHASES.RESULTS,
  conditions = {},
  matchers = {},
}) => registerPaneRequests({ pane, phase, conditions, matchers }).aliases;

/**
 * Runs a UI action and waits for its pane requests.
 *
 * Result actions wait for primary requests and every response-derived linked
 * request. Filter actions track matching `fetch` calls actually emitted during
 * rendering, excluding resources already held in the application's cache.
 *
 * @param {Object} options - Wait options.
 * @param {string} options.pane - A value from `PANE_REQUEST_PROFILE_NAMES`.
 * @param {Function} options.trigger - UI action run after tracking is installed.
 * @param {string} [options.phase=PANE_REQUEST_PHASES.RESULTS] - A value from
 * `PANE_REQUEST_PHASES` identifying which group of profile requests to await.
 * @param {Object.<string, boolean>} [options.conditions={}] - Runtime facts not
 * available in responses, such as Receiving's `crossTenant` mode.
 * @param {Object.<string, PaneRequestMatcher>} [options.matchers={}] - Custom
 * predicates keyed by route ID.
 * @param {number} [options.timeout] - Cypress request timeout override in ms.
 * @returns {Cypress.Chainable} Primary result interceptions, or completed
 * filter request URLs for the filters phase.
 */
export const waitForPaneRequests = ({
  pane,
  trigger,
  phase = PANE_REQUEST_PHASES.RESULTS,
  conditions = {},
  matchers = {},
  timeout,
}) => {
  if (typeof trigger !== 'function') throw new Error('A pane request trigger function is required');

  const { aliases, routes, tracker } = registerPaneRequests({
    pane,
    phase,
    conditions,
    matchers,
    trackFilters: true,
  });

  trigger();

  if (phase === PANE_REQUEST_PHASES.FILTERS) return waitForTrackedRequests(tracker, timeout);

  return waitForResultRequests({
    pane,
    aliases,
    conditions,
    routes,
    timeout,
  });
};

/**
 * Runs a UI action and asserts the pane sends none of its requests.
 *
 * Use it for behavior defined by an absent request, such as a search index
 * change that must not run a search before the user submits it. The absence
 * cannot be awaited, so the action is followed by a quiet period long enough
 * for a request the application should not send.
 *
 * @param {Object} options - Assertion options.
 * @param {string} options.pane - A value from `PANE_REQUEST_PROFILE_NAMES`.
 * @param {Function} options.trigger - UI action run after tracking is installed.
 * @param {string} [options.phase=PANE_REQUEST_PHASES.RESULTS] - A value from
 * `PANE_REQUEST_PHASES` identifying which group of profile requests must not run.
 * @param {Object.<string, boolean>} [options.conditions={}] - Runtime facts used
 * to select a result variant.
 * @param {Object.<string, PaneRequestMatcher>} [options.matchers={}] - Custom
 * predicates keyed by route ID.
 * @param {number} [options.quietPeriod=NO_REQUEST_QUIET_PERIOD_MS] - Time in ms
 * the pane must stay silent after the action.
 * @returns {Cypress.Chainable} Chainable resolved after the assertion passes.
 */
export const assertNoPaneRequests = ({
  pane,
  trigger,
  phase = PANE_REQUEST_PHASES.RESULTS,
  conditions = {},
  matchers = {},
  quietPeriod = NO_REQUEST_QUIET_PERIOD_MS,
}) => {
  if (typeof trigger !== 'function') throw new Error('A pane request trigger function is required');

  const { routes, tracker } = registerPaneRequests({ pane, phase, conditions, matchers });

  trigger();

  cy.wait(quietPeriod);

  return cy.then({ log: false }, () => {
    const sentRouteIds = routes.filter(({ id }) => tracker.routeCounts[id]).map(({ id }) => id);

    expect(sentRouteIds, `requests sent by the ${pane} action`).to.deep.equal([]);
  });
};
