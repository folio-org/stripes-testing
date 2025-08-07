import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Export query', {
    retries: {
      runMode: 1,
    },
  }, () => {
    const userData = {};
    const listData = {
      name: `C552377-${getTestEntityValue('list')}`,
      description: `C552377-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };

    beforeEach('Create test data', () => {
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

    afterEach('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listData.id);
      Users.deleteViaApi(userData.userId);
      Lists.deleteDownloadedFile(listData.name);
    });

    it(
      'C552377 Verify that "Export visible columns (CSV)" exports only the visible columns (corsair)',
      { tags: ['smoke', 'corsair', 'shiftLeft', 'C552377'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });

        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.exportListVisibleColumns();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );
        Lists.verifyCalloutMessage(`List ${listData.name} was successfully exported to CSV.`);
        Lists.checkDownloadedFile(
          listData.name,
          '"User - Active","User - User UUID","User - Username"',
        );
      },
    );
  });
});
