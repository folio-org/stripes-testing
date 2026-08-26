import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Create list', () => {
    let userData = {};
    const listData = {
      name: getTestEntityValue('C411695_Test100'),
      description: 'Test description',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411695 Verify that record amount is correct in the Lists landing page (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411695'] },
      () => {
        // #1 Click on "Lists" in app navigation bar
        // Opens 'Lists' landing page and displays 'X records found' under the 'Lists' title
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.getTotalRecordsViaApi().then((initialRecordsCount) => {
          Lists.verifyLandingPageRecordsCount(initialRecordsCount);

          // #2 Click on 'New' at the top-right of the page
          // Opens 'New list' page
          Lists.openNewListPane();

          // #3 Add list name, Description, Visibility, Status, Record type and save the changes
          // Displays toast message "List <name> saved" and opens Lists details page
          Lists.setName(listData.name);
          Lists.setDescription(listData.description);
          Lists.selectRecordType('Loans');
          Lists.selectVisibility('Private');
          Lists.selectStatus('Active');
          Lists.saveList();
          Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);

          // #4 Click on 'X' at the left-top of the page
          // Opens landing page, record amount changed by one -> displays "X+1 records found"
          // The response of API lists?size=100 contains "totalRecords" which equals X+1
          Lists.closeListDetailsPane();
          Lists.verifyLandingPageRecordsCount(initialRecordsCount + 1);
          Lists.getTotalRecordsViaApi().then((updatedRecordsCount) => {
            expect(updatedRecordsCount).to.equal(initialRecordsCount + 1);
          });
        });
      },
    );
  });
});
