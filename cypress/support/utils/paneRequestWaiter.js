const route = (id, pathname, method = 'GET') => ({ id, pathname, method });

const acquisitionUnits = route('acquisitionUnits', '/acquisitions-units/units');
const settingsEntries = route('settingsEntries', '/settings/entries');
const tags = route('tags', '/tags');
const funds = route('funds', '/finance/funds');
const organizations = route('organizations', '/organizations/organizations');
const orders = route('orders', '/orders/composite-orders');
const orderLines = route('orderLines', '/orders/order-lines');
const receivingTitles = route('receivingTitles', '/orders/titles');
const holdings = route('holdings', '/holdings-storage/holdings');
const consortiumHoldings = route('consortiumHoldings', '/search/consortium/batch/holdings', 'POST');
const locations = route('locations', '/locations');

const responseRecords = (responses, routeId, property) => responses[routeId]?.response?.body?.[property] || [];

const hasOrderLineProperty = (responses, property) => responseRecords(responses, 'orderLines', 'poLines').some((line) => line[property]);

const hasOrderLineLocation = (responses) => responseRecords(responses, 'orderLines', 'poLines').some(({ locations: lineLocations = [] }) => lineLocations.some(({ locationId }) => locationId));

const hasOrderLineHolding = (responses) => responseRecords(responses, 'orderLines', 'poLines').some(({ locations: lineLocations = [] }) => lineLocations.some(({ holdingId }) => holdingId));

const hasLocalHoldingLocation = (responses) => responseRecords(responses, 'holdings', 'holdingsRecords').some(
  ({ permanentLocationId }) => permanentLocationId,
);

/**
 * Network resources used by Acquisitions result panes and find-record plugins.
 *
 * `filters` are requested while a pane is opened. `results` are requested after
 * a search, sort, pagination or filter action. `conditionalResults` contain
 * requests only made by particular filters or pane configurations.
 */
export const PANE_REQUEST_PROFILES = Object.freeze({
  orders: {
    filters: [
      acquisitionUnits,
      funds,
      route('customFields', '/custom-fields'),
      route('prefixes', '/orders/configuration/prefixes'),
      route('suffixes', '/orders/configuration/suffixes'),
      route('closureReasons', '/orders/configuration/reasons-for-closure'),
      route('tenantAddresses', '/tenant-addresses'),
      settingsEntries,
      tags,
    ],
    results: [orders, organizations],
    conditionalResults: {
      acquisitionUnit: [acquisitionUnits],
    },
  },
  orderLines: {
    filters: [
      acquisitionUnits,
      route('expenseClasses', '/finance/expense-classes'),
      funds,
      route('acquisitionMethods', '/orders/acquisition-methods'),
      route('customFields', '/custom-fields'),
      route('locations', '/locations'),
      route('materialTypes', '/material-types'),
      route('prefixes', '/orders/configuration/prefixes'),
      route('suffixes', '/orders/configuration/suffixes'),
      settingsEntries,
      tags,
    ],
    results: [orderLines, orders],
    conditionalResults: {
      acquisitionUnit: [acquisitionUnits],
    },
  },
  organizations: {
    filters: [
      acquisitionUnits,
      route('organizationTypes', '/organizations-storage/organization-types'),
      settingsEntries,
      tags,
    ],
    results: [organizations],
  },
  receiving: {
    filters: [
      acquisitionUnits,
      route('locations', '/locations'),
      route('materialTypes', '/material-types'),
      settingsEntries,
      tags,
    ],
    results: [receivingTitles],
    responseDependencies: [
      {
        route: orderLines,
        dependsOn: ['receivingTitles'],
        when: ({ responses }) => responseRecords(responses, 'receivingTitles', 'titles').some(({ poLineId }) => poLineId),
      },
      {
        route: holdings,
        dependsOn: ['orderLines'],
        when: ({ conditions, responses }) => !conditions.crossTenant && hasOrderLineHolding(responses),
      },
      {
        route: consortiumHoldings,
        dependsOn: ['orderLines'],
        when: ({ conditions, responses }) => Boolean(conditions.crossTenant) && hasOrderLineProperty(responses, 'instanceId'),
      },
      {
        route: locations,
        dependsOn: ['orderLines'],
        when: ({ conditions, responses }) => {
          if (conditions.crossTenant) return responseRecords(responses, 'orderLines', 'poLines').length > 0;

          return hasOrderLineLocation(responses) || hasLocalHoldingLocation(responses);
        },
      },
      {
        route: orders,
        dependsOn: ['orderLines'],
        when: ({ responses }) => hasOrderLineProperty(responses, 'purchaseOrderId'),
      },
    ],
  },
  invoices: {
    filters: [
      acquisitionUnits,
      route('expenseClasses', '/finance/expense-classes'),
      route('fiscalYears', '/finance/fiscal-years'),
      funds,
      route('batchGroups', '/batch-groups'),
      settingsEntries,
      tags,
    ],
    results: [route('invoices', '/invoice/invoices')],
    conditionalResults: {
      organizationLookup: [organizations],
    },
  },
  claiming: {
    filters: [
      acquisitionUnits,
      route('customFields', '/custom-fields'),
      route('locations', '/locations'),
      route('materialTypes', '/material-types'),
      settingsEntries,
      tags,
      route('tenantAddresses', '/tenant-addresses'),
    ],
    results: [route('claimingPieces', '/orders/wrapper-pieces'), organizations],
  },
  fiscalYears: {
    filters: [acquisitionUnits],
    results: [route('fiscalYears', '/finance/fiscal-years')],
  },
  ledgers: {
    filters: [acquisitionUnits],
    results: [route('ledgers', '/finance/ledgers')],
  },
  groups: {
    filters: [acquisitionUnits],
    results: [route('groups', '/finance/groups')],
  },
  funds: {
    filters: [
      acquisitionUnits,
      route('fundTypes', '/finance/fund-types'),
      route('groups', '/finance/groups'),
      route('ledgers', '/finance/ledgers'),
      settingsEntries,
      tags,
    ],
    results: [funds, route('ledgers', '/finance/ledgers')],
  },
  findPoLine: {
    filters: [
      acquisitionUnits,
      route('expenseClasses', '/finance/expense-classes'),
      funds,
      route('acquisitionMethods', '/orders/acquisition-methods'),
      route('locations', '/locations'),
      route('materialTypes', '/material-types'),
      route('prefixes', '/orders/configuration/prefixes'),
      route('suffixes', '/orders/configuration/suffixes'),
      settingsEntries,
      tags,
    ],
    results: [orderLines],
  },
  findOrganization: {
    filters: [],
    results: [organizations],
  },
  findFund: {
    filters: [route('ledgers', '/finance/ledgers')],
    results: [funds],
  },
});

