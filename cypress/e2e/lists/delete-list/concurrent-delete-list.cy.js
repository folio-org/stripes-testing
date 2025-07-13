import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Delete list', () => {
    let userData = {};
    const listData = {
      name: `C411773-${getTestEntityValue('list')}`,
      description: `C411773-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create user', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsAll.gui,
        Permissions.usersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ]).then((userProperties) => {
        userData = userProperties;
      });
      Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
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

    beforeEach('Reset list state', () => {
      cy.getAdminToken();
      Lists.getListByIdViaApi(listId).then((body) => {
        listData.version = body.version;
      }).then(() => {
        Lists.waitForListToCompleteRefreshViaApi(listId).then(() => {
          Lists.editViaApi(listId, { ...listData, isActive: true, isPrivate: false }).then(() => {
            Lists.getListByIdViaApi(listId).then((body) => {
              listData.version = body.version;
            }).then(() => {
              Lists.waitForListToCompleteRefreshViaApi(listId);
            });
          });
        });
      });
    });

    after('Delete test data', () => {
      cy.getAdminToken();
      Lists.deleteViaApi(listId);
      Users.deleteViaApi(userData.userId);
    });

    it('C411774 (Multiple users): Delete list when refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411774'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        // refresh a list
        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then(() => { cy.wait(100); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifyCalloutMessage(`Error: ${listData.name} was not deleted. Lists can't be deleted while a refresh is in progress.`);
      });

    it('C411831 (Multiple users): Delete list when another user made the list private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411831'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isPrivate: true }).then(() => { cy.wait(500); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifyCalloutMessage(
          `Error: the list ${listData.name} was not deleted. Someone else modified this list and you no longer have access to it`
        );
      });

    it('C411773 (Multiple users): Delete list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411773'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        // delete a list
        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then(() => { cy.wait(500); });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.openActions();
        Lists.deleteList();
        Lists.confirmDelete();
        Lists.verifyCalloutMessage(`Error: ${listData.name} was not deleted because the list was not found. Verify the list location and try again.`);
      });
  });
});
