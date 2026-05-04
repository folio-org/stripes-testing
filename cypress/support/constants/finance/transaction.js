export const ENCUMBRANCE_STATUSES = {
  RELEASED: 'Released',
  UNRELEASED: 'Unreleased',
};

export const TRANSACTION_DETAIL_FIELDS = {
  FISCAL_YEAR: 'Fiscal year',
  TRANSACTION_DATE: 'Transaction date',
  AMOUNT: 'Amount',
  SOURCE: 'Source',
  TYPE: 'Type',
  FROM: 'From',
  TO: 'To',
  EXPENSE_CLASS: 'Expense class',
  TAGS: 'Tags',
  INITIAL_ENCUMBRANCE: 'Initial encumbrance',
  AWAITING_PAYMENT: 'Awaiting payment',
  EXPENDED: 'Expended',
  STATUS: 'Status',
  DESCRIPTION: 'Description',
};

export const TRANSACTION_TYPES = {
  ALLOCATION: 'Allocation',
  CREDIT: 'Credit',
  ENCUMBRANCE: 'Encumbrance',
  PAYMENT: 'Payment',
  PENDING_PAYMENT: 'Pending payment',
  ROLLOVER_TRANSFER: 'Rollover transfer',
  TRANSFER: 'Transfer',
};

export const TRANSACTION_LIST_COLUMNS = {
  TRANSACTION_DATE: 'Transaction date',
  TYPE: 'Type',
  AMOUNT: 'Amount',
  FROM: 'From',
  TO: 'To',
  SOURCE: 'Source',
  TAGS: 'Tags',
};

export const TRANSACTION_TOOLTIPS = {
  VOIDED_TRANSACTION: 'Voided transaction',
};

export const TRANSACTION_RESULTS_FILTERS = {
  SOURCE_POL: 'Source POL number',
  SOURCE_INVOICE: 'Source Invoice number',
  TYPE: 'Type',
  TAGS: 'Tags',
  EXPENSE_CLASS: 'Expense class',
  SOURCE: 'Source',
  ENCUMBRANCE_STATUS: 'Encumbrance status',
};

export const TRANSACTION_SOURCE_TYPES = {
  INVOICE: 'Invoice',
  PO_LINE: 'PO line',
  USER: 'User',
};
