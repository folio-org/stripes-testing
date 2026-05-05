export const INVOICE_ACTION_MENU_BUTTONS = {
  APPROVE: 'Approve',
  APPROVE_AND_PAY: 'Approve & pay',
  CANCEL: 'Cancel',
  DELETE: 'Delete',
  DUPLICATE: 'Duplicate',
  EDIT: 'Edit',
  PAY: 'Pay',
};

export const INVOICE_STATUSES = {
  OPEN: 'Open',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
};

export const INVOICE_POL_PAYMENT_STATUSES = {
  AWAITING_PAYMENT: 'Awaiting Payment',
  AWAITING_PAYMENT_UI: 'Awaiting payment',
  CANCELLED: 'Cancelled',
  FULLY_PAID: 'Fully Paid',
  FULLY_PAID_UI: 'Fully paid',
  NO_CHANGE: 'No Change',
  NO_CHANGE_UI: 'No change',
  PARTIALLY_PAID: 'Partially Paid',
  PARTIALLY_PAID_UI: 'Partially paid',
};

export const INVOICE_VIEW_FIELDS = {
  ACQUISITION_UNITS: 'Acquisition units',
  BATCH_GROUP: 'Batch group',
  CALCULATED_TOTAL_AMOUNT: 'Calculated total amount',
  CALCULATED_TOTAL_AMOUNT_EXCHANGED: 'Calculated total amount (Exchanged)',
  FISCAL_YEAR: 'Fiscal year',
  INVOICE_DATE: 'Invoice date',
  INVOICE_STATUS: 'Status',
  PAYMENT_METHOD: 'Payment method',
  SUB_TOTAL: 'Sub-total',
  TOTAL_ADJUSTMENTS: 'Total adjustments',
  VENDOR_NAME: 'Vendor name',
  VENDOR_INVOICE_NUMBER: 'Vendor invoice number',
  VOUCHER_STATUS: 'Status',
};

export const INVOICE_LEVEL_FUND_DISTRIBUTION_COLUMNS = {
  ADJUSTMENT: 'Adjustment',
  FUND: 'Fund',
  EXPENSE_CLASS: 'Expense class',
  VALUE: 'Value',
  AMOUNT: 'Amount',
  INITIAL_ENCUMBRANCE: 'Initial encumbrance',
  CURRENT_ENCUMBRANCE: 'Current encumbrance',
};

export const INVOICE_LEVEL_ADJUSTMENTS_COLUMNS = {
  DESCRIPTION: 'Description',
  VALUE: 'Value',
  PRORATE: 'Pro rate',
  RELATION_TO_TOTAL: 'Relation to total',
};

export const INVOICE_BATCH_GROUPS = {
  AMHERST: 'Amherst (AC)',
  FOLIO: 'FOLIO',
};

export const INVOICE_PAYMENT_METHODS = {
  CASH: 'Cash',
  CHECK: 'Check',
  CREDIT_CARD: 'Credit card',
  EFT: 'EFT',
};

export const CURRENCIES = {
  USD: 'US Dollar (USD)',
  UZS: 'Uzbekistani Som (UZS)',
  UAH: 'Ukrainian Hryvnia (UAH)',
};

export const INVOICE_AND_INVOICE_LINE_BUTTONS = {
  CANCEL: 'Cancel',
  SAVE_AND_CLOSE: 'Save & close',
  SAVE_AND_KEEP_EDITING: 'Save & keep editing',
};
