import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('permissions', () => {
    const userData = {};
    const listData = {
      name: `C418649-${getTestEntityValue('test_list')}`,
      description: `C418649-${getTestEntityValue('test_list_description')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsDelete.gui,
        Permissions.usersViewRequests.gui,
        Permissions.uiOrdersCreate.gui,
        Permissions.inventoryAll.gui,
        Permissions.loansAll.gui,
        Permissions.uiOrganizationsViewEditCreate.gui,
      ])
        .then((userProperties) => {
          userData.username = userProperties.username;
          userData.password = userProperties.password;
          userData.userId = userProperties.userId;
        })
        .then(() => {
          Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
            Lists.createQueryViaApi(query).then((createdQuery) => {
              listData.queryId = createdQuery.queryId;
              listData.fqlQuery = createdQuery.fqlQuery;
              listData.fields = fields;

              Lists.createViaApi(listData).then((body) => {
                listData.id = body.id;
              });
            });
          });
        });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listData.id);
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C418649 Lists (Delete): Can create, edit, refresh, and delete lists (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C418649'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListButtonDoesNotExist();
        Lists.refreshList();
        Lists.waitForCompilingToComplete();
        Lists.openActions();
        Lists.deleteList();
        Lists.cancelDelete();
        Lists.openActions();
        Lists.editList();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListButtonDoesNotExist();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifySuccessCalloutMessage(`List ${listData.name} deleted.`);
        Lists.verifyListIsNotPresent(listData.name);
      },
    );
  });
});
