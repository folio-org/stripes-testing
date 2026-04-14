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
