// Names of the accordions (filters and facets) of the "Search & filter" pane of the Inventory app.
// A separate object for each tab; the ECS variants add the accordions which only exist in the
// consortia tenants: "Held by" - in Central and Member, "Shared" - in Member only
// Only the names confirmed by the existing specs are listed - extend the objects when needed

// Search > Instance
export const INVENTORY_SEARCH_INSTANCE_FILTERS = {
  EFFECTIVE_LOCATION_ITEM: 'Effective location (item)',
  LANGUAGE: 'Language',
  RESOURCE_TYPE: 'Resource type',
  FORMAT: 'Format',
  MODE_OF_ISSUANCE: 'Mode of issuance',
  NATURE_OF_CONTENT: 'Nature of content',
  STAFF_SUPPRESS: 'Staff suppress',
  SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
  STATISTICAL_CODE: 'Statistical code',
  DATE_RANGE: 'Date range',
  DATE_CREATED: 'Date created',
  DATE_UPDATED: 'Date updated',
  INSTANCE_STATUS: 'Instance status',
  SOURCE: 'Source',
  TAGS: 'Tags',
};

// Search > Holdings
export const INVENTORY_SEARCH_HOLDINGS_FILTERS = {
  EFFECTIVE_LOCATION_ITEM: 'Effective location (item)',
  HOLDINGS_PERMANENT_LOCATION: 'Holdings permanent location',
  HOLDINGS_TYPE: 'Holdings type',
  SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
  STATISTICAL_CODE: 'Statistical code',
  DATE_CREATED: 'Date created',
  DATE_UPDATED: 'Date updated',
  SOURCE: 'Source',
  TAGS: 'Tags',
};

// Search > Item
export const INVENTORY_SEARCH_ITEM_FILTERS = {
  ITEM_STATUS: 'Item status',
  EFFECTIVE_LOCATION_ITEM: 'Effective location (item)',
  HOLDINGS_PERMANENT_LOCATION: 'Holdings permanent location',
  MATERIAL_TYPE: 'Material type',
  SUPPRESS_FROM_DISCOVERY: 'Suppress from discovery',
  STATISTICAL_CODE: 'Statistical code',
  DATE_CREATED: 'Date created',
  DATE_UPDATED: 'Date updated',
  TAGS: 'Tags',
};

// Browse > Call numbers (all the call number options)
export const INVENTORY_BROWSE_CALL_NUMBERS_FILTERS = {
  EFFECTIVE_LOCATION_ITEM: 'Effective location (item)',
};

// Browse > Subjects
export const INVENTORY_BROWSE_SUBJECTS_FILTERS = {
  SUBJECT_SOURCE: 'Subject source',
  SUBJECT_TYPE: 'Subject type',
};

// Browse > Contributors
export const INVENTORY_BROWSE_CONTRIBUTORS_FILTERS = {
  NAME_TYPE: 'Name type',
};

const HELD_BY = { HELD_BY: 'Held by' };
const SHARED = { SHARED: 'Shared' };

// ECS, Central tenant: no "Shared" accordion
export const INVENTORY_SEARCH_INSTANCE_FILTERS_CENTRAL = {
  ...INVENTORY_SEARCH_INSTANCE_FILTERS,
  ...HELD_BY,
};
export const INVENTORY_SEARCH_HOLDINGS_FILTERS_CENTRAL = {
  ...INVENTORY_SEARCH_HOLDINGS_FILTERS,
  ...HELD_BY,
};
export const INVENTORY_SEARCH_ITEM_FILTERS_CENTRAL = {
  ...INVENTORY_SEARCH_ITEM_FILTERS,
  ...HELD_BY,
};
export const INVENTORY_BROWSE_CALL_NUMBERS_FILTERS_CENTRAL = {
  ...INVENTORY_BROWSE_CALL_NUMBERS_FILTERS,
  ...HELD_BY,
};
// "Held by" is absent on the Subjects and Contributors browse
export const INVENTORY_BROWSE_SUBJECTS_FILTERS_CENTRAL = { ...INVENTORY_BROWSE_SUBJECTS_FILTERS };
export const INVENTORY_BROWSE_CONTRIBUTORS_FILTERS_CENTRAL = {
  ...INVENTORY_BROWSE_CONTRIBUTORS_FILTERS,
};

// ECS, Member tenant
export const INVENTORY_SEARCH_INSTANCE_FILTERS_MEMBER = {
  ...INVENTORY_SEARCH_INSTANCE_FILTERS,
  ...SHARED,
  ...HELD_BY,
};
export const INVENTORY_SEARCH_HOLDINGS_FILTERS_MEMBER = {
  ...INVENTORY_SEARCH_HOLDINGS_FILTERS,
  ...SHARED,
  ...HELD_BY,
};
export const INVENTORY_SEARCH_ITEM_FILTERS_MEMBER = {
  ...INVENTORY_SEARCH_ITEM_FILTERS,
  ...SHARED,
  ...HELD_BY,
};
export const INVENTORY_BROWSE_CALL_NUMBERS_FILTERS_MEMBER = {
  ...INVENTORY_BROWSE_CALL_NUMBERS_FILTERS,
  ...SHARED,
  ...HELD_BY,
};
export const INVENTORY_BROWSE_SUBJECTS_FILTERS_MEMBER = {
  ...INVENTORY_BROWSE_SUBJECTS_FILTERS,
  ...SHARED,
};
export const INVENTORY_BROWSE_CONTRIBUTORS_FILTERS_MEMBER = {
  ...INVENTORY_BROWSE_CONTRIBUTORS_FILTERS,
  ...SHARED,
};
