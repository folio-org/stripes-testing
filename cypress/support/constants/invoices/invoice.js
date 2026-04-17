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
  FISCAL_YEAR: 'Fiscal year',
  INVOICE_STATUS: 'Status',
  SUB_TOTAL: 'Sub-total',
  TOTAL_ADJUSTMENTS: 'Total adjustments',
  CALCULATED_TOTAL_AMOUNT: 'Calculated total amount',
  VENDOR_NAME: 'Vendor name',
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
