import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Delete list', () => {
    const userData = {};
    const listData = {
      name: getTestEntityValue('test_list'),
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    };

    before('Create a user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.uiUsersView.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.uiUsersViewLoans.gui,
        Permissions.uiOrganizationsView.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });
    it(
      'C411768 Delete list: Positive case (corsair)',
      { tags: ['smoke', 'corsair', 'C411768'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} deleted.`);
      },
    );

    it(
      'C411772 Delete list: "Edit list" mode (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411772'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.resetAllFilters();
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.setDescription(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.saveList();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} deleted.`);
      },
    );
  });
});
