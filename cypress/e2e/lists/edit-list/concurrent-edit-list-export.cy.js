import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Concurrent edit of the same list by two users', () => {
    let userData = {};
    const listData = {
      name: `C411767-${getTestEntityValue('list')}`,
      description: `C411767-${getTestEntityValue('desc')}`,
      recordType: 'Instances',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create users and list', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsExport.gui,
        Permissions.usersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      }).then(() => {
        Lists.buildQueryOnAllInstances().then(({ query, fields }) => {
          Lists.createQueryViaApi(query).then((createdQuery) => {
            listData.queryId = createdQuery.queryId;
            listData.fqlQuery = createdQuery.fqlQuery;
            listData.fields = fields;

            Lists.createViaApi(listData).then((body) => {
              listData.version = body.version;
              listId = body.id;
            }).then(() => {
              Lists.waitForListToCompleteRefreshViaApi(listId);
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.waitForListToCompleteRefreshViaApi(listId).then(() => {
        Lists.deleteViaApi(listId);
      });
      Users.deleteViaApi(userData.userId);
    });

    it('C411767 (Multiple users) Edit list when export is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'С411767'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();
        Lists.editList();
        Lists.setName(`${listData.name}_test_name`);

        cy.getUserTokenOfAdminUser();
        Lists.exportViaApi(listId, listData.fields).then(() => { cy.wait(50); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });
        Lists.saveList();
        Lists.verifyCalloutMessage(`Error: changes to ${listData.name} were not saved. Lists can't be updated while an export is in progress.`);
      });
  });
});
