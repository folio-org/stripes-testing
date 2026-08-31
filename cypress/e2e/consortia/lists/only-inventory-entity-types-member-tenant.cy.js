import Affiliations, { tenantNames } from '../../../support/dictionary/affiliations';
import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import ConsortiumManager from '../../../support/fragments/settings/consortium-manager/consortium-manager';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';

const testData = {
  user: {},
};

describe('Lists', () => {
  describe('Consortia', () => {
    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiOrdersView.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
      ])
        .then((userProperties) => {
          testData.user = userProperties;

          cy.affiliateUserToTenant({
            tenantId: Affiliations.College,
            userId: testData.user.userId,
            permissions: [Permissions.listsAll.gui, Permissions.inventoryAll.gui],
          });
        })
        .then(() => {
          cy.login(testData.user.username, testData.user.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          ConsortiumManager.checkCurrentTenantInTopMenu(tenantNames.central);
        });
    });

    after('Delete test data', () => {
      cy.resetTenant();
      cy.getAdminToken();

      if (testData.user.userId) {
        Users.deleteViaApi(testData.user.userId);
      }
    });

    it(
      'C523638 Only Inventory related entity types are available in the member tenant, when the necessary capabilities are added (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C523638'] },
      () => {
        // Step 1: Switch affiliation to member tenant and open Lists app
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.openRecordTypeDropdown();
        Lists.verifyAllOptionsInRecordTypeDropdown([
          Lists.recordTypes.holdings,
          Lists.recordTypes.instances,
          Lists.recordTypes.instancesWithMarcBibliographic,
          Lists.recordTypes.items,
          Lists.recordTypes.purchaseOrders,
        ]);
      },
    );
  });
});
