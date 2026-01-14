import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import { getTestEntityValue } from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Entity type displays', () => {
    let userData = {};
    const listData = {
      name: `C446123-${getTestEntityValue('list')}`,
      recordType: 'Purchase order lines with titles',
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.inventoryAll.gui,
        Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      if (userData.userId) Users.deleteViaApi(userData.userId);
    });

    it(
      'C446123 Verify that entity type displays on the "Lists details" page (corsair)',
      { tags: ['criticalPath', 'corsair', 'C446123'] },
      () => {
        // Preconditions: Log into the application and open the "Lists" page
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        // Step 1: Click on "New" button on the top-left of the page
        Lists.openNewListPane();
        // Step 2: Add list name
        Lists.setName(listData.name);
        // Step 3: Select 'Record type' - ex. "Purchase order lines"
        Lists.selectRecordType(listData.recordType);
        // Set additional required fields
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        // Step 4: Click on 'Save' button
        Lists.saveList();
        // Verify successful save
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        // Step 5: Opens list details page and verify "Record type" displays on the list details page
        Lists.verifyRecordType(listData.recordType);
        // Step 6: Click on "Actions" => "Edit list"
        Lists.openActions();
        Lists.editList();
        // Step 7: Verify that record type is displayed on the Edit list page
        Lists.verifyRecordType(listData.recordType);
      },
    );
  });
});
