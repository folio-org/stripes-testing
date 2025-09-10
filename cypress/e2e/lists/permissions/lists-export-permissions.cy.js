import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe(
    'Permissions',
    {
      retries: {
        runMode: 1,
      },
    },
    () => {
      const userData = {};
      let listData;

      beforeEach('Create test data', () => {
        listData = {
          name: `C418652-${getTestEntityValue('list')}`,
          description: `C418652-${getTestEntityValue('desc')}`,
          recordType: 'Users',
          fqlQuery: '',
          isActive: true,
          isPrivate: false,
        };

        cy.createTempUser([
          Permissions.listsExport.gui,
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
                }).then(() => {
                  Lists.waitForListToCompleteRefreshViaApi(listData.id);
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
        'C418652 Lists (Export): Can create, edit, refresh, and export lists (corsair)',
        { tags: ['smoke', 'corsair', 'shiftLeft', 'C418652'] },
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
          Lists.verifyExportListButtonIsActive();
          Lists.verifyExportListVisibleColumnsButtonIsActive();
          Lists.verifyDeleteListButtonDoesNotExist();
          Lists.refreshList();
          Lists.waitForCompilingToComplete();
          Lists.openActions();
          Lists.exportList();
          Lists.verifyCalloutMessage(
            `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
          );
          Lists.verifyCalloutMessage(`List ${listData.name} was successfully exported to CSV.`);
          cy.wait(5000);
          Lists.openActions();
          Lists.editList();
        },
      );
    },
  );
});
