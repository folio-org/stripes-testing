export const ORDER_INVOICE_ANALYSIS_FIELDS = {
  INVOICE: {
    FOLIO_INVOICE_NUMBER: 'Invoice — Folio invoice number',
    FISCAL_YEAR: 'Invoice — Fiscal year',
    STATUS: 'Invoice — Status',
    VENDOR_NAME: 'Invoice — Vendor name',
    VENDOR_INVOICE_NUMBER: 'Invoice — Vendor invoice number',
  },
  INVOICE_LINE: {
    INVOICE_LINE_NUMBER: 'Invoice — Line — Invoice line number',
    TOTAL: 'Invoice — Line — Total',
    SUB_TOTAL: 'Invoice — Line — Sub-total',
    FUND_DISTRIBUTION_AMOUNT: 'Invoice — Line — Fund distribution amount',
    FUND_DISTRIBUTION_VALUE: 'Invoice — Line — Fund distribution value',
  },
  PO_LINE: {
    TAGS: 'PO line — Tags',
    TITLE_OR_PACKAGE: 'PO line — Title or package',
    PO_LINE_NUMBER: 'PO line — PO line number',
    MULTI_YEAR_PREPAYMENT: 'PO line — Multi-year prepayment',
    PAYMENT_TERMS: 'PO line — Payment terms',
    PREPAYMENT_TERM: 'PO line — Prepayment term',
    STARTING_FISCAL_YEAR: 'PO line — Starting fiscal year',
  },
  PAYMENT_TERMS: {
    DISTRIBUTION_TYPE: 'PO line — Payment terms — Distribution type',
    EXPENSE_CLASS: 'PO line — Payment terms — Expense class',
    FISCAL_YEAR: 'PO line — Payment terms — Fiscal year',
    FUND: 'PO line — Payment terms — Fund',
    FUND_CODE: 'PO line — Payment terms — Code',
  },
  PO: {
    ORDER_TYPE: 'PO — Order type',
    PO_NUMBER: 'PO — PO number',
    RELATED_FISCAL_YEARS: 'PO — Related fiscal years',
    CREATED_AT: 'PO — Created at',
  },
  ORGANIZATION: {
    CODE: 'Organization — Code',
  },
  EXPENSE_CLASS: {
    NAME: 'Expense class — Name',
  },
  FUND: {
    NAME: 'Fund — Name',
    CODE: 'Fund — Code',
  },
  FISCAL_YEAR: {
    CODE: 'Fiscal year — Code',
  },
  INSTANCE: {
    FORMAT_NAMES: 'Instance — Format names',
  },
};

const AGREEMENTS_INVOICES_ORDERS_PREFIX = 'Order — Invoice analysis — ';
const prefixOrderInvoiceAnalysisFields = (fields) => Object.fromEntries(
  Object.entries(fields).map(([key, value]) => [
    key,
    `${AGREEMENTS_INVOICES_ORDERS_PREFIX}${value}`,
  ]),
);

// The composite entity exposes Order — Invoice Analysis as a nested relationship.
// Prefix its reusable field groups exactly as they appear in the Lists field selector.
export const AGREEMENTS_INVOICES_ORDERS_FIELDS = {
  AGREEMENT: { NAME: 'Agreements + Lines — Agreement — Name' },
  INVOICE: prefixOrderInvoiceAnalysisFields(ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE),
  INVOICE_LINE: prefixOrderInvoiceAnalysisFields(ORDER_INVOICE_ANALYSIS_FIELDS.INVOICE_LINE),
  PO: prefixOrderInvoiceAnalysisFields(ORDER_INVOICE_ANALYSIS_FIELDS.PO),
  PO_LINE: prefixOrderInvoiceAnalysisFields(ORDER_INVOICE_ANALYSIS_FIELDS.PO_LINE),
  PAYMENT_TERMS: prefixOrderInvoiceAnalysisFields(ORDER_INVOICE_ANALYSIS_FIELDS.PAYMENT_TERMS),
};
