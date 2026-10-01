/**
 * Creates a request route used by pane profiles.
 *
 * @param {string} id - Stable name used by aliases and dependency links.
 * @param {string} pathname - Exact Okapi path without a query string.
 * @param {string} [method='GET'] - HTTP method sent by the application.
 * @param {Function} [matcher] - Optional discriminator for shared endpoints.
 * @param {number[]} [acceptedErrorStatuses=[]] - Expected HTTP error statuses
 * that complete this route successfully (for example, validation endpoints
 * that use 400 to report an invalid search value).
 * @returns {Object} Pane request route.
 */
export const route = (id, pathname, method = 'GET', matcher, acceptedErrorStatuses = []) => {
  return Object.freeze({
    id,
    pathname,
    method,
    matcher,
    acceptedErrorStatuses: Object.freeze([...acceptedErrorStatuses]),
  });
};

export const acquisitionUnits = route('acquisitionUnits', '/acquisitions-units/units');
export const acquisitionMethods = route('acquisitionMethods', '/orders/acquisition-methods');
export const batchGroups = route('batchGroups', '/batch-groups');
export const claimingPieces = route('claimingPieces', '/orders/wrapper-pieces');
export const consortiumHoldings = route(
  'consortiumHoldings',
  '/search/consortium/batch/holdings',
  'POST',
);
export const customFields = route('customFields', '/custom-fields');
export const expenseClasses = route('expenseClasses', '/finance/expense-classes');
export const fiscalYears = route('fiscalYears', '/finance/fiscal-years');
export const funds = route('funds', '/finance/funds');
export const fundTypes = route('fundTypes', '/finance/fund-types');
export const groups = route('groups', '/finance/groups');
export const holdings = route('holdings', '/holdings-storage/holdings');
export const invoices = route('invoices', '/invoice/invoices');
export const isbnConversion = route('isbnConversion', '/isbn/convertTo13', 'GET', null, [400]);
export const ledgers = route('ledgers', '/finance/ledgers');
export const locations = route('locations', '/locations');
export const materialTypes = route('materialTypes', '/material-types');
export const organizations = route('organizations', '/organizations/organizations');
export const organizationTypes = route(
  'organizationTypes',
  '/organizations-storage/organization-types',
);
export const orderLines = route('orderLines', '/orders/order-lines');
export const invalidOrderLinesQuery = route(
  'invalidOrderLinesQuery',
  '/orders/order-lines',
  'GET',
  null,
  [400],
);
export const orders = route('orders', '/orders/composite-orders');
export const prefixes = route('prefixes', '/orders/configuration/prefixes');
export const receivingTitles = route('receivingTitles', '/orders/titles');
export const suffixes = route('suffixes', '/orders/configuration/suffixes');
export const tags = route('tags', '/tags');
export const tenantAddresses = route('tenantAddresses', '/tenant-addresses');
export const users = route('users', '/users');

export const closureReasons = route('closureReasons', '/orders/configuration/reasons-for-closure');
export const settingsEntries = route(
  'settingsEntries',
  '/settings/entries',
  'GET',
  // Releases have used both `tags.tags.manage` and `ui-tags.tags.manage`.
  // Matching the stable suffix keeps the filter profile compatible with both.
  ({ query }) => query.query?.includes('tags.tags.manage') && query.query?.includes('key="tags_enabled"'),
);
export const centralOrderingSettings = route(
  'centralOrderingSettings',
  '/orders-storage/settings',
  'GET',
  ({ query }) => query.query?.includes('ALLOW_ORDERING_WITH_AFFILIATED_LOCATIONS'),
);
export const defaultReceivingSearchSettings = route(
  'defaultReceivingSearchSettings',
  '/orders-storage/settings',
  'GET',
  ({ query }) => query.query?.includes('CENTRAL_ORDERING_DEFAULT_RECEIVING_SEARCH'),
);
