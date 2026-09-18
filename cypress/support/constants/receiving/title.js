export const RECEIVING_TITLE_SEARCH_INDEX_LABELS = {
  KEYWORD: 'Keyword',
  TITLE: 'Title (Receiving titles)',
  PACKAGE: 'Package (POL Package name)',
  PRODUCT_ID: 'Product ID (For the specific title or the package)',
  PO_NUMBER: 'PO number',
  POL_NUMBER: 'POL number',
  VENDOR_REF_NUMBER: 'Vendor reference number',
};

export const RECEIVING_TITLE_SEARCH_INDEXES = {
  TITLE: 'title',
  PACKAGE: 'poLine.titleOrPackage',
  PRODUCT_ID: 'productIds',
  PO_NUMBER: 'purchaseOrder.poNumber',
  POL_NUMBER: 'poLine.poLineNumber',
  VENDOR_REF_NUMBER: 'poLine.vendorDetail.referenceNumbers',
};

export const RECEIVING_TITLE_ACCORDION_NAMES = {
  TITLE_INFORMATION: 'Title information',
  POL_DETAILS: 'POL details',
  EXPECTED: 'Expected',
  RECEIVED: 'Received',
  ROUTING_LISTS: 'Routing lists',
  UNRECEIVABLE: 'Unreceivable',
  BOUND_ITEMS: 'Bound items',
};

export const RECEIVING_BOUND_ITEMS_COLUMN_LABELS = {
  BARCODE: 'Barcode',
  CALL_NUMBER: 'Call number',
  DISPLAY_SUMMARY: 'Display summary',
  STATUS: 'Status',
};
export const EXPECTED_TABLE_COLUMN_HEADERS = {
  SEQUENCE: 'Sequence',
  DISPLAY_SUMMARY: 'Display summary',
  STATUS: 'Status',
  COPY_NUMBER: 'Copy number',
  ENUMERATION: 'Enumeration',
  CHRONOLOGY: 'Chronology',
  COMMENT: 'Comment',
  PIECE_FORMAT: 'Piece format',
  EXPECTED_RECEIPT_DATE: 'Expected receipt date',
  HOLDINGS_LOCATION: 'Holdings location',
  DISPLAY_TO_PUBLIC: 'Display to public',
  REQUEST: 'Request',
};

export const RECEIVED_TABLE_COLUMN_HEADERS = {
  SEQUENCE: 'Sequence',
  BARCODE: 'Barcode',
  DISPLAY_SUMMARY: 'Display summary',
  COPY_NUMBER: 'Copy number',
  ENUMERATION: 'Enumeration',
  CHRONOLOGY: 'Chronology',
  COMMENT: 'Comment',
  PIECE_FORMAT: 'Piece format',
  RECEIVED_DATE: 'Received date',
  HOLDINGS_LOCATION: 'Holdings location',
  DISPLAY_TO_PUBLIC: 'Display to public',
  REQUEST: 'Request',
};

export const UNRECEIVABLE_TABLE_COLUMN_HEADERS = {
  SEQUENCE: 'Sequence',
  BARCODE: 'Barcode',
  DISPLAY_SUMMARY: 'Display summary',
  COPY_NUMBER: 'Copy number',
  ENUMERATION: 'Enumeration',
  CHRONOLOGY: 'Chronology',
  COMMENT: 'Comment',
  PIECE_FORMAT: 'Piece format',
  RECEIVED_DATE: 'Received date',
  HOLDINGS_LOCATION: 'Holdings location',
  DISPLAY_TO_PUBLIC: 'Display to public',
  REQUEST: 'Request',
  CALL_NUMBER: 'Call number',
};
