import Permissions from '../../../support/dictionary/permissions';
import { Lists } from '../../../support/fragments/lists/lists';
import TopMenu from '../../../support/fragments/topMenu';
import Users from '../../../support/fragments/users/users';
import { getTestEntityValue } from '../../../support/utils/stringTools';

describe('Lists', () => {
  describe('Edit list', () => {
    let userData = {};
    const listData = {
      name: `C411740-${getTestEntityValue('list')}`,
      description: `C411740-${getTestEntityValue('desc')}`,
      recordType: 'Users',
      fqlQuery: '',
      isActive: true,
      isPrivate: false,
    };
    let listId;

    before('Create user and list', () => {
      cy.getAdminToken();
      cy.createTempUser([
        Permissions.listsEdit.gui,
        Permissions.usersViewRequests.gui,
        Permissions.inventoryAll.gui,
      ])
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
      'C411740 (Multiple users): Make the list INACTIVE (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411740'] },
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

        // make a list inactive
        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isActive: false }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.editQuery();
        cy.wait(2000);
        // Change query value
        Lists.changeQueryBoolValue(false);
        cy.wait(5000);
        Lists.testQuery();
        cy.wait(5000);
        Lists.runQueryAndSave();
        Lists.verifyCalloutMessage(
          `Error: someone else modified ${listData.name}. Reload the page to view the latest version of this list`,
        );
      },
    );

    it(
      'C411741 (Multiple users): Make the list Private (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411741'] },
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

        cy.getUserTokenOfAdminUser();
        Lists.editViaApi(listId, { ...listData, isPrivate: true }).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.setDescription('test description');
        Lists.saveList();
        Lists.verifyCalloutMessage(
          `Error: changes to ${listData.name} were not saved. Someone else modified this list and you no longer have access to it.`,
        );
      },
    );

    it(
      'C411766 (Multiple users) Edit list when refresh is in progress (corsair)',
      { tags: ['criticalPath', 'corsair', 'С411766'] },
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
        cy.getUserTokenOfAdminUser();
        Lists.refreshViaApi(listId).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.setDescription('test description');
        Lists.saveList();
        Lists.verifyCalloutMessage(
          `Error: changes to ${listData.name} were not saved. Lists can't be updated while a refresh is in progress.`,
        );
      },
    );

    it(
      'C411765 C411776 (Multiple users) Edit deleted list (corsair)',
      { tags: ['criticalPath', 'corsair', 'C411765', 'C411776'] },
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
        const modifiedName = '_test_name';
        Lists.setName(`${listData.name}${modifiedName}`);

        cy.getUserTokenOfAdminUser();
        Lists.deleteViaApi(listId).then(() => {
          cy.wait(500);
        });
        cy.getUserToken(userData.username, userData.password).then(() => {
          cy.wait(500);
        });

        Lists.saveList();
        Lists.verifyCalloutMessage(
          `Error: ${listData.name}${modifiedName} was not found. Verify the list location and try again.`,
        );
      },
    );
  });
});
