import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import users from '../../../support/fragments/users/users';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';

let user;
const capabSetsToAssign = [
  { type: 'Settings', resource: 'UI-Authorization-Roles Settings', action: 'Create' },
];
const capabsToAssign = [
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'Settings Enabled',
    action: CAPABILITY_ACTIONS.VIEW,
  },
];

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test users', () => {
      cy.createTempUser([]).then((createdUserProperties) => {
        user = createdUserProperties;
        cy.assignCapabilitiesToExistingUser(user.userId, capabsToAssign, capabSetsToAssign);
        if (Cypress.env('runAsAdmin')) cy.updateRolesForUserApi(user.userId, []);
        cy.login(user.username, user.password, {
          path: TopMenu.settingsAuthorizationRoles,
          waiter: AuthorizationRoles.waitContentLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      users.deleteViaApi(user.userId);
    });

    it(
      'C350765 Verify BULK EDIT capability set list (firebird)',
      { tags: ['smoke', 'firebird', 'C350765'] },
      () => {
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.clickNewButton();
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal();
        AuthorizationRoles.clickSaveInModal();
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled({
          table: 'Data',
          resource: 'UI-Bulk-Edit Users Csv',
          action: CAPABILITY_ACTIONS.VIEW,
        });
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled({
          table: 'Data',
          resource: 'UI-Bulk-Edit Users Csv',
          action: CAPABILITY_ACTIONS.EDIT,
        });
        AuthorizationRoles.verifyCapabilityCheckboxAbsent({
          table: 'Data',
          resource: 'UI-Bulk-Edit Users Csv',
          action: CAPABILITY_ACTIONS.DELETE,
        });
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled({
          table: 'Data',
          resource: 'UI-Bulk-Edit Inventory',
          action: CAPABILITY_ACTIONS.VIEW,
        });
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled({
          table: 'Data',
          resource: 'UI-Bulk-Edit Inventory',
          action: CAPABILITY_ACTIONS.EDIT,
        });
        AuthorizationRoles.verifyCapabilityCheckboxAbsent({
          table: 'Data',
          resource: 'UI-Bulk-Edit Inventory',
          action: CAPABILITY_ACTIONS.DELETE,
        });
        AuthorizationRoles.verifyCapabilitySetCheckboxEnabled({
          table: 'Data',
          resource: 'UI-Bulk-Edit Users',
          action: CAPABILITY_ACTIONS.EDIT,
        });
      },
    );
  });
});