/**
 * Supported pane-request profile names for use with `waitForPaneRequests`.
 */
export const PANE_REQUEST_PROFILE_NAMES = Object.freeze({
  ORDERS: 'orders',
  ORDER_LINES: 'orderLines',
  ORGANIZATIONS: 'organizations',
  RECEIVING: 'receiving',
  INVOICES: 'invoices',
  CLAIMING: 'claiming',
  FISCAL_YEARS: 'fiscalYears',
  LEDGERS: 'ledgers',
  GROUPS: 'groups',
  FUNDS: 'funds',
  FIND_PO_LINE: 'findPoLine',
  FIND_ORGANIZATION: 'findOrganization',
  FIND_FUND: 'findFund',
});

let invocation = 0;

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

const getProfile = (pane) => {
  const profile = PANE_REQUEST_PROFILES[pane];

  if (!profile) {
    throw new Error(`Unsupported pane request profile: ${pane}`);
  }

  return profile;
};

const getRoutes = (pane, phase, conditions, includeConditional = false) => {
  const profile = getProfile(pane);
  const routes = [...(profile[phase] || [])];

  if (phase === 'results') {
    const enabledConditions = includeConditional
      ? Object.keys(profile.conditionalResults || {})
      : Object.entries(conditions)
        .filter(([, enabled]) => enabled)
        .map(([condition]) => condition);

    enabledConditions.forEach((condition) => routes.push(...(profile.conditionalResults?.[condition] || [])));
  }

  return routes.filter(
    (item, index, items) => items.findIndex(({ id }) => id === item.id) === index,
  );
};

const getResponseDependencyRoutes = (pane, phase) => {
  if (phase !== 'results') return [];

  return (
    getProfile(pane).responseDependencies?.map(({ route: dependencyRoute }) => dependencyRoute) ||
    []
  );
};

const requestDetails = (request) => {
  const url = new URL(request.url);

  return {
    url: request.url,
    pathname: url.pathname,
    query: Object.fromEntries(url.searchParams.entries()),
  };
};

const matches = (request, matcher) => !matcher || matcher(requestDetails(request));

const registerPaneRequests = ({
  pane,
  phase,
  conditions,
  matchers,
  includeConditional = false,
}) => {
  const sequence = ++invocation;
  const aliases = {};
  const routes = getRoutes(pane, phase, conditions, includeConditional);
  const dependencyRoutes = getResponseDependencyRoutes(pane, phase);
  const registeredRoutes = [...routes, ...dependencyRoutes].filter(
    (item, index, items) => items.findIndex(({ id }) => id === item.id) === index,
  );

  registeredRoutes.forEach((item) => {
    const alias = `pane-${pane}-${item.id}-${sequence}`;
    aliases[item.id] = `@${alias}`;

    cy.intercept({ method: item.method, pathname: item.pathname }, (request) => {
      if (matches(request, matchers[item.id])) {
        request.alias = alias;
      }
    });
  });

  return { aliases, routes };
};

