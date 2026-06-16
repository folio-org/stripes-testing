import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../constants';

// Capabilities and capability sets extracted from "Cataloger" and "Cataloger - Marigold" roles.
// Used to assign permissions directly to users without relying on pre-existing roles.

const catalogerCapabilities = [
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Import Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  { type: CAPABILITY_TYPES.DATA, resource: 'UI-Inventory Item', action: CAPABILITY_ACTIONS.DELETE },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Inventory Item',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Alternative-Title-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Call-Number-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Classification-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Contributor-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Electronic-Access-Relationships',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Holdings-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Holdings-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Identifier-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Ill-Policies',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Formats',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Statuses',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Item-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings List',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Modes-Of-Issuance',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Nature-Of-Content-Terms',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Statistical-Codes',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Statistical-Code-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Quick-Marc Quick-Marc-Editor',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
];

const catalogerCapabilitySets = [
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Import Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  { type: CAPABILITY_TYPES.DATA, resource: 'UI-Inventory Item', action: CAPABILITY_ACTIONS.DELETE },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Inventory Item',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Alternative-Title-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Call-Number-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Classification-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Contributor-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Electronic-Access-Relationships',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Holdings-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Holdings-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Identifier-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Ill-Policies',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Formats',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Statuses',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Instance-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Item-Note-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings List',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Modes-Of-Issuance',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Nature-Of-Content-Terms',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Statistical-Codes',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Statistical-Code-Types',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Quick-Marc Quick-Marc-Editor',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
];

const marigoldCatalogerCapabilities = [
  // Data — Search & Browse
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Browse Authorities Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Inventory-Storage Authority-Source-Files Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Hub Preview',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Profiles Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Profiles Metadata',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Profiles Preferred',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Profiles Preferred',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Bib',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Bib',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Bib',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Bib Id',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Bib Marc',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Graph',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Preview',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Rdf',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Resources Support-Check',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Vocabularies Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marigold Cataloger',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Source-Storage Records Formatted Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Search Authorities Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Search Facets Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Search Linked-Data Hub Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Search Linked-Data Work Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  // Settings
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'Linked-Data Profiles Settings',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'Linked-Data Profiles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'Module Ld-Folio-Wrapper Enabled',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  // Procedural
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Authority-Assignment-Check',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Hub Import',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Import File',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Import Url',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Profiles Preferred',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Resources Bib',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Resources Import',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
];

const marigoldCatalogerCapabilitySets = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marigold Cataloger',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marc-Authorities Authority-Record',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marc-Authorities Authority-Record',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marc-Authorities Authority-Record',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Quick-Marc Quick-Marc-Authorities-Editor',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
];

// Capabilities from the "Marigold Administrator" role.
// Used in addition to Cataloger + Cataloger - Marigold capabilities.
const marigoldAdminCapabilities = [
  // Data
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Admin Caches',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data Batch Status',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data-Import Files Collection',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data-Import Jobs Failed-Lines Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data-Import Jobs Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Linked-Data-Import Jobs Item Stop',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  // Procedural
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Batch Graph Cleaning',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Batch Reindex Full',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data Batch Reindex Incremental',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Linked-Data-Import Start',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
];

// Combined: all capabilities from both "Cataloger" + "Cataloger - Marigold" roles
export const MARIGOLD_CAPABILITIES = [...catalogerCapabilities, ...marigoldCatalogerCapabilities];

// Combined: all capabilities from "Cataloger" + "Cataloger - Marigold" + "Marigold Administrator" roles
export const MARIGOLD_ADMIN_CAPABILITIES = [
  ...catalogerCapabilities,
  ...marigoldCatalogerCapabilities,
  ...marigoldAdminCapabilities,
];

export const MARIGOLD_CAPABILITY_SETS = [
  ...catalogerCapabilitySets,
  ...marigoldCatalogerCapabilitySets,
];
