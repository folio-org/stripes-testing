export const BATCH_REQUEST_SIZE = 25;
export const FILTER_NETWORK_IDLE_MS = 750;

/** Supported request phases for `waitForPaneRequests`. */
export const PANE_REQUEST_PHASES = Object.freeze({
  FILTERS: 'filters',
  RESULTS: 'results',
});

/** Supported profile names for `waitForPaneRequests`. */
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