const assertSuccessfulResponses = (interceptions) => {
  const completedRequests = Array.isArray(interceptions) ? interceptions : [interceptions];

  completedRequests.forEach(({ request, response }) => {
    if (!response || response.statusCode >= 400) {
      const status = response?.statusCode || 'no response';
      throw new Error(`Pane request failed (${status}): ${request.url}`);
    }
  });

  return interceptions;
};

const mapResponsesByRouteId = (routes, interceptions) => {
  const completedRequests = Array.isArray(interceptions) ? interceptions : [interceptions];

  return routes.reduce(
    (responses, item, index) => ({
      ...responses,
      [item.id]: completedRequests[index],
    }),
    {},
  );
};

const waitForResponseDependencies = ({ pane, aliases, conditions, responses, timeout }) => {
  const dependencies = getProfile(pane).responseDependencies || [];

  return dependencies
    .reduce(
      (chain, dependency) => chain.then(() => {
        const hasDependencies = dependency.dependsOn.every((routeId) => responses[routeId]);

        if (!hasDependencies || !dependency.when({ conditions, responses })) return null;

        const wait = timeout
          ? cy.wait(aliases[dependency.route.id], { timeout })
          : cy.wait(aliases[dependency.route.id]);

        return wait.then((interception) => {
          assertSuccessfulResponses(interception);
          responses[dependency.route.id] = interception;
        });
      }),
      cy.wrap(null),
    )
    .then(() => responses);
};

/**
 * Registers action-scoped Cypress aliases for a pane's known requests.
 *
 * Use this directly only when registering routes and waiting for them must be
 * separate operations. In normal tests, prefer `waitForPaneRequests` so the
 * intercepts are installed immediately before the action.
 *
 * @param {Object} options - Interception options.
 * @param {string} options.pane - A key from `PANE_REQUEST_PROFILES`, such as
 * `orders`, `invoices`, or `findPoLine`.
 * @param {'filters'|'results'} [options.phase='results'] - `filters` registers
 * the lookup data loaded when a pane opens; `results` registers calls made by
 * search, sort, pagination, and filter actions.
 * @param {Object.<string, boolean>} [options.conditions={}] - Enables named
 * conditional result routes. For example,
 * `{ acquisitionUnit: true }` includes the acquisition-unit endpoint.
 * @param {Object.<string, PaneRequestMatcher>} [options.matchers={}] - Maps a
 * route id (for example, `orders` or `funds`) to a predicate that accepts or
 * ignores matching endpoint traffic based on URL query parameters.
 * @returns {Object.<string, string>} Route ids mapped to Cypress aliases, such
 * as `{ orders: '@pane-orders-orders-1' }`.
 */
export const interceptPaneRequests = ({
  pane,
  phase = 'results',
  conditions = {},
  matchers = {},
}) => {
  return registerPaneRequests({ pane, phase, conditions, matchers }).aliases;
};

/**
 * Runs a UI action and waits for its pane requests.
 *
 * Waits for every configured route in the requested phase. Profiles may add
 * response dependencies that are awaited only when prior responses require them.
 *
 * @param {Object} options - Wait options.
 * @param {string} options.pane - A key from `PANE_REQUEST_PROFILES`, such as
 * `orders`, `receiving`, `funds`, or `findOrganization`.
 * @param {Function} options.trigger - Function that performs the UI action.
 * It runs after interception is registered; use it for clicking Search,
 * selecting a filter value, changing sort order, or moving a page.
 * @param {'filters'|'results'} [options.phase='results'] - Selects pane-open
 * lookup requests (`filters`) or search/list requests (`results`).
 * @param {Object.<string, boolean>} [options.conditions={}] - Enables named
 * conditional routes and supplies request context to response dependencies.
 * For example, Receiving uses `{ crossTenant: true }` to select consortium
 * reference endpoints.
 * @param {Object.<string, PaneRequestMatcher>} [options.matchers={}] - Optional
 * route-specific predicates. Use these when background traffic can hit the
 * same endpoint; return true only for the query generated by this action.
 * @param {number} [options.timeout] - Maximum time in milliseconds to wait for
 * requests. Defaults to Cypress's configured request timeout.
 * @returns {Cypress.Chainable} Cypress interceptions, rejecting when any
 * awaited response has an HTTP error status.
 */
export const waitForPaneRequests = ({
  pane,
  trigger,
  phase = 'results',
  conditions = {},
  matchers = {},
  timeout,
}) => {
  if (typeof trigger !== 'function') throw new Error('A pane request trigger function is required');

  const { aliases, routes } = registerPaneRequests({
    pane,
    phase,
    conditions,
    matchers,
  });
  trigger();

  const routeAliases = routes.map(({ id }) => aliases[id]);
  const wait = timeout ? cy.wait(routeAliases, { timeout }) : cy.wait(routeAliases);

  return wait.then((interceptions) => {
    assertSuccessfulResponses(interceptions);

    return waitForResponseDependencies({
      pane,
      aliases,
      conditions,
      responses: mapResponsesByRouteId(routes, interceptions),
      timeout,
    }).then(() => interceptions);
  });
};
