export const ORDER_TYPES = {
  ONE_TIME: 'One-time',
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
