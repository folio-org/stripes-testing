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
  IN_PROCESS: 'In process',
  NOT_STARTED: 'Not started',
  SUCCESS: 'Successful',
};
