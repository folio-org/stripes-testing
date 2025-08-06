import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import BulkEditSearchPane from '../../../support/fragments/bulk-edit/bulk-edit-search-pane';
import QueryModal from '../../../support/fragments/bulk-edit/query-modal';
import { CAPABILITY_TYPES, CAPABILITY_ACTIONS } from '../../../support/constants';
import getRandomPostfix from '../../../support/utils/stringTools';

let user;
const testData = {
  roleName: `Auto Role C376993 ${getRandomPostfix()}`,
  capabSetIds: [],
};
const capabSetsToAssign = [
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Inventory',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.VIEW,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users Csv',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.DATA,
    resource: 'UI-Bulk-Edit Users',
    action: CAPABILITY_ACTIONS.EDIT,
  },
  {
    type: CAPABILITY_TYPES.PROCEDURAL,
    resource: 'UI-Bulk-Edit Query',
    action: CAPABILITY_ACTIONS.EXECUTE,
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
      'C376993 Verify Query tab capability sets without Inventory and Users capability sets (firebird)',
      { tags: ['extendedPath', 'firebird', 'C376993'] },
      () => {
        // Step 1: Navigate to the "Bulk edit" app
        cy.login(user.username, user.password, {
          path: TopMenu.bulkEditPath,
          waiter: BulkEditSearchPane.waitLoading,
        });
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabs('Identifier', 'Query');
        BulkEditSearchPane.verifySetCriteriaPaneSpecificTabsHidden('Logs');

        // Step 2: Select the "Query" tab and verify record types
        BulkEditSearchPane.openQuerySearch();
        BulkEditSearchPane.verifyRadioHidden('Inventory - holdings');
        BulkEditSearchPane.verifyRadioHidden('Inventory - instances');
        BulkEditSearchPane.verifyRadioHidden('Inventory - items');
        BulkEditSearchPane.verifyUsersRadioAbsent();
        QueryModal.buildQueryButtonDisabled();
      },
    );
  });
});
