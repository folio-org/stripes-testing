export const ORDER_TYPES = {
  ONE_TIME: 'One-time',
  ONE_TIME_API: 'One-Time',
  ONGOING: 'Ongoing',
};

export const ORDER_STATUSES = {
  OPEN: 'Open',
  PENDING: 'Pending',
  CLOSED: 'Closed',
};

export const ORDER_SYSTEM_CLOSING_REASONS = {
  CANCELLED: 'Cancelled',
  CEASED: 'Ceased',
  COMPLETE: 'Complete',
  TRANSFERRED_TO_ANOTHER_PUBLISHER: 'Transferred to another publisher',
  MERGED_WITH_ANOTHER_TITLE: 'Merged with another title',
  SPLIT_INTO_OTHER_TITLES: 'Split into other titles',
  LACK_OF_FUNDS: 'Lack of funds',
  LACK_OF_USE: 'Lack of use',
  DUPLICATION: 'Duplication',
  UNRESPONSIVE_VENDOR: 'Unresponsive vendor',
  LICENSING_TERMS: 'Licensing terms (unacceptable)',
  LOW_QUALITY: 'Low quality',
  UNPREFERRED_FORMAT: 'Unpreferred format',
  ERROR: 'Error',
  TITLE_WONT_BE_PUBLISHED_THIS_YEAR: "Title won't be published this year",
  TITLE_WONT_BE_PUBLISHED: "Title won't be published",
  TITLE_OUT_OF_PRINT: 'Title is out of print',
  TITLE_RECEIVED_AS_GIFT: 'Title received as a gift',
};

export const ORDER_RESULTS_LIST_COLUMN_LABELS = {
  ACQUISITION_UNIT: 'Acquisition unit',
  ASSIGNED_TO: 'Assigned to',
  LAST_UPDATED: 'Last updated',
  ORDER_TYPE: 'Order type',
  PO_NUMBER: 'PO number', // Used as a link to open order details
  STATUS: 'Status',
  VENDOR_CODE: 'Vendor code',
};

export const ORDER_FILTER_LABELS = {
  ACQUISITION_UNIT: 'Acquisition unit',
  APPROVED: 'Approved',
  ASSIGNED_TO: 'Assigned to',
  BILL_TO: 'Bill to',
  CREATED_BY: 'Created by',
  DATE_CREATED: 'Date created',
  DATE_OPENED: 'Date opened',
  DATE_UPDATED: 'Date updated',
  FUND_CODE: 'Fund code',
  MANUAL_RENEWAL: 'Manual renewal',
  ORDER_TYPE: 'Order type',
  PREFIX: 'Prefix',
  REASON_FOR_CLOSURE: 'Reason for closure',
  RE_ENCUMBER: 'Re-encumber',
  RENEWAL_DATE: 'Renewal date',
  REVIEW_PERIOD: 'Review period',
  SHIP_TO: 'Ship to',
  STATUS: 'Status',
  SUBSCRIPTION: 'Subscription',
  SUFFIX: 'Suffix',
  TAGS: 'Tags',
  UPDATED_BY: 'Updated by',
  VENDOR: 'Vendor',
};
