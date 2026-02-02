import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';
import Users from '../../../support/fragments/users/users';

let user;
const testData = {
  roleName: `Auto Role C423695 ${getRandomPostfix()}`,
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
    resource: 'UI-Inventory Instance',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
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
    action: CAPABILITY_ACTIONS.VIEW,
  },
];
const capabSetToSelect = {
  table: CAPABILITY_TYPES.PROCEDURAL,
  resource: 'UI-Bulk-Edit Query',
  action: CAPABILITY_ACTIONS.EXECUTE,
};
const capabSetToUnselect = [
  {
    table: CAPABILITY_TYPES.SETTINGS,
    resource: 'UI-Authorization-Roles Settings',
    action: CAPABILITY_ACTIONS.CREATE,
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
    action: CAPABILITY_ACTIONS.VIEW,
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
      'C423695 Verify Query tab capability sets (In app Instances) (firebird)',
      { tags: ['criticalPath', 'firebird', 'C423695'] },
      () => {
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Query', 'Logs');

        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.SETTINGS, 'Authorization roles');
        AuthorizationRoles.waitContentLoading();
        AuthorizationRoles.searchRole(testData.roleName);
        AuthorizationRoles.clickOnRoleName(testData.roleName);
        AuthorizationRoles.openForEdit();
        AuthorizationRoles.clickSelectApplication();
        AuthorizationRoles.selectAllApplicationsInModal();
        AuthorizationRoles.clickSaveInModal();
        AuthorizationRoles.checkCapabilitySpinnersShown();
        AuthorizationRoles.checkCapabilitySpinnersAbsent();
        AuthorizationRoles.selectCapabilitySetCheckbox(capabSetToSelect);

        capabSetToUnselect.forEach((capabSet) => {
          AuthorizationRoles.selectCapabilitySetCheckbox(capabSet, false);
          cy.wait(5000);
        });

        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabSetToSelect);

        capabSetToUnselect.forEach((capabSet) => {
          AuthorizationRoles.verifyCapabilityCheckboxAbsent(capabSet);
        });

        cy.wait(2000);
        cy.logout();
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
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
