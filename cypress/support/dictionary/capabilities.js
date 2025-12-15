import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../constants';

export default {
  // Settings capabilities
  settingsEnabled: {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'Settings Enabled',
    action: CAPABILITY_ACTIONS.VIEW,
  },

  // Data capabilities
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
  usersKeycloakAuthUsersItem: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Users-Keycloak Auth-Users Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  usersKeycloakAuthUsersItemCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Users-Keycloak Auth-Users Item',
    action: CAPABILITY_ACTIONS.CREATE,
  },
  consortiaUserTenantsCollection: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Consortia User-Tenants Collection',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  userCapabilities: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'User-Capabilities',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  usersBlUsersByUsernameItem: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Users-Bl Users-By-Username Item',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  circulationRulesView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Circulation Rules',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  capabilitiesManage: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'Capabilities',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  uiBulkEditLogsView: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Logs',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  uiInventoryHoldingsCreate: {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory-Holdings',
    action: CAPABILITY_ACTIONS.CREATE,
  },

  // Procedural capabilities
  uiUsersResetPassword: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Users Reset Password',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  usersKeycloakPasswordResetLinkGenerate: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'Users-keycloak Password-Reset-Link Generate',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
  uiBulkEditQueryExecute: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Bulk Edit-Query',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
};
