export const APPLICATION_NAMES = {
  AGREEMENTS: 'Agreements',
  BULK_EDIT: 'Bulk edit',
  DATA_EXPORT: 'Data export',
  DATA_IMPORT: 'Data import',
  EXPORT_MANAGER: 'Export manager',
  INVENTORY: 'Inventory',
  INVOICES: 'Invoices',
  LICENSES: 'Licenses',
  SETTINGS: 'Settings',
  CIRCULATION_LOG: 'Circulation log',
  USERS: 'Users',
  MARC_AUTHORITY: 'MARC authority',
  ORDERS: 'Orders',
  CHECK_IN: 'Check in',
  CHECK_OUT: 'Check out',
  REQUESTS: 'Requests',
  READING_ROOM_ACCESS: 'Reading room access',
  EHOLDINGS: 'eHoldings',
  CONSORTIUM_MANAGER: 'Consortium manager',
  FINANCE: 'Finance',
  LINKED_DATA_EDITOR: 'Linked Data Editor',
  NOTES: 'Notes',
  ORGANIZATIONS: 'Organizations',
  COURSES: 'Courses',
};

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
  COURSE_RESERVES: 'Course reserves',
  SELECTED: 'Selected',
};

export const MATERIAL_TYPE_NAMES = {
  BOOK: 'book',
  DVD: 'dvd',
  ELECTRONIC_RESOURCE: 'electronic resource',
  MICROFORM: 'microform',
  SOUND_RECORDING: 'sound recording',
  TEXT: 'text',
  UNSPECIFIED: 'unspecified',
  VIDEO_RECORDING: 'video recording',
};

export const ITEM_STATUS_NAMES = {
  ON_ORDER: 'On order',
  IN_PROCESS: 'In process',
  AVAILABLE: 'Available',
  MISSING: 'Missing',
  LONG_MISSING: 'Long missing',
  IN_TRANSIT: 'In transit',
  PAGED: 'Paged',
  AWAITING_PICKUP: 'Awaiting pickup',
  CHECKED_OUT: 'Checked out',
  CLAIMED_RETURNED: 'Claimed returned',
  DECLARED_LOST: 'Declared lost',
  MARKED_AS_MISSING: 'Marked as missing',
  AWAITING_DELIVERY: 'Awaiting delivery',
  FOUND_BY_LIBRARY: 'Checked in (found by library)',
  AGED_TO_LOST: 'Aged to lost',
  LOST_AND_PAID: 'Lost and paid',
  WITHDRAWN: 'Withdrawn',
  ORDER_CLOSED: 'Order closed',
};

export const BUDGET_STATUSES = {
  ACTIVE: 'Active',
  CLOZED: 'Clozed',
  FROZEN: 'Frozed',
  INACTIVE: 'Inactive',
  PLANNED: 'Planned',
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
  DELIVERY: 'Delivery',
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
  INSTANCE: 'Instance',
  HOLDINGS: 'Holdings',
  ITEM: 'Item',
  ORDER: 'Order',
  INVOICE: 'Invoice',
  MARCBIBLIOGRAPHIC: 'MARC Bibliographic',
  MARCAUTHORITY: 'MARC Authority',
};

export const PAYMENT_METHOD = {
  CASH: '"Cash"',
  CREDIT_CARD: '"Credit Card"',
};

export const BATCH_GROUP = {
  FOLIO: '"FOLIO"',
  AMHERST: '"Amherst (AC)"',
};

export const INVOICE_STATUSES = {
  OPEN: 'Open',
  REVIEWED: 'Reviewed',
  APPROVED: 'Approved',
  CANCELLED: 'Cancelled',
  PAID: 'Paid',
};

export const ORDER_STATUSES = {
  OPEN: 'Open',
  PENDING: 'Pending',
  CLOSED: 'Closed',
};

export const RECORD_STATUSES = {
  CREATED: 'Created',
  UPDATED: 'Updated',
  NO_ACTION: 'No action',
  DASH: 'No value set-',
  BLANK: 'No value set',
  ERROR: 'Error',
};

export const ORDER_TYPES = {
  ONE_TIME: 'One-time',
  ONGOING: 'Ongoing',
};

export const ORDER_FORMAT_NAMES = {
  ELECTRONIC_RESOURCE: 'Electronic resource',
  ELECTRONIC_RESOURCE_Check: 'Electronic Resource',
  PE_MIX: 'P/E mix',
  PE_MIX_Check: 'P/E Mix',
  OTHER: 'Other',
  PHYSICAL_RESOURCE: 'Physical resource',
  PHYSICAL_RESOURCE_Check: 'Physical Resource',
};

export const ORDER_PAYMENT_STATUS = {
  PENDING: 'Pending',
  PAYMENT_NOT_REQUIRED: 'Payment not required',
};

export const ORDER_LINE_PAYMENT_STATUS = {
  AWAITING_PAYMENT: 'Awaiting Payment',
  CANCELLED: 'Cancelled',
  FULLY_PAID: 'Fully paid',
  PARTIALLY_PAID: 'Partially paid',
  PAYMENT_NOT_REQUIRED: 'Payment not required',
};

