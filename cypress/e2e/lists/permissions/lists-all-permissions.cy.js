import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Permissions', () => {
    const userData = {};
    const listData = {
      name: `C411693-${getTestEntityValue('list')}`,
      description: `C411693-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    before('Create test data', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
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
      'C411694 C411693 Lists (Admin): All permissions (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C411694', 'C411693'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.verifyNewButtonIsEnabled();
        Lists.verifyListIsPresent(listData.name);
        Lists.selectActiveLists();
        Lists.selectInactiveLists();
        Lists.selectPrivateLists();
        Lists.selectSharedLists();
        Lists.selectRecordTypeFilter(listData.recordType);
        Lists.resetAllFilters();

        Lists.openList(listData.name);
        Lists.openActions();
        Lists.verifyRefreshListButtonIsActive();
        Lists.verifyEditListButtonIsActive();
        Lists.verifyDuplicateListButtonIsActive();
        Lists.verifyDeleteListButtonIsActive();
        Lists.verifyExportListButtonIsActive();

        Lists.editList();
        Lists.openActions();
        Lists.verifyDeleteListButtonIsActive();
      },
    );
  });
});
