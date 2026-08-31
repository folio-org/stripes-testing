import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe(
    'Add new list',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      let userData = {};
      let listData;

      beforeEach('Create test data', () => {
        listData = {
          name: getTestEntityValue('list'),
        };

        cy.createTempUser([
          Permissions.listsEdit.gui,
          Permissions.usersViewRequests.gui,
          Permissions.uiOrdersCreate.gui,
          Permissions.inventoryAll.gui,
          Permissions.loansAll.gui,
          Permissions.uiOrganizationsViewEditCreate.gui,
        ]).then((userProperties) => {
          userData = userProperties;
        });
      });

      afterEach('Delete test data', () => {
        cy.getAdminToken();
        Lists.deleteListByNameViaApi(listData.name);
        Users.deleteViaApi(userData.userId);
      });

      it(
        'C411705 Verify that created new list is visible on the "Lists" landing page (athena)',
        { tags: ['smoke', 'athena', 'shiftLeft', 'C411705'] },
        () => {
          cy.login(userData.username, userData.password, {
            path: TopMenu.listsPath,
            waiter: Lists.waitLoading,
          });
          Lists.openNewListPane();
          Lists.setName(listData.name);
          Lists.setDescription(listData.name);
          Lists.selectRecordType('Loans');
          Lists.selectVisibility('Shared');
          Lists.selectStatus('Active');
          Lists.saveList();
          Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
          Lists.verifyRecordsNumber('No');
          cy.wait(4000);
          Lists.closeListDetailsPane();
          Lists.findResultRowIndexByContent(listData.name).then((rowIndex) => {
            Lists.checkResultSearch(listData, rowIndex);
          });
        },
      );
    },
  );
});
