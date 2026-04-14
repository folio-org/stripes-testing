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
