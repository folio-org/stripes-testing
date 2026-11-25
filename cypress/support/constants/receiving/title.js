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

export const RECEIVING_TITLE_FILTER_LABELS = {
  CREATED_BY: 'Created by',
  CREATED_BY_PIECE: 'Created by (Piece)',
  DATE_UPDATED: 'Date updated',
  DATE_UPDATED_PIECE: 'Date updated (Piece)',
  EXPECTED_RECEIPT_DATE: 'Expected receipt date',
  ORDER_STATUS: 'Order status',
  RECEIPT_DUE: 'Receipt due',
  RECEIVED_DATE: 'Received date',
  UPDATED_BY: 'Updated by',
  UPDATED_BY_PIECE: 'Updated by (Piece)',
  VENDOR: 'Vendor',
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

export const RECEIVING_PIECES_ACCORDION_NAMES = [
  RECEIVING_TITLE_ACCORDION_NAMES.EXPECTED,
  RECEIVING_TITLE_ACCORDION_NAMES.RECEIVED,
  RECEIVING_TITLE_ACCORDION_NAMES.UNRECEIVABLE,
];

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

export const RECEIVING_REMOVE_FROM_PACKAGE_MESSAGES = {
  CONFIRMATION:
    'Removing this title from the package will delete all related pieces and delete any related inventory Holdings and Items. Holdings that contain items that are not related to this order and receiving title will not be deleted.',
  DELETE_HOLDINGS:
    'One or more related Holdings do not reference any other pieces or items. Do you want to delete them?',
  SUCCESS: 'Related pieces and any related inventory Holdings and Items have been deleted.',
  RECEIVED_PIECES_ERROR:
    "Unable to remove the title as there are pieces with a 'Received' status associated with it",
};
