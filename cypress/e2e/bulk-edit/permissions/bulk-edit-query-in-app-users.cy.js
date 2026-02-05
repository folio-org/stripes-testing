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
  roleName: `Auto Role C413364 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users',
    action: CAPABILITY_ACTIONS.EDIT,
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
      'C413364 Verify Query tab capability sets (In app Users) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C413364'] },
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
        cy.wait(3000);

        // Step 5: Save the changes
        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabSetToSelect);
        cy.wait(5000);
        cy.logout();

        // Step 6: Relog into FOLIO with updated capability sets and navigate to Bulk edit
        cy.login(user.username, user.password);
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');

        // Step 7: Select the "Query" tab and verify record types
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.verifyRadioHidden('Inventory - holdings');
        BulkEditSearchPane.verifyRadioHidden('Inventory - instances');
        BulkEditSearchPane.verifyRadioHidden('Inventory - items');
        BulkEditSearchPane.isUsersRadioChecked(false);
        BulkEditSearchPane.verifyInputLabel(
          'Select a record type and then click the Build query button.',
        );
        QueryModal.buildQueryButtonDisabled();
      },
    );
  });
});
