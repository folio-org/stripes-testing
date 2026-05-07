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
