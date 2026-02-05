import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const testData = {
  roleName: `Auto Role C376992 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Inventory Holdings',
    action: CAPABILITY_ACTIONS.DELETE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
];
const capabSetToSelect = {
  table: CAPABILITY_TYPES.PROCEDURAL,
  resource: 'UI-Bulk-Edit Query',
  action: CAPABILITY_ACTIONS.EXECUTE,
};
const capabSetToUnselect = [
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Users Settings',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
  {
    table: CAPABILITY_TYPES.DATA,
    resource: 'UI-Users Roles',
    action: CAPABILITY_ACTIONS.MANAGE,
  },
];

describe('Bulk-edit', () => {
  describe('Permissions', () => {
    before('create test data', () => {
      cy.createTempUser([]).then((userProperties) => {
        user = userProperties;
        cy.createAuthorizationRoleApi(testData.roleName).then((role) => {
          testData.roleId = role.id;

          capabSetsToAssign.forEach((capabilitySet) => {
            cy.getCapabilitySetIdViaApi(capabilitySet).then((capabSetId) => {
              testData.capabSetIds.push(capabSetId);
            });
          });

          cy.addCapabilitySetsToNewRoleApi(testData.roleId, testData.capabSetIds);
          cy.addRolesToNewUserApi(user.userId, [testData.roleId]);
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
    });

    it(
      'C376992 Verify Query tab capability sets (In app holdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376992'] },
      () => {
        // Step 1: Navigate to the "Bulk edit" app
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');

        // Step 2-3: Go to Settings > Authorization roles and edit current user role
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Authorization roles');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.openForEdit();

        // Step 4: Search for and select "procedural - UI-Bulk-Edit Query - execute" capability set
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal();
        AuthorizationRoles.clickSaveInModal();
        AuthorizationRoles.checkCapabilitySpinnersShown();
        AuthorizationRoles.checkCapabilitySpinnersAbsent();
        AuthorizationRoles.selectCapabilitySetCheckbox(capabSetToSelect);

        // Step 5: Unselect specific capability sets
        capabSetToUnselect.forEach((capabSet) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(capabSet, false);
          cy.wait(4000);
        });

        // Step 6: Save the changes
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
        cy.wait(2000);

        // Step 7: Relog into FOLIO with updated capability sets and navigate to Bulk edit
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');

        // Step 8: Select the "Query" tab and verify record types
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.isHoldingsRadioChecked(false);
        BulkEditSearchPane.isInstancesRadioChecked(false);
        BulkEditSearchPane.isItemsRadioChecked(false);
        BulkEditSearchPane.verifyUsersRadioAbsent();
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        QueryModal.buildQueryButtonDisabled();
      },
    );
  });
});
