export const ORDER_LINE_ACCORDION_NAMES = {
  ITEM_DETAILS: 'Item details',
  PURCHASE_ORDER_LINE: 'Purchase order line',
  DONOR_INFORMATION: 'Donor information',
  VENDOR: 'Vendor',
  COST_DETAILS: 'Cost details',
  FUND_DISTRIBUTION: 'Fund distribution',
  LOCATION: 'Location',
  PHYSICAL_RESOURCE_DETAILS: 'Physical resource details',
  E_RESOURCES_DETAILS: 'E-resources details',
  ROUTING_LISTS: 'Routing lists',
  NOTES: 'Notes',
  RELATED_INVOICE_LINES: 'Related invoice lines',
  LINKED_INSTANCE: 'Linked instance',
  CUSTOM_FIELDS: 'Custom fields',
};

export const ORDER_LINE_PAYMENT_STATUS = {
  AWAITING_PAYMENT: 'Awaiting payment',
  CANCELLED: 'Cancelled',
  FULLY_PAID: 'Fully paid',
  ONGOING: 'Ongoing',
  PARTIALLY_PAID: 'Partially paid',
  PAYMENT_NOT_REQUIRED: 'Payment not required',
  PENDING: 'Pending',
};

export const ORDER_FORMAT_NAMES_IN_PROFILE = {
  ELECTRONIC_RESOURCE: 'Electronic Resource',
  PE_MIX: 'P/E Mix',
  OTHER: 'Other',
  PHYSICAL_RESOURCE: 'Physical Resource',
};

export const ORDER_FORMAT_NAMES = {
  ELECTRONIC_RESOURCE: 'Electronic resource',
  ELECTRONIC_RESOURCE_Check: 'Electronic Resource', // Deprecated, need to be removed after all tests will be updated
  PE_MIX: 'P/E mix',
  PE_MIX_Check: 'P/E Mix',
  OTHER: 'Other',
  PHYSICAL_RESOURCE: 'Physical resource',
  PHYSICAL_RESOURCE_Check: 'Physical Resource', // Deprecated, need to be removed after all tests will be updated
};

export const ORDER_PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAYMENT_NOT_REQUIRED: 'Payment not required',
};

export const ACQUISITION_METHOD_NAMES_IN_PROFILE = {
  APPROVAL_PLAN: 'Approval plan',
  PURCHASE: 'Purchase',
  PURCHASE_AT_VENDOR_SYSTEM: 'Purchase at vendor system',
  OTHER: 'Other',
};

export const RECEIPT_STATUS_SELECTED = {
  PENDING: 'Pending',
  RECEIPT_NOT_REQUIRED: 'Receipt not required',
};

export const RECEIPT_STATUS_VIEW = {
  AWAITING_RECEIPT: 'Awaiting receipt',
  CANCELLED: 'Cancelled',
  PENDING: 'Pending',
  FULLY_RECEIVED: 'Fully received',
  ONGOING: 'Ongoing',
  PARTIALLY_RECEIVED: 'Partially received',
  RECEIPT_NOT_REQUIRED: 'Receipt not required',
};

export const RECEIVING_WORKFLOW_NAMES = {
  SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY: 'Synchronized order and receipt quantity',
  INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY: 'Independent order and receipt quantity',
};

export const ACQUISITION_METHOD_NAMES = {
  APPROVAL_PLAN: 'Approval plan',
  DDA: 'Demand driven acquisitions (DDA)',
  DEPOSITORY: 'Depository',
  EBA: 'Evidence based acquisitions (EBA)',
  EXCHANGE: 'Exchange',
  FREE: 'Free',
  GIFT: 'Gift',
  INTERNAL_TRANSFER: 'Internal transfer',
  MEMBERSHIP: 'Membership',
  OTHER: 'Other',
  PURCHASE: 'Purchase',
  PURCHASE_AT_VENDOR_SYSTEM: 'Purchase At Vendor System',
  TECHNICAL: 'Technical',
};

