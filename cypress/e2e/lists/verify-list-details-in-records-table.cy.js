import Permissions from '../../support/dictionary/permissions';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import Users from '../../support/fragments/users/users';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const listData = {
      name: `AT_C411699_List_${getRandomPostfix()}`,
      description: 'Test description C411699',
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Private',
    };

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsView.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
        Permissions.ordersStorageAcquisitionMethodsCollectionGet.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listData.name);
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411699 Verify that list details are correct in the records table (athena)',
      { tags: ['extendedPath', 'athena', 'C411699'] },
      () => {
        // Step 1: Click on "Lists" in app navigation bar
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        // Step 2: Check the record table structure
        Lists.verifyLandingPageTableColumns([
          'List name',
          'Record type',
          'Records',
          'Status',
          'Source',
          'Last updated',
          'Visibility',
        ]);

        // Step 3: Click on 'New' at the top-right of the page
        Lists.openNewListPane();

        // Step 4: Add list details and save
        Lists.setName(listData.name);
        Lists.setDescription(listData.description);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);

        // Step 5: Click on 'X' at the left-top of the page
        Lists.verifyRecordsNumber('No');
        Lists.closeListDetailsPane();

        // Step 6: Search for the newly created list and verify details
        Lists.verifyListDetailsInRecordsTable({
          name: listData.name,
          recordType: listData.recordType,
          records: '0',
          status: listData.status,
          lastUpdated: '',
          visibility: listData.visibility,
        });
      },
    );
  });
});
