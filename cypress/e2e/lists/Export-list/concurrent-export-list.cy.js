import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Export list', () => {
    let userData = {};
    const listData = {
      name: '',
      description: '',
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create user and list', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsExport.gui,
        Permissions.usersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ])
        .then((userProperties) => {
          userData = userProperties;
        });
    });

    beforeEach('Reset list state', () => {
      listData.name = `C411814-${getTestEntityValue('list')}`;
      listData.description = `C411814-${getTestEntityValue('desc')}`;
      cy.getAdminToken();
      Lists.buildQueryOnActiveUsers().then(({ query, fields }) => {
        Lists.createQueryViaApi(query).then((createdQuery) => {
          listData.queryId = createdQuery.queryId;
          listData.fqlQuery = createdQuery.fqlQuery;
          listData.fields = fields;

          Lists.createViaApi(listData)
            .then((body) => {
              listData.version = body.version;
              listId = body.id;
            })
            .then(() => {
              Lists.waitForListToCompleteRefreshViaApi(listId);
            });
        });
      });
    });

    afterEach('Delete test list', () => {
      cy.getAdminToken();
      Lists.deleteRecursivelyViaApi(listId);
    });

    after('Delete test user', () => {
      cy.getAdminToken();
      Users.deleteViaApi(userData.userId);
    });

    it(
      'C411814 (Multiple users): Export list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411814'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.postExportViaApi(listId, listData.fields).then(() => {
          cy.wait(100);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.openActions();
        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Export of ${listData.name} is being generated. This may take some time for larger lists.`,
        );
      },
    );

    it(
      'C411815 (Multiple users): Export list when refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411815'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();

        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then(() => {
          cy.wait(100);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Error: ${listData.name} was not exported. Lists can't be exported while a refresh is in progress.`,
        );
      },
    );

    it(
      'C411816 (Multiple users): Export list when another user make the list Private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411816'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isPrivate: true }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Error: export of ${listData.name} failed. Someone else modified this list and you no longer have access to it.`,
        );
      },
    );

    it(
      'C411832 (Multiple users): Export list when another user make the list Inactive (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411832'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isActive: false }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Error: export of ${listData.name} failed. Verify the list is active and try to export the list again.`,
        );
      },
    );

    it(
      'C411817 (Multiple users): Export list when someone removes the list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411817'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);
        Lists.openActions();

        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.exportList();

        Lists.verifyCalloutMessage(
          `Error: export of ${listData.name} failed because the list was not found. Verify the list location and try again.`,
        );
      },
    );
  });
});
