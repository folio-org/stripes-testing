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
        Permissions.listsEdit.gui,
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
            permissions: [
              Permissions.listsEdit.gui,
              Permissions.uiOrdersView.gui,
              Permissions.uiOrganizationsViewEditCreate.gui,
              Permissions.uiUsersViewLoans.gui,
            ],
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
      'C523639 Only entity types for which the user has all required permissions in member tenant are available - Consortium (consortia) (athena)',
      { tags: ['criticalPathECS', 'athena', 'C523639'] },
      () => {
        // Step 1: Switch affiliation to member tenant
        ConsortiumManager.switchActiveAffiliation(tenantNames.central, tenantNames.college);
        Lists.waitLoading();
        Lists.openNewListPane();
        Lists.openRecordTypeDropdownAndSearchOption('Organizations');
        Lists.verifyRecordTypeDropdownOptions('Organizations');

        // Verify available record types - Purchase order lines (has permission)
        Lists.searchOptionInRecordTypeDropdown('Purchase order lines');
        Lists.verifyRecordTypeDropdownOptions('Purchase order lines');

        // Verify available record types - Users (has permission)
        Lists.searchOptionInRecordTypeDropdown('Users');
        Lists.verifyRecordTypeDropdownOptions('Users');

        // Verify NOT available record types - Instances (NO Inventory permission)
        Lists.searchOptionInRecordTypeDropdown('Instances');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // Verify NOT available record types - Holdings (NO Inventory permission)
        Lists.searchOptionInRecordTypeDropdown('Holdings');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // Verify NOT available record types - Items (NO Inventory permission)
        Lists.searchOptionInRecordTypeDropdown('Items');
        Lists.verifyRecordTypeAbsentInDropdownOptions();

        // Verify NOT available record types - Loans (NO specific Loans permission)
        Lists.searchOptionInRecordTypeDropdown('Loans');
        Lists.verifyRecordTypeAbsentInDropdownOptions();
      },
    );
  });
});