export const ORDER_FORMAT_NAMES_IN_PROFILE = {
  ELECTRONIC_RESOURCE: 'Electronic Resource',
  PE_MIX: 'P/E Mix',
  OTHER: 'Other',
  PHYSICAL_RESOURCE: 'Physical Resource',
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

export const ACQUISITION_METHOD_NAMES_IN_PROFILE = {
  APPROVAL_PLAN: 'Approval plan',
  PURCHASE: 'Purchase',
  PURCHASE_AT_VENDOR_SYSTEM: 'Purchase at vendor system',
};

export const RECEIPT_STATUS_SELECTED = {
  PENDING: 'Pending',
  RECEIPT_NOT_REQUIRED: 'Receipt not required',
};

export const RECEIPT_STATUS_VIEW = {
  PENDING: 'Pending',
  RECEIPT_NOT_REQUIRED: 'Receipt Not Required',
  CANCELLED: 'Cancelled',
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

export const INSTITUTION_NAMES = {
  KOBENHAVNS_UNIVERSITET: 'Københavns Universitet',
};

export const CAMPUS_NAMES = {
  CITY_CAMPUS: 'City Campus',
};

export const LIBRARY_NAMES = {
  DATALOGISK_INSTITUT: 'Datalogisk Institut',
};

export const LOCATION_NAMES = {
  ANNEX: 'Annex (KU/CC/DI/A)',
  ANNEX_UI: 'Annex',
  ONLINE: 'Online (E)',
  ONLINE_UI: 'Online',
  MAIN_LIBRARY: 'Main Library (KU/CC/DI/M)',
  MAIN_LIBRARY_UI: 'Main Library',
  POPULAR_READING_COLLECTION: 'Popular Reading Collection (KU/CC/DI/P)',
  POPULAR_READING_COLLECTION_UI: 'Popular Reading Collection',
  SECOND_FLOOR: 'Second Floor (KU/CC/DI/2)',
  SECOND_FLOOR_UI: 'Second Floor',
  DCB_UI: 'DCB',
};

export const LOCATION_IDS = {
  ANNEX: '53cf956f-c1df-410b-8bea-27f712cca7c0',
  MAIN_LIBRARY: 'fcd64ce1-6995-48f0-840e-89ffa2288371',
  ONLINE: '184aae84-a5bf-4c6a-85ba-4a7c73026cd5',
  POPULAR_READING_COLLECTION: 'b241764c-1466-4e1d-a028-1a3684a5da87',
};

export const INSTANCE_STATUS_TERM_NAMES = {
  BATCH_LOADED: 'Batch Loaded',
  CATALOGED: 'Cataloged',
  UNCATALOGED: 'Uncataloged',
  OTHER: 'Other',
  NOTYETASSIGNED: 'Not yet assigned',
  ELECTRONIC_RESOURCE: 'Electronic Resource',
};

export const CALL_NUMBER_TYPE_NAMES = {
  ALL: 'Call numbers (all)',
  OTHER_SCHEME: 'Other scheme',
  LIBRARY_OF_CONGRESS: 'Library of Congress classification',
  LIBRARY_OF_MEDICINE: 'National Library of Medicine classification',
  DEWAY_DECIMAL: 'Dewey Decimal classification',
  SUDOC: 'Superintendent of Documents classification',
  UDC: 'UDC',
  MOYS: 'MOYS',
  LOCAL: 'Local',
};

export const EXPORT_TRANSFORMATION_NAMES = {
  ITEM_HRID: 'Item - HRID',
  HOLDINGS_HRID: 'Holdings - HRID',
};

export const TARGET_PROFILE_NAMES = {
  OCLC_WORLDCAT: '✓ OCLC WorldCat',
};

export const ACCEPTED_DATA_TYPE_NAMES = {
  MARC: 'MARC',
  EDIFACT: 'EDIFACT',
};

export const INSTANCE_SOURCE_NAMES = {
  MARC: 'MARC',
  FOLIO: 'FOLIO',
  LDE: 'LINKED_DATA',
};

export const HOLDINGS_SOURCE_NAMES = {
  MARC: 'MARC',
  FOLIO: 'FOLIO',
};

export const PROFILE_TYPE_NAMES = {
  JOB_PROFILE: 'JOB_PROFILE',
  MATCH_PROFILE: 'MATCH_PROFILE',
  ACTION_PROFILE: 'ACTION_PROFILE',
  MAPPING_PROFILE: 'MAPPING_PROFILE',
};

export const EXISTING_RECORD_NAMES = {
  INSTANCE: 'INSTANCE',
  HOLDINGS: 'HOLDINGS',
  ITEM: 'ITEM',
  MARC_BIBLIOGRAPHIC: 'MARC_BIBLIOGRAPHIC',
  MARC_AUTHORITY: 'MARC_AUTHORITY',
};

export const INCOMING_RECORD_NAMES = {
  MARC_BIBLIOGRAPHIC: 'MARC_BIBLIOGRAPHIC',
};

export const JOB_STATUS_NAMES = {
  COMPLETED: 'Completed',
  COMPLETED_WITH_ERRORS: 'Completed with errors',
  FAILED: 'Failed',
  STOPPED_BY_USER: 'Stopped by user',
};

export const VENDOR_NAMES = {
  GOBI: 'GOBI Library Solutions',
  HARRASSOWITZ: 'Otto Harrassowitz GmbH & Co. KG',
  EBSCO: 'EBSCO SUBSCRIPTION SERVICES',
  AMAZON: 'Amazon.com',
  MOSAIC: 'Mosaic',
};

export const HOLDINGS_TYPE_NAMES = {
  ELECTRONIC: 'Electronic',
  MONOGRAPH: 'Monograph',
  PHYSICAL: 'Physical',
};

export const NOTE_TYPES = {
  GENERAL: 'General note',
  NOTE_1516: 'Note type 1516',
  NOTE_1654: 'Note-type-1654',
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

export const REMOTE_STORAGE_PROVIDER_NAMES = {
  Dematic_EMS: 'Dematic EMS (API)',
  DDEMATIC_STAGING_DIRECTOR: 'Dematic StagingDirector (TCP/IP)',
  CAIA_SOFT: 'CaiaSoft',
};

export const BROWSE_CALL_NUMBER_OPTIONS = {
  CALL_NUMBERS_ALL: 'Call numbers (all)',
  DEWEY_DECIMAL: 'Dewey Decimal classification',
  LIBRARY_OF_CONGRESS: 'Library of Congress classification',
  LIBRARY_OF_MEDICINE: 'National Library of Medicine classification',
  OTHER_SCHEME: 'Other scheme',
  SUPERINTENDENT_OF_DOCUMENTS: 'Superintendent of Documents classification',
};

export const BROWSE_CLASSIFICATION_OPTIONS = {
  CALL_NUMBERS_ALL: 'Classification (all)',
  DEWEY_DECIMAL: 'Dewey Decimal classification',
  LIBRARY_OF_CONGRESS: 'Library of Congress classification',
};

export const CONDITION_AND_LIMIT_TYPES = {
  MAX_ITEMS_CHARGED_OUT: 'Maximum number of items charged out',
  MAX_LOST_ITEMS: 'Maximum number of lost items',
  MAX_OVERDUE_ITEMS: 'Maximum number of overdue items',
  MAX_OVERDUE_RECALLS: 'Maximum number of overdue recalls',
  MAX_OUTSTANDING_FEE_FINE_BALANCE: 'Maximum outstanding fee/fine balance',
  MAX_NUMBER_OF_DAYS: 'Recall overdue by maximum number of days',
};

export const REFERENCES_FILTER_CHECKBOXES = {
  EXCLUDE_SEE_FROM: 'Exclude see from',
  EXCLUDE_SEE_FROM_ALSO: 'Exclude see from also',
};

export const MARC_AUTHORITY_SEARCH_OPTIONS = {
  KEYWORD: 'Keyword',
  IDENTIFIER_ALL: 'Identifier (all)',
  LCCN: 'LCCN',
  PERSONAL_NAME: 'Personal name',
  CORPORATE_CONFERENCE_NAME: 'Corporate/Conference name',
  GEOGRAPHIC_NAME: 'Geographic name',
  NAME_TITLE: 'Name-title',
  UNIFORM_TITLE: 'Uniform title',
  SUBJECT: 'Subject',
  CHILDRENS_SUBJECT_HEADING: "Children's subject heading",
  GENRE: 'Genre',
  ADVANCED_SEARCH: 'Advanced search',
};

export const MARC_AUTHORITY_BROWSE_OPTIONS = {
  PERSONAL_NAME: 'Personal name',
  CORPORATE_CONFERENCE_NAME: 'Corporate/Conference name',
  GEOGRAPHIC_NAME: 'Geographic name',
  NAME_TITLE: 'Name-title',
  UNIFORM_TITLE: 'Uniform title',
  SUBJECT: 'Subject',
  GENRE: 'Genre',
};

export const DEFAULT_FOLIO_AUTHORITY_FILES = {
  LC_NAME_AUTHORITY_FILE: 'LC Name Authority file (LCNAF)',
  LC_SUBJECT_HEADINGS: 'LC Subject Headings (LCSH)',
  LC_CHILDREN_SUBJECT_HEADINGS: "LC Children's Subject Headings",
  LC_GENRE_FORM_TERMS: 'LC Genre/Form Terms (LCGFT)',
  LC_DEMOGRAPHIC_GROUP_TERMS: 'LC Demographic Group Terms (LCDGT)',
  LC_MEDIUM_OF_PERFORMANCE_THESAURUS_FOR_MUSIC:
    'LC Medium of Performance Thesaurus for Music (LCMPT)',
  FACETED_APPLICATION_OF_SUBJECT_TERMINOLOGY: 'Faceted Application of Subject Terminology (FAST)',
  MEDICAL_SUBJECT_HEADINGS: 'Medical Subject Headings (MeSH)',
  THESAURUS_FOR_GRAPHIC_MATERIALS: 'Thesaurus for Graphic Materials (TGM)',
  RARE_BOOKS_AND_MANUSCRIPTS_SECTION: 'Rare Books and Manuscripts Section (RBMS)',
  ART_AND_ARCHITECTURE_THESAURUS: 'Art & architecture thesaurus (AAT)',
  GSAFD_GENRE_TERMS: 'GSAFD Genre Terms (GSAFD)',
};

export const AUTHORITY_SEARCH_ACCORDION_NAMES = {
  AUTHORITY_SOURCE: 'Authority source',
  REFERENCES: 'References',
  THESAURUS: 'Thesaurus',
  TYPE_OF_HEADING: 'Type of heading',
  DATE_CREATED: 'Date created',
  DATE_UPDATED: 'Date updated',
};

export const AUTHORITY_TYPES = {
  AUTHORIZED: 'Authorized',
  REFERENCE: 'Reference',
  AUTH_REF: 'Auth/Ref',
};

export const ACTION_NAMES_IN_ACTION_PROFILE = {
  CREATE: 'Create (all record types except MARC Bibliographic, MARC Authority, or MARC Holdings)',
  MODIFY: 'Modify (MARC Bibliographic record type only)',
  UPDATE: 'Update (all record types except Orders, Invoices, or MARC Holdings)',
};

export const AUTHORITY_LDR_FIELD_STATUS_DROPDOWN = {
  A: 'a - Increase in encoding level',
  C: 'c - Corrected or revised',
  D: 'd - Deleted',
  N: 'n - New',
  O: 'o - Obsolete',
  S: 's - Deleted; heading split into two or more headings',
  X: 'x - Deleted; heading replaced by another heading',
};

export const AUTHORITY_LDR_FIELD_DROPDOWNS_NAMES = {
  STATUS: 'Status',
  TYPE: 'Type',
  ELVL: 'ELvl',
  PUNCT: 'Punct',
};

export const AUTHORITY_LDR_FIELD_ELVL_DROPDOWN = {
  N: 'n - Complete authority record',
  O: 'o - Incomplete authority record',
};

export const AUTHORITY_LDR_FIELD_PUNCT_DROPDOWN = {
  '\\': '\\ - No information provided',
  C: 'c - Punctuation omitted',
  I: 'i - Punctuation included',
  U: 'u - Unknown',
};

export const AUTHORITY_LDR_FIELD_TYPE_DROPDOWN = {
  Z: 'z - Authority data',
};

export const MARC_HOLDING_LDR_FIELD_DROPDOWNS_NAMES = {
  STATUS: 'Status',
  TYPE: 'Type',
  ELVL: 'ELvl',
  ITEM: 'Item',
};

export const MARC_HOLDING_LDR_FIELD_STATUS_DROPDOWN = {
  C: 'c - Corrected or revised',
  D: 'd - Deleted',
  N: 'n - New',
};

export const MARC_HOLDING_LDR_FIELD_TYPE_DROPDOWN = {
  U: 'u - Unknown',
  V: 'v - Multipart item holdings',
  X: 'x - Single-part item holdings',
  Y: 'y - Serial item holdings',
};

export const MARC_HOLDING_LDR_FIELD_ELVL_DROPDOWN = {
  1: '1 - Holdings level 1',
  2: '2 - Holdings level 2',
  3: '3 - Holdings level 3',
  4: '4 - Holdings level 4',
  5: '5 - Holdings level 4 with piece designation',
  M: 'm - Mixed level',
  U: 'u - Unknown',
  Z: 'z - Other level',
};

export const MARC_HOLDING_LDR_FIELD_ITEM_DROPDOWN = {
  I: 'i - Item information',
  N: 'n - No item information',
};

export const INVENTORY_LDR_FIELD_DROPDOWNS_NAMES = {
  STATUS: 'Status',
  TYPE: 'Type',
  BLVL: 'BLvl',
  CTRL: 'Ctrl',
  DESC: 'Desc',
  MULTILVL: 'MultiLvl',
};

export const INVENTORY_LDR_FIELD_STATUS_DROPDOWN = {
  A: 'a - Increase in encoding level',
  C: 'c - Corrected or revised',
  D: 'd - Deleted',
  N: 'n - New',
  P: 'p - Increase in encoding level from prepublication',
};

export const INVENTORY_LDR_FIELD_CTRL_DROPDOWN = {
  '\\': '\\ - No specified type',
  A: 'a - Archival',
};

export const INVENTORY_LDR_FIELD_DESC_DROPDOWN = {
  '\\': '\\ - Non-ISBD',
  A: 'a - AACR2',
  C: 'c - ISBD punctuation omitted',
  I: 'i - ISBD punctuation included',
  N: 'n - Non-ISBD punctuation omitted',
  U: 'u - Unknown',
};

export const INVENTORY_LDR_FIELD_MULTILVL_DROPDOWN = {
  '\\': '\\ - Not specified or not applicable',
  A: 'a - Set',
  B: 'b - Part with independent title',
  C: 'c - Part with dependent title',
};

export const INVENTORY_LDR_FIELD_TYPE_DROPDOWN = {
  A: 'a - Language material',
  C: 'c - Notated music',
  D: 'd - Manuscript notated music',
  E: 'e - Cartographic material',
  F: 'f - Manuscript cartographic material',
  G: 'g - Projected medium',
  I: 'i - Nonmusical sound recording',
  J: 'j - Musical sound recording',
  K: 'k - Two-dimensional nonprojectable  graphic',
  M: 'm - Computer file',
  O: 'o - Kit',
  P: 'p - Mixed materials',
  R: 'r - Three-dimensional artifact or naturally occurring object',
  T: 't - Manuscript language material',
};

export const INVENTORY_LDR_FIELD_BLVL_DROPDOWN = {
  A: 'a - Monographic component part',
  B: 'b - Serial component part',
  C: 'c - Collection',
  D: 'd - Subunit',
  I: 'i - Integrating resource',
  M: 'm - Monograph/Item',
  S: 's - Serial',
};

export const INVENTORY_008_FIELD_DROPDOWNS_BOXES_NAMES = {
  DTST: 'DtSt',
  DATE1: 'Date 1',
  DATE2: 'Date 2',
  CONF: 'Conf',
  FEST: 'Fest',
  INDX: 'Indx',
  AUDN: 'Audn',
  LITF: 'LitF',
  ILLS: 'Ills',
  COMP: 'Comp',
  CTRY: 'Ctry',
  CONT: 'Cont',
  GPUB: 'GPub',
  BIOG: 'Biog',
  LANG: 'Lang',
  MREC: 'MRec',
  PART: 'Part',
  ACCM: 'AccM',
  LTXT: 'LTxt',
  TRAR: 'TrAr',
  FREQ: 'Freq',
  SRTP: 'SrTp',
  ORIG: 'Orig',
  ENTW: 'EntW',
  ALPH: 'Alph',
  TIME: 'Time',
  FMUS: 'FMus',
  FORM: 'Form',
  CRTP: 'CrTp',
  TMAT: 'TMat',
  TECH: 'Tech',
  FILE: 'File',
  REGL: 'Regl',
  SL: 'S/L',
  SRCE: 'Srce',
};

export const INVENTORY_008_FIELD_DTST_DROPDOWN = {
  NO: '| - No attempt to code',
  B: 'b - No dates given; B.C. date involved',
  C: 'c - Continuing resource currently published',
  D: 'd - Continuing resource ceased publication',
  E: 'e - Detailed date',
  I: 'i - Inclusive dates of collection',
  K: 'k - Range of years of bulk of collection',
  M: 'm - Multiple dates',
  N: 'n - Dates unknown',
  P: 'p - Date of distribution/release/issue and production/recording session when different',
  Q: 'q - Questionable date',
  R: 'r - Reprint/reissue date and original date',
  S: 's - Single known date/probable date',
  T: 't - Publication date and copyright date',
  U: 'u - Continuing resource status unknown',
};

export const INVENTORY_008_FIELD_CONF_DROPDOWN = {
  NO: '| - No attempt to code',
  ZERO: '0 - Not a conference publication',
  ONE: '1 - Conference publication',
};

export const INVENTORY_008_FIELD_FEST_DROPDOWN = {
  NO: '| - No attempt to code',
  ZERO: '0 - Not a festschrift',
  ONE: '1 - Festschrift',
};

export const INVENTORY_008_FIELD_INDX_DROPDOWN = {
  NO: '| - No attempt to code',
  ZERO: '0 - No index',
  ONE: '1 - Index present',
};

export const INVENTORY_008_FIELD_LITF_DROPDOWN = {
  NO: '| - No attempt to code',
  ZERO: '0 - Not fiction (not further specified)',
  ONE: '1 - Fiction (not further specified)',
  D: 'd - Dramas',
  E: 'e - Essays',
  F: 'f - Novels',
  H: 'h - Humor, satires, etc.',
  I: 'i - Letters',
  J: 'j - Short stories',
  M: 'm - Mixed forms',
  P: 'p - Poetry',
  S: 's - Speeches',
  U: 'u - Unknown',
};

export const INVENTORY_008_FIELD_COMP_DROPDOWN = {
  NO: '|| - No attempt to code',
  AN: 'an - Anthems',
  BD: 'bd - Ballads',
  CA: 'ca - Chaconnes',
  DF: 'df - Dance forms',
  FG: 'fg - Fugues',
  GM: 'gm - Gospel music',
  HY: 'hy - Hymns',
  JZ: 'jz - Jazz',
  MC: 'mc - Musical revues and comedies',
  NC: 'nc - Nocturnes',
  OP: 'op - Operas',
  PG: 'pg - Program music',
  RC: 'rc - Rock music',
  SD: 'sd - Square dance music',
  TC: 'tc - Toccatas',
  UU: 'uu - Unknown',
  VI: 'vi - Villancicos',
  WZ: 'wz - Waltzes',
  ZZ: 'zz - Other',
};

export const INVENTORY_008_FIELD_FMUS_DROPDOWN = {
  NO: '| - No attempt to code',
  A: 'a - Full score',
  B: 'b - Miniature or study score',
  C: 'c - Accompaniment reduced for keyboard',
  D: 'd - Voice score with accompaniment omitted',
  Z: 'z - Other',
};

export const INVENTORY_008_FIELD_CRTP_DROPDOWN = {
  NO: '| - No attempt to code',
  A: 'a - Single map',
  B: 'b - Map series',
  C: 'c - Map serial',
  D: 'd - Globe',
  Z: 'z - Other',
};

export const INVENTORY_008_FIELD_TMAT_DROPDOWN = {
  NO: '| - No attempt to code',
  A: 'a - Art original',
  B: 'b - Kit',
  C: 'c - Art reproduction',
  D: 'd - Diorama',
  Z: 'z - Other',
};

export const INVENTORY_008_FIELD_TECH_DROPDOWN = {
  NO: '| - No attempt to code',
  A: 'a - Animation',
  C: 'c - Animation and live action',
  L: 'l - Live action',
  N: 'n - Not applicable',
  U: 'u - Unknown',
  Z: 'z - Other',
};

export const INVENTORY_008_FIELD_FILE_DROPDOWN = {
  NO: '| - No attempt to code',
  A: 'a - Numeric data',
  B: 'b - Computer program',
  C: 'c - Representational',
  D: 'd - Document',
  E: 'e - Bibliographic data',
  Z: 'z - Other',
};

export const INVENTORY_008_FIELD_REGL_DROPDOWN = {
  NO: '| - No attempt to code',
  N: 'n - Normalized irregular',
  R: 'r - Regular',
  U: 'u - Unknown',
  X: 'x - Completely irregular',
};

export const INVENTORY_008_FIELD_S_L_DROPDOWN = {
  NO: '| - No attempt to code',
  0: '0 - Successive entry',
  1: '1 - Latest entry',
  2: '2 - Integrated entry',
};

export const AUTHORITY_008_FIELD_DROPDOWNS_BOXES_NAMES = {
  GEOSUBD: 'Geo Subd',
  ROMAN: 'Roman',
  LANG: 'Lang',
  KINDREC: 'Kind rec',
  CATRULES: 'CatRules',
  SHSYS: 'SH Sys',
  SERIES: 'Series',
  NUMBSERIES: 'Numb Series',
  MAINUSE: 'Main use',
  SUBJUSE: 'Subj use',
  SERIESUSE: 'Series use',
  SUBDTYPE: 'Subd type',
  GOVTAG: 'Govt Ag',
  REFEVAL: 'RefEval',
  RECUPD: 'RecUpd',
  PERSNAME: 'Pers Name',
  LEVELEST: 'Level Est',
  MODREC: 'Mod Rec',
  SOURCE: 'Source',
};

export const AUTHORITY_008_FIELD_GEOSUBD_DROPDOWN = {
  SL: '\\ - Not subdivided geographically',
  D: 'd - Subdivided geographically-direct',
  I: 'i - Subdivided geographically-indirect',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_ROMAN_DROPDOWN = {
  A: 'a - International standard',
  B: 'b - National standard',
  C: 'c - National library association standard',
  D: 'd - National library or bibliographic agency standard',
  E: 'e - Local standard',
  F: 'f - Standard of unknown origin',
  G: 'g - Conventional romanization or conventional form of name in language of cataloging agency',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_LANG_DROPDOWN = {
  SL: '\\ - No information provided',
  B: 'b - English and French',
  E: 'e - English only',
  F: 'f - French only',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_KINDREC_DROPDOWN = {
  A: 'a - Established heading',
  B: 'b - Untraced reference',
  C: 'c - Traced reference',
  D: 'd - Subdivision',
  E: 'e - Node label',
  F: 'f - Established heading and subdivision',
  G: 'g - Reference and subdivision',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_CATRULES_DROPDOWN = {
  A: 'a - Earlier rules',
  B: 'b - AACR 1',
  C: 'c - AACR 2',
  D: 'd - AACR 2 compatible heading',
  Z: 'z - Other',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SHSYS_DROPDOWN = {
  A: 'a - Library of Congress Subject Headings',
  B: "b - Library of Congress Children's and Young Adults' Subject Headings",
  C: 'c - Medical Subject Headings',
  D: 'd - National Agricultural Library subject authority file',
  K: 'k - Canadian Subject Headings',
  N: 'n - Not applicable',
  R: 'r - Art and Architecture Thesaurus',
  S: 's - Sears List of Subject Heading',
  V: 'v - Répertoire de vedettes-matière',
  Z: 'z - Other',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SERIES_DROPDOWN = {
  A: 'a - Monographic series',
  B: 'b - Multipart item',
  C: 'c - Series-like phrase',
  N: 'n - Not applicable',
  Z: 'z - Other',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_NUMBSERIES_DROPDOWN = {
  A: 'a - Numbered',
  B: 'b - Unnumbered',
  C: 'c - Numbering varies',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_MAINUSE_DROPDOWN = {
  A: 'a - Appropriate',
  B: 'b - Not appropriate',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SUBJUSE_DROPDOWN = {
  A: 'a - Appropriate',
  B: 'b - Not appropriate',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SERIESUSE_DROPDOWN = {
  A: 'a - Appropriate',
  B: 'b - Not appropriate',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SUBDTYPE_DROPDOWN = {
  A: 'a - Topical',
  B: 'b - Form',
  C: 'c - Chronological',
  D: 'd - Geographic',
  E: 'e - Language',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_GOVTAG_DROPDOWN = {
  SL: '\\ - Not a government agency',
  A: 'a - Autonomous or semi-autonomous component',
  C: 'c - Multilocal',
  F: 'f - Federal/national',
  I: 'i - International intergovernmental',
  L: 'l - Local',
  M: 'm - Multistate',
  O: 'o - Government agency-type undetermined',
  S: 's - State, provincial, territorial, dependent, etc.',
  U: 'u - Unknown if heading is government agency',
  Z: 'z - Other',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_REFEVAL_DROPDOWN = {
  A: 'a - Tracings are consistent with the heading',
  B: 'b - Tracings are not necessarily consistent with the heading',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_RECUPD_DROPDOWN = {
  A: 'a - Record can be used',
  B: 'b - Record is being updated',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_PERSNAME_DROPDOWN = {
  A: 'a - Differentiated personal name',
  B: 'b - Undifferentiated personal name',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_LEVELEST_DROPDOWN = {
  A: 'a - Fully established',
  B: 'b - Memorandum',
  C: 'c - Provisional',
  D: 'd - Preliminary',
  N: 'n - Not applicable',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_MODREC_DROPDOWN = {
  SL: '\\ - Not modified',
  S: 's - Shortened',
  X: 'x - Missing characters',
  NO: '| - No attempt to code',
};

export const AUTHORITY_008_FIELD_SOURCE_DROPDOWN = {
  SL: '\\ - National bibliographic agency',
  S: 'c - Cooperative cataloging program',
  D: 'd - Other',
  U: 'u - Unknown',
  NO: '| - No attempt to code',
};

export const DEFAULT_JOB_PROFILE_NAMES = {
  CREATE_INSTANCE_AND_SRS: 'Default - Create instance and SRS MARC Bib',
  CREATE_AUTHORITY: 'Default - Create SRS MARC Authority',
  CREATE_HOLDINGS_AND_SRS: 'Default - Create Holdings and SRS MARC Holdings',
};

export const DEFAULT_DATA_EXPORT_JOB_PROFILE_NAMES = {
  INSTANCES: 'Default instances export job profile',
  HOLDINGS: 'Default holdings export job profile',
  AUTHORITY: 'Default authority export job profile',
};

export const AUTHORIZATION_POLICY_TYPES = {
  USER: 'user',
  ROLE: 'role',
  TIME: 'time',
};

export const AUTHORIZATION_POLICY_SOURCES = {
  USER: 'USER',
  SYSTEM: 'SYSTEM',
  CONSORTIUM: 'CONSORTIUM',
};

export const patronGroupNames = {
  STAFF: 'staff',
  FACULTY: 'faculty',
  UNDERGRAD: 'undergrad',
};

export const patronGroupUuids = {
  STAFF: '3684a786-6671-4268-8ed0-9db82ebca60b',
  FACULTY: '503a81cd-6c26-400f-b620-14c08943697c',
  UNDERGRAD: 'bdc2b6d4-5ceb-4a12-ab46-249b9a68473e',
};

export const electronicAccessRelationshipId = {
  RESOURCE: 'f5d0068e-6272-458e-8a81-b85e7b9a14aa',
};

export const ELECTRONIC_ACCESS_RELATIONSHIP_NAME = {
  RESOURCE: 'Resource',
  VERSION_OF_RESOURCE: 'Version of resource',
  NO_INFORMATION_PROVIDED: 'No information provided',
  RELATED_RESOURCE: 'Related resource',
  NO_DISPLAY_CONSTANT_GENERATED: 'No display constant generated',
  COMPONENT_PART_OF_RESOURCE: 'Component part(s) of resource',
  VERSION_OF_COMPONENT_PART_OF_RESOURCE: 'Version of component part(s) of resource',
};

export const AUTHORITY_FILE_TEXT_FIELD_NAMES = {
  NAME: 'Name',
  PREFIX: 'Prefix',
  HRID_STARTS_WITH: 'HRID starts with',
  BASE_URL: 'Base URL',
};

export const HOLDING_NOTES = {
  ACTION_NOTE: 'd6510242-5ec3-42ed-b593-3585d2e48fd6',
  ELECTRONIC_BOOKPLATE_NOTE: '88914775-f677-4759-b57b-1a33b90b24e0',
  BINDING_NOTE: 'e19eabab-a85c-4aef-a7b2-33bd9acef24e',
  PROVENANCE_NOTE: 'db9b4787-95f0-4e78-becf-26748ce6bdeb',
};

export const ITEM_NOTES = {
  ACTION_NOTE: '0e40884c-3523-4c6d-8187-d578e3d2794e',
  BINDING_NOTE: '87c450be-2033-41fb-80ba-dd2409883681',
  NOTE_NOTE: '8d0a5eca-25de-4391-81a9-236eeefdd20b',
  COPY_NOTE: '1dde7141-ec8a-4dae-9825-49ce14c728e7',
  ELECTRONIC_BOOKPLATE_NOTE: 'f3ae3823-d096-4c65-8734-0c1efd2ffea8',
};

export const INSTANCE_NOTE_IDS = {
  ACTION_NOTE: '1c017b8d-c783-4f63-b620-079f7a5b9c07',
  REPRODUCTION_NOTE: 'd548fdff-b71c-4359-8055-f1c008c30f01',
  DISSERTATION_NOTE: 'b73cc9c2-c9fa-49aa-964f-5ae1aa754ecd',
};

export const INSTANCE_STATUS_TERM_IDS = {
  CATALOGED: '9634a5ab-9228-4703-baf2-4d12ebc77d56',
};

export const INSTANCE_RESOURCE_TYPE_IDS = {
  TEXT: '6312d172-f0cf-40f6-b27d-9fa8feaf332f',
};

export const LOAN_TYPE_IDS = {
  SELECTED: 'a1dc1ce3-d56f-4d8a-b498-d5d674ccc845',
};

export const MATERIAL_TYPE_IDS = {
  DVD: '5ee11d91-f7e8-481d-b079-65d708582ccc',
};

export const EHOLDINGS_PACKAGE_HEADERS = [
  'Provider Level Token',
  'Provider Name',
  'Provider Id',
  'Package Level Token',
  'Package Name',
  'Package Id',
  'Package Type',
  'Package Content Type',
  'Package Holdings Status',
  'Package Custom Coverage',
  'Package Show To Patrons',
  'Package Automatically Select',
  'Package Proxy',
  'Package Access Status Type',
  'Package Tags',
  'Package Agreements',
  'Package Note',
];

export const EHOLDINGS_TITLE_HEADERS = [
  'Title Name',
  'Alternate Titles',
  'Title Id',
  'Publication Type',
  'Title Type',
  'Title Holdings Status',
  'Title Show To Patrons',
  'Managed Coverage',
  'Managed Embargo',
  'Custom Coverage',
  'Custom Embargo',
  'Coverage Statement',
  'Title Proxy',
  'Url',
  'Title Access Status Type',
  'Title Tags',
  'Contributors',
  'Edition',
  'Publisher',
  'ISSN Print',
  'ISSN Online',
  'ISBN Print',
  'ISBN Online',
  'Subjects',
  'Peer Reviewed',
  'Description',
  'Custom Value 1',
  'Custom Value 2',
  'Custom Value 3',
  'Custom Value 4',
  'Custom Value 5',
  'Title Agreements',
  'Title Note',
];

export const EHOLDINGS_EXPORT_FIELDS = {
  PACKAGE: [
    'Access Status Type',
    'Agreements',
    'Automatically Select titles',
    'Custom Coverage',
    'Holdings status',
    'Notes',
    'Package Content Type',
    'Package Id',
    'Package Level Token',
    'Package Name',
    'Package Type',
    'Provider Id',
    'Provider Level Token',
    'Provider Name',
    'Proxy',
    'Show To Patrons',
    'Tags',
  ],
  TITLE: [
    'Access status type',
    'Agreements',
    'Alternate title(s)',
    'Contributors',
    'Coverage statement',
    'Custom coverage dates',
    'Custom Embargo',
    'Custom label',
    'Description',
    'Edition',
    'Holdings Status',
    'ISBN_Online',
    'ISBN_Print',
    'ISSN_Online',
    'ISSN_Print',
    'Managed coverage dates',
    'Managed Embargo',
    'Notes',
    'Peer reviewed',
    'Proxy',
    'Publication Type',
    'Publisher',
    'Show to patron',
    'Subjects',
    'Tags',
    'Title ID',
    'Title name',
    'Title Type',
    'URL',
  ],
};

export const CLASSIFICATION_IDENTIFIER_TYPES = {
  ADDITIONAL_DEWEY: '74c08086-81a4-4466-93d8-d117ce8646db',
  CANADIAN_CLASSIFICATION: 'ad615f6e-e28c-4343-b4a0-457397c5be3e',
  DEWEY: '42471af9-7d25-4f3a-bf78-60d29dcf463b',
  GDC: 'fb12264c-ff3b-47e0-8e09-b0aa074361f1',
  LC: 'ce176ace-a53e-4b4d-aa89-725ed7b2edac',
  LC_LOCAL: 'a83699eb-cc23-4307-8043-5a38a8dce335',
  NATIONAL_AGRICULTURAL_LIBRARY: '9a60012a-0fcf-4da9-a1d1-148e818c27ad',
  NLM: 'a7f4d03f-b0d8-496c-aebf-4e9cdb678200',
  SUDOC: '9075b5f8-7d97-49e1-a431-73fdd468d476',
  UDC: 'e8662436-75a8-4984-bebc-531e38c774a0',
};

export const DEFAULT_LOCALE_STRING = '{"locale":"en-US","timezone":"UTC","currency":"USD"}';
export const DEFAULT_LOCALE_OBJECT = { locale: 'en-US', timezone: 'UTC', currency: 'USD' };

export const BULK_EDIT_TABLE_COLUMN_HEADERS = {
  INVENTORY_HOLDINGS: {
    ACQUISITION_METHOD: 'Acquisition method',
    HOLDINGS_UUID: 'Holdings UUID',
    INSTANCE: 'Instance (Title, Publisher, Publication date)',
    HOLDINGS_HRID: 'Holdings HRID',
    HOLDINGS_TYPE: 'Holdings type',
    ADMINISTRATIVE_NOTE: 'Administrative note',
    ELECTRONIC_BOOKPLATE_NOTE: 'Electronic bookplate note',
    ELECTRONIC_ACCESS: 'Electronic access',
    NOTE: 'Note',
    BINDING_NOTE: 'Binding note',
    ACTION_NOTE: 'Action note',
    COPY_NOTE: 'Copy note',
    REPRODUCTION: 'Reproduction note',
    HOLDINGS_PERMANENT_LOCATION: 'Holdings permanent location',
    PROVENANCE_NOTE: 'Provenance note',
    HOLDINGS_TEMPORARY_LOCATION: 'Holdings temporary location',
    SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
    SOURCE: 'Source',
    STATISTICAL_CODES: 'Statistical codes',
    SHELVING_TITLE: 'Shelving title',
    FORMER_HOLDINGS_ID: 'Former holdings Id',
    HOLDINGS_COPY_NUMBER: 'Holdings copy number',
    HOLDINGS_LEVEL_CALL_NUMBER_TYPE: 'Holdings level call number type',
    HOLDINGS_LEVEL_CALL_NUMBER_PREFIX: 'Holdings level call number prefix',
    HOLDINGS_LEVEL_CALL_NUMBER_SUFFIX: 'Holdings level call number suffix',
    HOLDINGS_LEVEL_CALL_NUMBER: 'Holdings level call number',
    NUMBER_OF_ITEMS: 'Number of items',
    HOLDINGS_STATEMENT: 'Holdings statement',
    HOLDINGS_STATEMENT_FOR_SUPPLEMENTS: 'Holdings statement for supplements',
    HOLDINGS_STATEMENT_FOR_INDEXES: 'Holdings statement for indexes',
    ILL_POLICY: 'ILL policy',
    DIGITIZATION_POLICY: 'Digitization policy',
    RETENTION_POLICY: 'Retention policy',
    ORDER_FORMAT: 'Order format',
    RECEIPT_STATUS: 'Receipt status',
    TAGS: 'Tags',
    MEMBER: 'Member',
  },
  INVENTORY_INSTANCES: {
    INSTANCE_UUID: 'Instance UUID',
    INSTANCE_HRID: 'Instance HRID',
    SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
    STAFF_SUPPRESS: 'Staff suppress',
    SOURCE: 'Source',
    RESOURCE_TITLE: 'Resource title',
    PREVIOUSLY_HELD: 'Previously held',
    SET_FOR_DELETION: 'Set for deletion',
    CATALOGED_DATE: 'Cataloged date',
    INSTANCE_STATUS_TERM: 'Instance status term',
    MODE_OF_ISSUANCE: 'Mode of issuance',
    STATISTICAL_CODE: 'Statistical code',
    ADMINISTRATIVE_NOTE: 'Administrative note',
    INDEX_TITLE: 'Index title',
    SERIES_STATEMENT: 'Series statements',
    CONTRIBUTORS: 'Contributors',
    PUBLICATION: 'Publication',
    EDITION: 'Edition',
    PHYSICAL_DESCRIPTION: 'Physical description',
    RESOURCE_TYPE: 'Resource type',
    NATURE_OF_CONTENT: 'Nature of content',
    FORMATS: 'Formats',
    LANGUAGES: 'Languages',
    PUBLICATION_FREQUENCY: 'Publication frequency',
    PUBLICATION_RANGE: 'Publication range',
    ACCESSIBILITY_NOTE: 'Accessibility note',
    ACCUMULATION_FREQUENCY_USE_NOTE: 'Accumulation and Frequency of Use note',
    ACTION_NOTE: 'Action note',
    ADDITIONAL_PHYSICAL_FORM_AVAILABLE_NOTE: 'Additional Physical Form Available note',
    AWARDS_NOTE: 'Awards note',
    BIBLIOGRAPHY_NOTE: 'Bibliography note',
    BINDING_INFORMATION_NOTE: 'Binding Information note',
    BIOGRAPHICAL_HISTORICAL_DATA: 'Biographical or Historical Data',
    CARTOGRAPHIC_MATHEMATICAL_DATA: 'Cartographic Mathematical Data',
    CASE_FILE_CHARACTERISTICS_NOTE: 'Case File Characteristics note',
    CITATION_REFERENCES_NOTE: 'Citation / References note',
    COPY_VERSION_IDENTIFICATION_NOTE: 'Copy and Version Identification note',
    CREATION_PRODUCTION_CREDITS_NOTE: 'Creation / Production Credits note',
    CUMULATIVE_INDEX_FINDING_AIDS_NOTES: 'Cumulative Index / Finding Aids notes',
    DATA_QUALITY_NOTE: 'Data quality note',
    DATE_TIME_PLACE_EVENT_NOTE: 'Date / time and place of an event note',
    DISSERTATION_NOTE: 'Dissertation note',
    ENTITY_ATTRIBUTE_INFORMATION_NOTE: 'Entity and Attribute Information note',
    EXHIBITIONS_NOTE: 'Exhibitions note',
    FORMATTED_CONTENTS_NOTE: 'Formatted Contents Note',
    FORMER_TITLE_COMPLEXITY_NOTE: 'Former Title Complexity note',
    FUNDING_INFORMATION_NOTE: 'Funding Information Note',
    GENERAL_NOTE: 'General note',
    GEOGRAPHIC_COVERAGE_NOTE: 'Geographic Coverage note',
    IMMEDIATE_SOURCE_ACQUISITION_NOTE: 'Immediate Source of Acquisition note',
    INFORMATION_ABOUT_DOCUMENTATION_NOTE: 'Information About Documentation note',
    INFORMATION_RELATED_COPYRIGHT_STATUS: 'Information related to Copyright Status',
    ISSUING_BODY_NOTE: 'Issuing Body note',
    LANGUAGE_NOTE: 'Language note',
    LINKING_ENTRY_COMPLEXITY_NOTE: 'Linking Entry Complexity note',
    LOCAL_NOTES: 'Local notes',
    LOCATION_ORIGINALS_DUPLICATES_NOTE: 'Location of Originals / Duplicates note',
    LOCATION_OTHER_ARCHIVAL_MATERIALS_NOTE: 'Location of Other Archival Materials note',
    METHODOLOGY_NOTE: 'Methodology note',
    NUMBERING_PECULIARITIES_NOTE: 'Numbering peculiarities note',
    ORIGINAL_VERSION_NOTE: 'Original Version note',
    OWNERSHIP_CUSTODIAL_HISTORY_NOTE: 'Ownership and Custodial History note',
    PARTICIPANT_PERFORMER_NOTE: 'Participant or Performer note',
    PREFERRED_CITATION_DESCRIBED_MATERIALS_NOTE: 'Preferred Citation of Described Materials note',
    PUBLICATIONS_ABOUT_DESCRIBED_MATERIALS_NOTE: 'Publications About Described Materials note',
    REPRODUCTION_NOTE: 'Reproduction note',
    RESTRICTIONS_ACCESS_NOTE: 'Restrictions on Access note',
    SCALE_NOTE_GRAPHIC_MATERIAL: 'Scale note for graphic material',
    SOURCE_DESCRIPTION_NOTE: 'Source of Description note',
    STUDY_PROGRAM_INFORMATION_NOTE: 'Study Program Information note',
    SUMMARY: 'Summary',
    SUPPLEMENT_NOTE: 'Supplement note',
    SYSTEM_DETAILS_NOTE: 'System Details note',
    TARGET_AUDIENCE_NOTE: 'Target Audience note',
    TERMS_GOVERNING_USE_REPRODUCTION_NOTE: 'Terms Governing Use and Reproduction note',
    TYPE_COMPUTER_FILE_DATA_NOTE: 'Type of computer file or data note',
    TYPE_REPORT_PERIOD_COVERED_NOTE: 'Type of report and period covered note',
    WITH_NOTE: 'With note',
    ELECTRONIC_ACCESS: 'Electronic access',
    SUBJECT: 'Subject',
    CLASSIFICATION: 'Classification',
  },
  INVENTORY_ITEMS: {
    ITEM_UUID: 'Item UUID',
    INSTANCE: 'Instance (Title, Publisher, Publication date)',
    HOLDINGS: 'Holdings (Location, Call number)',
    ITEM_EFFECTIVE_LOCATION: 'Item effective location',
    EFFECTIVE_CALL_NUMBER: 'Effective call number',
    SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
    ITEM_HRID: 'Item HRID',
    BARCODE: 'Barcode',
    ACCESSION_NUMBER: 'Accession number',
    ITEM_IDENTIFIER: 'Item identifier',
    FORMER_IDENTIFIER: 'Former identifier',
    STATISTICAL_CODES: 'Statistical codes',
    ADMINISTRATIVE_NOTE: 'Administrative note',
    MATERIAL_TYPE: 'Material type',
    COPY_NUMBER: 'Copy number',
    SHELVING_ORDER: 'Shelving order',
    ITEM_LEVEL_CALL_NUMBER_TYPE: 'Item level call number type',
    ITEM_LEVEL_CALL_NUMBER_PREFIX: 'Item level call number prefix',
    ITEM_LEVEL_CALL_NUMBER: 'Item level call number',
    ITEM_LEVEL_CALL_NUMBER_SUFFIX: 'Item level call number suffix',
    NUMBER_OF_PIECES: 'Number of pieces',
    DESCRIPTION_OF_PIECES: 'Description of pieces',
    ENUMERATION: 'Enumeration',
    CHRONOLOGY: 'Chronology',
    VOLUME: 'Volume',
    YEAR_CAPTION: 'Year, caption',
    NUMBER_OF_MISSING_PIECES: 'Number of missing pieces',
    MISSING_PIECES: 'Missing pieces',
    MISSING_PIECES_DATE: 'Missing pieces date',
    ITEM_DAMAGED_STATUS: 'Item damaged status',
    ITEM_DAMAGED_STATUS_DATE: 'Item damaged status date',
    ACTION_NOTE: 'Action note',
    BINDING_NOTE: 'Binding note',
    COPY_NOTE: 'Copy note',
    ELECTRONIC_BOOKPLATE_NOTE: 'Electronic bookplate note',
    NOTE: 'Note',
    PROVENANCE_NOTE: 'Provenance note',
    REPRODUCTION_NOTE: 'Reproduction note',
    PERMANENT_LOAN_TYPE: 'Permanent loan type',
    TEMPORARY_LOAN_TYPE: 'Temporary loan type',
    STATUS: 'Status',
    CHECK_IN_NOTE: 'Check in note',
    CHECK_OUT_NOTE: 'Check out note',
    ITEM_PERMANENT_LOCATION: 'Item permanent location',
    ITEM_TEMPORARY_LOCATION: 'Item temporary location',
    ELECTRONIC_ACCESS: 'Electronic access',
    IS_BOUND_WITH: 'Is bound with',
    BOUND_WITH_TITLES: 'Bound with titles',
    TAGS: 'Tags',
    HOLDINGS_UUID: 'Holdings UUID',
    MEMBER: 'Member',
  },
  USERS: {
    USERNAME: 'Username',
    USER_ID: 'User id',
    EXTERNAL_SYSTEM_ID: 'External System ID',
    BARCODE: 'Barcode',
    ACTIVE: 'Active',
    TYPE: 'Type',
    PATRON_GROUP: 'Patron group',
    DEPARTMENTS: 'Departments',
    PROXY_FOR: 'Proxy for',
    LAST_NAME: 'Last name',
    FIRST_NAME: 'First name',
    MIDDLE_NAME: 'Middle name',
    PREFFERED_FIRST_NAME: 'Preferred first name',
    EMAIL: 'Email',
    PHONE: 'Phone',
    MOBILE_PHONE: 'Mobile phone',
    BIRTH_DATE: 'Birth date',
    ADDRESSES: 'Addresses',
    PREFFERED_CONTACT_TYPE_ID: 'Preferred contact type id',
    LINK_TO_THE_PROFILE_PICTURE: 'Link to the profile picture',
    DATE_ENROLLED: 'Date enrolled',
    EXPIRATION_DATE: 'Expiration date',
    TAGS: 'Tags',
    CUSTOM_FIELDS: 'Custom fields',
    PREFFERED_EMAIL_COMMUNICATIONS: 'Preferred email communications',
  },
};

export const HOLDING_NOTE_TYPES = {
  ACTION_NOTE: 'Action note',
  ADMINISTRATIVE_NOTE: 'Administrative note',
  COPY_NOTE: 'Copy note',
  ELECTRONIC_BOOKPLATE: 'Electronic bookplate',
  REPRODUCTION: 'Reproduction',
  NOTE: 'Note',
  BINDING: 'Binding',
  PROVENANCE: 'Provenance',
};

export const ITEM_NOTE_TYPES = {
  ACTION_NOTE: 'Action note',
  ADMINISTRATIVE_NOTE: 'Administrative note',
  BINDING: 'Binding',
  CHECK_IN_NOTE: 'Check in note',
  CHECK_OUT_NOTE: 'Check out note',
  COPY_NOTE: 'Copy note',
  ELECTRONIC_BOOKPLATE: 'Electronic bookplate',
  PROVENANCE: 'Provenance',
  REPRODUCTION: 'Reproduction',
  NOTE: 'Note',
};

export const INSTANCE_NOTE_TYPES = {
  ACTION_NOTE: 'Action note',
  ADMINISTRATIVE_NOTE: 'Administrative note',
  AWARDS_NOTE: 'Awards note',
  BIBLIOGRAPHY_NOTE: 'Bibliography note',
  COPY_AND_VERSION_IDENTIFICATION_NOTE: 'Copy and Version Identification note',
  DATA_QUALITY_NOTE: 'Data quality note',
  REPRODUCTION_NOTE: 'Reproduction note',
  LOCAL_NOTES: 'Local notes',
  WITH_NOTE: 'With note',
};

export const BULK_EDIT_ACTIONS = {
  ADD: 'Add',
  ADD_NOTE: 'Add note',
  ADDITIONAL_SUBFIELD: 'Additional subfield',
  APPEND: 'Append',
  CLEAR_FIELD: 'Clear field',
  CHANGE_NOTE_TYPE: 'Change note type',
  DUPLICATE_TO: 'Duplicate to',
  FIND: 'Find',
  FIND_FULL_FIELD_SEARCH: 'Find (full field search)',
  REPLACE_WITH: 'Replace with',
  REMOVE: 'Remove',
  REMOVE_ALL: 'Remove all',
  REMOVE_MARK_AS_STAFF_ONLY: 'Remove mark as staff only',
  REMOVE_FIELD: 'Remove field',
  REMOVE_SUBFIELD: 'Remove subfield',
  SET_TRUE: 'Set true',
  SET_FALSE: 'Set false',
  MARK_AS_STAFF_ONLY: 'Mark as staff only',
};

export const AUTHORITY_FILE_SOURCES = {
  LOCAL: 'Local',
  FOLIO: 'FOLIO',
};

export const CAPABILITY_TYPES = {
  DATA: 'Data',
  SETTINGS: 'Settings',
  PROCEDURAL: 'Procedural',
};

export const CAPABILITY_ACTIONS = {
  VIEW: 'View',
  CREATE: 'Create',
  EDIT: 'Edit',
  DELETE: 'Delete',
  EXECUTE: 'Execute',
  MANAGE: 'Manage',
};

export const INVENTORY_DEFAULT_SORT_OPTIONS = {
  TITLE: 'Title',
  CONTRIBUTORS: 'Contributors',
  DATE: 'Date',
  RELEVANCE: 'Relevance',
};
export const STAFF_SLIP_NAMES = {
  DUE_DATE_RECEIPT: 'Due date receipt',
  HOLD: 'Hold',
  PICK_SLIP: 'Pick slip',
  REQUEST_DELIVERY: 'Request delivery',
  SEARCH_SLIP_HOLD_REQUESTS: 'Search slip (Hold requests)',
  TRANSIT: 'Transit',
};

export const INSTANCE_DATE_TYPES = {
  NO: 'No attempt to code',
  BC: 'No dates given; B.C. date involved',
  CONTINUING_PUBLISHED: 'Continuing resource currently published',
  CONTINUING_CEASED: 'Continuing resource ceased publication',
  DETAILED: 'Detailed date',
  INCLUSIVE: 'Inclusive dates of collection',
  RANGE: 'Range of years of bulk of collection',
  MULTIPLE: 'Multiple dates',
  UNKNOWN: 'Dates unknown',
  DISTRIBUTION:
    'Date of distribution/release/issue and production/recording session when different',
  QUESTIONABLE: 'Questionable date',
  REPRINT: 'Reprint/reissue date and original date',
  SINGLE: 'Single known date/probable date',
  PUBLICATION: 'Publication date and copyright date',
  CONTINUING_UNKNOWN: 'Continuing resource status unknown',
};

export const AUTHORIZATION_ROLES_COLUMNS = {
  NAME: 'Name',
  DESCRIPTION: 'Description',
  UPDATED: 'Updated',
  UPDATED_BY: 'Updated by',
};

export const AUTHORIZATION_ROLES_COLUMNS_CM = {
  NAME: 'Name',
  DESCRIPTION: 'Description',
  TYPE: 'Type',
  UPDATED: 'Updated',
  UPDATED_BY: 'Updated by',
};

export const AUTHORIZATION_POLICIES_COLUMNS = {
  NAME: 'Name',
  DESCRIPTION: 'Description',
  UPDATED: 'Updated',
  UPDATED_BY: 'Updated by',
};

export const LDE_ADVANCED_SEARCH_OPTIONS = {
  CONTAINS_ALL: 'Contains all',
  STARTS_WITH: 'Starts with',
  EXACT_PHRASE: 'Exact phrase',
};

export const LDE_SEARCH_OPTIONS = {
  LCCN: 'LCCN',
  TITLE: 'title',
  CONTRIBUTOR: 'Contributor',
  ISBN: 'ISBN',
};

export const LDE_ADVANCED_SEARCH_CONDITIONS = {
  AND: 'AND',
  NOT: 'NOT',
  OR: 'OR',
};

export const AUTHORIZATION_ROLE_TYPES = {
  REGULAR: 'Regular',
  CONSORTIUM: 'Consortium',
  DEFAULT: 'Default',
};

export const ADVANCED_SEARCH_MODIFIERS = {
  CONTAINS_ALL: 'Contains all',
  STARTS_WITH: 'Starts with',
  EXACT_PHRASE: 'Exact phrase',
  CONTAINS_ANY: 'Contains any',
};

export const BULK_EDIT_FORMS = {
  PREVIEW_OF_RECORDS_MATCHED: 'Preview of records matched',
  ARE_YOU_SURE: 'Are you sure',
  PREVIEW_OF_RECORDS_CHANGED: 'Preview of records changed',
};

export const INVENTORY_006_FIELD_DROPDOWNS_BOXES_NAMES = {
  TYPE: 'Type',
  COMP: 'Comp',
  AUDN: 'Audn',
  FORM: 'Form',
  FILE: 'File',
  GPUB: 'GPub',
  PROJ: 'Proj',
};

export const INVENTORY_007_FIELD_DROPDOWNS_BOXES_NAMES = {
  TYPE: 'Type',
  SMD: 'SMD',
  COLOR: 'Color',
  MPPF: 'MPPF',
  SOMOS: 'SoMoS',
  MFS: 'MfS',
  DIMENTIONS: 'Dimensions',
  CoPC: 'CoPC',
  PRODEL: 'ProdEl',
  PNASPECT: 'P/N aspect',
  GENERATION: 'Generation',
  BOF: 'BoF',
  RCOC: 'RCoC',
  KOCSOP: 'KoCSop',
  DETST: 'DetSt',
  COMPL: 'Compl',
  FID: 'FID',
  IBD: 'IBD',
  COBRWR: 'CoBrWr',
  BMF: 'BMF',
  RRRRR: 'RRR/RR',
  DATATYPE: 'Data type',
};

export const INVENTORY_006_FIELD_TYPE_DROPDOWN = {
  A: 'a - Language material',
  C: 'c - Notated music',
  D: 'd - Manuscript notated music',
  E: 'e - Cartographic material',
  F: 'f - Manuscript cartographic material',
  G: 'g - Projected medium',
  I: 'i - Nonmusical sound recording',
  J: 'j - Musical sound recording',
  K: 'k - Two-dimensional nonprojectable  graphic',
  M: 'm - Computer file',
  O: 'o - Kit',
  P: 'p - Mixed materials',
  R: 'r - Three-dimensional artifact or naturally occurring object',
  S: 's - Serial/Integrating resource',
  T: 't - Manuscript language material',
};

export const INVENTORY_007_FIELD_TYPE_DROPDOWN = {
  A: 'a - Map',
  C: 'c - Electronic resource',
  D: 'd - Globe',
  F: 'f - Tactile material',
  G: 'g - Projected graphic',
  H: 'h - Microform',
  K: 'k - Nonprojected graphic',
  M: 'm - Motion picture',
  O: 'o - Kit',
  Q: 'q - Notated music',
  R: 'r - Remote-sensing image',
  S: 's - Sound recording',
  T: 't - Text',
  V: 'v - Videorecording',
  Z: 'z - Unspecified',
};

export const STANDARD_FIELDS = [
  '010',
  '100',
  '110',
  '130',
  '148',
  '150',
  '151',
  '155',
  '260',
  '336',
  '370',
  '377',
  '400',
  '410',
  '411',
  '430',
  '448',
  '450',
  '451',
  '455',
  '500',
  '510',
  '511',
  '530',
  '548',
  '550',
  '551',
  '555',
  '580',
  '581',
  '582',
  '585',
  '586',
  '600',
  '610',
  '611',
  '630',
  '648',
  '650',
  '651',
  '653',
  '654',
  '655',
  '656',
  '657',
  '658',
  '662',
  '667',
  '670',
  '675',
  '678',
  '680',
  '681',
  '682',
  '683',
  '684',
  '688',
  '700',
  '710',
  '711',
  '730',
  '748',
  '750',
  '751',
  '755',
  '780',
  '785',
  '786',
  '787',
  '788',
  '800',
  '810',
  '811',
  '830',
  '848',
  '850',
  '851',
  '855',
  '856',
  '880',
  '881',
  '883',
  '884',
  '885',
  '886',
  '887',
  '888',
  '890',
  '898',
  '899',
];

export const SYSTEM_FIELDS = ['000', '001', '005', '008', '999'];

export const DEFAULT_WAIT_TIME = 4000;

export const API_PATH = {
  INVOICE_STORAGE_SETTINGS: 'invoice-storage/settings',
  ORDERS_STORAGE_SETTINGS: 'orders-storage/settings',
};

export const INVENTORY_COLUMN_HEADERS = {
  TITLE: 'Title',
  CONTRIBUTORS: 'Contributors',
  PUBLISHERS: 'Publishers',
  DATE: 'Date',
  RELATION: 'Relation',
  INSTANCE_HRID: 'Instance HRID',
};

export const AUTHORITY_APP_CONTEXT_DROPDOWN_OPTIONS = {
  SEARCH: 'MARC authority app Search',
  SHORTCUTS: 'Keyboard shortcuts',
  DOCUMENTATION: 'MARC authority documentation',
};

export const INVENTORY_APP_CONTEXT_DROPDOWN_OPTIONS = {
  SEARCH: 'Inventory app search',
  SHORTCUTS: 'Keyboard shortcuts',
};

export const EHOLDINGS_APP_CONTEXT_DROPDOWN_OPTIONS = {
  SEARCH: 'eholdings app Search',
  SHORTCUTS: 'Keyboard shortcuts',
  INQUIRY: 'Submit a KB Content Inquiry',
  STATUS: 'EBSCO System status',
};

export const EHOLDINGS_KB_SETTINGS_TABS = {
  ROOT_PROXY: 'Root proxy',
  CUSTOM_LABELS: 'Custom labels',
  ACCESS_STATUS_TYPES: 'Access status types',
  ASSIGNED_USERS: 'Assigned users',
  USAGE_CONSOLIDATION: 'Usage consolidation',
};

export const CONSORTIA_SYSTEM_USER = 'System, System user - mod-consortia-keycloak';
