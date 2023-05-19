export const REQUEST_METHOD = {
  DELETE: 'DELETE',
  GET: 'GET',
  PATCH: 'PATCH',
  POST: 'POST',
  PUT: 'PUT',
};

export const LOAN_POLICY_NAMES = {
  EXAMPLE_LOAN: 'Example Loan Policy',
  HOLD_ONLY: 'One hour',
};

export const REQUEST_POLICY_NAMES = {
  ALLOW_ALL: 'Allow All',
  HOLD_ONLY: 'Hold only',
};

export const NOTICE_POLICY_NAMES = {
  SEND_NO_NOTICES: 'Send No Notices',
};

export const OVERDUE_FINE_POLICY_NAMES = {
  OVERDUE_FINE_POLICY: 'Overdue fine policy',
};

export const LOST_ITEM_FEES_POLICY_NAMES = {
  LOST_ITEM_FEES_POLICY: 'Lost item fee policy',
};

export const LOAN_TYPE_NAMES = {
  CAN_CIRCULATE: 'Can circulate',
  COURSE_RESERVES: 'Course reserves'
};

export const MATERIAL_TYPE_NAMES = {
  MICROFORM: 'microform',
  BOOK: 'book',
  ELECTRONIC_RESOURCE: 'electronic resource'
};

export const ITEM_STATUS_NAMES = {
  ON_ORDER: 'On order',
  IN_PROCESS: 'In process',
  AVAILABLE: 'Available',
  MISSING: 'Missing',
  IN_TRANSIT: 'In transit',
  PAGED: 'Paged',
  AWAITING_PICKUP: 'Awaiting pickup',
  CHECKED_OUT: 'Checked out',
  DECLARED_LOST: 'Declared lost',
  AWAITING_DELIVERY: 'Awaiting delivery'
};

export const CY_ENV = {
  CIRCULATION_RULES: 'circulationRules',
  DIKU_LOGIN: 'diku_login',
  DIKU_PASSWORD: 'diku_password',
  FIXED_DUE_DATE_SCHEDULE: 'fixedDueDateSchedule',
  HOLDING_SOURCES: 'holdingSources',
  HOLDINGS_TYPES: 'holdingsTypes',
  INSTANCE_TYPES: 'instanceTypes',
  LOAN_POLICY: 'loanPolicy',
  LOAN_POLICIES: 'loanPolicies',
  LOAN_TYPES: 'loanTypes',
  LOCATION: 'locations',
  LOST_ITEM_FEES_POLICY: 'lostItemFeesPolicy',
  MATERIAL_TYPES: 'materialTypes',
  NEW_SERVICE_POINT: 'newServicePoint',
  NOTICE_POLICY: 'noticePolicy',
  OVERDUE_FINE_POLICY: 'overdueFinePolicy',
  OWNER: 'owner',
  REQUEST_POLICY: 'requestPolicy',
  SERVICE_POINTS: 'servicePoints',
  USER: 'user',
  USER_GROUPS: 'userGroups',
};

export const LIBRARY_DUE_DATE_MANAGMENT = {
  CURRENT_DUE_DATE: 'CURRENT_DUE_DATE_TIME',
};

export const LOAN_PROFILE = {
  FIXED: 'Fixed',
  ROLLING: 'Rolling',
};

export const FULFILMENT_PREFERENCES = {
  HOLD_SHELF: 'Hold Shelf',
  DELIVERY: 'Delivery'
};

export const REQUEST_LEVELS = {
  ITEM: 'Item',
  TITLE: 'Title',
};

export const REQUEST_TYPES = {
  PAGE: 'Page',
  HOLD: 'Hold',
  RECALL: 'Recall',
};

export const FOLIO_RECORD_TYPE = {
  INSTANCE:'Instance',
  HOLDINGS:'Holdings',
  ITEM:'Item',
  ORDER:'Order',
  INVOICE:'Invoice',
  MARCBIBLIOGRAPHIC:'MARC Bibliographic'
};

export const PAYMENT_METHOD = {
  CASH:'"Cash"',
  CREDIT_CARD:'"Credit Card"'
};

export const BATCH_GROUP = {
  FOLIO:'"FOLIO"',
  AMHERST:'"Amherst (AC)"'
};

export const ORDER_STATUSES = {
  OPEN: 'Open',
  PENDING: 'Pending'
};

export const ORDER_FORMAT_NAMES = {
  ELECTRONIC_RESOURCE: 'Electronic Resource',
  PE_MIX: 'P/E Mix',
  OTHER: 'Other',
  PHYSICAL_RESOURCE: 'Physical resource',
};

export const RECEIVING_WORKFLOW_NAMES = {
  SYNCHRONIZED_ORDER_AND_RECEIPT_QUANTITY: 'Synchronized order and receipt quantity',
  INDEPENDENT_ORDER_AND_RECEIPT_QUANTITY: 'Independent order and receipt quantity',
};

export const ACQUISITION_METHOD_NAMES = {
  APPROVAL_PLAN: 'Approval plan',
  DDA: 'Demand driven acquisitions (DDA)',
  DEPOSITORY: 'Depository',
  EBA:'Evidence based acquisitions (EBA)',
  EXCHANGE: 'Exchange',
  FREE: 'Free',
  GIFT: 'Gift',
  INTERNAL_TRANSFER: 'Internal transfer',
  MEMBERSHIP: 'Membership',
  OTHER: 'Other',
  PURCHASE: 'Purchase',
  PURCHASE_AT_VENDOR_SYSTEM: 'Purchase at vendor system',
  TECHNICAL: 'Technical'
};

export const LOCALION_NAMES = {
  ANNEX: 'Annex (KU/CC/DI/A)',
  ANNEX_UI: 'Annex',
  ONLINE: 'Online (E)',
  ONLINE_UI: 'Online',
  MAIN_LIBRARY: 'Main Library (KU/CC/DI/M)',
  MAIN_LIBRARY_UI: 'Main Library'
};

export const INSTANCE_STATUS_TERM_NAMES = {
  BATCH_LOADED: 'Batch Loaded',
  CATALOGED: 'Cataloged',
  UNCATALOGED: 'Uncataloged'
};

export const CALL_NUMBER_TYPE_NAMES = {
  OTHER_SCHEME: 'Other scheme',
  LIBRARY_OF_CONGRESS: 'Library of Congress classification',
  LIBRARY_OF_MEDICINE: 'National Library of Medicine classification'
};
