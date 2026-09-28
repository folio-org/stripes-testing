export const LEDGER_ROLLOVER_BUDGET_VALUE = {
  AVAILABLE: 'Available',
  CASH_BALANCE: 'CashBalance',
  NONE: 'None',
};

export const LEDGER_ROLLOVER_BUDGET_VALUE_LABELS = {
  AVAILABLE: 'Available',
  CASH_BALANCE: 'Cash balance',
  NONE: 'None',
};

export const LEDGER_ROLLOVER_ENCUMBRANCE_BASE_LABELS = {
  EXPENDED: 'Expended',
  INITIAL_ENCUMBRANCE: 'Initial encumbrance',
  REMAINING: 'Remaining',
};

export const LEDGER_ROLLOVER_TYPES = {
  COMMIT: 'Commit',
  PREVIEW: 'Preview',
  ROLLBACK: 'Rollback',
};

export const LEDGER_ROLLOVER_SOURCE_LABELS = {
  [LEDGER_ROLLOVER_TYPES.COMMIT]: 'Rollover',
  [LEDGER_ROLLOVER_TYPES.PREVIEW]: 'Rollover test',
};

export const LEDGER_ROLLOVER_STATUS_LABELS = {
  FAILED: 'Failed',
  IN_PROCESS: 'In process',
  IN_PROGRESS: 'In progress',
  NOT_STARTED: 'Not started',
  SUCCESS: 'Successful',
};

export const LEDGER_ROLLOVER_LOGS_FILTERS = {
  START_TIME: 'Start time',
  END_TIME: 'End time',
  STATUS: 'Status',
  SOURCE: 'Source',
};

export const LEDGER_ROLLOVER_LOGS_COLUMNS = {
  START_TIME: 'Start time',
  END_TIME: 'End time',
  STATUS: 'Status',
  ERRORS: 'Errors',
  RESULTS: 'Results',
  SETTINGS: 'Settings',
  SOURCE: 'Source',
};

export const ROLLOVER_BUDGET_VALUE_AS = {
  ALLOCATION: 'Allocation',
  TRANSFER: 'Available',
};

export const ROLLOVER_BUDGET_VALUE_AS_LABELS = {
  ALLOCATION: 'Allocation',
  TRANSFER: 'Transfer',
};

export const LEDGER_ROLLOVER_ORDER_TYPES = {
  ONE_TIME: 'One-time',
  ONGOING: 'Ongoing',
  ONGOING_SUBSCRIPTION: 'Ongoing-Subscription',
};

export const ROLLOVER_ENCUMBRANCE_BASED_ON = {
  EXPENDED: 'Expended',
  INITIAL_AMOUNT: 'InitialAmount',
  REMAINING: 'Remaining',
};

export const ROLLOVER_ERROR_TYPES = {
  ORDER: 'Order',
};

export const ROLLOVER_FAILED_ACTIONS = {
  CREATE_ENCUMBRANCE: 'Create encumbrance',
};

export const ROLLOVER_ERROR_MESSAGES = {
  INSUFFICIENT_FUNDS: 'Insufficient funds',
  LEDGER_NOT_ROLLED_OVER: (ledger) => `[WARNING] Part of the encumbrances belong to the ledger, which has not been rollovered. Ledgers to rollover: ${ledger.name} (id=${ledger.id})`,
};
