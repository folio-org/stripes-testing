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

  // Procedural capability sets
  uiUsersResetPassword: {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Users Reset Password',
    action: CAPABILITY_ACTIONS.EXECUTE,
  },
};
