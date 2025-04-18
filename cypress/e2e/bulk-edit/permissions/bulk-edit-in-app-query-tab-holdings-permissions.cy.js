import AuthorizationRoles from '../../../support/fragments/settings/authorization-roles/authorizationRoles';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import TopMenuNavigation from '../../../support/fragments/topMenuNavigation';
import {
  APPLICATION_NAMES,
  CAPABILITY_TYPES,
  CAPABILITY_ACTIONS,
} from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const testData = {
  roleName: `Auto Role C413373 ${getRandomPostfix()}`,
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

describe('bulk-edit', () => {
  describe('permissions', () => {
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

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
      });
    });

    after('delete test data', () => {
      cy.getAdminToken();
      Users.deleteViaApi(user.userId);
      cy.deleteAuthorizationRoleApi(testData.roleId);
    });

    it(
      'C413373 Verify Query tab capability sets (In app holdings) (firebird)',
      { tags: ['extendedPath', 'firebird', 'C413373'] },
      () => {
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
        });

        AuthorizationRoles.clickSaveButton();
        AuthorizationRoles.checkAfterSaveEdit(testData.roleName);
        AuthorizationRoles.clickOnCapabilitySetsAccordion();
        AuthorizationRoles.verifyCapabilitySetCheckboxChecked(capabSetToSelect);

        capabSetToUnselect.forEach((capabSet) => {
          AuthorizationRoles.verifyCapabilityCheckboxAbsent(capabSet);
        });

        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');
      },
    );
  });
});
