import Permissions from '../../support/dictionary/permissions';
import { APPLICATION_NAMES } from '../../support/constants';
import { Lists } from '../../support/fragments/lists/lists';
import TopMenu from '../../support/fragments/topMenu';
import TopMenuNavigation from '../../support/fragments/topMenuNavigation';
import Users from '../../support/fragments/users/users';
import BulkEditSearchPane from '../../support/fragments/bulk-edit/bulk-edit-search-pane';
import getRandomPostfix from '../../support/utils/stringTools';

describe('Lists', () => {
  describe('Lists landing page', () => {
    let userData;
    const listName = `AT_C506687_List_${getRandomPostfix()}`;

    before('Create test data', () => {
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.bulkEditView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
      ]).then((userProperties) => {
        userData = userProperties;

        cy.getUserToken(userData.username, userData.password);
        Lists.createViaApi({
          name: listName,
          description: 'Test list for C506687',
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: false,
        });

        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
      });
    });

    after('Delete test data', () => {
      cy.getUserToken(userData.username, userData.password);
      Lists.deleteListByNameViaApi(listName);
      cy.getAdminToken(false);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C1444144 Verify that the previously selected filters are still selected when we navigate to the other apps/lists details page and come back to the "Lists" (athena)',
      { tags: ['criticalPath', 'athena', 'C1444144'] },
      () => {
        // Step 1: Select filters
        Lists.clickOnCheckbox('Shared');
        Lists.selectRecordTypeFilter(Lists.recordTypes.users);

        // Verify filters are selected
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyRecordTypeSelectedinFilter([Lists.recordTypes.users]);

        // Step 2: Navigate to Bulk edit app
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.BULK_EDIT);
        BulkEditSearchPane.waitLoading();

        // Step 3: Navigate back to Lists app from app dropdown
        TopMenuNavigation.navigateToApp(APPLICATION_NAMES.LISTS);
        Lists.waitLoading();

        // Verify previously selected filters are still selected
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyRecordTypeSelectedinFilter([Lists.recordTypes.users]);

        // Step 4: Click on the created list
        Lists.openList(listName);

        // Step 5: Click on the X button to close list details
        Lists.closeListDetailsPane();

        // Verify previously selected filters are still selected
        Lists.verifyCheckboxChecked('Shared');
        Lists.verifyRecordTypeSelectedinFilter([Lists.recordTypes.users]);
      },
    );
  });
});
