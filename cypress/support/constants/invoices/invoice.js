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

export const INVOICE_SEARCH_INDEX_LABELS = {
  ACCOUNTING_CODE: 'Accounting code',
  ALL: 'All',
  FOLIO_INVOICE_NUMBER: 'FOLIO invoice number',
  PO_NUMBER: 'PO number',
  VENDOR_INVOICE_NUMBER: 'Vendor invoice number',
  VOUCHER_NUMBER: 'Voucher number',
};

export const INVOICE_SEARCH_INDEXES = {
  ACCOUNTING_CODE: 'accountingCode',
  FOLIO_INVOICE_NUMBER: 'folioInvoiceNo',
  INVOICE_LINE_DESCRIPTION: 'invoiceLines.description',
  PO_NUMBER: 'poNumbers',
  VENDOR_INVOICE_NUMBER: 'vendorInvoiceNo',
  VOUCHER_NUMBER: 'voucherNumber',
};

export const INVOICE_RESULTS_LIST_COLUMNS = {
  FOLIO_INVOICE_NUMBER: 'FOLIO invoice number',
  INVOICE_DATE: 'Invoice date',
  STATUS: 'Status',
  TOTAL_AMOUNT_SYSTEM: 'Total amount (system)',
  VENDOR: 'Vendor',
  VENDOR_INVOICE_NUMBER: 'Vendor invoice number',
  VENDOR_NAME: 'Vendor name',
};

export const INVOICE_RESULTS_ACTIONS_LABELS = {
  EXPORT_CSV: 'Export results (CSV)',
};

export const EXPORT_INVOICE_FIELDS = {
  ACCOUNTING_CODE: 'Accounting code',
  ACQ_UNIT_IDS: 'Acquisitions units',
  ADJUSTMENTS_TOTAL: 'Total adjustments',
  APPROVAL_DATE: 'Approved date',
  APPROVED_BY: 'ApprovedBy',
  BATCH_GROUP: 'Batch group',
  BILL_TO: 'Bill to',
  CHK_SUBSCRIPTION_OVERLAP: 'Check subscription overlap',
  CREATED_BY: 'Created by',
  CURRENCY: 'Currency',
  DATE_CREATED: 'Created on',
  DATE_UPDATED: 'Updated on',
  ENCLOSURE_NEEDED: 'Enclosure needed',
  EXCHANGE_RATE: 'Exchange rate',
  EXPORT_TO_ACCOUNTING: 'Export to accounting',
  FISCAL_YEAR: 'Fiscal year',
  FOLIO_INVOICE_NO: 'FOLIO invoice number',
  INVOICE_ADJUSTMENTS: 'Invoice adjustments',
  INVOICE_DATE: 'Invoice date',
  INVOICE_FUND_DISTRIBUTIONS: 'Invoice fund distributions',
  INVOICE_TAGS: 'Invoice tags',
  LOCK_TOTAL: 'Lock total amount',
  NOTE: 'Note',
  PAYMENT_DATE: 'Payment date',
  PAYMENT_DUE: 'Payment due',
  PAYMENT_METHOD: 'Payment method',
  PAYMENT_TERMS: 'Terms',
  STATUS: 'Status',
  SUB_TOTAL: 'Sub total',
  TOTAL_AMOUNT: 'Total amount',
  TOTAL_UNITS: 'Total units',
  UPDATED_BY: 'Updated by',
  VENDOR_ADDRESS: 'Vendor address',
  VENDOR_CODE: 'Vendor code',
  VENDOR_INVOICE_NO: 'Vendor invoice number',
  VENDOR_NAME: 'Vendor name',
};
