import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Refresh list', () => {
    let userData = {};
    const listData = {
      name: `C411825-${getTestEntityValue('list')}`,
      description: `C411825-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create user and list', () => {
      cy.getAdminToken();
      cy.createTempUser([Permissions.listsEdit.gui, Permissions.usersViewRequests.gui])
        .then((userProperties) => {
          userData = userProperties;
        })
        .then(() => {
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
    });

    beforeEach('Reset list state', () => {
      cy.getAdminToken();
      Lists.getListByIdViaApi(listId)
        .then((body) => {
          listData.version = body.version;
        })
        .then(() => {
          Lists.waitForListToCompleteRefreshViaApi(listId).then(() => {
            Lists.editViaApi(listId, { ...listData, isActive: true, isPrivate: false }).then(() => {
              Lists.getListByIdViaApi(listId)
                .then((body) => {
                  listData.version = body.version;
                })
                .then(() => {
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

    it(
      'C411825 (Multiple users): Refresh list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411825'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then(() => {
          cy.wait(100);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(100);
        });

        Lists.openActions();
        Lists.refreshList();
        Lists.verifyCalloutMessage(
          `Error: refresh for ${listData.name} failed because a refresh for this list is already in progress.`,
        );
      },
    );

    it(
      'C411826 (Multiple users): Refresh list when another user modifies the list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411826'] },
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

        Lists.editQuery();
        cy.wait(2000);
        // Change query value
        Lists.changeQueryBoolValue(false);
        cy.wait(5000);
        Lists.testQuery();
        cy.wait(5000);
        Lists.runQueryAndSave();

        cy.wait(100);
        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then((response) => {
          expect(response.body).to.have.property(
            'message',
            `List ( with id ${listId} ) is already in refresh state`,
          );
          expect(response.body).to.have.property('code', 'refresh-list.refresh.in.progress');
        });
      },
    );

    it(
      'C411829 (Multiple users): Cancel refresh (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411829'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        Lists.openActions();
        Lists.refreshList();

        cy.wait(200);
        Lists.openActions();
        Lists.cancelRefreshList();
        Lists.verifyCalloutMessage(`The refresh for ${listData.name} was successfully cancelled.`);
      },
    );

    it(
      'C411835 (Multiple users): Refresh list when another user make the list Private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411835'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isPrivate: true }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.openActions();
        Lists.refreshList();
        Lists.verifyCalloutMessage(
          `Error: refresh of ${listData.name} failed. Someone else modified this list and you no longer have access to it.`,
        );
      },
    );

    it(
      'C411836 (Multiple users): Refresh list when another user make the list Inactive (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411836'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isActive: false }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.openActions();
        Lists.refreshList();
        Lists.verifyCalloutMessage(
          `Error: ${listData.name} was not refreshed because it is inactive. Set the list status to active to refresh the list.`,
        );
      },
    );

    it(
      'C411827 (Multiple users): Refresh list when someone removes the list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411827'] },
      () => {
        cy.login(userData.username, userData.password, {
          path: TopMenu.listsPath,
          waiter: Lists.waitLoading,
        });
        Lists.waitLoading();
        Lists.verifyListIsPresent(listData.name);
        Lists.openList(listData.name);

        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.openActions();
        Lists.refreshList();
        Lists.verifyCalloutMessage(
          `Error: ${listData.name} was not refreshed because the list was not found. Verify the list location and try again.`,
        );
      },
    );
  });
});