export const ACQUISITION_METHOD_NAMES_IN_MAPPING_PROFILES = {
  APPROVAL_PLAN: 'Approval Plan',
  DDA: 'Demand Driven Acquisitions (DDA)',
  DEPOSITORY: 'Depository',
  EBA: 'Evidence Based Acquisitions (EBA)',
  EXCHANGE: 'Exchange',
  FREE: 'Free',
  GIFT: 'Gift',
  INTERNAL_TRANSFER: 'Internal transfer',
  MEMBERSHIP: 'Membership',
  OTHER: 'Other',
  PURCHASE: 'Purchase',
  PURCHASE_AT_VENDOR_SYSTEM: 'Purchase At Vendor System',
  TECHNICAL: 'Technical',
};

export const POL_CREATE_INVENTORY_SETTINGS = {
  INSTANCE: 'Instance',
  INSTANCE_HOLDING: 'Instance, Holding',
  INSTANCE_HOLDING_ITEM: 'Instance, Holding, Item',
  NONE: 'None',
};

export const POL_CREATE_INVENTORY_SETTINGS_VIEW = {
  INSTANCE: 'Instance',
  INSTANCE_HOLDING: 'Instance, holdings',
  INSTANCE_HOLDING_ITEM: 'Instance, holdings, item',
  NONE: 'None',
};

export const POLINE_DETAILS_FIELDS = {
  ORDER_FORMAT: 'Order format',
  RECEIPT_STATUS: 'Receipt status',
  PAYMENT_STATUS: 'Payment status',
  HOLDING_NAME: 'Holding',
  LOCATION_NAME: 'Name (code)',
  PHYSICAL_UNIT_PRICE: 'Physical unit price',
  QUANTITY_PHYSICAL: 'Quantity physical',
  ELECTRONIC_UNIT_PRICE: 'Electronic unit price',
  QUANTITY_ELECTRONIC: 'Quantity electronic',
  CREATE_INVENTORY: 'Create inventory',
};

export const ORDER_LINE_RESULTS_ACTIONS_LABELS = {
  EXPORT_CSV: 'Export results (CSV)',
};

export const ORDER_LINE_RESULTS_LIST_COLUMNS = {
  ACQUISITION_UNIT: 'Acquisition unit',
  FUND_CODE: 'Fund code',
  ORDER_STATUS: 'Order status',
  PO_LINE_NUMBER: 'POL number',
  PRODUCT_ID: 'Product ID',
  VENDOR_REF_NUMBER: 'Vendor reference number',
  TITLE_OR_PACKAGE: 'Title or package name',
  UPDATED_DATE: 'Updated date',
};

