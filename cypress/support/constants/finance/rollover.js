export const ROLLOVER_BUDGET_VALUE = {
  NONE: 'None',
  AVAILABLE: 'Available',
  CASH_BALANCE: 'CashBalance',
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
  IN_PROCESS: 'In process',
  NOT_STARTED: 'Not started',
  SUCCESS: 'Successful',
};

export const ROLLOVER_BUDGET_VALUE_AS = {
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
