import Permissions from '../../../support/dictionary/permissions';
import Lists from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('lists', () => {
  describe('export query', () => {
    const userData = {};
    const listData = {
      name: `C552378-${getTestEntityValue('test_list')}`,
      description: `C552378-${getTestEntityValue('test_list_description')}`,
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
          Lists.buildQueryOnActiveUsersWithUsernames().then(({ query, fields }) => {
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
      Lists.deleteDownloadedFile(listData.name);
    });

    it(
      'C552378 Verify that "Export all columns (CSV)" exports all the columns of the proper entity types (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C552378'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listData.name} was successfully exported to CSV.`);
        Lists.checkDownloadedFile(listData.name, 'users.active,');
        Lists.checkDownloadedFile(listData.name, 'users.id');
        Lists.checkDownloadedFile(listData.name, 'users.username');
        Lists.checkDownloadedFile(listData.name, 'users.type');
        Lists.checkDownloadedFile(listData.name, 'users.updated_by_user_id');
        Lists.checkDownloadedFile(listData.name, 'users.updated_date');
        Lists.checkDownloadedFile(listData.name, 'users.user_created_date');
      },
    );
  });
});
