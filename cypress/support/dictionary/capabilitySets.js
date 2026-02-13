import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../constants';

export default {
  // Settings capability sets
  uiAuthorizationRolesSettingsAdmin: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings Admin',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiAuthorizationRolesSettingsView: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiAuthorizationRolesSettingsEdit: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiAuthorizationRolesSettingsCreate: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  uiAuthorizationRolesSettingsDelete: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  uiAuthorizationRolesUsersSettingsView: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiAuthorizationRolesUsersSettingsManage: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiAuthorizationPoliciesSettingsAdmin: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Policies Settings Admin',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiDataExportSettingsView: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Export Settings',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiDataExportSettingsEdit: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Export Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiInventorySettingsHoldingsSourcesView: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Holdings-Sources',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiInventorySettingsSubjectSourcesView: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Inventory Settings Subject-Sources',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiDataImportSettingsManage: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Data-Import Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },

  // Data capability sets
  capabilities: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Capabilities',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  roleCapabilitySets: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Role-Capability-Sets',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiUsersRolesView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiUsersRolesManage: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiUsersView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiUsersEdit: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiUsersCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  rolesUsers: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Roles Users',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  policies: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Policies',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  users: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Users',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  userCapabilities: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'User-Capabilities',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiConsortiaSettingsConsortiumManagerView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Consortia-Settings Consortium-Manager',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiConsortiaSettingsConsortiumManagerEdit: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Consortia-Settings Consortium-Manager',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiCheckout: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Checkout',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiCheckin: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Checkin',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiCourses: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Courses',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  consortiaSharingRolesAllItemCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Consortia Sharing-Roles-All Item',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  consortiaSharingRolesAllItemDelete: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Consortia Sharing-Roles-All Item',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  uiOrganizationsView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Organizations',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiInventoryInstanceEdit: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiInventoryInstanceView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiInventoryInstanceStaffSuppressedRecordsView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Instance Staff-Suppressed-Records',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiDataExportEdit: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Data-Export',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiDataExportView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Data-Export',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiInventoryHoldingsCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  uiInventory: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiInventoryItemCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Item',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiDataImport: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Data-Import',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiConsortiaDataImportCentralRecordUpdate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Consortia Data-Import Central-Record-Update',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiConsortiaInventoryUpdateOwnershipItem: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Consortia Inventory Update-Ownership Item',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  uiMarcAuthoritiesAuthorityRecordView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marc-Authorities Authority-Record',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiMarcAuthoritiesAuthorityRecordEdit: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Marc-Authorities Authority-Record',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  uiQuickMarcQuickMarcEditor: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Quick-Marc Quick-Marc-Editor',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiBulkEditLogsView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Logs',
    action: CAPABILITY_ACTIONS.VIEW,
  },

  // Procedural capability sets
  uiUsersResetPassword: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Users Reset Password',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiConsortiaSettingsConsortiumManagerShare: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Consortia-Settings Consortium-Manager Share',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiConsortiaInventoryLocalSharingInstances: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Consortia Inventory Local Sharing-Instances',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiInventoryInstanceSetRecordsForDeletion: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Inventory Instance Set-Records-For-Deletion',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiBulkEditQueryExecute: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Bulk-Edit Query',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiQuickMarcEditorDuplicate: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Quick-Marc Quick-Marc-Editor Derive',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
};