export const ORDER_LINE_EXPORT_CSV_FIELDS = {
  PO_LINE_NUMBER: 'POLine number',
  TITLE_OR_PACKAGE: 'Title',
  INSTANCE_ID: 'Instance UUID',
  SUBSCRIPTION_FROM: 'Subscription from',
  SUBSCRIPTION_TO: 'Subscription to',
  SUBSCRIPTION_INTERVAL: 'Subscription interval',
  RECEIVING_NOTE: 'Receiving note',
  PUBLISHER: 'Publisher',
  EDITION: 'Edition',
  PACKAGE_PO_LINE_ID: 'Linked package',
  CONTRIBUTOR: 'Contributor, Contributor type',
  PRODUCT_IDENTIFIER: 'Product ID, Qualifier, Product ID type',
  DESCRIPTION: 'Internal note',
  ACQUISITION_METHOD: 'Acquisition method',
  ORDER_FORMAT: 'Order format',
  RECEIPT_DATE: 'Receipt date',
  RECEIPT_STATUS: 'Receipt status',
  PAYMENT_STATUS: 'Payment status',
  SOURCE: 'Source',
  DONOR: 'Donor',
  SELECTOR: 'Selector',
  REQUESTER: 'Requester',
  CANCELLATION_RESTRICTION: 'Cancellation restriction',
  CANCELLATION_RESTRICTION_NOTE: 'Cancellation description',
  RUSH: 'Rush',
  COLLECTION: 'Collection',
  PO_LINE_DESCRIPTION: 'Line description',
  REF_NUMBER: 'Vendor reference number, reference type',
  INSTRUCTIONS: 'Instructions to vendor',
  VENDOR_ACCOUNT: 'Account number',
  LIST_UNIT_PRICE: 'Physical unit price',
  QUANTITY_PHYSICAL: 'Quantity physical',
  LIST_UNIT_PRICE_ELECTRONIC: 'Electronic unit price',
  QUANTITY_ELECTRONIC: 'Quantity electronic',
  DISCOUNT: 'Discount',
  PO_LINE_ESTIMATED_PRICE: 'Estimated price',
  CURRENCY: 'Currency',
  FUND_DISTRIBUTION: 'Fund code, Expense class, Value, Amount',
  LOCATION: 'Location, Quantity P, Quantity E',
  MATERIAL_SUPPLIER: 'Material supplier',
  RECEIPT_DUE: 'Receipt due',
  EXPECTED_RECEIPT_DATE: 'Expected receipt date',
  VOLUMES: 'Volumes',
  CREATE_INVENTORY: 'Create inventory',
  MATERIAL_TYPE: 'Material type',
  ACCESS_PROVIDER: 'Access provider',
  ACTIVATED: 'Activation status',
  ACTIVATION_DUE: 'Activation due',
  CREATE_INVENTORY_E: 'Create inventory E',
  MATERIAL_TYPE_E: 'Material type E',
  TRIAL: 'Trial',
  EXPECTED_ACTIVATION: 'Expected activation',
  USER_LIMIT: 'User limit',
  RESOURCE_URL: 'URL',
  PO_LINE_TAGS: 'POLine tags',
  RENEWAL_NOTE: 'Renewal note',
  EXCHANGE_RATE: 'Exchange rate',
  PO_LINE_CREATED_BY: 'Created by (PO Line)',
  PO_LINE_DATE_CREATED: 'Created on (PO Line)',
  PO_LINE_UPDATED_BY: 'Updated by (PO Line)',
  PO_LINE_DATE_UPDATED: 'Updated on (PO Line)',
};

export const ORDER_LINE_FILTER_LABELS = {
  ACCESS_PROVIDER: 'Access provider',
  ACTIVATED: 'Activated',
  ACTUAL_RECEIPT_DATE: 'Actual receipt date',
  ACQUISITION_UNIT: 'Acquisition unit',
  ACQUISITION_METHOD: 'Acquisition method',
  COLLECTION: 'Collection',
  CREATED_BY: 'Created by',
  DATE_CREATED: 'Date created',
  DATE_UPDATED: 'Date updated',
  DONOR: 'Donor',
  EXPECTED_ACTIVATION: 'Expected activation',
  EXPECTED_RECEIPT_DATE: 'Expected receipt date',
  EXPENSE_CLASS: 'Expense class',
  EXPORT_DATE: 'Export date',
  FUND_CODE: 'Fund code',
  LINKED_PACKAGE_POL: 'Linked package POL',
  LOCATION: 'Location',
  MATERIAL_TYPE_ELECTRONIC: 'Material type, electronic',
  MATERIAL_TYPE_PHYSICAL: 'Material type, physical',
  ORDER_FORMAT: 'Order format',
  PAYMENT_STATUS: 'Payment status',
  PREFIX: 'Prefix',
  RECEIPT_DUE: 'Receipt due',
  RECEIPT_STATUS: 'Receipt status',
  RUSH: 'Rush',
  SOURCE: 'Source',
  SUBSCRIPTION_FROM: 'Subscription from',
  SUBSCRIPTION_TO: 'Subscription to',
  SUFFIX: 'Suffix',
  TAGS: 'Tags',
  TRIAL: 'Trial',
  UPDATED_BY: 'Updated by',
  VENDOR: 'Vendor',
};
