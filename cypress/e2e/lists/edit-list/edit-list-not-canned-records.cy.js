import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('Edit list', () => {
    const userData = {};
    const listData = {
      name: `C411732-${getTestEntityValue('test_list')}`,
      recordType: 'Loans',
      status: 'Active',
      visibility: 'Shared',
    };
    const editListData = {
      name: `C411732-${getTestEntityValue('test_list')}`,
      description: `C411732-${getTestEntityValue('test_list_description')}`,
      visibility: 'Private',
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ]).then((userProperties) => {
        userData.username = userProperties.username;
        userData.password = userProperties.password;
        userData.userId = userProperties.userId;
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteListByNameViaApi(listData.name);
      Lists.deleteListByNameViaApi(editListData.name);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411732 Edit lists: Not canned records (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411732'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.openNewListPane();
        Lists.setName(listData.name);
        Lists.selectRecordType(listData.recordType);
        Lists.selectVisibility(listData.visibility);
        Lists.selectStatus(listData.status);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} saved.`);
        Lists.closeListDetailsPane();

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        Lists.verifyCancelButtonIsActive();
        Lists.verifySaveButtonIsDisabled();
        Lists.setDescription(editListData.description);
        Lists.verifySaveButtonIsActive();
        Lists.selectVisibility(editListData.visibility);
        Lists.verifySaveButtonIsActive();
        Lists.clearName();
        Lists.verifySaveButtonIsDisabled();
        Lists.verifyEmptyListNameErrorMessage();
        Lists.cancelList();
        Lists.verifyCancellationModal();
        Lists.keepEditing();
        cy.url().should('include', 'lists/list');
        Lists.cancelList();
        Lists.closeWithoutSaving();
        Lists.closeListDetailsPane();

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        Lists.setName(editListData.name);
        Lists.setDescription(editListData.description);
        Lists.saveList();
        Lists.verifySuccessCalloutMessage(`List ${editListData.name} saved.`);
        Lists.closeListDetailsPane();
        Lists.verifyListIsPresent(editListData.name);
        Lists.verifyListIsNotPresent(listData.name);
      },
    );
  });
});
